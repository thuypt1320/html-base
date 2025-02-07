const form = document.querySelector('form');
const reset = document.querySelector('button[type="reset"]');
const style = `
    [data-text-color="blue"] p {color: blue;} 
    [data-text-color="yellow"] p {color: yellow;} 
    [data-text-color="red"] p {color: red;} 
    [data-text-color="green"] p {color: green;} 
  `;
const hidePage = `body > :not(.beastify-image) {
                    display: none;
                  }`;

const onResetBeast = tabId => chrome.scripting.removeCSS({
  css: hidePage,
  target: { tabId: tabId }
}).then(() => chrome.tabs.sendMessage(tabId, { command: 'reset' }));

const onResetColor = tabId => chrome.scripting.removeCSS({
  css: style,
  target: { tabId: tabId }
});

const executeScript = (tabId) => {
  chrome.scripting.executeScript({
    target: { tabId },
    files: ['content_scripts/beastify.js']
  });
  chrome.scripting.executeScript({
    target: { tabId },
    func: function () {
      chrome.runtime.onMessage.addListener(message => {
        if (message.command !== 'change-color') return;
        if (!message.color) {
          document.body.removeAttribute('data-text-color');
        } else {
          document.body.setAttribute('data-text-color', message.color);
        }
      });
    },
  });
};

const beasts = {
  snake: chrome.runtime.getURL('beasts/snake.jpg'),
  frog: chrome.runtime.getURL('beasts/frog.jpg'),
  turtle: chrome.runtime.getURL('beasts/turtle.jpg'),
};

const onChangeBeast = (tabId, values) => {
  onResetBeast(tabId);
  values.beast && chrome.scripting.insertCSS({
    css: hidePage,
    target: { tabId }
  }).then(() => {
    chrome.tabs.sendMessage(tabId, {
      command: 'beastify',
      beastURL: beasts[values.beast]
    });
  });
};

const onChangeColor = (tabId, values) => {
  chrome.tabs.sendMessage(tabId, { command: 'change-color', ...values });
  values.color && chrome.scripting.insertCSS({
    css: style,
    target: { tabId }
  });
};

const handleScript = () => {
  try {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }).then(([{ id: tabId }]) => {
      executeScript(tabId);
      reset.addEventListener('click', () => {
        onResetBeast(tabId);
        onResetColor(tabId);
      });
      form.addEventListener('change', (e) => {
        const values = Object.fromEntries(new FormData(form).entries());
        if (e.target.name === 'color') onChangeColor(tabId, values);
        if (e.target.name === 'beast') onChangeBeast(tabId, values);
      });
    });
  } catch (e) {
    console.log(e);
  }
};

reset.addEventListener('click', () => {
  form.reset();
  form.dispatchEvent(new Event('change'));
});

handleScript();
