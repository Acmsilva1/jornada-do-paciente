# Agentes (Cursor / automação) — Jornada do paciente

## Contexto

Monorepo **workspaces** `web` + `api`. Mapa da jornada em **`web/src/features/jornada/`** (React). Base URL da API em **`web/src/shared/lib/apiBase.ts`** (`VITE_API_URL` opcional). API Fastify em **`api/src/features/jornada/app.ts`** com **`api/src/core/paths.ts`** (pasta de dados Parquet + porta).

## Contratos

- **Não** colocar lógica de negócio nova no `api/src/index.ts` além de `start()` — estender `features/jornada`.
- Dados em `data/local/` (Parquet); override com `JORNADA_DADOS_DIR`.

## Comandos

- Raiz: `npm run dev` — `concurrently` web + api.
- `cd web && npm run dev` — Vite **5176** (`strictPort`).
- API: porta via `getApiPort()` (default **3001**).

## Testes

- `cd api && npx vitest run` — inclui `app.test.ts` contra Fastify inject.

## Checkpoint

- [ ] Novos endpoints ou WS alteram `app.ts` (ou ficheiros extraídos da feature `jornada`) e o cliente em `features/jornada` / `apiBase` se a URL mudar.
- [ ] `npx vitest run` na API verde após mudanças em rotas.
- [ ] `npm run build` no `web` verde.
- [ ] Parquet / `DADOS_DIR` documentado ou constante em `core/paths.ts` atualizado.
