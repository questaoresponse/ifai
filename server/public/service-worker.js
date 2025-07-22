// service-worker.js

var server;

const CACHE_NAME = 'v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/logo.png',
  '/static/main.css',
  '/static/main.js',
];

self.addEventListener('message', (event) => {
  console.log('Mensagem recebida no service worker:', event.data);
    server = event.data.server;
//   if (event.data.type === 'GET_DATA') {
//     // Enviar resposta
//     event.source.postMessage({
//       type: 'RESPONSE_DATA',
//       payload: { result: 'Aqui está o dado pedido!' }
//     });
//   }
});

// Instala o service worker e faz cache dos arquivos essenciais
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Ativação: limpa caches antigos, se houver
self.addEventListener('activate', event => {
  console.log('[SW] Ativado');
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetchWithRetry(event.request)
  );
});

async function fetchWithRetry(request, retries = 100, delay = 1000) {


    // try {
    const response = await fetch(request);

    //     // Se não for erro 429, retorna normalmente
    if (response.status === 429) {
        return await fetch(server + "/imagem/" + request.url.split("/u/d/")[1].split("=")[0]);
    }
    return response;

    //     // Se for erro 429 e ainda houver tentativas
    //     if (retries > 0) {
    //         console.warn('429 Too Many Requests. Retrying...');
    //         await sleep(delay); // espera antes de tentar novamente
    //         return fetchWithRetry(request, retries - 1, delay * 2); // backoff exponencial opcional
    //     }

    //     return response; // retorna o 429 mesmo se não houver mais tentativas
    // } catch (err) {
    //     // erro de rede ou outro erro inesperado
    //     console.error('Fetch failed:', err);
    //     throw err;
    // }
  }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}