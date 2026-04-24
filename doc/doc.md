# Documentação técnica — Jornada do Paciente

Este documento descreve a arquitetura, os contratos de API, a web e os fluxos de utilizador do dashboard de jornada clínica na PS.

Para o **desenho alvo** de repositório (`api` / `web`), pipeline de dados e DevOps, ver [docs/PIPELINE_E_ARQUITETURA.md](../docs/PIPELINE_E_ARQUITETURA.md).

As pastas antigas **`frontend/`** e **`backend/`** não fazem parte do layout actual (foram removidas após a migração). Ver [docs/PASTAS_LEGACY.md](../docs/PASTAS_LEGACY.md) para checklist de remoção segura e recuperação via `git`.

---

## 1. Visão geral

O sistema é composto por:

- **API** (`api/`): Node.js + Fastify, DuckDB em memória, leitura de **Parquet** em `data/local/` (ou `JORNADA_DADOS_DIR`), estruturas em RAM e REST JSON.
- **Web** (`web/`): React 18 + Vite + TypeScript, consome a API, polling e mapa **ReactFlow** (`web/src/features/jornada/`).

Não há base de dados relacional no runtime: os dados são **stateless** e derivados dos ficheiros **Parquet**.

---

## 2. Tech stack

### Frontend

| Tecnologia | Uso |
| :--- | :--- |
| React 18 | UI e estado (`useState`, `useEffect`, `useMemo`) |
| Vite | Dev server e build |
| TypeScript | Tipagem (`tsc -b` no `npm run build`) |
| Tailwind CSS | Layout e tema (tokens em `web/src/index.css`) |
| ReactFlow | Mapa de setores e animação do “passo ativo” |
| Lucide React | Ícones |

### Backend

| Tecnologia | Uso |
| :--- | :--- |
| Node.js + Fastify | HTTP, CORS, WebSocket (registo presente) |
| duckdb | Leitura `read_parquet` e agregações sobre ficheiros locais |
| TypeScript | `api/src/features/jornada/app.ts` (entrada via `api/src/index.ts` + `ts-node`) |

---

## 3. Backend — dados e API

### 3.1 Origem dos dados

O servidor resolve `DADOS_DIR` para `data/local/` na raiz do repositório (ou o caminho absoluto em `JORNADA_DADOS_DIR`). Ficheiros relevantes (Parquet):

- `tbl_tempos_entrada_consulta_saida.parquet` — atendimentos principais
- `tbl_tempos_laboratorio.parquet`, `tbl_tempos_medicacao.parquet`, `tbl_vias_medicamentos.parquet`
- `tbl_tempos_rx_e_ecg.parquet`, `tbl_tempos_tc_e_us.parquet`, `tbl_tempos_reavaliacao.parquet`
- `meta_tempos.parquet` — metas de tempo

Se um ficheiro não existir, o carregamento regista aviso e segue com lista vazia onde aplicável.

### 3.2 Endpoints REST

| Método | Caminho | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/units` | Lista ordenada de valores únicos do campo `UNIDADE` dos atendimentos |
| `GET` | `/api/patients?unit=<nome>` | **Obrigatório** `unit`. Até 200 pacientes por unidade (último atendimento por `CD_PESSOA_FISICA`), ordenados por `DT_ENTRADA` descendente |
| `GET` | `/api/journey/<NR_ATENDIMENTO>` | Jornada detalhada (passos, tempos, detalhes agregados). O router usa wildcard `*` no código para IDs com caracteres especiais |
| `GET` | `/api/metas` | Metas de tempo carregadas de `meta_tempos.parquet` |

Respostas em JSON. Erros devolvem corpo JSON com `error` ou status HTTP apropriado (`400` se `unit` em falta em `/api/patients`).

### 3.3 CORS

A web em desenvolvimento (`http://localhost:5173`) deve conseguir chamar `http://localhost:3001`; o plugin `@fastify/cors` está registado.

---

## 4. Web — estrutura de ficheiros

```
web/src/
├── main.tsx                 # Entrada React
├── index.css                # Tokens CSS globais + Tailwind base
├── vite-env.d.ts            # Tipos `import.meta.env` (Vite)
├── shared/                  # Hooks/UI partilhados (a expandir)
└── features/jornada/
    ├── App.tsx              # Estado global, cabeçalho, fila, busca, HUD, overlay
    ├── apiBase.ts           # Base URL da API (`VITE_API_URL`)
    └── components/
        ├── MapFlow.tsx
        ├── SectorBackgroundNode.tsx
        ├── PatientWalkingNode.tsx
        ├── PatientQueueRow.tsx
        ├── StepDetailModal.tsx
        └── FootprintEdge.tsx
```

---

## 5. Web — estado e fluxos principais

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

- Overlay de carregamento ligado a `loadingJourney` (fetch da jornada); título **“Carregando jornada”** e `syncStatus` rotativo.
- Troca de paciente cancela pedidos anteriores (`cancelled` no efeito) para não sobrescrever dados nem fechar o loading no momento errado.

### 5.6 Mapa e status “Finalizado”

- Passos finais no modelo de fluxo: `ALTA` e `INTERNACAO`.
- No **tooltip** do setor (`SectorBackgroundNode`), para esses passos o badge deixa de usar “EM ANDAMENTO” / “CONCLUÍDO” e mostra sempre **“Finalizado”** com estilo esmeralda.
- No **header** (“Status atual”), se `activeStep` for `ALTA` ou `INTERNACAO`, o texto é **“Finalizado”**.

### 5.7 Modal de passo

- `StepDetailModal`: detalhe do passo clicado no nó; ícones e textos por tipo de passo (ver ficheiro).

---

## 6. Estilos e tema

- Cores e utilitários (`text-app-muted`, `text-dash-live`, `bg-[#1E2235]`, etc.) vivem principalmente em `web/src/index.css` e classes Tailwind em componentes.
- Scrollbars personalizadas: classe `custom-scrollbar` onde listas longas.

A referência prática de tokens e Tailwind é **`web/src/index.css`** e **`web/tailwind.config.mjs`**.

---

## 7. Build e qualidade

```bash
cd web   # ou na raiz: npm run build
npm run build   # tsc -b && vite build
```

O projeto inclui `@types/node` para o alias de `path` no `vite.config.ts`.

---

## 8. Portas e URLs

| Serviço | URL padrão |
| :--- | :--- |
| API | `http://localhost:3001` |
| UI dev | `http://localhost:5173` |

A web usa `API_BASE` em `web/src/features/jornada/apiBase.ts` (por defeito `http://localhost:3001`; sobrescrever com `VITE_API_URL`).

---

## 9. Referências cruzadas

- Regras de SLA, busca e comportamentos subtis: [agentes.md](agentes.md).
- Índice e arranque rápido: [README.md](README.md).
