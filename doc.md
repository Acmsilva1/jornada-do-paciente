# Documentação técnica — Jornada do Paciente

Este documento descreve a arquitetura, os contratos de API, o frontend e os fluxos de utilizador do dashboard de jornada clínica na PS.

---

## 1. Visão geral

O sistema é composto por:

- **Backend** Node.js + Fastify: carrega CSVs da pasta `../dados` (relativa ao processo em `backend/`), mantém estruturas em RAM e expõe REST JSON.
- **Frontend** React 18 + Vite + TypeScript: consome a API, mantém estado local, polling periódico e renderiza o mapa com **ReactFlow**.

Não há base de dados relacional no runtime: os dados são **stateless** e derivados dos ficheiros CSV.

---

## 2. Tech stack

### Frontend

| Tecnologia | Uso |
| :--- | :--- |
| React 18 | UI e estado (`useState`, `useEffect`, `useMemo`) |
| Vite | Dev server e build |
| TypeScript | Tipagem (`tsc -b` no `npm run build`) |
| Tailwind CSS | Layout e tema (tokens em `frontend/src/index.css`) |
| ReactFlow | Mapa de setores e animação do “passo ativo” |
| Lucide React | Ícones |

### Backend

| Tecnologia | Uso |
| :--- | :--- |
| Node.js + Fastify | HTTP, CORS, WebSocket (registo presente) |
| csv-parse | Leitura streaming/linha a linha dos CSV |
| TypeScript | `server.ts` (execução via `ts-node`) |

---

## 3. Backend — dados e API

### 3.1 Origem dos dados

O servidor resolve `DADOS_DIR` para `path.resolve('../dados')` a partir do diretório de trabalho habitual (`backend/`). Ficheiros relevantes (nomes usados no código):

- `tbl_tempos_entrada_consulta_saida.csv` — atendimentos principais
- `tbl_tempos_laboratorio.csv`, `tbl_tempos_medicacao.csv`, `tbl_vias_medicamentos.csv`
- `tbl_tempos_rx_e_ecg.csv`, `tbl_tempos_tc_e_us.csv`, `tbl_tempos_reavaliacao.csv`
- `meta_tempos.csv` — metas de tempo

Se um ficheiro não existir, o carregamento regista aviso e segue com lista vazia onde aplicável.

### 3.2 Endpoints REST

| Método | Caminho | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/units` | Lista ordenada de valores únicos do campo `UNIDADE` dos atendimentos |
| `GET` | `/api/patients?unit=<nome>` | **Obrigatório** `unit`. Até 200 pacientes por unidade (último atendimento por `CD_PESSOA_FISICA`), ordenados por `DT_ENTRADA` descendente |
| `GET` | `/api/journey/<NR_ATENDIMENTO>` | Jornada detalhada (passos, tempos, detalhes agregados). O router usa wildcard `*` no código para IDs com caracteres especiais |
| `GET` | `/api/metas` | Metas de tempo carregadas de `meta_tempos.csv` |

Respostas em JSON. Erros devolvem corpo JSON com `error` ou status HTTP apropriado (`400` se `unit` em falta em `/api/patients`).

### 3.3 CORS

O frontend em desenvolvimento (`http://localhost:5173`) deve conseguir chamar `http://localhost:3001`; o plugin `@fastify/cors` está registado.

---

## 4. Frontend — estrutura de ficheiros

```
frontend/src/
├── main.tsx                 # Entrada React
├── index.css                # Tokens CSS globais + Tailwind base
├── App.tsx                  # Estado global, cabeçalho, painel da fila, busca, HUD, overlay
└── components/
    ├── MapFlow.tsx          # Definição de nós/setores, edges, ReactFlow
    ├── SectorBackgroundNode.tsx  # Card por setor + tooltip (SLA, desfecho, status)
    ├── PatientWalkingNode.tsx    # Marcador animado no setor ativo
    ├── PatientQueueRow.tsx       # Linha reutilizável (ATD, prioridade, nome, hora)
    ├── StepDetailModal.tsx       # Modal ao clicar num passo com detalhe
    └── FootprintEdge.tsx         # Tipo de edge (reservado; mapa usa edges default)
```

---

## 5. Frontend — estado e fluxos principais

### 5.1 Unidades

