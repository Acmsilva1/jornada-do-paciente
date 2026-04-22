# Jornada do Paciente

Dashboard em tempo real para visualizar a jornada do atendimento na Pronto-Socorro: fila por unidade, busca de pacientes e mapa de fluxo (ReactFlow) com etapas, tempos e desfechos.

## Documentação

| Documento | Conteúdo |
| :--- | :--- |
| [doc.md](doc.md) | Arquitetura, API, frontend, fluxos de UX e build |
| [agentes.md](agentes.md) | Regras de negócio, SLA e decisões para manutenção assistida por IA |

## Requisitos

- Node.js 18+ (recomendado LTS)
- Pasta `dados/` na raiz do repositório com os CSV esperados pelo backend (ver [doc.md](doc.md))

## Como executar

1. **Backend** (porta `3001`):

   ```bash
   cd backend
   npm install
   npx ts-node server.ts
   ```

2. **Frontend** (porta `5173`, aponta para `http://localhost:3001`):

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Build de produção (frontend)**:

   ```bash
   cd frontend
   npm run build
   ```

## Estrutura do repositório

```
jornada-do-paciente/
├── backend/          # Fastify + CSV em memória
├── frontend/         # React + Vite + TypeScript + Tailwind + ReactFlow
├── dados/            # Arquivos CSV de entrada (não versionados aqui por padrão)
├── doc.md              # Documentação técnica detalhada
├── agentes.md          # Regras de negócio e manutenção
├── css.md              # Notas de design system (parcialmente genérico)
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
