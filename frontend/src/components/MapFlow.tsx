import { useMemo, useEffect, useState } from 'react'
import ReactFlow, { Background, Edge, MarkerType } from 'reactflow'
import 'reactflow/dist/style.css'
import SectorBackgroundNode from './SectorBackgroundNode'
import PatientWalkingNode from './PatientWalkingNode'
import { Beaker, Camera, Building2, Activity, Stethoscope, Pill, HeartPulse } from 'lucide-react'

const nodeTypes = {
  sector: SectorBackgroundNode,
  patient: PatientWalkingNode
}

type StepInfo = { step: string; label: string; time: string | null; minutes: number | null; type: string }

interface MapFlowProps {
  activeStep: string
  journey?: any
  onStepClick?: (step: StepInfo) => void
}

const SECTOR_DEFINITIONS = [
  { id: 'ENTRADA', label: 'PORTARIA / SENHA', icon: <span className="text-2xl">🏢</span>, position: { x: 50, y: 350 }, sourcePosition: 'right', targetPosition: 'left', zone: 'START' },
  { id: 'TRIAGEM', label: 'CLASSIFICAÇÃO', icon: <span className="text-2xl animate-pulse">🩺</span>, position: { x: 350, y: 350 }, sourcePosition: 'right', targetPosition: 'left', zone: 'START' },
  { id: 'CONSULTA', label: 'CONSULTÓRIO', icon: <span className="text-2xl animate-bounce" style={{ animationDuration: '3s' }}>👨‍⚕️</span>, position: { x: 650, y: 350 }, sourcePosition: 'right', targetPosition: 'left', zone: 'START' },
  
  { id: 'LABORATORIO', label: 'LABORATÓRIO', icon: <span className="text-2xl animate-spin" style={{ animationDuration: '8s' }}>🧪</span>, position: { x: 1000, y: 100 }, sourcePosition: 'right', targetPosition: 'left', zone: 'ACTION' },
  { id: 'IMAGEM', label: 'RX / TC / US', icon: <span className="text-2xl animate-spin" style={{ animationDuration: '5s' }}>☢️</span>, position: { x: 1000, y: 300 }, sourcePosition: 'right', targetPosition: 'left', zone: 'ACTION' },
  { id: 'MEDICACAO', label: 'MEDICAÇÃO', icon: <span className="text-2xl animate-bounce" style={{ animationDuration: '4s' }}>💊</span>, position: { x: 1000, y: 600 }, sourcePosition: 'right', targetPosition: 'left', zone: 'ACTION' },
  
  { id: 'REAVALIACAO', label: 'REAVALIAÇÃO', icon: <span className="text-2xl">🔄</span>, position: { x: 1350, y: 350 }, sourcePosition: 'right', targetPosition: 'left', zone: 'END' },
  { id: 'ALTA', label: 'ALTA MÉDICA', icon: <span className="text-2xl">🏠</span>, position: { x: 1700, y: 250 }, sourcePosition: 'right', targetPosition: 'left', zone: 'END' },
  { id: 'INTERNACAO', label: 'INTERNAÇÃO', icon: <span className="text-2xl">🏥</span>, position: { x: 1700, y: 450 }, sourcePosition: 'right', targetPosition: 'left', zone: 'END' },
]