- Lista carregada uma vez: `GET /api/units`.
- **Botões** em duas linhas ao lado do título “Jornada do Paciente” (sem dropdown).
- Ao clicar numa unidade: `selectedUnit` atualiza, pacientes são pedidos a `/api/patients?unit=...`, o **painel da fila** abre (`patientPanelOpen = true`).

### 5.2 Painel da fila (esquerda)

- Posição fixa à **esquerda** do viewport (`z-index` abaixo do header), para não sobrepor o mapa à direita.
- Largura animada: recolhido mostra só a **aba** (~`2.75rem`); expandido usa `min(22rem, calc(100vw - 1.5rem))`.
- Cabeçalho com nome da unidade; **campo de filtro** acima da lista (`panelSearchTerm`) — filtra nome ou `NR_ATENDIMENTO` em memória.
- Lista: mesmo componente visual que a busca (`PatientQueueRow`). Ao escolher paciente: `handleSelectPatient` e o painel **fecha**.
- Com paciente selecionado e painel aberto, o **HUD da timeline** desloca para a direita (`left` em `calc(...)`) para não ficar por baixo do painel.

### 5.3 Busca central (topo)

- O **dropdown** de resultados **só aparece** com texto não vazio em `searchTerm` e foco no input (`isSearchFocused`).
- Sugestões: filtro por nome ou ATD; **ordenação por relevância** (prefixo de ATD, depois contenção; nome que começa com o termo antes de nome que só contém). Limite de 50 linhas.
- Sem unidade selecionada: mensagem a pedir seleção de unidade.
- O placeholder pode mostrar o paciente atual quando aplicável; ao selecionar no dropdown, o termo é limpo e o foco fecha.

### 5.4 Polling (ETL simulado no UI)

- Um intervalo de 1 s decrementa `timeLeft`; ao chegar a zero chama `refreshData()` que:
  - Atualiza a lista de pacientes da unidade atual;
  - Se houver `selectedPatient`, atualiza a jornada via `GET /api/journey/...`.
- O header mostra contagem regressiva e hora da última atualização.

### 5.5 Troca de paciente e carregamento

- `isSwitching`: curto período ao mudar de paciente; overlay com título **“Buscando novos dados”** e sublinha **“Aguarde um instante...”**.
- Carregamento inicial da jornada (sem troca): título **“Carregando Dados”** e mensagens rotativas em `syncStatus`.

### 5.6 Mapa e status “Finalizado”

- Passos finais no modelo de fluxo: `ALTA` e `INTERNACAO`.
- No **tooltip** do setor (`SectorBackgroundNode`), para esses passos o badge deixa de usar “EM ANDAMENTO” / “CONCLUÍDO” e mostra sempre **“Finalizado”** com estilo esmeralda.
- No **header** (“Status atual”), se `activeStep` for `ALTA` ou `INTERNACAO`, o texto é **“Finalizado”**.

### 5.7 Modal de passo

- `StepDetailModal`: detalhe do passo clicado no nó; ícones e textos por tipo de passo (ver ficheiro).

---

## 6. Estilos e tema

- Cores e utilitários (`text-app-muted`, `text-dash-live`, `bg-[#1E2235]`, etc.) vivem principalmente em `frontend/src/index.css` e classes Tailwind em componentes.
- Scrollbars personalizadas: classe `custom-scrollbar` onde listas longas.

O ficheiro [css.md](css.md) no repositório descreve um pipeline de tokens mais genérico; neste projeto a referência prática é **`frontend/src/index.css`** e **`frontend/tailwind.config.mjs`**.

---

## 7. Build e qualidade

```bash
cd frontend
npm run build   # tsc -b && vite build
```

O projeto inclui `@types/node` para o alias de `path` no `vite.config.ts`.

---

## 8. Portas e URLs

| Serviço | URL padrão |
| :--- | :--- |
| API | `http://localhost:3001` |
| UI dev | `http://localhost:5173` |

O frontend usa URLs absolutas `http://localhost:3001` nas chamadas `fetch` em `App.tsx`; para outro host/porta é necessário ajustar o código ou introduzir variável de ambiente Vite (`import.meta.env`).

---

## 9. Referências cruzadas

- Regras de SLA, busca e comportamentos subtis: [agentes.md](agentes.md).
- Índice e arranque rápido: [README.md](README.md).
