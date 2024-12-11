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
const screenCapture = document.getElementById('screen-capture');
const screenCaptureReset = document.getElementById('reset');
const clearBtn = document.getElementById('clear');

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

const time = (date) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Ho_Chi_Minh',
  dayPeriod: 'short',
  weekday: 'long',
  month: 'numeric',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
  second: 'numeric'
}).format(date);

// Display Time
const getTime = () => {
  const timeEle = document.createElement('p');
  timeEle.slot = 'time';
  screenCapture.appendChild(timeEle);
  setInterval(() => timeEle.innerHTML = time(), 1000);
};

getTime();

const clearScreenCapture = () => {
  const tracks = videoStream.srcObject?.getTracks() || [];
  videoStream.srcObject = undefined;
  videoPreview.removeAttribute('src');
  videoStream.slot = 'video';
  videoPreview.removeAttribute('slot');
  tracks.forEach(track => track?.stop());
};

//  Handle Control Screen Capture
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
      if (!videoStream.srcObject) return;
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
  clearScreenCapture();
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
  if (!data) return;
  const list = (data?.map(({
    url,
    id,
    created_at
  }) => {
    const recordEle = document.createElement('custom-capture');
    recordEle.src = url;
    recordEle.value = id;
    recordEle.createdAt = created_at;
    recordEle.innerHTML = time(new Date(created_at));
    recordEle.slot = 'record';
    return recordEle;
  })) || [];
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

recordDelete.addEventListener('click', async () => await postMessage(['DELETE_DATA', getSelectedCaptures().map(({ value }) => value)]));
recordDownload.addEventListener('click', () => {
  getSelectedCaptures().forEach(async ({
    src,
    createdAt
  }) => {
    const a = document.createElement('a');
    a.download = 'Record ' + new Date(createdAt).toLocaleString().replace(',', ' at');
    a.href = src;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
});
screenCaptureReset.addEventListener('click', clearScreenCapture);
clearBtn.addEventListener('click', async () => await postMessage(['CLEAR_STORE']));

const handleServiceWorker = async () => {
  if (!navigator.serviceWorker) return;

  await navigator.serviceWorker.register('sw.js');

  await navigator.serviceWorker.addEventListener('message', async e => {
    const [type, data] = e.data;
    if (type === 'ERROR') {
      showModal('fail');
      return;
    }
    showModal();
    await displayRecords(data);
  });
};

handleServiceWorker().then();
postMessage(['GET_ALL']).then();
