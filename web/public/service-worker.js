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
  // console.log('Mensagem recebida no service worker:', event.data);
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
  // event.waitUntil(
  //   caches.open(CACHE_NAME).then(cache => {
  //     return cache.addAll(ASSETS_TO_CACHE);
  //   })
  // );
});

// Ativação: limpa caches antigos, se houver
self.addEventListener('activate', event => {
  console.log('[SW] Ativado');
  // event.waitUntil(
  //   caches.keys().then(cacheNames =>
  //     Promise.all(
  //       cacheNames.map(name => {
  //         if (name !== CACHE_NAME) {
  //           return caches.delete(name);
  //         }
  //       })
  //     )
  //   )
  // );
});

self.addEventListener('fetch', (event) => {
    if (!event.request.url.includes("get_file")) return;

    event.respondWith((async () => {
        const cache = await caches.open("file-cache");
        const cachedResponse = await cache.match(event.request);

        if (cachedResponse) {
                const contentLength = cachedResponse.headers.get("Content-Length");
                if (contentLength && parseInt(contentLength) > 0) {
                    return cachedResponse;
                }
        }

        const req = new Request(event.request.url, {
            method: event.request.method,
            headers: event.request.headers,
            mode: "cors",
            credentials: "include"
        });

        const response = await fetch(req);

        const contentLength = response.headers.get("Content-Length");
        if (contentLength && parseInt(contentLength) > 0) {
            return cachedResponse;
        }

        return response;
    })());
});

// async function fetchWithRetry(request, retries = 100, delay = 1000) {


//     // try {
//     fetch(request).then(response => {
//       const { readable, writable } = new TransformStream();
//       response.body.pipeTo(writable);
//       return new Response(readable, { headers: response.headers });
//     });

//     fetch(request)

    
//     // return response;

//     //     // Se for erro 429 e ainda houver tentativas
//     //     if (retries > 0) {
//     //         console.warn('429 Too Many Requests. Retrying...');
//     //         await sleep(delay); // espera antes de tentar novamente
//     //         return fetchWithRetry(request, retries - 1, delay * 2); // backoff exponencial opcional
//     //     }

//     //     return response; // retorna o 429 mesmo se não houver mais tentativas
//     // } catch (err) {
//     //     // erro de rede ou outro erro inesperado
//     //     console.error('Fetch failed:', err);
//     //     throw err;
//     // }
//   }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}