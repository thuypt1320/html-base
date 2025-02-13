chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: '',
    title: 'None',
    checked: true
  });
  chrome.contextMenus.create({
    id: 'blue',
    title: 'Blue',
  });
  chrome.contextMenus.create({
    id: 'yellow',
    title: 'Yellow',
  });
  chrome.contextMenus.create({
    id: 'red',
    title: 'Red',

  });
  chrome.contextMenus.create({
    id: 'green',
    title: 'Green',
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    const style = `
    [data-text-color="blue"] p {color: blue;} 
    [data-text-color="yellow"] p {color: yellow;} 
    [data-text-color="red"] p {color: red;} 
    [data-text-color="green"] p {color: green;} 
  `;
    if (!info.menuItemId) {
      chrome.scripting.removeCSS({
        css: style,
        target: { tabId: tab.id }
      });
    } else {
      chrome.scripting.insertCSS({
        css: style,
        target: { tabId: tab.id }
      });
    }

    chrome.scripting.executeScript({
      func: function () {
        chrome.runtime.onMessage.addListener((message) => {
          if (!message.color) {
            document.body.removeAttribute('data-text-color');
          } else {
            document.body.setAttribute('data-text-color', message.color);
          }
        });
      },
      target: { tabId: tab.id }
    });

    chrome.tabs.sendMessage(tab.id, { color: info.menuItemId });
  });
});

chrome.omnibox.onInputStarted.addListener(function () {
  console.log('💬 onInputStarted');

  chrome.omnibox.setDefaultSuggestion({
    description: 'Here is a default <match>suggestion</match>. <url>It\'s <match>url</match> here</url>'
  });
});
chrome.omnibox.onInputEntered.addListener((text) => {
  // Encode user input for special characters , / ? : @ & = + $ #
  const newURL = 'https://www.google.com/search?q=' + encodeURIComponent(text);
  chrome.tabs.create({ url: newURL });
});

// Handle command - show panel
chrome.tabs.query({
  active: true,
  currentWindow: true
}).then(([{ id: tabId }]) => {
  let open = false;
  chrome.commands.onCommand.addListener(command => {
    if (command === 'show-panel') {
      chrome.sidePanel.setOptions({ enabled: !open });
      chrome.sidePanel.open({ tabId });
      open = !open;
    }
  });
});
