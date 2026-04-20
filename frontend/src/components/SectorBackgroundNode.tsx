import { useState } from 'react'
import { Handle, Position } from 'reactflow'
import { Clock, MousePointerClick, CheckCircle2 } from 'lucide-react'

function fmtMin(min: number | null | undefined) {
  if (min === null || min === undefined || isNaN(Number(min))) return null
  const v = Number(min)
  const h = Math.floor(v / 60)
  const m = Math.round(v % 60)
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

function fmtTime(dt: string | null | undefined) {
  if (!dt) return null
  try {
    return new Date(dt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch { return dt }
}

export default function SectorBackgroundNode({ data }: any) {
  const [hovered, setHovered] = useState(false)
  const hasStep = !!data.stepData
  const isActive = data.active
  const isFinished = hasStep && !isActive
  
  const timeStr = hasStep ? fmtTime(data.stepData.time) : null
  const durationStr = hasStep ? fmtMin(data.stepData.minutes) : null

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: hasStep ? 'pointer' : 'default' }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0 pointer-events-none" />

      {/* Node Card - SURREAL VISUAL */}
      <div className={`
        px-4 py-6 rounded-[2rem] w-48 min-h-[140px] flex flex-col items-center justify-center
        border transition-all duration-500 relative overflow-hidden backdrop-blur-md
        ${isActive
          ? 'border-dash-live shadow-[0_0_30px_rgba(45,224,185,0.3)] bg-dash-live/10'
          : isFinished
            ? 'border-dash-live/40 bg-white/5 opacity-100 shadow-[0_0_15px_rgba(45,224,185,0.1)]'
            : 'border-app-border bg-black/40 opacity-40 grayscale-[0.5]'
        }
        ${hovered && hasStep ? 'scale-105 -translate-y-2 !opacity-100' : ''}
      `}>
        {/* Animated Background Pulse for Active */}
        {isActive && (
          <div className="absolute inset-0 bg-dash-live/10 animate-pulse pointer-events-none" />
        )}

        {/* Finished Checkmark */}
        {isFinished && (
          <div className="absolute top-3 right-3 text-dash-live drop-shadow-[0_0_5px_rgba(45,224,185,0.8)]">
            <CheckCircle2 size={16} strokeWidth={3} />
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className={`
            p-3 rounded-2xl transition-all duration-500
            ${isActive ? 'bg-dash-live text-[#0B0E14] shadow-[0_0_20px_var(--dash-live)]' : 'bg-black/20 text-[#3a3f58]'}
            ${isFinished ? 'text-dash-live !bg-dash-live/10' : ''}
          `}>
            {data.icon}
          </div>
          
          <div className="flex flex-col items-center">
            <span className={`text-[10px] font-black tracking-[0.2em] uppercase text-center transition-colors mb-1 ${
              isActive || isFinished ? 'text-white' : 'text-[#4B5263]'
            }`}>
              {data.label}
            </span>
            
            {/* Status Indicator */}
            <div className={`h-1 w-8 rounded-full transition-all duration-500 ${
              isActive ? 'bg-dash-live w-12' : isFinished ? 'bg-dash-live/40' : 'bg-transparent'
            }`} />
          </div>

          {/* Time badge */}
          {(isActive || isFinished) && timeStr && (
            <div className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all
              ${isActive ? 'bg-dash-live/20 border-dash-live/40' : 'bg-black/40 border-white/10'}
            `}>
              <Clock size={10} className={isActive ? 'text-dash-live' : 'text-app-muted'} />
              <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-dash-live' : 'text-app-muted'}`}>
                {timeStr}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tooltip Surreal */}
      {hovered && hasStep && (
        (() => {
          const openLeft = (data.xPos ?? 250) >= 400;
          const isBottom = (data.yPos ?? 0) >= 700;
          
          const verticalPos = isBottom ? 'bottom-0' : 'top-1/2 -translate-y-1/2';
          const arrowVerticalPos = isBottom ? 'bottom-[60px]' : 'top-1/2 -translate-y-1/2';

          const posClass = openLeft 
            ? `right-full mr-4 ${verticalPos} slide-in-from-right-2`
            : `left-full ml-4 ${verticalPos} slide-in-from-left-2`;

          const arrowClass = openLeft
            ? `absolute -right-[8px] ${arrowVerticalPos} border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[8px] border-l-dash-live/30`
            : `absolute -left-[8px] ${arrowVerticalPos} border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[8px] border-r-dash-live/30`;

          const stepKey = data.stepData?.step || '';

          const getHexFromCor = (corName: string) => {
            if (!corName) return '#4B5263';
            const c = corName.toUpperCase();
            if (c.includes('VERMELHO') || c.includes('EMERG')) return '#EF4444';
            if (c.includes('LARANJA') || c.includes('MUITO URGENTE')) return '#F97316';
            if (c.includes('AMARELO') || c.includes('URGENTE')) return '#EAB308';
            if (c.includes('VERDE') || c.includes('POUCO URG')) return '#22C55E';
            if (c.includes('AZUL') || c.includes('NAO URG')) return '#3B82F6';
            return '#4B5263';
          }

          return (
            <div className={`absolute z-50 pointer-events-none animate-in fade-in duration-300 ${posClass}`}>
              <div className={arrowClass} />
              
              <div className="bg-[#0B0E14]/90 backdrop-blur-xl border border-dash-live/30 rounded-2xl px-5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[220px]">
                
                {/* Cabeçalho */}
                <div className="flex items-center justify-between gap-4 mb-3 pb-2 border-b border-white/10">
                  <p className="font-black text-[11px] text-dash-live uppercase tracking-[0.2em]">{data.label}</p>
                  <div className={`px-2 py-0.5 rounded text-[9px] font-bold border ${isActive ? 'bg-dash-live/10 text-dash-live border-dash-live/20' : 'bg-white/5 text-app-muted border-white/10'}`}>
                    {isActive ? 'EM ANDAMENTO' : 'CONCLUÍDO'}
                  </div>
                </div>
                
                {/* Dados Específicos por Setor */}
                <div className="space-y-3 mb-3">
                  
                  {/* TRIAGEM */}
                  {stepKey === 'TRIAGEM' && data.journey && (
                     <div className="p-2.5 bg-white/[0.02] rounded-lg border border-white/5 border-l-2" style={{ borderLeftColor: getHexFromCor(data.journey.COR) }}>
                       <span className="text-[8px] text-app-muted uppercase tracking-widest font-black block mb-1">Classificação de Risco:</span>
                       <div className="flex items-center gap-2">
                         <span className="text-[11px] font-bold text-white capitalize">{data.journey.PRIORIDADE || data.journey.COR}</span>
                       </div>
                       {data.journey.DISCRIMINADOR && (
                         <div className="mt-1 text-[10px] text-white/60 italic leading-tight">"{data.journey.DISCRIMINADOR}"</div>
                       )}
                     </div>
                  )}

                  {/* CONSULTA */}
                  {stepKey === 'CONSULTA' && data.journey && (
                     <div className="p-2.5 bg-white/[0.02] rounded-lg border border-white/5 space-y-2">
                       <div>
                         <span className="text-[8px] text-app-muted uppercase tracking-widest font-black block mb-0.5">Médico Responsável:</span>
                         <span className="text-[11px] font-bold text-white truncate max-w-[180px] block" title={data.journey.MEDICO_ATENDIMENTO}>{data.journey.MEDICO_ATENDIMENTO || 'Não informado'}</span>
                       </div>
                       {(data.journey.CD_CID || data.journey.CID) && (
                         <div className="border-t border-white/5 pt-2">
                           <span className="text-[8px] text-app-muted uppercase tracking-widest font-black block mb-0.5">Diagnóstico (CID):</span>
                           <span className="text-[10px] text-dash-live/90 font-medium leading-tight block">[{data.journey.CD_CID}] {data.journey.CID}</span>
                         </div>
                       )}
                     </div>
                  )}

                  {/* APOIO DIAG E TERAPEUTICO */}
                  {(stepKey === 'LABORATORIO' || stepKey === 'IMAGEM' || stepKey === 'MEDICACAO' || stepKey === 'REAVALIACAO') && (
                     <>
                       {Array.isArray(data.stepData?.detail) && data.stepData.detail.length > 0 ? (
                         <div className="p-2 bg-white/[0.02] rounded-lg border border-white/5">
                           <span className="text-[8px] text-app-muted uppercase tracking-widest font-black block mb-1.5">
                             {stepKey === 'MEDICACAO' ? 'Medicamentos Check:' : (stepKey === 'REAVALIACAO' ? 'Reavaliações:' : 'Exames Solicitados:')}
                           </span>
                           <div className="space-y-1.5">
                             {data.stepData.detail.slice(0, 3).map((item: any, i: number) => (
                               <div key={i} className="flex items-center justify-between gap-2 text-[10px]">
                                 <span className="text-white/90 truncate max-w-[130px] font-medium" title={item.name}>• {item.name || item}</span>
                                 {/* {item.time && <span className="text-dash-live/60 font-mono text-[9px] shrink-0">{fmtTime(item.time)}</span>}  -- removido horario de cada item para nao duplicar com o tempo do card */}
                               </div>
                             ))}
                             {data.stepData.detail.length > 3 && (
                               <div className="text-[9px] text-dash-live/80 font-bold pt-1 text-center border-t border-white/5 mt-1">
                                 + {data.stepData.detail.length - 3} item(ns)
                               </div>
                             )}
                           </div>
                         </div>
                       ) : (
                         <div className="text-[10px] text-white/30 italic p-2 bg-white/[0.01] border border-white/5 rounded-lg text-center">Nenhum registro...</div>
                       )}
                     </>
                  )}

                  {/* DESFECHO (ALTA/INTERNACAO) */}
                  {(stepKey === 'ALTA' || stepKey === 'INTERNACAO') && data.journey && (
                     <div className="p-2.5 bg-white/[0.02] rounded-lg border border-white/5 space-y-2 border-l-2 border-l-dash-live">
                       <div>
                         <span className="text-[8px] text-app-muted uppercase tracking-widest font-black block mb-0.5">Desfecho Clínico:</span>
                         <span className="text-[11px] font-bold text-white uppercase">{data.journey.DESFECHO || data.journey.ALTA_HOSPITALAR || data.journey.DESTINO || 'Não Lançado'}</span>
                       </div>
                       {(data.journey.MEDICO_DESFECHO || data.journey.MEDICO_ALTA) && (
                         <div className="border-t border-white/5 pt-2">
                           <span className="text-[8px] text-app-muted uppercase tracking-widest font-black block mb-0.5">Assinado por:</span>
                           <span className="text-[10px] text-white/90 font-medium truncate block max-w-[180px]">{data.journey.MEDICO_ALTA || data.journey.MEDICO_DESFECHO}</span>
                         </div>
                       )}
                     </div>
                  )}
                  
                  {/* FOOTER: Tempos */}
                  <div className="flex items-center justify-between px-1 pt-1 bg-black/20 rounded py-1.5 border border-black/40">
                    <div className="flex flex-col px-2">
                      <span className="text-[8px] text-app-muted uppercase tracking-widest font-black mb-0.5">Início:</span>
                      <span className="text-white font-mono font-bold text-[11px]">{timeStr || '--:--'}</span>
                    </div>
                    {data.stepData?.endTime && (
                      <div className="flex flex-col text-right px-2 border-l border-white/5">
                        <span className="text-[8px] text-dash-live/60 uppercase tracking-widest font-black mb-0.5">Fim:</span>
                        <span className="text-dash-live font-mono font-bold text-[11px]">{fmtTime(data.stepData.endTime)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="pt-2 border-t border-white/5 flex items-center justify-center gap-2 text-[9px] text-dash-live/80 font-bold uppercase tracking-tighter cursor-pointer hover:text-dash-live transition-colors">
                  <MousePointerClick size={12} />
                  <span>Clique p/ Detalhes Completos</span>
                </div>
              </div>
            </div>
          )
        })()
      )}

      <Handle type="source" position={Position.Bottom} className="opacity-0 pointer-events-none" />
    </div>
  )
}
