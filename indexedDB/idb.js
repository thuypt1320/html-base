// Elements

const attachFile = document.getElementById('attach-file');
const fileUrl = document.getElementById('file');
const previewObject = document.getElementById('preview-attach-file');
const previewVideo = document.getElementById('preview-video');
const form = document.querySelector('form');
const template = document.getElementById('preview-template');
const content = document.getElementById('content');
const search = document.getElementById('search');
const dialog = document.querySelector('dialog');
const dialogConfirm = dialog.querySelector('#warning-confirm');
const dialogCancel = dialog.querySelector('#warning-cancel');

const settings = document.getElementById('settings');
const settingsPopover = document.getElementById('settings-popover');
const clearBtn = document.getElementById('clear');
const reloadBtn = document.getElementById('reload');
const warning = document.getElementById('warning');
const warningContent = document.getElementById('warning-content');

// Show Warning
const showWarning = (isSuccess = true, message) => {
  warning.open = true;
  const p = document.createElement('p');
  p.classList.add(isSuccess ? 'success' : 'fail');
  p.innerHTML = message || isSuccess ? 'SUCCESS' : 'FAIL';

  warningContent.replaceChildren(p);
  setTimeout(() => warning.open = false, 1200);
};

// Handle Service Worker
const handleServiceWorker = async () => {
  if (!navigator.serviceWorker) return;
  await navigator.serviceWorker.register('sw.js');

  await navigator.serviceWorker.addEventListener('message', async (e) => {
    const [type, data] = e.data;
    showWarning(type !== 'ERROR');
    if (data && type !== 'ERROR') await handleDisplayPreview(data);
  });
};

//  Post Message Service Worker
const postMessage = async (message) => {
  if (!navigator.serviceWorker) return;
  const registration = await navigator.serviceWorker.ready;
  return registration.active.postMessage(message);
};

handleServiceWorker().then();

// Custom Element - File Preview

class CustomPreview extends HTMLElement {
  constructor () {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  static observedAttributes = ['value'];

  set value (val) {
    this.setAttribute('value', val);
  }

  get value () {
    return this.getAttribute('value');
  }

  connectedCallback () {
    const popover = this.shadowRoot.getElementById('popover');
    const deleteBtn = this.shadowRoot.getElementById('delete');
    const editBtn = this.shadowRoot.getElementById('edit');
    const openBtn = this.shadowRoot.getElementById('open');
    const downloadBtn = this.shadowRoot.getElementById('download');
    downloadBtn.download = this.title;
    popover.style.visibility = 'hidden';

    this.shadowRoot.addEventListener('contextmenu', e => {
      e.preventDefault();
      const popover = this.shadowRoot.getElementById('popover');
      popover.style.top = `${e.offsetY}px`;
      popover.style.left = `${e.offsetX}px`;
      popover.style.removeProperty('visibility');
    }, { capture: true });

    document.addEventListener('click', () => (popover.style.visibility = 'hidden'));
    document.addEventListener('auxclick', (e) => {
      if (!this.contains(e.target)) {
        popover.style.visibility = 'hidden';
      }

    });
    deleteBtn.addEventListener('click', async () => {
      await postMessage(['DELETE_DATA', this.value]);
    });
    editBtn.addEventListener('click', () => {
    });

    openBtn.addEventListener('click', async () => {
      const url = await fetch(this.url).then(res => res.blob()).then(blob => URL.createObjectURL(blob));
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    });
    fetch(this.url)
      .then(res => res.blob())
      .then(blob => URL.createObjectURL(blob))
      .then(url => downloadBtn.href = url);
  }
}

customElements.define('custom-preview', CustomPreview);

// Submit Form

attachFile.onchange = e => {
  const [file] = e.target.files;
  const isVideo = file.type.includes('video');

  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = evt => {
    const url = evt.target.result;
    fileUrl.value = url;

    if (!isVideo) {
      previewObject.data = url;
      previewObject.slot = 'file';
      previewVideo.slot = '';
    } else {
      previewVideo.src = URL.createObjectURL(file);
      previewObject.slot = '';
      previewVideo.slot = 'file';
      previewVideo.controls = true;
      previewVideo.autoplay = true;
    }
  };
};

form.onsubmit = async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const values = Object.fromEntries(formData.entries());
  await postMessage(['ADD_DATA', values]);
  form.reset();
  attachFile.focus();
  previewObject.data = '';
};

// Display Preview
const handleDisplayPreview = async (res = []) => {
  const data = await Promise.all(res.map(async ({
    file,
    ...item
  }) => {
    const blob = await fetch(file).then(res => res.blob()).then(blob => URL.createObjectURL(blob));
    return {
      ...item,
      file: blob,
      isVideo: file.includes('video')
    };
  }));

  const previews = await Promise.all(data.map(async ({
    file,
    title,
    id,
    isVideo
  }) => {
    const customPreview = document.createElement('custom-preview');
    const object = document.createElement('object');
    const video = document.createElement('video');
    const p = document.createElement('p');
    customPreview.value = id;
    customPreview.url = file;
    customPreview.title = title;
    object.data = file;
    video.height = 200;
    video.src = file;
    video.autoplay = true;
    video.controls = true;
    p.slot = 'label';
    p.innerHTML = title;

    if (isVideo) {
      video.slot = 'file';
    } else {
      object.slot = 'file';
    }
    customPreview.append(object, p, video);

    customPreview.slot = 'content';
    return customPreview;
  }));
  content.replaceChildren(...previews);
};

// Settings

clearBtn.onclick = () => {
  dialog.showModal();
  dialogConfirm.onclick = async () => {
    await postMessage(['CLEAR_DB']);
    dialog.close();
  };
  dialogCancel.onclick = () => dialog.close();
};

reloadBtn.onclick = () => postMessage(['RELOAD']);

settings.onclick = () => {
  if (!settingsPopover.style.visibility) {
    settingsPopover.style.setProperty('visibility', 'hidden');
  } else {
    settingsPopover.style.removeProperty('visibility');
  }
};

// Search
search.oninput = () => postMessage(['SEARCH', search.value]);

postMessage(['GET_ALL']).then();
