import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// Força o Vite a resolver 'react' e 'react-dom' do node_modules,
// e nunca pegar o react.js da raiz do workspace pai
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            'react': path.resolve('./node_modules/react'),
            'react-dom': path.resolve('./node_modules/react-dom'),
        }
    },
    server: {
        port: 5173
    }
});
