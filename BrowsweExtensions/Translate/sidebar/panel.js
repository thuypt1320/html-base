const DOMAIN = `https://translate.google.com`;
const textarea = document.querySelector('textarea[name=text]');
const copyText = document.querySelector('#list');
const reset = document.querySelector('#controls [type=reset]');
const submit = document.querySelector('#controls [type=submit]');
const copy = document.querySelector('#controls [type=button]');
const form = document.querySelector('form');
const list = document.querySelector('ul');
// Extension events, avoid error `Receiving end does not exist`
const handleAction = (cb = () => {
}) => {
  getTabs().then((tabInfo) => {
    cb(tabInfo);
  });
};

const handleActivated = (cb = () => {
}) => {
  chrome.tabs.onActivated.addListener((res) => {
    console.log('activated', res);
    cb(res);
  });
};

const handleUpdated = (cb = () => {
}) => {
  chrome.tabs.onUpdated.addListener((res) => {
    console.log('updated', res);
    cb(res);
  });
};

const createUrl = text => DOMAIN + `?sl=auto&tl=vi&text=${text}&op=translate`;

const createLink = (text) => {
  if (!text.trim()) return;
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
    id: tabId
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
      if (!message.text) createLink(textarea.value);
      textarea.value = message.text;
      textarea.dispatchEvent(new InputEvent('input'));
    });
  });
};

chrome.tabs.onActivated.addListener(async () => {
  createLink(textarea.value);
  form.reset();
  textarea.dispatchEvent(new InputEvent('input'));
  handleScript();
});
handleScript();

textarea.addEventListener('input', onChange);
submit.addEventListener('click', onSubmit);
reset.addEventListener('click', onReset);
copy.addEventListener('click', onCopy);

const getTabs = () => chrome.tabs.query({
  active: true,
  currentWindow: true
});

// #1302
const navigate = (tabId, source, target) => {
  const sameOrigin = (target, source) => {
    const targetUrl = new URL(target);
    const sourceUrl = new URL(source);
    return (targetUrl.origin === sourceUrl.origin);
  };

  if (sameOrigin(target, source)) {
    chrome.tabs.sendMessage(tabId, { target });
    return;
  }

  window.open(target);
};

const handleClickLink = () => {
  handleAction(([{
    id
  }]) => {
    list.addEventListener('click', e => {
      // if e.target = li -> send message
      // get tabId = data-tabId property

    });
    chrome.scripting.executeScript({
      target: { tabId: id },
      func: function () {
        chrome.runtime.onMessage.addListener(message => {
          location.href = message.target;
        });
      }
    });
  });
};

handleClickLink();
handleActivated(({ tabId }) => {
  list.setAttribute('data-tabId', tabId);
  handleClickLink();
});
handleUpdated(({ tabId }) => {
  list.setAttribute('data-tabId', tabId);

  handleClickLink();
});
