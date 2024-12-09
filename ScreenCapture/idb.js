/**
 *  Client Elements
 * */
// Elements
const start = document.getElementById('start');
const stop = document.getElementById('stop');
const videoStream = document.getElementById('stream');
const videoPreview = document.getElementById('preview');
const download = document.querySelector('[download]');
const saveOffline = document.getElementById('offline');
const details = document.querySelector('details#warning');
const successMess = document.getElementById('success');
const failMess = document.getElementById('fail');
const records = document.getElementById('records');

const showModal = (mode = 'success') => {
  details.open = true;
  successMess.slot = mode === 'success' ? 'success' : '';
  failMess.slot = mode === 'success' ? '' : 'fail';
  setTimeout(async () => {
    details.open = false;
    await displayRecords();
  }, 1500);
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

// Add
const addData = async (val) => {
  const store = await getStore('readwrite');
  const addRequest = store.add(val);
  addRequest.onsuccess = () => showModal();
  addRequest.onerror = () => showModal('fail');
};

const getAll = async () => {
  const store = await getStore();
  const request = await store.getAll();
  return new Promise(resolve => {
    request.onsuccess = e => {
      resolve(e.target.result);
    };
  });
};

start.addEventListener('click', async () => {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: {
      displaySurface: 'monitor', // displaySurface options: 'browser' | 'window' | 'monitor'→ Default content option
      width: window.screen.width / 2, // Video Size <width> - check `Dimension` property file info, e.g: Dimension 1920x1280
      height: window.screen.height / 2 // Video Size <height>
    }
  });
  videoStream.srcObject = stream;
  const mimeType = 'video/mp4;codecs=avc1';

  const recorder = new MediaRecorder(stream, { mimeType });
  recorder.start(1);
  recorder.onstart = () => {
    videoPreview.removeAttribute('slot');
    videoStream.slot = 'video';
    const data = [];
    recorder.ondataavailable = e => data.push(e.data);
    recorder.onstop = () => {
      videoPreview.slot = 'video';
      videoStream.removeAttribute('slot');
      const url = URL.createObjectURL(new Blob(data, { type: mimeType }));
      videoPreview.src = url;
      download.href = url;
    };
  };
});

stop.addEventListener('click', async () => {
  if (!videoStream.srcObject) return;
  const tracks = videoStream.srcObject?.getTracks();
  tracks.forEach(track => track.stop());
});

saveOffline.addEventListener('click', async () => {
  if (!videoPreview.src) return showModal('fail');

  const url = await fetch(videoPreview.src).then(res => res.blob()).then(blob => {
    const file = new FileReader();
    file.readAsDataURL(blob);

    return new Promise(resolve => {
      file.onload = e => {
        resolve(e.target.result);
      };
    });
  });

  const value = {
    url,
    created_at: new Date()
  };
  await addData(value);
});

/**
 *  Custom Element - Record Items
 * */

class Capture extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('record');
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  static observedAttributes = ['src'];

  set src (val) {
    const video = this.shadowRoot.querySelector('video');
    video.src = val;
  }
}

customElements.define('custom-capture', Capture);

// Display Record
const displayRecords = async () => {
  const data = await getAll();

  const list = (data.map(({
    url,
    created_at
  }) => {
    const recordEle = document.createElement('custom-capture');
    recordEle.src = url;
    recordEle.innerHTML = new Date(created_at).toLocaleString();
    recordEle.slot = 'record';
    return recordEle;
  }));
  records.querySelectorAll('[slot=record]').forEach(child => child.remove());
  records.append(...list);
};

displayRecords().then();
