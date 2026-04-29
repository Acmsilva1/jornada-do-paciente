# Mudança de arquitetura — pastas por *features* + camadas na API

Este documento define o **alvo de organização** alinhado ao padrão usado em projetos como *command-center-web*: **feature slices** no frontend e na API, com **rotas → controllers → services → repositories** dentro de cada feature, e código partilhado em `shared` / `core`.

## Referência de pastas (alvo)

```
jornada do paciente/
  web/src/
    features/<nome-da-feature>/
      components/
      hooks/
      lib/
    shared/
      components/
      lib/
  api/src/
    features/<nome-da-feature>/
      routes/ ou <nome>Routes.ts
      controllers/
      services/
      repositories/
      app.ts            # composição Fastify/Express desta feature
    core/
    config/
```

**Regras:**

- Hoje existe `features/jornada` no web e na API — **expandir** esse padrão quando surgirem novos módulos (ex.: `auth`, `relatorios`): cada um com a sua pasta e camadas na API.
- `api/src/index.ts` deve apenas **compor** features (registo de plugins/rotas), sem regra de negócio.

## Situação atual neste repositório

**Web:** `features/jornada/` + `shared/lib/apiBase.ts` (URL base da API). **API:** `features/jornada/app.ts` + **`api/src/core/paths.ts`** (porta e pasta de dados). **Opcional:** partir `app.ts` em `routes/` + `services/` quando o ficheiro crescer de novo.

## Etapas do processo (checklist)

1. **Rever a feature `jornada`** — Separar em `controllers` / `services` / `repositories` na API se ainda não existir.
2. **Barrel e limites** — `features/jornada/index.ts` (ou equivalente) exporta apenas o necessário ao router principal.
3. **Novas capabilities** — Qualquer novo módulo = nova pasta `features/<nome>` no web e na API, desde o primeiro commit.
4. **Shared** — Extrair UI e helpers usados por mais de uma feature para `web/src/shared`.
5. **Testes** — Manter testes por feature (`api/src/features/jornada/*.test.ts`).
6. **README** — Descrever a árvore `features/` para onboarding.

**Ordem sugerida:** refinar a feature existente antes de adicionar novas, para o padrão ficar visível como exemplo.

## Critério de conclusão

- Toda a API de negócio em `api/src/features/<nome>/` com camadas explícitas.
- Web sem componentes de negócio “soltos” fora de `features` ou `shared`.

## Ambiente local (dev)

| Alvo | Comando típico | Porta |
|--------|----------------|--------|
| Web (Vite) | `npm run dev` (raiz, workspace `web`) ou `cd web && npm run dev` | **5176** (`strictPort`) |
| API (Fastify) | `npm run dev` inclui API via workspace; porta em `getApiPort()` — default **3001** (`JORNADA_API_PORT` / `PORT`) |
| API base no browser | `web/src/shared/lib/apiBase.ts` — override com `VITE_API_URL` se a API não for localhost:3001 |
