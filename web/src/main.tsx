import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
    <App />
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register("/service-worker.js?v=0.02")
      .then(_ => {
        // console.log('[SW] Registrado com sucesso:', reg.scope);
      })
      .catch(err => {
        console.error('[SW] Falha no registro:', err);
      });
  });
}

const link = document.createElement("link");
link.rel = "manifest";
link.href = import.meta.env.VITE_MANIFEST; // pega a variável de ambiente
document.head.appendChild(link);