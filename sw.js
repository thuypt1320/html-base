/* eslint-disable no-restricted-globals*/

let assets = [];

const message = (str, type = '', style = 'color: green; font-weight: 700;') => {
  if (type === 'error') return [`%c [TO CLIENT] ${str}`, 'color: red; font-weight: 700'];
  return [`%c [TO CLIENT] ${str}`, style];
};

const postMessage = async (message, clientId) => {
  const client = await self.clients.get(clientId);
  if (client) return client.postMessage(message);
  const clients = await self.clients.matchAll({ type: 'window' });
  if (clients && clients.length) {
    return Promise.all(
      clients.map(async (windowClient) => {
        return windowClient.postMessage(message);
      }),
    );
  }
};

const addResourceToCache = async (resource) => {
  assets.push(...resource);
  try {
    const cache = await caches.open('v1');
    await postMessage(message('<CacheStorage> RESOURCE ADDED'));
    return cache.addAll(resource);
  } catch (e) {
    await postMessage(message('<CacheStorage> ERROR ADD RESOURCE TO CACHE', 'error'));
  }
};

const isAssetCache = (request) => assets.includes(request.url);

const cacheFirst = async (e) => {
  const cache = await caches.open('v1');
  const request = e.request;

  const getResponseCache = async () => {
    const response = await cache.match(request);
    if (response) return response;
  };

  const getResponsePreload = async () => {
    const cacheResponse = await getResponseCache();

    // Get Assets from Cache <e.g: images, font, ...>
    if (isAssetCache(request) && cacheResponse) return cacheResponse;

    const response = await e.preloadResponse;
    if (response) {
      await cache.add(request);
      return response;
    }
  };
  const getResponse = async () => {
    const cacheResponse = await getResponseCache();

    // Get Assets from Cache <e.g: images, font, ...>
    if (isAssetCache(request) && cacheResponse) return await getResponseCache();
    const response = await fetch(request);

    if (response) {
      await cache.add(request);
      return response;
    }
  };

  if (navigator.onLine) {
    const preload = await getResponsePreload();
    if (preload) return preload;
    const response = await getResponse();
    if (response) return response;

    const cacheResponse = await getResponseCache();
    if (cacheResponse) return cacheResponse;
    return new Response('------ NETWORK ERROR ------');
  }

  const cacheResponse = await getResponseCache();
  if (cacheResponse) return cacheResponse;

  return new Response('------ NETWORK ERROR OFFLINE ------');
};

self.addEventListener('install', async (e) => {
 await self.skipWaiting();

  // Install events do not have a client → use console log to show message
  console.log('%c ⌛︎ INSTALLING...', 'font-weight: 700; color: gray;');
  e.waitUntil((async () => console.log('%c INSTALLED!', 'font-weight: 700; color: green;'))());
});

self.addEventListener('active', (e) => {
  e.waitUntil(
    (async () => {
      await self.clients.claim();
      await postMessage('✔︎ SERVICE WORKER READY');
    })(),
  );
});

self.addEventListener('message', (e) => {
  const [type, data] = e.data;
  if (type === 'RESOURCE') e.waitUntil(addResourceToCache(data));
});

self.addEventListener('fetch', async (e) => {
  e.respondWith(cacheFirst(e));
});
