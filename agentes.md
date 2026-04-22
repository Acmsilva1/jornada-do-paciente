# Checkpoint — regras de negócio e lógica crítica

Memória de contexto para manutenção humana ou assistida: decisões que não ficam óbvias só pela leitura linear do código.

---

## SLA (farol de performance)

Hierarquia aplicada nos cards de setor (`SectorBackgroundNode`), com base em tempos e metas vindas dos dados:

1. **Meta supervisão (alerta amarelo)**  
   Tempo `>= ALERTA_MIN` e `<= VALOR_MIN`. Texto: *Meta Supervisão Excedida*.

2. **Meta gerência (crítico vermelho)**  
   Tempo `> VALOR_MIN`. Texto: *Meta Gerência Excedida*.  
   Comportamento visual: pulsação / destaque vermelho no card.

3. **Precisão**  
   Tempo exatamente igual ao limite da meta não deve ser tratado como “acima da meta gerência” sem validar a regra implementada no componente (comparar operadores `>`, `>=` no código atual).

---

## Mapa da jornada (ReactFlow)

- **Espinha dorsal**: fluxo principal entre setores definidos em `MapFlow.tsx` (`SECTOR_DEFINITIONS`).
- **Arestas**: tipos `smoothstep` / `straight` com animação (`edge-pulse-main`) e cores por função (fluxo inicial, pedidos, retorno, desfecho).
- **Anti-ruído em atualização**: falhas pontuais na API não devem limpar o mapa de forma agressiva; validar `App.tsx` e efeitos que atualizam `journey` apenas quando a resposta é coerente com o paciente atual.
- **Cursor**: no canvas ReactFlow o painel usa `grab`/`grabbing`; nós e edges com cursor padrão (ver estilos injetados em `MapFlow.tsx`).

---

## Unidades e painel da fila

- Unidades vêm de `GET /api/units`; não há menu dropdown — só **botões** em duas linhas no header.
- Ao **selecionar uma unidade**, o painel **esquerdo** abre automaticamente com a fila (`GET /api/patients?unit=...`).
- O painel pode **recolher**; a aba permanece visível na borda esquerda.
- **Filtro local** (`panelSearchTerm`): filtra a lista já carregada por nome ou `NR_ATENDIMENTO`; não é o mesmo estado da busca central.
- Ao escolher um paciente na fila, o painel **fecha** para maximizar área do mapa.

---

## Busca central (header)

- O dropdown de sugestões **não** abre só com foco: exige **`searchTerm.trim().length > 0`**.
- Ordenação das sugestões: priorizar **ATD** que começa com o texto digitado, depois ATD que contém; depois **nome** que começa com o termo (case insensitive), depois nome que só contém. Máximo 50 itens.
- Sem unidade: mensagem a indicar que é preciso escolher unidade antes de haver pacientes para sugerir.

---

## Desfecho: Alta e Internação

- Nos setores **`ALTA`** e **`INTERNACAO`**, o badge de estado no **tooltip** não alterna entre “EM ANDAMENTO” e “CONCLUÍDO”: mostra sempre **“Finalizado”**, com classes Tailwind de ênfase esmeralda (`emerald`).
- No **header** (“Status atual”), quando `activeStep` é `ALTA` ou `INTERNACAO`, o rótulo é **“Finalizado”** (ver `headerStatusLabel` em `App.tsx`).

---

## Troca de paciente e overlay

- `isSwitching`: estado temporário ao mudar de paciente; overlay full-screen.
- Textos fixos nesse modo: título **“Buscando novos dados”**; linha secundária **“Aguarde um instante...”** (não usar o ciclo de `syncStatus` nesse intervalo).
- Fora da troca, com `loadingJourney`, mantém-se o título “Carregando Dados” e rotação de mensagens em `syncStatus`.

---

## Permanência e tempos

- Onde aplicável, tempos no modal e nos nós devem respeitar `time` / `endTime` / `minutes` vindos dos passos da jornada.
- **Permanência total** nos nós de desfecho: cálculo derivado dos timestamps dos passos (ver `SectorBackgroundNode` e `StepDetailModal`); tratar `null` em datas antes de `new Date(...)`.

---

## Componente `PatientQueueRow`

- Única representação visual da linha de paciente (ATD, prioridade com cores Manchester-like, nome, idade/sexo, hora de entrada, badge ALTA quando aplicável).
- Usado na **lista do painel esquerdo** e no **dropdown da busca central** para evitar divergência de estilo.

---

## Lista de pacientes por unidade (API)

- Backend devolve até **200** registos, um por `CD_PESSOA_FISICA` (última entrada), ordenados por `DT_ENTRADA` descendente. O frontend pode truncar ou filtrar na UI; a busca central limita sugestões a 50.

---

## Scrollbar

- Classe utilitária `custom-scrollbar` em listas longas (painel, dropdown) para barra fina alinhada ao tema escuro.