export default function MapFlow({ activeStep, journey, onStepClick }: MapFlowProps) {
  const [nodes, setNodes] = useState<any[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  // Mapa de step → stepData da jornada real
  const stepMap = useMemo(() => {
    const map: Record<string, StepInfo> = {}
    if (journey?.steps) {
      for (const s of journey.steps) map[s.step] = s
    }
    return map
  }, [journey])

  useEffect(() => {
    // 1. Criar Nodes
    const newNodes: any[] = SECTOR_DEFINITIONS.map(def => ({
      id: def.id,
      type: 'sector',
      position: def.position,
      data: {
        label: def.label,
        icon: def.icon,
        active: def.id === activeStep,
        stepData: stepMap[def.id] ?? null,
        onStepClick,
        journey: journey,
        yPos: def.position.y,
        xPos: def.position.x
      },
      sourcePosition: def.sourcePosition,
      targetPosition: def.targetPosition
    }))

    // Ghost do paciente no nó ativo
    if (activeStep) {
      const activeDef = SECTOR_DEFINITIONS.find(d => d.id === activeStep)
      if (activeDef) {
        newNodes.push({
          id: 'patient_ghost',
          type: 'patient',
          position: { x: activeDef.position.x + 96, y: activeDef.position.y + 65 },
          data: {}
        })
      }
    }

    setNodes(newNodes)

    // 2. Criar Edges Dinâmicas
    const newEdges: Edge[] = []
    
    const addPath = (id: string, source: string, target: string, type: 'spine' | 'action' = 'spine') => {
      const isVisited = !!(stepMap[source] && (stepMap[target] || target === activeStep))
      const isCurrent = target === activeStep
      const isAction = type === 'action'
      
      newEdges.push({
        id,
        source,
        target,
        type: 'smoothstep',
        className: isAction ? 'edge-pulse-action' : 'edge-pulse-main',
        style: {
          strokeWidth: isAction ? 2 : 3,
          stroke: isAction ? '#EAB308' : 'var(--dash-live)',
          filter: isAction ? 'drop-shadow(0 0 4px rgba(234, 179, 8, 0.4))' : 'drop-shadow(0 0 6px rgba(45, 224, 185, 0.4))',
          opacity: 1, 
        },
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          color: isAction ? '#EAB308' : 'var(--dash-live)' 
        }
      })
    }

    addPath('e-ent-tri', 'ENTRADA', 'TRIAGEM')
    addPath('e-tri-con', 'TRIAGEM', 'CONSULTA')

    if (stepMap['LABORATORIO'] || activeStep === 'LABORATORIO') addPath('e-con-lab', 'CONSULTA', 'LABORATORIO', 'action')
    if (stepMap['IMAGEM']      || activeStep === 'IMAGEM')      addPath('e-con-img', 'CONSULTA', 'IMAGEM', 'action')
    if (stepMap['MEDICACAO']   || activeStep === 'MEDICACAO')   addPath('e-con-med', 'CONSULTA', 'MEDICACAO', 'action')

    if (stepMap['REAVALIACAO'] || activeStep === 'REAVALIACAO') {
      if (stepMap['LABORATORIO']) addPath('e-lab-rea', 'LABORATORIO', 'REAVALIACAO', 'action')
      if (stepMap['IMAGEM'])      addPath('e-img-rea', 'IMAGEM', 'REAVALIACAO', 'action')
      if (stepMap['MEDICACAO'])   addPath('e-med-rea', 'MEDICACAO', 'REAVALIACAO', 'action')
      if (!stepMap['LABORATORIO'] && !stepMap['IMAGEM'] && !stepMap['MEDICACAO']) {
        addPath('e-con-rea', 'CONSULTA', 'REAVALIACAO')
      }
    }

    const finalStep = stepMap['ALTA'] ? 'ALTA' : (stepMap['INTERNACAO'] ? 'INTERNACAO' : (activeStep === 'ALTA' || activeStep === 'INTERNACAO' ? activeStep : null))
    if (finalStep) {
      const source = stepMap['REAVALIACAO'] ? 'REAVALIACAO' : 'CONSULTA'
      addPath(`e-final`, source, finalStep)
    }

    setEdges(newEdges)
  }, [activeStep, stepMap, onStepClick, journey])

  return (
    <div className="absolute inset-0 bg-[#0F1219] overflow-hidden">
      <style>{`
        .react-flow__node {
          transition: z-index 0s !important;
        }
        .react-flow__node:hover {
          z-index: 10000 !important;
        }
        .react-flow__viewport {
          overflow: visible !important;
        }
        /* LEI MARCIAL: Bloqueio Universal de Cursor */
        .react-flow, .react-flow *, .react-flow__pane, .react-flow__node, .react-flow__edge, .react-flow__edge-path {
          cursor: default !important;
        }
        
        /* Respiração Sutil das Linhas */
        @keyframes edge-breath {
          0% { opacity: 0.5; }
          50% { opacity: 0.9; }
          100% { opacity: 0.5; }
        }
        
        .edge-pulse-main {
          animation: edge-breath 4s infinite ease-in-out;
        }
        
        .edge-pulse-action {
          animation: edge-breath 6s infinite ease-in-out;
        }
      `}</style>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes) => {}}
        onNodeMouseEnter={(_, node) => {
          setNodes(nds => nds.map(n => n.id === node.id ? { ...n, zIndex: 10000 } : n));
        }}
        onNodeMouseLeave={(_, node) => {
          setNodes(nds => nds.map(n => n.id === node.id ? { ...n, zIndex: 1 } : n));
        }}
        // Inviolabilidade do DOM: fitView só ativa no carregamento inicial do paciente
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.2, maxZoom: 1.0 }}
        key={`flow-${journey?.NR_ATENDIMENTO || 'none'}`}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
        selectionMode={undefined}
        panOnScroll={false}
        style={{ width: '100%', height: '100%' }}
        onNodeClick={(_, node) => {
          if (node.data?.stepData) {
            onStepClick?.(node.data.stepData);
          }
        }}
        className="[&_.react-flow__pane]:!cursor-default [&_.react-flow__node]:!cursor-default"
      >
        <Background color="rgba(255,255,255,0.03)" gap={20} size={1} />
      </ReactFlow>
    </div>
  )
}
