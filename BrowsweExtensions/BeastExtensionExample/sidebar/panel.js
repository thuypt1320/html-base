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

const onReset = (tabId) => {
  chrome.scripting.removeCSS({
    css: hidePage,
    target: { tabId: tabId }
  });

  chrome.scripting.removeCSS({
    css: style,
    target: { tabId: tabId }
  });
};

const executeScript = (tabId) => {
  chrome.scripting.executeScript({
    target: { tabId },
    files: ['content_scripts/beastify.js']
  });
  chrome.scripting.executeScript({
    target: { tabId },
    func: function () {
      chrome.runtime.onMessage.addListener(message => {
        if (!message.color) {
          document.body.removeAttribute('data-text-color');
        } else {
          document.body.setAttribute('data-text-color', message.color);
        }
      });
    },
  });
};

const onChange = (tabId) => {
  const values = Object.fromEntries(new FormData(form).entries());
  chrome.tabs.sendMessage(tabId, values);

  if (!values?.color) {
    chrome.scripting.removeCSS({
      css: style,
      target: { tabId }
    });
  }
  if (!values?.beast) {
    onReset(tabId);
  } else {
    chrome.scripting.insertCSS({
      css: hidePage,
      target: { tabId }
    }).then(() => {
      chrome.tabs.sendMessage(tabId, {
        command: 'beastify',
        beastURL: chrome.runtime.getURL(`beasts/${values?.beast}.jpg`)
      });
    });
  }

  chrome.scripting.insertCSS({
    css: style,
    target: { tabId }
  });
  executeScript(tabId);
};

const handleScript = () => {
  try {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }).then(([{ id: tabId }]) => {
      executeScript(tabId);
      reset.addEventListener('click', () => onReset(tabId));
      form.addEventListener('change', () => onChange(tabId));
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
