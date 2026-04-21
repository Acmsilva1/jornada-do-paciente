import { useState, useEffect, useMemo } from 'react'
import MapFlow from './components/MapFlow'
import StepDetailModal from './components/StepDetailModal'
import { HeartPulse, Building2, User, Activity, AlertTriangle, ChevronDown, Clock, Stethoscope, Map as MapIcon, BarChart3, Pill, Beaker, Camera, RefreshCw, Timer, Search } from 'lucide-react'

export type PatientSummary = {
  NR_ATENDIMENTO: string;
  PACIENTE: string;
  IDADE: string;
  SEXO: string;
  PRIORIDADE: string;
  DT_ENTRADA: string;
  CD_PESSOA_FISICA: string;
}

export type JourneyStep = {
  type: 'FLOW' | 'ACTION' | 'OUTCOME';
  step: string;
  label: string;
  time: string | null;
  minutes: number | null;
  count?: number;
  detail?: any;
}

export type JourneyData = {
  NR_ATENDIMENTO: string;
  PACIENTE: string;
  IDADE: string;
  SEXO: string;
  PRIORIDADE: string;
  COR: string;
  DISCRIMINADOR: string;
  CID: string;
  GRUPO_CID: string;
  DESFECHO: string;
  UNIDADE: string;
  MEDICO_ATENDIMENTO: string;
  TURNO_ATENDIMENTO: string;
  steps: JourneyStep[];
  tempoTotalMin: number | null;
}

const COR_BADGE: Record<string, string> = {
  VERMELHO: 'bg-red-500/20 text-red-400 border-red-500/30',
  LARANJA: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  AMARELO: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  VERDE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  AZUL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  BRANCO: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
}

