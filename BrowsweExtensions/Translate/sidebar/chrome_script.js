const DOMAIN = `https://translate.google.com`;
const createUrl = text => DOMAIN + `?sl=auto&tl=vi&text=${encodeURIComponent(text)}&op=translate`;

const checkExist = (text) => [...list.querySelectorAll('li span')].find(item => item.textContent === text);

const createLink = (text) => {
  if (!text.trim()) return;
  if (checkExist(text)) return;
  const li = document.createElement('li');
  li.classList.add('link');
  const p = document.createElement('p');
  const span = document.createElement('span');
  const button = document.createElement('button');

  li.href = createUrl(text);
  span.title = text;
  span.textContent = text;
  button.textContent = '✕';

  p.append(span, button);
  li.append(p);
  // Add new item at the top of list
  list.insertBefore(li, list.querySelector('li:first-child'));
  button.onclick = () => li.remove();

  return li;
};
const textareaChange = (text) => {
  textarea.value = text;
  textarea.dispatchEvent(new InputEvent('input'));
};

const sameOrigin = (tar, src) => {
  const tarUrl = new URL(tar);
  const srcUrl = new URL(src);
  return tarUrl.origin === srcUrl.origin;
};

const getActiveTab = async () => chrome.tabs.query({
  active: true,
  currentWindow: true
}).then(([res]) => res);

const queryActive = async cb => chrome.tabs.query({
  active: true,
  currentWindow: true
}).then(cb);
const onMessage = cb => chrome.runtime.onMessage.addListener(cb);
const executeScript = async cb => queryActive(([{ id }]) => chrome.scripting.executeScript({
  target: { tabId: id },
  func: cb
}));
const onActivated = cb => chrome.tabs.onActivated.addListener(cb);
const onUpdated = cb => chrome.tabs.onUpdated.addListener(cb);

const navigate = (to) => queryActive(([{
  url,
  id
}]) => {
  if (to === url) return;
  if (sameOrigin(to, url)) return chrome.tabs.update(id, { url: to });// ≅ window.location.replace(<url>)
  window.open(to);
});
const handleClickLink = (target) => target.addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON') return;
  navigate(target.href);
});

// Insert selection text from current tab to textarea of extension
const handleSelectionText = async () => {
  const { url } = await getActiveTab();
  if (sameOrigin(url, DOMAIN)) return;

  executeScript(() => {
    const runtimeSendMessage = async message => chrome.runtime.sendMessage(message);
    document.addEventListener('selectionchange', (e) => {
      if (['TEXTAREA', 'INPUT'].includes(e.target.tagName)) return;
      const selectionText = document.getSelection().toString();
      if (!selectionText.trim()) {
        runtimeSendMessage({ command: 'create-link' });
      } else {
        runtimeSendMessage({ selectionText });
      }
    });
  });

  onMessage(message => {
    if (message.selectionText) textareaChange(message.selectionText);
    if (message.command === 'create-link') {
      const li = createLink(textarea.value);
      textareaChange('');
      handleClickLink(li);
    }
  });
};
const handleTextList = () => {
  const observer = new MutationObserver(() => {
    textList.textContent = '';
    list.querySelectorAll('li span').forEach((span) => {
      textList.textContent = [textList.textContent, '• ' + span.textContent].join('\n').trim();
      transAll.href = textList.textContent;
    });
  });

  observer.observe(list, {
    subtree: true,
    childList: true
  });
};

transAll.addEventListener('click', () => navigate(createUrl(textList.textContent)));
submit.addEventListener('click', () => navigate(createUrl(textarea.value)));

handleTextList();
handleSelectionText().then();
onActivated(handleSelectionText);
onUpdated(handleSelectionText());
