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
const unselectBtn = document.getElementById('unselect');
const clearBtn = document.getElementById('clear');
const reloadBtn = document.getElementById('reload');
const multiDeleteBtn = document.getElementById('multi-delete');
const multiDownloadBtn = document.getElementById('multi-download');
const warning = document.getElementById('warning');
const warningContent = document.getElementById('warning-content');
const selected = document.getElementById('settings-content');

// Show Warning
const showWarning = (isSuccess = true, message) => {
  warning.open = true;
  const p = document.createElement('p');
  p.classList.add(isSuccess ? 'success' : 'fail');
  p.innerHTML = message || (isSuccess ? 'SUCCESS' : 'FAIL');

  warningContent.replaceChildren(p);
  setTimeout(() => warning.open = false, 1200);
};

// Handle Service Worker
const handleServiceWorker = async () => {
  if (!navigator.serviceWorker) return;
  await navigator.serviceWorker.register('sw.js');

  await navigator.serviceWorker.addEventListener('message', async (e) => {
    const [type, data] = e.data;
    showWarning(type !== 'ERROR', data.message);
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
    this._selectedCount = 0;
  }

  static observedAttributes = ['value', 'checked'];

  set value (val) {
    this.setAttribute('value', val);
  }

  get value () {
    return this.getAttribute('value');
  }

  set checked (val) {
    this.setAttribute('checked', val);
  }

  get checked () {
    return this.shadowRoot.querySelector('input').checked;
  }

  set selectedCount (val) {
    this._selectedCount = val;
  }

  get selectedCount () {
    return this._selectedCount;
  }

  updateSelectedCount () {
    // Count
    const siblings = this.getSiblings();
    this.selectedCount = this.getSelected(siblings).length;
  }

  createEvents () {
    const popover = this.shadowRoot.getElementById('popover');
    const deleteBtn = this.shadowRoot.getElementById('delete');
    const editBtn = this.shadowRoot.getElementById('edit');
    const openBtn = this.shadowRoot.getElementById('open');
    const downloadBtn = this.shadowRoot.getElementById('download');
    const input = this.shadowRoot.querySelector('input');

    // Select Events
    input.addEventListener('input', e => {
      this.checked = e.target.checked;
      this.dispatchEvent(new InputEvent('change', e));
    });

    // Show custom `contextmenu`
    this.shadowRoot.addEventListener('contextmenu', e => {
      e.preventDefault();
      const popover = this.shadowRoot.getElementById('popover');
      popover.style.top = `${e.offsetY}px`;
      popover.style.left = `${e.offsetX}px`;
      popover.style.removeProperty('visibility');
    }, { capture: true });
    // Hidden menu when click outside
    document.addEventListener('click', () => (popover.style.visibility = 'hidden'));
    // Hidden menu when other menu show
    document.addEventListener('auxclick', (e) => {
      if (!this.contains(e.target)) {
        popover.style.visibility = 'hidden';
      }
    });
    // Menu Buttons Events - Delete Event
    deleteBtn.addEventListener('click', async () => {
      await postMessage(['DELETE_DATA', this.value]);
    });
    // ## Menu Buttons Events - Edit Event
    editBtn.addEventListener('click', () => {
    });
    // Menu Buttons Events - Open New Tab Event
    openBtn.addEventListener('click', async () => {
      const url = await fetch(this.url).then(res => res.blob()).then(blob => URL.createObjectURL(blob));
      window.open((this.isVideo ? '../videoPreview.html' + '?src=' : '') + url, '_blank');
    });
    // Menu Buttons Events - Download Event
    downloadBtn.download = this.title;
    popover.style.visibility = 'hidden';
    fetch(this.url)
      .then(res => res.blob())
      .then(blob => URL.createObjectURL(blob))
      .then(url => downloadBtn.href = url);
  }

  getSiblings () {
    return this.parentElement.querySelectorAll(this.tagName.toLowerCase());
  }

  getSelected (selectors) {
    return [...selectors].filter(({ checked }) => checked);
  }

  updateContent () {
    const filePreview = document.createElement('object');
    const videoPreview = document.createElement('video');
    const label = document.createElement('p');

    videoPreview.controls = true;

    filePreview.slot = 'file';
    videoPreview.slot = 'file';
    label.slot = 'label';

    filePreview.data = this.url;
    videoPreview.src = this.url;
    label.innerHTML = this.title;

    this.appendChild(label);
    if (this.isVideo) {
      this.appendChild(videoPreview);
    } else {
      this.appendChild(filePreview);
    }
  }

  connectedCallback () {
    this.createEvents();
    this.updateContent();
  }

  attributeChangedCallback (name, oldVal, currentValue) {
    if (name === 'checked') {
      this.shadowRoot.querySelector('input').checked = JSON.parse(currentValue);
      this.updateSelectedCount();
      this.dispatchEvent(new InputEvent('change'));
    }
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
  selected.removeAttribute('data-selected');
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
    customPreview.value = id;
    customPreview.url = file;
    customPreview.title = title;
    customPreview.isVideo = isVideo;
    customPreview.slot = 'content';

    customPreview.addEventListener('change', e => {
      selected.setAttribute('data-selected', e.target.selectedCount);
    });
    return customPreview;
  }));
  content.replaceChildren(...previews);
};

clearBtn.onclick = () => {
  dialog.showModal();
  dialogConfirm.onclick = async () => {
    await postMessage(['CLEAR_DB']);
    dialog.close();
  };
  dialogCancel.onclick = () => dialog.close();
};

reloadBtn.onclick = () => {
  previewObject.data = '';
  previewVideo.src = '';
  previewObject.slot = 'file';
  previewVideo.removeAttribute('slot');
  form.reset();
};

unselectBtn.onclick = () => {
  document.querySelectorAll('custom-preview').forEach(child => child.toggleAttribute('checked', false));
};

multiDeleteBtn.onclick = async () => {
  const customPreview = document.querySelectorAll('custom-preview');
  const ids = [...customPreview].filter(({ checked }) => checked).map(({ value }) => value);

  await postMessage(['MULTI-DELETE', ids]);
};
multiDownloadBtn.onclick = () => {
};

// Close settings click outside
document.onclick = e => {
  if (!settings.contains(e.target)) settings.open = false;
};

document.onkeydown = e => {
  if (e.key === 'Escape') settings.open = false;
};

// Search
search.oninput = () => postMessage(['SEARCH', search.value]);

postMessage(['GET_ALL']).then();
