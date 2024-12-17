const captureFieldSet = document.getElementById('capture-fieldset');
const recordFieldset = document.getElementById('record-fieldset');
const capture = document.getElementById('video-capture');
const record = document.getElementById('video-record');
const startCaptureBtn = document.getElementById('start-capture');
const stopCaptureBtn = document.getElementById('stop-capture');
const pauseCaptureBtn = document.getElementById('pause-capture');
const playRecordBtn = document.getElementById('play-record');
const pauseRecordBtn = document.getElementById('pause-record');
const downloadRecordBtn = document.getElementById('download');
const timeProgress = document.getElementById('time-update');
const timeTxt = document.getElementById('time');
const durationCaptureTxt = document.getElementById('duration-capture');
const newCaptureBtn = document.getElementById('new-capture');
const dataTransfer = new DataTransfer();

// #
// record.src = '../assets/video.mp4';

const setSlot = (name, ele) => {
  document.querySelectorAll(`[slot=${name}]`).forEach(child => child.removeAttribute('slot'));
  ele.slot = name;
};

const resetCapture = () => {
  capture.currentTime = 0;
  record.currentTime = 0;

  capture.srcObject = undefined;
  record.removeAttribute('src');
};

const handleRecord = async (stream) => {
  const [track] = stream.getVideoTracks();
  const { displaySurface } = track.getSettings();

  const browserOptions = displaySurface === 'browser' ? { mimeType: 'video/mp4' } : undefined;
  const monitorOptions = displaySurface === 'monitor' ? { mimeType: 'video/mp4' } : undefined;
  const windowOptions = displaySurface === 'window' ? { mimeType: 'video/webm' } : undefined;
  const noSupportOptions = !displaySurface ? { mimeType: 'video/mp4' } : undefined;

  const options = monitorOptions || browserOptions || windowOptions || noSupportOptions;

  const recorder = new MediaRecorder(stream, options);
  recorder.start(1);
  pauseCaptureBtn.addEventListener('click', () => (recorder.state === 'recording') && recorder.pause());
  recorder.onpause = () => {
    capture.pause();
    pauseCaptureBtn.addEventListener('click', () => recorder.resume());
  };

  recorder.onresume = () => {
    capture.play();
    pauseCaptureBtn.addEventListener('click', () => recorder.pause());
  };
  const data = [];
  recorder.ondataavailable = evt => data.push(evt.data);
  recorder.onstop = () => {
    const blob = new Blob(data, { type: options?.mimeType });
    record.src = URL.createObjectURL(blob);
    stopCapture();
  };
};

const startCapture = async () => {
  setSlot('capture-button', stopCaptureBtn);
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'window',
        width: window.screen.width * 0.7,
        height: window.screen.height * 0.7,
      },
      audio: true,
    });

    await handleRecord(stream);
    capture.srcObject = stream;
    capture.ontimeupdate = e => {
      durationCaptureTxt.innerText = e.target.currentTime.toFixed(0).padStart(2, '0');
      dataTransfer.setData('text/plain', e.target.currentTime);
    };
  } catch {
    setSlot('capture-button', startCaptureBtn);
  }
};

const stopCapture = async () => {
  try {
    const duration = dataTransfer.getData('text/plain');
    timeProgress.max = Math.fround(parseFloat(duration));
    timeTxt.innerText = `${timeProgress.value.toFixed(0).padStart(2, '0')}:${timeProgress.max.toFixed(0).padStart(2, '0')}`;
  } catch {
    console.log('Cannot custom controls video');
  }

  setSlot('capture-button', startCaptureBtn);
  setSlot('video', recordFieldset);
  capture.srcObject.getTracks().forEach(track => track.stop());
  dataTransfer.clearData('text/plain');
};

const playRecord = () => {
  record.currentTime = 0;
  setSlot('record-button', pauseRecordBtn);
  record.play();
  record.ontimeupdate = e => {
    if (e.target.duration !== Infinity) timeProgress.max = e.target.duration;
    timeProgress.value = e.target.currentTime;
    timeTxt.innerText = `${timeProgress.value.toFixed(0).padStart(2, '0')}/${timeProgress.max.toFixed(0).padStart(2, '0')}`;
  };

  record.onended = () => {
    setSlot('record-button', playRecordBtn);
  };
};
const pauseRecord = () => {
  setSlot('record-button', playRecordBtn);
  record.pause();
};

const downloadRecord = async (e) => {
  const noSupportDeviceURL = async (url) => {
    // create download preview _.html file
    const title = `Preview Video ` + new Date().toLocaleString();
    const file = new FileReader();
    const blobURL = await fetch(url).then(res => res.blob()).then(blob => {
      file.readAsDataURL(blob);
      return new Promise(resolve => {
        file.onload = e => {
          const innerHTML = `
<html>
<head>
  <title>${title}</title>
  <style>
    body {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background-color: #000;
    }
  </style>
</head>
<body>
  <video autoplay controls src="${e.target.result}"></video>
</body>
</html>
    `;
          const blob = new Blob([innerHTML], { type: 'text/html' });
          resolve(URL.createObjectURL(blob));
        };
      });
    });

    const a = document.createElement('a');
    a.target = '_blank';
    a.download = title;
    a.href = blobURL;
    a.click();
    a.remove();
  };
  // #
  const noSupportBrowser = false;
  if (noSupportBrowser) return noSupportDeviceURL(record.src);

  const a = document.createElement('a');
  a.download = 'Video ' + new Date().toLocaleString();
  a.href = record.src;
  a.click();
  a.remove();
};

const createNew = () => {
  setSlot('video', captureFieldSet);
  resetCapture();
};

startCaptureBtn.onclick = startCapture;
stopCaptureBtn.onclick = stopCapture;
downloadRecordBtn.onclick = downloadRecord;
playRecordBtn.onclick = playRecord;
pauseRecordBtn.onclick = pauseRecord;
newCaptureBtn.onclick = createNew;
