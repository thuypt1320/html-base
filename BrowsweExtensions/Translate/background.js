chrome.tabs.query({
  active: true,
  currentWindow: true
}).then(([{ id: tabId }]) => {
  let open = false;
  chrome.commands.onCommand.addListener(command => {
    if (command === 'show-panel') {
      chrome.sidePanel.setOptions({ enabled: !open });
      if (!open) chrome.sidePanel.open({ tabId });
      open = !open;
    }
  });

});
