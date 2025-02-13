const DOMAIN = `https://translate.google.com`;
const textarea = document.querySelector('textarea[name=text]');
const copyText = document.querySelector('textarea#copy');
const reset = document.querySelector('#controls [type=reset]');
const submit = document.querySelector('#controls [type=submit]');
const copy = document.querySelector('#controls [type=button]');
const form = document.querySelector('form');
const list = document.querySelector('ul');

const createUrl = text => DOMAIN + `?sl=auto&tl=vi&text=${text}&op=translate`;

const createLink = (text, url = '') => {
  if (!text.trim()) return;
  if (url && url.includes(DOMAIN)) return;

  const li = document.createElement('li');
  li.classList.add('link');
  const p = document.createElement('p');
  const span = document.createElement('span');
  const button = document.createElement('button');

  li.setAttribute('data-href', createUrl(text));
  span.title = text;
  span.textContent = text;
  button.textContent = '✕';

  p.append(span, button);
  li.append(p);
  list.appendChild(li);
  button.onclick = () => li.remove();
};
createLink(`A basic theme must define an image to add to the header, the accent color to use in the header, and the color of text used in the header:`);

const onChange = () => {
  textarea.removeAttribute('style');

  if (textarea.scrollHeight > textarea.style.height) {
    textarea.style.height = `${textarea.scrollHeight + 20}px`;
  }
};

const onSubmit = () => {
  const { text } = Object.fromEntries(new FormData(form).entries());
  window.open(createUrl(text));
};

const onReset = () => {
  list.replaceChildren();
  form.reset();
  textarea.removeAttribute('style');
};

const onCopy = () => {

};

const handleScript = () => {

  chrome.tabs.query({
    active: true,
    currentWindow: true
  }).then(async ([{
    id: tabId,
    url
  }]) => {
    chrome.scripting.executeScript({
      target: { tabId },
      func: function () {
        document.addEventListener('selectionchange', () => {
          const text = document.getSelection().toString();
          chrome.runtime.sendMessage({ text });
        });
      }
    });

    chrome.runtime.onMessage.addListener(message => {
      if (!message.text) createLink(textarea.value, url);
      textarea.value = message.text;
      textarea.dispatchEvent(new InputEvent('input'));
    });
  });
};

chrome.tabs.onActivated.addListener(async () => {
  const [{ url }] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  createLink(textarea.value, url);
  form.reset();
  textarea.dispatchEvent(new InputEvent('input'));
  handleScript();
});
chrome.commands.onCommand.addListener(async command => {
  const [{
    url,
    id: tabId
  }] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!url.includes(DOMAIN)) return;

  if (command === 'back') {
    chrome.scripting.executeScript({
      target: { tabId },
      func: function () {
        window.close();
      }
    });
  }
});
handleScript();

textarea.addEventListener('input', onChange);
submit.addEventListener('click', onSubmit);
reset.addEventListener('click', onReset);
copy.addEventListener('click', onCopy);
