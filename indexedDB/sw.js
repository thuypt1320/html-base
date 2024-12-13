const postMessage = async (message) => {
  const clients = await self.clients.matchAll({ type: 'window' });
  if (!clients || !clients.length) return;
  clients.forEach(client => client.postMessage(message));
};

<!-- IndexDB API -->
const req = indexedDB.open('cat', 1);
const FACTORY_NAME = 'cat';
const STORE_NAME = 'cat';

req.onupgradeneeded = e => {
  const store = e.currentTarget.result.createObjectStore(FACTORY_NAME, {
    keyPath: 'id',
    autoIncrement: true
  });

  store.createIndex('file', 'file', { unique: false });
  store.createIndex('title', 'title', { unique: false });
};

const getStore = (mode = 'readwrite') => {
  const req = indexedDB.open('cat', 1);

  return new Promise(resolve => {
    req.onsuccess = e => {
      resolve(e.currentTarget.result.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
    };
  });

};

const getAll = async () => {
  const store = await getStore('readonly');
  const request = store.getAll();

  request.onsuccess = e => postMessage(['GET_ALL', e.currentTarget.result]);
  // request.onerror = postMessage(['ERROR', 'GET_ALL ERROR']);
};

const addData = async (value) => {
  const store = await getStore();
  const request = store.add(value);
  request.onsuccess = getAll();
  // request.onerror = postMessage(['ERROR', 'ADD_DATA ERROR']);

};

const getData = async (key, value) => {
  const store = await getStore();
  const req = store.index(key);
  const record = req.get(value);
  return new Promise((resolve, reject) => {
    record.onsuccess = e => {
      if (!e.target.result) {
        reject('Not Found');
        return;
      }
      resolve(e.target.result);
    };

    record.onerror = () => reject('Error IndexedDB');
  });
};

const deleteData = async (key) => {
  const store = await getStore();
  const request = store.delete(Number(key));
  request.onsuccess = getAll();
  // request.onerror = postMessage(['ERROR', 'DELETE_ALL ERROR']);

};

const clearDB = async () => {
  const store = await getStore();
  const request = store.clear();
  request.onsuccess = postMessage(['CLEAR', []]);
  // request.onerror = postMessage(['ERROR', 'CLEAR_DB ERROR']);
};

const deleteMulti = async (data) => {
  if (!data.length || !data) {
    await postMessage(['ERROR', { message: 'DID YOU SELECT SOME?' }]);
    return;
  }

  const store = await getStore();
  data.forEach(value => {
    const request = store.delete(Number(value));
    const isLast = data.at(-1) === value;
    if (isLast) request.onsuccess = getAll();
  });
};

const updateData = async (data) => {
  const {
    id,
    title,
  } = data;

  const store = await getStore('readwrite');
  const request = await store.get(id);

  request.onsuccess = e => {
    const data = e.currentTarget.result;
    data.title = title;

    const putRequest = store.put(data);
    putRequest.onsuccess = () => getAll();
    putRequest.onerror = () => postMessage(['ERROR', 'UPDATE_DATA ERROR']);
  };
};
const searchData = async (data) => {
  const store = await getStore('readwrite');
  // All records start with <data>
  const request = await store.index('title').getAll(IDBKeyRange.bound(data, data + '\uffff'));
  request.onsuccess = e => postMessage(['SEARCH', e.target.result]);
};

self.addEventListener('message', async (e) => {
  const [type, data] = e.data;
  if (type === 'GET_ALL') await getAll();
  if (type === 'CLEAR_DB') await clearDB();
  if (type === 'ADD_DATA') await addData(data);
  if (type === 'DELETE_DATA') await deleteData(data);
  if (type === 'MULTI-DELETE') await deleteMulti(data);
  if (type === 'UPDATE_DATA') await updateData(data);
  if (type === 'SEARCH') await searchData(data);
});
