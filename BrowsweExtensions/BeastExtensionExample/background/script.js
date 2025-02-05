chrome.runtime.onInstalled.addListener( () => {
  chrome.contextMenus.create({
    id: "0",
    title: 'None',
    contexts: ['all'],
    type: 'radio',
    checked: true
  })
  chrome.contextMenus.create({
    id: "1",
    title: 'Blue',
    contexts: ['all'],
    type: 'radio'
  })
  chrome.contextMenus.create({
    id: "2",
    title: 'Yellow',
    contexts: ['all'],
    type: 'radio'

  })
  chrome.contextMenus.create({
    id: "3",
    title: 'Red',
    contexts: ['all'],
    type: 'radio'

  })
  chrome.contextMenus.create({
    id: "4",
    title: 'Green',
    contexts: ['all'],
    type: 'radio'
  })

    chrome.contextMenus.onClicked.addListener( (info, tab) => {
      const style = `
    [data-text-color="blue"] p {color: blue;} 
    [data-text-color="yellow"] p {color: yellow;} 
    [data-text-color="red"] p {color: red;} 
    [data-text-color="green"] p {color: green;} 
  `
      if(info.menuItemId === "0")
        chrome.scripting.removeCSS({css: style, target: {tabId: tab.id}})
      else
        chrome.scripting.insertCSS({css: style, target: {tabId: tab.id}})

      chrome.scripting.executeScript({func: function() {
        chrome.runtime.onMessage.addListener((message) => {
          switch(message.option) {
            case "default": {
              document.body.removeAttribute("data-text-color")
              break;
            }
            case "custom-color": {
              document.body.setAttribute("data-text-color", message.color)
              break;
            }
          }
        })
        }, target: {tabId: tab.id}})

      switch (info.menuItemId) {
        case "1":
          chrome.tabs.sendMessage(tab.id, { option: `custom-color`, color: "blue" });
          break;
        case "2":
          chrome.tabs.sendMessage(tab.id, { option: `custom-color`, color: "yellow" });
          break;
        case "3":
          chrome.tabs.sendMessage(tab.id, { option: `custom-color`, color: "red" });
          break;
        case "4":
          chrome.tabs.sendMessage(tab.id, { option: `custom-color`, color: "green" });
          break;
        default:
          chrome.tabs.sendMessage(tab.id, { option: `default` });
          break;
      }
    })
})



