importScripts('common/scripts.js');
const sidePanelToggle = (tabId,) => {
  let open;
  const toggle = () => {
    chrome.sidePanel.setOptions({ enabled: !open });
    chrome.sidePanel.open({ tabId });
    open = !open;
  };
  chrome.commands.onCommand.addListener(async command => {
    if (command !== 'show-panel') return;
    toggle();
  });
  chrome.action.onClicked.addListener(toggle);
};

const handleToggle = () => {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }).then(res => {
    const [{ id }] = res;
    sidePanelToggle(id);
  });
};

const onFocusChanged = cb => chrome.windows.onFocusChanged.addListener(cb);

// Omnibox
const SPLIT = ' of ';
chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description: `Suggest Default - Go to <url>Translate Google</url>`
  });
});
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  suggest([{
    description: `Suggest Translate- <match>"${text.slice(0, 30)}..."</match> in Chinese`,
    content: 'Chinese' + SPLIT + text,
  }, {
    description: `Suggest Translate- <match>"${text.slice(0, 30)}..."</match> in English`,
    content: 'English' + SPLIT + text,
  }, {
    description: `Suggest Translate- <match>"${text.slice(0, 30)}..."</match> in Japanese`,
    content: 'Japanese' + SPLIT + text,
  }]);
});

chrome.omnibox.onInputEntered.addListener((content) => {
  const [lang, ...rest] = content.split(SPLIT);

  const language = {
    Vietnamese: 'vi',
    Chinese: 'zh-CN',
    English: 'en',
    Japanese: 'ja'
  };
  const text = language[lang] ? rest.join(SPLIT) : content;

  queryActive(([{ url }]) => {
    const target = createUrl(text, language[lang]);
    if (sameOrigin(target, url)) {
      chrome.tabs.update({ url: target });
    } else {
      chrome.tabs.create({ url: target });
    }
  });
});

handleToggle();
onFocusChanged(handleToggle);
