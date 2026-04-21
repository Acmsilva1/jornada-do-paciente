# Documentação Técnica: Jornada do Paciente 🏥

Este documento descreve a infraestrutura e as tecnologias que sustentam o Dashboard de Alta Fidelidade para monitoramento de fluxos hospitalares.

## 🛠️ Tech Stack

### Frontend (User Interface)
- **Framework**: React 18 + Vite (TypeScript)
- **Engine de Fluxo**: **ReactFlow** (Modelagem de canvas dinâmico)
- **Estilização**: Vanilla CSS + **Design Tokens Personalizados** (Navy Soft Theme)
- **Ícones**: Lucide React
- **Estado**: React Hooks (useMemo, useEffect, useState)
- **Visual**: Glassmorphism, Neon Blurring e Animações CSS6 (Keyframes)

### Backend (Data Engine)
- **Runtime**: Node.js + Fastify (High Performance)
- **Linguagem**: TypeScript
- **Processamento**: `csv-parse` para ingestão massiva de dados em memória (RAM)
- **Database**: Stateless (CSV-driven) com lógica de Map/Set para consultas O(1)

## 📡 Protocolos & Dados
- **API REST**: Endpoints para `units`, `patients`, `journey` e `metas`.
- **ETL Sync**: Polling ativo do frontend para sincronização silenciosa com o backend.
- **Volumetria**: Processamento de arquivos > 100MB (Ex: `tbl_vias_medicamentos.csv` - 76MB).

## 🚀 Como Rodar
1. **Backend**: `cd backend && npm install && npx ts-node server.ts`
2. **Frontend**: `cd frontend && npm install && npm run dev`
