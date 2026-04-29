# Jornada do Paciente

Dashboard em tempo real para visualizar a jornada do atendimento na Pronto-Socorro: fila por unidade, busca de pacientes e mapa de fluxo (ReactFlow) com etapas, tempos e desfechos.

## Documentação

| Documento | Conteúdo |
| :--- | :--- |
| [docs/PIPELINE_E_ARQUITETURA.md](docs/PIPELINE_E_ARQUITETURA.md) | Árvore `api`/`web`, pipeline de dados e CI/CD (alinhado às skills) |
| [docs/PASTAS_LEGACY.md](docs/PASTAS_LEGACY.md) | Histórico: pastas `frontend/` e `backend/` removidas; checklist de remoção segura |
| [doc/doc.md](doc/doc.md) | Arquitetura, API, web, fluxos de UX e build |
| [agentes.md](agentes.md) | Regras de negócio, SLA e decisões para manutenção assistida por IA |
| [agents.md](agents.md) | Arquitetura `web/src/features` + `api/src/features` / `core`, comandos e **Checkpoint** para Cursor |

## Requisitos

- Node.js 18+ (recomendado LTS)
- Pasta `data/local/` com os Parquet esperados pela API (ou `JORNADA_DADOS_DIR`; ver [doc/doc.md](doc/doc.md))

## Como executar

Na **raiz** do repositório (uma vez: `npm install`).

1. **API + Web em desenvolvimento:**

   ```bash
   npm run dev
   ```

2. **Só API** (porta `3001`, pasta de dados por defeito `data/local/`):

   ```bash
   npm run dev:api
   ```

3. **Só Web** (porta **`5176`** `strictPort`, `VITE_API_URL` opcional):

   ```bash
   npm run dev:web
   ```

4. **Build de produção (web):**

   ```bash
   npm run build
   ```

## Qualidade (lint, testes, typecheck)

Na raiz, após `npm install`:

| Comando | O que faz |
| :--- | :--- |
| `npm run lint` | ESLint na workspace `web` (avisos de `any` e hooks são esperados até refinar tipos). |
| `npm test` | Vitest na `api` — rotas com `fastify.inject` (sem abrir porta). |
| `npm run typecheck -w api` | `tsc --noEmit` na API. |
| `npm run check` | Encadeia: `lint` → `test` → `typecheck` (api) → `build` (web). |

**Logs típicos:** os testes da API imprimem linhas JSON do logger do Fastify (`incoming request`, `request completed`); é normal. O aviso *«The CJS build of Vite's Node API is deprecated»* vem do Vitest 3 e pode ser ignorado ou silenciado numa futura actualização do Vitest/Vite.

## Estrutura do repositório

```
jornada-do-paciente/
├── api/                 # Backend Fastify + DuckDB (workspace npm)
├── web/                 # React + Vite + TypeScript + Tailwind + ReactFlow
├── data/local/          # Parquet de entrada (nome sem espaços)
├── docs/                # Pipeline, arquitetura alvo
├── doc/                 # Documentação técnica (doc/doc.md)
├── infra/               # env.example, Docker (a expandir)
├── scripts/             # Automação / ETL (a expandir)
├── package.json         # workspaces: api, web
├── agentes.md
└── README.md
```

## Funcionalidades (resumo)

- Seleção de **unidade** por botões fixos no cabeçalho (duas linhas).
- **Painel esquerdo** com a fila da unidade: abre ao escolher a unidade, pode recolher; filtro local por nome ou ATD acima da lista.
- **Busca central** no topo: lista de sugestões só após digitar; ordenação por relevância (ATD/nome).
- **Mapa da jornada** após selecionar um paciente; timeline à esquerda (desloca quando o painel da fila está aberto).
- **Alta** e **Internação**: status apresentado como **Finalizado** no mapa e no indicador “Status atual” do topo.

## Licença

Uso interno / conforme política da organização proprietária do código.
