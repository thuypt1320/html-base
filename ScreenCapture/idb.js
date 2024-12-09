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

const postMessage = async (message) => {
  if (!navigator.serviceWorker) return;
  const registration = await navigator.serviceWorker.ready;
  registration.active.postMessage(message);
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
  await postMessage(['ADD_DATA', value]);
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
const displayRecords = async (data) => {
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

const handleServiceWorker = async () => {
  if (!navigator.serviceWorker) return;

  await navigator.serviceWorker.register('sw.js');

  await navigator.serviceWorker.addEventListener('message', async e => {
    const [type, data] = e.data;
    if (type === 'GET_ALL') await displayRecords(data);
    if (type === 'ADD_DATA') {
      await displayRecords(data);
      showModal();
    }
  });
};

handleServiceWorker().then();
postMessage(['GET_ALL']).then();
