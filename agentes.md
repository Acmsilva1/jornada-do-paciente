# Checkpoint Agentes: Regras de Negócio e Lógica Crítica 🤖🧠

Este documento serve como a "memória" de inteligência do projeto, detalhando decisões que não são óbvias apenas lendo o código.

## ⚖️ Regras de SLA (Farol de Performance)
O sistema utiliza uma hierarquia de gestão para os tempos de atendimento (SLA):

1. **Meta Supervisão (Alerta Amarelo)**:
   - Acionado quando o tempo é `>= ALERTA_MIN` e `<= VALOR_MIN`.
   - Texto: "Meta Supervisão Excedida".
2. **Meta Gerência (Crítico Vermelho)**:
   - Acionado quando o tempo é estritamente `> VALOR_MIN` (ex: 16 min para meta de 15).
   - Texto: "Meta Gerência Excedida".
   - Comportamento: Pulsação de fundo vermelha no card.
3. **Precisão**: Um tempo de exatamente `15/15` é considerado **Dentro da Meta (Amarelo)** e não acima.

## 🗺️ Mapa da Jornada (ReactFlow)
- **Espinha Dorsal**: O caminho principal corre horizontalmente no nível `y: 350`.
- **Caminho das Pedras**:
  - `Smoothstep` edges com animação de fluxo (flow offset).
  - Corredor central limpo para evitar que as trilhas atravessem os corpos dos cards.
- **Resiliência Anti-404**: O frontend ignora erros 404 durante atualizações silenciosas para evitar que o mapa suma caso o backend esteja recarregando o CSV massivo de 76MB (Reload de ~35s).

## 🔍 Busca Inteligente
- **Critério**: Filtra por Nome ou NR Atendimento.
- **Ordenação**: Cronológica decrescente (Entrada mais recente no topo).
- **Aesthetic**: Menu Glassmorphism com cores do Manchester Protocol (Risco Clínico).

## 🧮 Lógica de Permanência Total
- **Cálculo Real**: Ignoramos colunas pré-calculadas de CSVs viciados. A permanência é calculada como `diffInMin(DT_ENTRADA, DT_DESFECHO)`.
- **Exibição**: Exibida diretamente no card de "Alta Médica" como `Total: X min`.

##  Lei Marcial de UI
- **Cursor**: Bloqueado como `default` em todo o ReactFlow para garantir experiência de Dash e não de Editor.
- **Scroll**: Custom scrollbar ultra-fina estilo Navy para listas longas.
