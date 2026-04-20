// server.ts - Fastify + TypeScript
import Fastify from 'fastify';
import cors from '@fastify/cors';

const fastify = Fastify({ logger: true });
fastify.register(cors);

// Simulação da estrutura de dados vinda do seu ETL (D-1/Real-time)
const getPatientJourney = (atendimentoId: string) => {
    return {
        id: atendimentoId,
        paciente: "ABADIA A P",
        atendimento: "862702",
        tempoTotal: 112.11,
        nodes: [
            { id: '1', type: 'custom', data: { label: 'Entrada', time: '00:03', status: 'done', icon: 'door' }, position: { x: 0, y: 100 } },
            { id: '2', type: 'custom', data: { label: 'Triagem', time: '00:05', status: 'done', icon: 'bullhorn', delay: '3,2 min' }, position: { x: 200, y: 100 } },
            { id: '3', type: 'custom', data: { label: 'Consulta', time: '00:29', status: 'done', icon: 'stethoscope', delay: '22,9 min' }, position: { x: 400, y: 100 } },
            { id: '4', type: 'custom', data: { label: 'RX/ECG', time: '24,65', status: 'done', isSub: true }, position: { x: 650, y: 0 } },
            { id: '5', type: 'custom', data: { label: 'TC/US', time: '1 Mil', status: 'critical', isSub: true }, position: { x: 650, y: 100 } },
            { id: '6', type: 'custom', data: { label: 'MED.', time: '13', status: 'done', isSub: true }, position: { x: 650, y: 200 } },
            { id: '7', type: 'custom', data: { label: 'Alta', time: '01:33', status: 'done', icon: 'hospital' }, position: { x: 900, y: 100 } },
        ],
        edges: [
            { id: 'e1-2', source: '1', target: '2', animated: true },
            { id: 'e2-3', source: '2', target: '3', animated: true },
            { id: 'e3-4', source: '3', target: '4' },
            { id: 'e3-5', source: '3', target: '5' },
            { id: 'e3-6', source: '3', target: '6' },
            { id: 'e5-7', source: '5', target: '7', animated: true },
        ]
    };
};

fastify.get('/api/jornada/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return getPatientJourney(id);
});

fastify.listen({ port: 3001, host: '0.0.0.0' });