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
