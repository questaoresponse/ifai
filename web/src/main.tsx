import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
    <App />
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(reg => {
        console.log('[SW] Registrado com sucesso:', reg.scope);
      })
      .catch(err => {
        console.error('[SW] Falha no registro:', err);
      });
  });
}