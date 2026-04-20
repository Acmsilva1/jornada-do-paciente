import { useMemo, useEffect, useState } from 'react'
import ReactFlow, { Background, Controls, Edge, MarkerType } from 'reactflow'
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
  { id: 'ENTRADA', label: 'PORTARIA / SENHA', icon: <Building2 size={24} />, position: { x: 50, y: 300 }, sourcePosition: 'right', targetPosition: 'left', zone: 'START' },
  { id: 'TRIAGEM', label: 'CLASSIFICAÇÃO', icon: <Activity size={24} />, position: { x: 300, y: 300 }, sourcePosition: 'right', targetPosition: 'left', zone: 'START' },
  { id: 'CONSULTA', label: 'CONSULTÓRIO', icon: <Stethoscope size={24} />, position: { x: 550, y: 300 }, sourcePosition: 'right', targetPosition: 'left', zone: 'START' },
  
  { id: 'LABORATORIO', label: 'LABORATÓRIO', icon: <Beaker size={24} />, position: { x: 820, y: 120 }, sourcePosition: 'right', targetPosition: 'left', zone: 'ACTION' },
  { id: 'IMAGEM', label: 'RX / TC / US', icon: <Camera size={24} />, position: { x: 820, y: 300 }, sourcePosition: 'right', targetPosition: 'left', zone: 'ACTION' },
  { id: 'MEDICACAO', label: 'MEDICAÇÃO', icon: <Pill size={24} />, position: { x: 820, y: 480 }, sourcePosition: 'right', targetPosition: 'left', zone: 'ACTION' },
  
  { id: 'REAVALIACAO', label: 'REAVALIAÇÃO', icon: <HeartPulse size={24} />, position: { x: 1090, y: 300 }, sourcePosition: 'right', targetPosition: 'left', zone: 'END' },
  { id: 'ALTA', label: 'ALTA MÉDICA', icon: <Building2 size={24} />, position: { x: 1350, y: 200 }, sourcePosition: 'right', targetPosition: 'left', zone: 'END' },
  { id: 'INTERNACAO', label: 'INTERNAÇÃO', icon: <Building2 size={24} />, position: { x: 1350, y: 400 }, sourcePosition: 'right', targetPosition: 'left', zone: 'END' },
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
      }
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
    
    // Conexões estáticas base
    const addPath = (id: string, source: string, target: string) => {
      const isVisited = !!(stepMap[source] && (stepMap[target] || target === activeStep))
      const isCurrent = target === activeStep
      
      newEdges.push({
        id,
        source,
        target,
        type: 'smoothstep',
        animated: isCurrent || (isVisited && Math.random() > 0.5), // Pulso aleatório para rastro
        style: {
          strokeWidth: isCurrent ? 4 : isVisited ? 3 : 2,
          stroke: isCurrent ? 'var(--dash-live)' : isVisited ? 'rgba(45, 224, 185, 0.4)' : '#1a1d27',
          filter: isCurrent ? 'drop-shadow(0 0 8px rgba(45, 224, 185, 0.8))' : isVisited ? 'drop-shadow(0 0 3px rgba(45, 224, 185, 0.3))' : 'none',
          opacity: isVisited || isCurrent ? 1 : 0.05,
          transition: 'all 1s ease'
        },
        markerEnd: isVisited || isCurrent ? { type: MarkerType.ArrowClosed, color: isCurrent ? 'var(--dash-live)' : 'rgba(45, 224, 185, 0.4)' } : undefined
      })
    }

    addPath('e-ent-tri', 'ENTRADA', 'TRIAGEM')
    addPath('e-tri-con', 'TRIAGEM', 'CONSULTA')

    if (stepMap['LABORATORIO'] || activeStep === 'LABORATORIO') addPath('e-con-lab', 'CONSULTA', 'LABORATORIO')
    if (stepMap['IMAGEM']      || activeStep === 'IMAGEM')      addPath('e-con-img', 'CONSULTA', 'IMAGEM')
    if (stepMap['MEDICACAO']   || activeStep === 'MEDICACAO')   addPath('e-con-med', 'CONSULTA', 'MEDICACAO')

    if (stepMap['REAVALIACAO'] || activeStep === 'REAVALIACAO') {
      if (stepMap['LABORATORIO']) addPath('e-lab-rea', 'LABORATORIO', 'REAVALIACAO')
      if (stepMap['IMAGEM'])      addPath('e-img-rea', 'IMAGEM', 'REAVALIACAO')
      if (stepMap['MEDICACAO'])   addPath('e-med-rea', 'MEDICACAO', 'REAVALIACAO')
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
  }, [activeStep, stepMap, onStepClick])

  return (
    <div className="absolute inset-0 bg-[#0B0E14] overflow-hidden">
      <style>{`
        @keyframes auroraFloat1 {
          0% { transform: translate(0px, 0px) scale(1); opacity: 0.8; }
          33% { transform: translate(8vw, -8vh) scale(1.15); opacity: 0.6; }
          66% { transform: translate(-4vw, 4vh) scale(0.95); opacity: 0.9; }
          100% { transform: translate(0px, 0px) scale(1); opacity: 0.8; }
        }
        @keyframes auroraFloat2 {
          0% { transform: translate(0px, 0px) scale(1); opacity: 0.6; }
          33% { transform: translate(-6vw, 6vh) scale(1.1); opacity: 0.9; }
          66% { transform: translate(5vw, -5vh) scale(0.9); opacity: 0.5; }
          100% { transform: translate(0px, 0px) scale(1); opacity: 0.6; }
        }
      `}</style>

      {/* Animated Subtle Background Orbs (Premium Aurora Effect) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div 
          className="absolute top-[5%] left-[5%] w-[60vw] h-[60vh] rounded-full blur-[160px]" 
          style={{ background: 'radial-gradient(circle, rgba(45,224,185,0.12) 0%, transparent 70%)', animation: 'auroraFloat1 25s ease-in-out infinite' }} 
        />
        <div 
          className="absolute bottom-[5%] right-[5%] w-[70vw] h-[70vh] rounded-full blur-[180px]" 
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', animation: 'auroraFloat2 28s ease-in-out infinite reverse' }} 
        />
        <div 
          className="absolute top-[40%] left-[40%] w-[50vw] h-[50vh] rounded-full blur-[150px]" 
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)', animation: 'auroraFloat1 35s ease-in-out infinite' }} 
        />
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 80, y: 150, zoom: 0.85 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        zoomOnPinch={false}
        panOnScroll={false}
        onNodeClick={(e, node) => {
          if (node.data?.stepData) {
            node.data.onStepClick?.(node.data.stepData);
          }
        }}
        className="[&_.react-flow\_\_pane]:!cursor-default [&_.react-flow\_\_node:hover]:!z-[1000]"
      >
        <Background color="rgba(45, 224, 185, 0.05)" gap={32} size={1.5} style={{ background: 'transparent' }} />
      </ReactFlow>
    </div>
  )
}

