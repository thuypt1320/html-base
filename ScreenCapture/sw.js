const postMessage = async (message, clientId) => {
  const client = await self.clients.get(clientId);
  if (client) return client.postMessage(message);
  const clients = await self.clients.matchAll({ type: 'window' });
  if (clients && clients.length) {
    return Promise.all(clients.map(async (windowClient) => {
      return windowClient.postMessage(message);
    }),);
  }
};

/**
 * IndexedDB - `screen-capture` database
 * */
const req = indexedDB.open('screen-capture', 1);

//  Create store
req.onupgradeneeded = e => {
  const db = e.currentTarget.result;
  const store = db.createObjectStore('screen-capture', {
    keyPath: 'id',
    autoIncrement: true
  });

  store.createIndex('created_at', 'created_at', { unique: false });
  store.createIndex('url', 'url', { unique: false });
};

// Get Store
const getStore = (mode = 'readonly') => {
  const request = indexedDB.open('screen-capture');

  return new Promise(resolve => {
    request.onsuccess = e => resolve(e.currentTarget.result.transaction('screen-capture', mode).objectStore('screen-capture'));
  });
};

const getAll_ = async () => {
  const store = await getStore();
  const request = await store.getAll();
  request.onsuccess = e => postMessage(['GET_ALL', e.target.result || []]);
  request.onerror = () => postMessage(['ERROR', 'GET_ALL ERROR']);
};

// Get All Sort By `created_at`
const getAll = async () => {
  const store = await getStore();
  const request = await store.index('created_at').openCursor(null, 'prev');
  const result = [];
  return new Promise(resolve => {
    request.onsuccess = async e => {
      let cursor = e.currentTarget.result;

      while (cursor) {
        result.push(cursor.value);
        cursor = await cursor.continue();

        if (!cursor) {
          await postMessage(['GET_ALL', result]);
          resolve(result);
        }
      }
    };
  });
};

// Add
const addData = async (val) => {
  const store = await getStore('readwrite');
  const addRequest = store.add(val);
  addRequest.onsuccess = getAll();
};

// Delete
const deleteData = async (ids) => {
  const store = await getStore('readwrite');

  ids.forEach(id => {
    const getReq = store.get(Number(id));
    getReq.onsuccess = (e) => {
      const isExist = e.currentTarget.result;
      if (!isExist) return;
      const request = store.delete(Number(id));
      request.onsuccess = getAll();
      request.onerror =  postMessage(['ERROR', 'DELETE_DATA ERROR']);
    };
    getReq.onerror = postMessage(['ERROR', 'DELETE_DATA ERROR']);
  });
};

// Clear Store
const clearStore = async () => {
  const store = await getStore('readwrite');
  const request = store.clear();
  request.onsuccess = postMessage(['CLEAR', []]);
};

self.addEventListener('message', async (e) => {
  const [type, data] = e.data;
  if (type === 'GET_ALL') await getAll();
  if (type === 'ADD_DATA') await addData(data);
  if (type === 'DELETE_DATA') await deleteData(data);
  if (type === 'CLEAR_STORE') await clearStore();
});