function fmtMin(min: number | null) {
  if (min === null || min === undefined) return '—'
  const h = Math.floor(Number(min) / 60)
  const m = Math.round(Number(min) % 60)
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

function fmtDatetime(dt: string | null) {
  if (!dt) return '—'
  try { return new Date(dt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return dt }
}

export default function App() {
  const [units, setUnits] = useState<string[]>([])
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null)
  const [journey, setJourney] = useState<JourneyData | null>(null)
  const [activeStep, setActiveStep] = useState<string>('')
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [loadingJourney, setLoadingJourney] = useState(false)
  const [selectedStep, setSelectedStep] = useState<any>(null)
  const [syncStatus, setSyncStatus] = useState<string>('Ocioso')
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutos
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  // Função central de Recarga Silenciosa (ETL Sync)
  const refreshData = async (isManual = false) => {
    if (!isManual) console.log('Iniciando sincronização automática com ETL...')
    
    // 1. Atualizar lista de pacientes em background
    if (selectedUnit) {
      fetch(`http://localhost:3001/api/patients?unit=${encodeURIComponent(selectedUnit)}`)
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setPatients(d) })
        .catch(console.error)
    }

    // 2. Atualizar jornada do paciente atual em background (se houver um selecionado)
    if (selectedPatient) {
      if (isManual) setLoadingJourney(true)
      fetch(`http://localhost:3001/api/journey/${selectedPatient.NR_ATENDIMENTO}`)
        .then(async r => {
          if (!r.ok) throw new Error(`HTTP Error ${r.status}`);
          return r.json();
        })
        .then((data: any) => {
            if (data && !data.error && Array.isArray(data.steps)) {
              // Só atualizamos o estado se houver mudança real para evitar re-renders desnecessários
              setJourney(prev => {
                if (JSON.stringify(prev?.steps) === JSON.stringify(data.steps)) return prev;
                return data as JourneyData;
              });
              
              const lastStep = data.steps[data.steps.length - 1];
              if (lastStep) setActiveStep(lastStep.step);
            }
        })
        .catch(err => {
          console.warn('Sincronização falhou (Servidor recarregando?), mantendo dados atuais:', err.message);
          // Não limpamos o estado aqui para evitar que o dado suma da tela
        })
        .finally(() => { if (isManual) setLoadingJourney(false) })
    }

    setLastUpdate(new Date())
    setTimeLeft(600)
  }

  // Cronômetro do Ciclo ETL
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          refreshData()
          return 600
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [selectedUnit, selectedPatient])

  // Alterna mensagens de carregamento para o efeito de "mensageria"
  useEffect(() => {
    if (!loadingJourney) {
      setSyncStatus('Sincronizado')
      return
    }
    const messages = ['Acessando prontuário...', 'Mapeando fluxo real...', 'Sincronizando exames...', 'Renderizando jornada...']
    let i = 0
    const interval = setInterval(() => {
      setSyncStatus(messages[i % messages.length])
      i++
    }, 400)
    return () => clearInterval(interval)
  }, [loadingJourney])

  // Carrega unidades
  useEffect(() => {
    fetch('http://localhost:3001/api/units')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setUnits(d) })
      .catch(console.error)
  }, [])

  // Carrega pacientes ao mudar unidade
  useEffect(() => {
    if (!selectedUnit) { setPatients([]); setSelectedPatient(null); setJourney(null); setActiveStep(''); return }
    setLoadingPatients(true)
    setSelectedPatient(null); setJourney(null); setActiveStep('')
    fetch(`http://localhost:3001/api/patients?unit=${encodeURIComponent(selectedUnit)}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPatients(d) })
      .catch(console.error)
      .finally(() => setLoadingPatients(false))
  }, [selectedUnit])

  // Carrega jornada real + anima os passos ao selecionar paciente
  useEffect(() => {
    if (!selectedPatient) { 
      setJourney(null); 
      setActiveStep(''); 
      setLoadingJourney(false);
      return; 
    }
    
    const isSamePatient = journey?.NR_ATENDIMENTO === selectedPatient.NR_ATENDIMENTO;
    
    if (!isSamePatient) {
      setLoadingJourney(true)
      setActiveStep('')
    }

    fetch(`http://localhost:3001/api/journey/${selectedPatient.NR_ATENDIMENTO}`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP Error ${r.status}`);
        return r.json();
      })
      .then((data: any) => {
        if (!data || data.error || !Array.isArray(data.steps)) return
        
        setJourney(data as JourneyData)
        
        // Só dispara a animação de passos se for um NOVO paciente
        if (!isSamePatient) {
          const startAnimation = () => {
            data.steps.forEach((s: JourneyStep, index: number) => {
              setTimeout(() => setActiveStep(s.step), index * 1200)
            })
          }
          const delay = isSwitching ? 2200 : 0 
          setTimeout(startAnimation, delay)
        } else {
          // Se for o mesmo paciente, apenas atualiza o passo ativo para o mais recente sem re-animar tudo
          const lastStep = data.steps[data.steps.length - 1];
          if (lastStep) setActiveStep(lastStep.step);
        }
      })
      .catch(err => {
        console.error('Falha ao carregar jornada inicial:', err);
        // Se falhou no primeiro carregamento (ex: servidor resetando), mantemos o loader ou tentamos novamente
      })
      .finally(() => setLoadingJourney(false))
  }, [selectedPatient])

  const corBadge = journey ? (COR_BADGE[journey.COR] ?? COR_BADGE.BRANCO) : ''

  // Filtragem inteligente para a busca
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients
    const s = searchTerm.toLowerCase()
    return patients.filter(p => 
      String(p.PACIENTE).toLowerCase().includes(s) || 
      String(p.NR_ATENDIMENTO).includes(s)
    ).slice(0, 50)
  }, [patients, searchTerm])

  const handleSelectPatient = (patient: any) => {
    setIsSwitching(true)
    setSelectedPatient(patient)
    setSearchTerm('')
    setIsSearchFocused(false)
    setTimeout(() => setIsSwitching(false), 2000)
  }

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-5 border-b border-app-border shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <HeartPulse className="text-dash-live" size={20} />
          <h1 className="text-base font-bold tracking-widest text-white uppercase">Jornada do Paciente</h1>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-4 space-y-4 border-b border-app-border shrink-0">
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-app-muted mb-1.5">
            <Building2 size={11} /> Unidade
          </label>
          <div className="relative">
            <select
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              className="w-full appearance-none bg-[#0B0E14] border border-app-border rounded-lg px-3 py-2.5 pr-8 text-sm text-app-fg focus:outline-none focus:border-dash-live transition-colors cursor-pointer"
            >
              <option value="">— Unidade —</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-3 text-app-muted pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-app-muted mb-1.5">
            <Search size={11} /> Pesquise e Selecione
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={selectedPatient ? `Paciente: ${selectedPatient.PACIENTE}` : "Pesquise e selecione aqui..."}
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value)
                setIsSearchFocused(true)
              }}
              onFocus={() => setIsSearchFocused(true)}
              className="w-full bg-[#0B0E14] border border-app-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-app-muted focus:outline-none focus:border-dash-live transition-all"
            />
            
            {/* Menu de Sugestões Inteligentes */}
            {isSearchFocused && (searchTerm.length > 0 || filteredPatients.length > 0) && (
              <>
                <div 
                  className="fixed inset-0 z-[100]" 
                  onClick={() => setIsSearchFocused(false)} 
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F1219]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-[101] max-h-[350px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((p: any) => (
                      <div
                        key={p.NR_ATENDIMENTO}
                        onClick={() => handleSelectPatient(p)}
                        className="group flex flex-col p-3 border-b border-white/5 hover:bg-dash-live/10 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-black text-app-muted group-hover:text-dash-live transition-colors">
                            #{p.NR_ATENDIMENTO}
                          </span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border border-white/10 ${
                            (String(p.PRIORIDADE || '').includes('AMARELO') || String(p.PRIORIDADE || '').includes('URGENTE')) && !String(p.PRIORIDADE || '').includes('POUCO') ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' : 
                            (String(p.PRIORIDADE || '').includes('VERDE') || String(p.PRIORIDADE || '').includes('POUCO')) ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                            (String(p.PRIORIDADE || '').includes('LARANJA') || String(p.PRIORIDADE || '').includes('MUITO URGENTE')) ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' :
                            (String(p.PRIORIDADE || '').includes('VERMELHO') || String(p.PRIORIDADE || '').includes('EMERG')) ? 'text-red-400 bg-red-400/10 border-red-400/20' : 
                            'text-blue-400 bg-blue-400/10 border-blue-400/20'
                          }`}>
                            {p.PRIORIDADE || 'NORMAL'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-white group-hover:translate-x-1 transition-transform truncate">
                          {p.PACIENTE}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-app-muted">{p.IDADE} • {p.SEXO}</span>
                          <span className="text-[10px] text-yellow-400 ml-auto font-mono flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(p.DT_ENTRADA).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-app-muted text-xs italic">
                      Nenhum paciente encontrado para "{searchTerm}"
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Info do Selecionado (Resumo rápido) */}
        {selectedPatient && !isSearchFocused && (
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl animate-in fade-in zoom-in-95">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-dash-live/20 flex items-center justify-center text-dash-live font-black border border-dash-live/20 uppercase">
                  {selectedPatient.PACIENTE?.substring(0,2)}
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-[10px] font-black text-dash-live uppercase tracking-widest leading-none mb-1">Selecionado</p>
                   <p className="text-sm font-bold text-white leading-tight truncate">{selectedPatient.PACIENTE}</p>
                </div>
                <button 
                  onClick={() => setSelectedPatient(null)}
                  className="text-app-muted hover:text-red-400 transition-colors"
                >
                  <Search size={14} />
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Painel de jornada */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {loadingJourney && (
          <div className="flex items-center justify-center py-10 gap-2 text-app-muted text-sm">
            <div className="animate-pulse w-2 h-2 bg-dash-live rounded-full" /> Carregando...
          </div>
        )}

        {journey && !loadingJourney && (
          <>
            <div className="bg-app-elevated border border-app-border rounded-xl p-4 shadow-xl">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-sm leading-tight truncate">{journey.PACIENTE}</h3>
                  <p className="text-[10px] text-app-muted mt-0.5">ATD #{journey.NR_ATENDIMENTO}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${corBadge}`}>
                  {journey.COR || '—'}
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-6 mt-4">
              {journey.steps.map((s, idx) => (
                <div key={`${s.step}-${idx}`} className="relative pl-6">
                  {/* Vertical Line */}
                  {idx < journey.steps.length - 1 && (
                    <div className="absolute left-1.5 top-5 bottom-[-1.5rem] w-0.5 bg-app-border" />
                  )}
                  
                  {/* Dot */}
                  <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#0B0E14] z-10 transition-all duration-500 ${
                    activeStep === s.step ? 'bg-dash-live shadow-[0_0_8px_var(--dash-live)] scale-125' : 'bg-app-border'
                  }`} />

                  <div className={`p-3 rounded-xl border transition-all ${
                    activeStep === s.step ? 'bg-white/[0.03] border-dash-live/40' : 'bg-transparent border-transparent'
                  }`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${
                        activeStep === s.step ? 'text-white' : 'text-app-muted'
                      }`}>{s.label}</span>
                      <span className="text-[10px] font-mono text-app-muted">{fmtDatetime(s.time)}</span>
                    </div>

                    {s.type === 'ACTION' && s.count && (
                      <div className="flex gap-2 mt-2">
                         {s.step === 'MEDICACAO' && <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px]"><Pill size={10}/> {s.count} Prescr.</div>}
                         {s.step === 'LABORATORIO' && <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]"><Beaker size={10}/> {s.count} Exames</div>}
                         {s.step === 'IMAGEM' && <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[10px]"><Camera size={10}/> {s.count} Imagens</div>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!journey && !loadingJourney && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
            <MapIcon size={32} className="mb-4" />
            <p className="text-xs uppercase font-bold tracking-widest leading-relaxed">Selecione um<br />Paciente</p>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-[#0B0E14] text-app-fg overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-80 border-r border-app-border flex flex-col h-full z-10 relative shrink-0"
        style={{ background: 'var(--dash-panel)' }}>
        {sidebarContent}
      </aside>

      {/* Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {!selectedPatient ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
            <User className="mb-4 text-app-muted" size={48} />
            <p className="text-white text-lg font-bold tracking-widest">NENHUM PACIENTE SELECIONADO</p>
            <p className="text-app-muted text-sm mt-2 max-w-md">Selecione um paciente na listagem lateral para desenhar o percurso clínico e mapeamento hospitalar.</p>
          </div>
        ) : (
          <>
            {/* O Key força o ReactFlow a esquecer qualquer cache de coordenada ou cache de resize ao trocar de paciente */}
            {!isSwitching && (
              <MapFlow key={selectedPatient.NR_ATENDIMENTO} activeStep={activeStep} journey={journey} onStepClick={(step) => setSelectedStep(step)} />
            )}
            
            {/* Máscara de segurança Cyberpunk (Mensageria Inteligente) */}
            {(loadingJourney || isSwitching) && (
              <div className="absolute inset-0 z-50 flex flex-col justify-center items-center bg-[#0B0E14]/90 backdrop-blur-xl transition-all duration-500">
                {/* Neon Scanning Line */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-dash-live shadow-[0_0_15px_var(--dash-live)] animate-[scan_2s_linear_infinite]" />
                
                <style>{`
                  @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                  }
                `}</style>

                <div className="relative">
                  <div className="absolute inset-0 bg-dash-live/20 blur-3xl rounded-full scale-150 animate-pulse" />
                  <Activity className="relative text-dash-live mb-6 animate-bounce" size={80} />
                </div>

                <div className="flex flex-col items-center">
                  <h2 className="text-white text-2xl font-black tracking-[0.3em] mb-2 drop-shadow-lg">
                    {isSwitching ? "SELECIONANDO NOVO PACIENTE" : selectedPatient.PACIENTE}
                  </h2>
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-dash-live animate-ping" />
                    <span className="text-dash-live font-mono text-sm tracking-widest uppercase">
                      {isSwitching ? "Sintonizando Dados Clínicos..." : syncStatus}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-dash-live shadow-[0_0_10px_var(--dash-live)] animate-[progress_1s_ease-in-out_infinite]" />
                </div>
                
                <style>{`
                  @keyframes progress {
                    0% { width: 0%; transform: translateX(-100%); }
                    50% { width: 50%; }
                    100% { width: 0%; transform: translateX(200%); }
                  }
                `}</style>
              </div>
            )}
            
            {/* Header / Floats */}
            <header className="absolute top-6 left-6 right-6 z-[60] flex justify-between pointer-events-none">
               <div className="bg-black/40 backdrop-blur-md border border-app-border px-5 py-3 rounded-2xl shadow-2xl">
                  <span className="text-[10px] text-app-muted uppercase tracking-[0.2em] font-bold block mb-1">Unidade Ativa</span>
                  <span className="text-lg font-bold text-white">{selectedUnit || 'Selecione no filtro'}</span>
               </div>

               {journey && (
                 <div className="bg-white/5 backdrop-blur-md border border-dash-live/30 px-5 py-3 rounded-2xl shadow-[0_0_20px_rgba(45,224,185,0.15)] text-right">
                    <span className="text-[10px] text-dash-live uppercase tracking-[0.2em] font-bold block mb-1">Status em Tempo Real</span>
                    <span className="text-lg font-bold text-white capitalize">{activeStep?.toLowerCase().replace('_', ' ') || 'Processando...'}</span>
                 </div>
               )}

               {/* ETL Sync Widget */}
               <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl flex items-center gap-4 pointer-events-auto">
                 <div className="flex flex-col">
                   <div className="flex items-center gap-1.5 mb-0.5">
                     <Timer size={10} className="text-app-muted" />
                     <span className="text-[9px] text-app-muted uppercase tracking-widest font-black">Próximo ETL</span>
                   </div>
                   <span className="text-white font-mono font-bold text-sm">
                     {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                   </span>
                 </div>
                 
                 <div className="h-8 w-[1px] bg-white/10" />

                 <div className="flex flex-col">
                   <div className="flex items-center gap-1.5 mb-0.5">
                     <RefreshCw size={10} className="text-dash-live/60" />
                     <span className="text-[9px] text-app-muted uppercase tracking-widest font-black">Última Sincronização</span>
                   </div>
                   <span className="text-app-muted font-mono text-[11px]">
                     {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                   </span>
                 </div>
               </div>
            </header>
          </>
        )}

        {/* Modal */}
        {selectedStep && journey && (
          <StepDetailModal
            data={{ step: selectedStep, journey }}
            onClose={() => setSelectedStep(null)}
          />
        )}
      </main>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-app-muted font-semibold uppercase tracking-tighter">{label}</p>
      <p className="font-bold text-white text-xs">{value}</p>
    </div>
  )
}
