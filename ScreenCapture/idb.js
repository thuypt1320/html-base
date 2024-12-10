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
const recordSettings = document.getElementById('record-settings');
const recordDelete = document.getElementById('delete');
const recordDownload = document.getElementById('download');

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

// Handle close click outside

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (recordSettings?.open) recordSettings.open = false;
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

    const input = this.shadowRoot.querySelector('input');
    input.addEventListener('input', e => this.dispatchEvent(new InputEvent('change', {
      data: JSON.stringify({ [this.value]: this.checked })
    })));
  }

  static observedAttributes = ['value'];

  set src (val) {
    const video = this.shadowRoot.querySelector('video');
    video.src = val;
  }

  get src () {
    const video = this.shadowRoot.querySelector('video');
    return video.src;
  }

  set value (val) {
    this.setAttribute('value', val);
    const input = this.shadowRoot.querySelector('input');
    input.value = val;
  }

  get value () {
    return this.getAttribute('value');
  }

  get checked () {
    const input = this.shadowRoot.querySelector('input');
    return input.checked;
  }

  set checked (val) {
    this.shadowRoot.querySelector('input').checked = val;
  }
}

customElements.define('custom-capture', Capture);

// Display Record
const displayRecords = async (data) => {
  const list = (data.map(({
    url,
    id,
    created_at
  }) => {
    const recordEle = document.createElement('custom-capture');
    recordEle.src = url;
    recordEle.value = id;
    recordEle.innerHTML = new Date(created_at).toLocaleString();
    recordEle.slot = 'record';
    return recordEle;
  }));
  records.querySelectorAll('[slot=record]').forEach(child => child.remove());
  records.append(...list);
  const customCaptures = document.querySelectorAll('custom-capture');
  customCaptures.forEach(child => {
    //  Custom Capture `Change Event`
    child.addEventListener('change', e => {
      if (e.target.checked) recordSettings.slot = 'settings';

      const noChecked = [...customCaptures].map(({ checked }) => checked).every(i => !i);
      if (noChecked) recordSettings.removeAttribute('slot');
    });
  });
};

const getSelectedCaptures = () => {
  const customCaptures = document.querySelectorAll('custom-capture');
  return [...customCaptures].filter(({ checked }) => checked);
};

recordDelete.addEventListener('click', async () => await postMessage(['DELETE_ALL', getSelectedCaptures().map(({ value }) => value)]));
recordDownload.addEventListener('click', e => {
  getSelectedCaptures().forEach(async ({
    src,
    innerHTML: createdAt
  }) => {
    const a = document.createElement('a');
    a.download = 'Record ' + createdAt.replace(',', ' at');
    a.href = src;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
});

const handleServiceWorker = async () => {
  if (!navigator.serviceWorker) return;

  await navigator.serviceWorker.register('sw.js');

  await navigator.serviceWorker.addEventListener('message', async e => {
    const [type, data] = e.data;
    if (data) await displayRecords(data);
    if (type === 'ADD_DATA') showModal();
    if (type === 'DELETE_DATA') showModal();
  });
};

handleServiceWorker().then();
postMessage(['GET_ALL']).then();
