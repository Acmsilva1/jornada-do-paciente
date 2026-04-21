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
  DT_ALTA?: string;
  DT_DESFECHO?: string;
  CD_PESSOA_FISICA: string;
}

export type JourneyStep = {
  type: 'FLOW' | 'ACTION' | 'OUTCOME';
  step: string;
  label: string;
  time: string | null;
  endTime?: string | null;
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
        .then(async r => r.json())
        .then((data: any) => {
            if (data && !data.error && Array.isArray(data.steps)) {
              setJourney(data as JourneyData);
              const lastStep = data.steps[data.steps.length - 1];
              if (lastStep) setActiveStep(lastStep.step);
            }
        })
        .catch(console.error)
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
    // Não limpamos o patient/journey aqui imediatamente para evitar o "flash" se o usuário estiver navegando rápido
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
    
    // SÓ MOSTRAMOS O LOADER SE O PACIENTE MUDOU
    if (!isSamePatient) {
      setLoadingJourney(true)
      setJourney(null) // Limpa para o novo
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

  // Removido sidebarContent para integração direta no layout principal

  return (
    <div className="flex h-screen bg-[#0B0E14] text-app-fg overflow-hidden font-sans">
      {/* Sidebar Removida - Agora tudo é sobreposição (overlap) */}

      {/* Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Header / Floats - Navbar Unificada no Topo */}
        <header className="absolute top-6 left-6 right-6 z-[60] flex items-center justify-between gap-4 pointer-events-none">
           {/* Brand & Unidade */}
           <div className="flex items-center gap-3 pointer-events-auto">
              <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-dash-live/20 flex items-center justify-center text-dash-live border border-dash-live/30">
                  <HeartPulse size={24} />
                </div>
                <div>
                   <h1 className="text-xs font-black tracking-widest text-white uppercase leading-none mb-1">Jornada do Paciente</h1>
                   <div className="relative">
                      <select
                        value={selectedUnit}
                        onChange={e => setSelectedUnit(e.target.value)}
                        className="appearance-none bg-transparent border-none p-0 pr-4 text-[11px] font-bold text-dash-live uppercase tracking-widest focus:outline-none cursor-pointer"
                      >
                        <option value="" className="bg-[#0B0E14]">Escolher Unidade</option>
                        {units.map(u => <option key={u} value={u} className="bg-[#0B0E14] uppercase">{u}</option>)}
                      </select>
                      <ChevronDown size={10} className="absolute right-0 top-1 text-dash-live pointer-events-none" />
                   </div>
                </div>
              </div>
           </div>

           {/* Busca Centralizada */}
           <div className="flex-1 max-w-xl pointer-events-auto">
              <div className="relative group">
                <div className="absolute inset-0 bg-dash-live/5 blur-xl group-focus-within:bg-dash-live/15 transition-all rounded-full" />
                <div className="relative flex items-center bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 hover:border-dash-live/30 focus-within:border-dash-live transition-all">
                   <Search size={18} className="text-app-muted mr-3" />
                   <input
                     type="text"
                     placeholder={selectedPatient ? `Paciente: ${selectedPatient.PACIENTE}` : "Pesquise por nome ou atendimento..."}
                     value={searchTerm}
                     onChange={e => {
                       setSearchTerm(e.target.value)
                       setIsSearchFocused(true)
                     }}
                     onFocus={() => setIsSearchFocused(true)}
                     className="w-full bg-transparent text-sm text-white placeholder:text-app-muted focus:outline-none"
                   />
                   {selectedPatient && (
                      <button 
                        onClick={() => setSelectedPatient(null)}
                        className="ml-2 p-1.5 rounded-lg bg-white/5 text-app-muted hover:text-red-400 transition-colors"
                      >
                        <Activity size={14} />
                      </button>
                   )}
                </div>

                {/* Dropdown de Busca */}
                {isSearchFocused && (searchTerm.length > 0 || filteredPatients.length > 0) && (
                  <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsSearchFocused(false)} />
                    <div className="absolute top-full left-0 right-0 mt-3 bg-[#0F1219]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-[101] max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300 custom-scrollbar">
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((p: any) => (
                          <div
                            key={p.NR_ATENDIMENTO}
                            onClick={() => handleSelectPatient(p)}
                            className="group flex flex-col p-4 border-b border-white/5 hover:bg-dash-live/10 cursor-pointer transition-all"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-black text-dash-live tracking-widest font-mono">
                                ATD #{p.NR_ATENDIMENTO}
                              </span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded border border-white/10 ${
                                (String(p.PRIORIDADE || '').includes('AMARELO') || String(p.PRIORIDADE || '').includes('URGENTE')) && 
                                !String(p.PRIORIDADE || '').includes('POUCO') && 
                                !String(p.PRIORIDADE || '').includes('NÃO') ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' : 
                                (String(p.PRIORIDADE || '').includes('VERDE') || String(p.PRIORIDADE || '').includes('POUCO')) ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                                (String(p.PRIORIDADE || '').includes('LARANJA') || String(p.PRIORIDADE || '').includes('MUITO URGENTE')) ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' :
                                (String(p.PRIORIDADE || '').includes('VERMELHO') || String(p.PRIORIDADE || '').includes('EMERG')) ? 'text-red-400 bg-red-400/10 border-red-400/20' : 
                                'text-blue-400 bg-blue-400/10 border-blue-400/20'
                              }`}>
                                {String(p.PRIORIDADE || '').toUpperCase().includes('NORMAL') ? 'NÃO URGENTE' : (p.PRIORIDADE || 'NÃO URGENTE')}
                              </span>
                            </div>
                            <span className="text-base font-bold text-white group-hover:translate-x-2 transition-transform truncate">
                              {p.PACIENTE}
                            </span>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-app-muted">{p.IDADE} • {p.SEXO}</span>
                              <div className="ml-auto flex items-center gap-3">
                                {p.DT_ALTA && p.DT_ALTA !== 'NULL' && (
                                  <span className="text-[8px] font-black px-2 py-0.5 rounded bg-red-500 text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                                    ALTA
                                  </span>
                                )}
                                <span className="text-xs text-yellow-400/70 flex items-center gap-1.5 font-mono">
                                  <Clock size={12} />
                                  {new Date(p.DT_ENTRADA).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-10 text-center text-app-muted text-sm italic">
                          Busca sem resultados para "{searchTerm}"
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
           </div>

           {/* Sync & Status */}
           <div className="flex items-center gap-3 pointer-events-auto">
              {journey && (
                <div className="bg-white/5 backdrop-blur-md border border-dash-live/30 px-5 py-2.5 rounded-2xl shadow-[0_0_20px_rgba(45,224,185,0.15)] text-right hidden lg:block">
                   <span className="text-[9px] text-dash-live uppercase tracking-[0.2em] font-black block mb-0.5">Status Atual</span>
                   <span className="text-sm font-bold text-white uppercase">{activeStep?.toLowerCase().replace('_', ' ') || 'Processando...'}</span>
                </div>
              )}

              <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-5">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 mb-0.5 text-app-muted">
                    <Timer size={10} />
                    <span className="text-[9px] uppercase tracking-widest font-black">Próximo ETL</span>
                  </div>
                  <span className="text-white font-mono font-bold text-sm leading-none">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                
                <div className="h-8 w-[1px] bg-white/10" />

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 mb-0.5 text-dash-live/60">
                    <RefreshCw size={10} />
                    <span className="text-[9px] text-app-muted uppercase tracking-widest font-black">Última Atualização</span>
                  </div>
                  <span className="text-app-muted font-mono text-[11px] leading-none">
                    {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
           </div>
        </header>

        {/* HUD Flutuante de Jornada (Apenas quando selecionado) */}
        {selectedPatient && (
          <aside className="absolute top-28 left-6 bottom-6 w-64 z-50 flex flex-col pointer-events-none animate-in fade-in slide-in-from-left-6 duration-700">
             {/* Card do Paciente */}
             <div className="pointer-events-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col h-full shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
               
               {/* Resumo no HUD */}
               <div className="p-5 border-b border-white/5 bg-white/5">
                 <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black border uppercase shadow-lg ${corBadge}`}>
                      {selectedPatient.PACIENTE?.substring(0,2)}
                    </div>
                    <div className="min-w-0">
                       <h3 className="text-base font-bold text-white truncate leading-tight">{selectedPatient.PACIENTE}</h3>
                       <p className="text-[10px] text-app-muted uppercase tracking-widest font-black mt-1">ATD #{selectedPatient.NR_ATENDIMENTO}</p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                       <p className="text-[9px] text-app-muted uppercase font-black mb-0.5">Prioridade</p>
                       <p className={`text-[10px] font-bold uppercase ${journey?.COR === 'VERMELHO' ? 'text-red-400' : 'text-dash-live'}`}>
                        {journey?.COR || 'Normal'}
                       </p>
                    </div>
                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                       <p className="text-[9px] text-app-muted uppercase font-black mb-0.5">Entrada</p>
                       <p className="text-[10px] font-bold text-white whitespace-nowrap">
                        {fmtDatetime(selectedPatient.DT_ENTRADA)}
                       </p>
                    </div>
                 </div>
               </div>

               {/* Timeline no HUD */}
               <div className="flex-1 overflow-y-auto p-5 custom-scrollbar relative">
                 {loadingJourney && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
                       <div className="flex flex-col items-center gap-3">
                          <Activity className="text-dash-live animate-spin" size={24} />
                          <span className="text-[10px] text-dash-live font-black uppercase tracking-widest">Sincronizando...</span>
                       </div>
                    </div>
                 )}

                 <div className="space-y-6">
                    {journey?.steps.map((s, idx) => (
                      <div key={`${s.step}-${idx}`} className="relative pl-7">
                        {/* Linha Vertical */}
                        {idx < journey.steps.length - 1 && (
                          <div className="absolute left-[7px] top-5 bottom-[-1.5rem] w-px bg-white/10" />
                        )}
                        
                        {/* Ponto na timeline */}
                        <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-[#0B0E14] z-10 transition-all duration-500 ${
                          activeStep === s.step ? 'bg-dash-live shadow-[0_0_12px_rgba(45,224,185,0.6)] scale-110' : 'bg-white/10'
                        }`} />

                        <div className={`p-3 rounded-2xl border transition-all duration-500 ${
                          activeStep === s.step ? 'bg-white/10 border-dash-live/40 shadow-lg' : 'bg-transparent border-transparent opacity-60'
                        }`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${
                              activeStep === s.step ? 'text-white' : 'text-app-muted'
                            }`}>{s.label}</span>
                            <span className="text-[9px] font-mono text-app-muted">{fmtDatetime(s.time)}</span>
                          </div>

                          {s.type === 'ACTION' && s.count && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                               {s.step === 'MEDICACAO' && <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 text-[9px] font-bold"><Pill size={11}/> {s.count} Presc.</div>}
                               {s.step === 'LABORATORIO' && <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 text-[9px] font-bold"><Beaker size={11}/> {s.count} Exames</div>}
                               {s.step === 'IMAGEM' && <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-400 text-[9px] font-bold"><Camera size={11}/> {s.count} Imagens</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                 </div>
               </div>

             </div>
          </aside>
        )}

        {/* Home / No Patient State */}
        {!selectedPatient ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="relative mb-8">
               <div className="absolute inset-0 bg-dash-live/10 blur-[100px] rounded-full scale-150 animate-pulse" />
               <div className="relative w-32 h-32 rounded-3xl bg-black/40 backdrop-blur-md border border-white/5 flex items-center justify-center shadow-2xl">
                  <MapIcon className="text-dash-live/40" size={64} />
               </div>
            </div>
            <h2 className="text-white text-3xl font-black tracking-[0.2em] uppercase mb-4 drop-shadow-2xl">
               Nenhum Paciente Selecionado
            </h2>
            <p className="text-app-muted text-base max-w-lg leading-relaxed px-6">
               Utilize a central de busca no topo para localizar um atendimento e desenhar o percurso clínico em tempo real.
            </p>
          </div>
        ) : (
          <>
            {!isSwitching && (
              <MapFlow key={selectedPatient.NR_ATENDIMENTO} activeStep={activeStep} journey={journey} onStepClick={(step) => setSelectedStep(step)} />
            )}
            
            {/* Máscara de segurança Cyberpunk */}
            {(loadingJourney || isSwitching) && (
              <div className="absolute inset-0 z-[100] flex flex-col justify-center items-center bg-[#0B0E14]/95 backdrop-blur-2xl transition-all duration-700">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-dash-live shadow-[0_0_20px_var(--dash-live)] animate-[scan_2.5s_linear_infinite]" />
                
                <style>{`
                  @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                  }
                `}</style>

                <Activity className="text-dash-live mb-8 animate-pulse shadow-[0_0_30px_rgba(45,224,185,0.4)]" size={100} />

                <div className="flex flex-col items-center gap-4">
                  <h2 className="text-white text-3xl font-black tracking-[0.4em] drop-shadow-2xl uppercase">
                    {isSwitching ? "Sintonizando Fluxo" : "Carregando Dados"}
                  </h2>
                  <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-xl">
                    <div className="w-2 h-2 rounded-full bg-dash-live animate-ping" />
                    <span className="text-dash-live font-mono text-sm tracking-[0.2em] uppercase font-bold">
                       {syncStatus}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-20 w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-dash-live shadow-[0_0_15px_var(--dash-live)] animate-[progress_1.5s_ease-in-out_infinite]" />
                </div>
                
                <style>{`
                  @keyframes progress {
                    0% { width: 0%; transform: translateX(-100%); }
                    50% { width: 60%; }
                    100% { width: 0%; transform: translateX(200%); }
                  }
                `}</style>
              </div>
            )}
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
