const sidePanelToggle = (tabId) => {
  let open;
  chrome.commands.onCommand.addListener(async command => {
    if (command !== 'show-panel') return;
    chrome.sidePanel.setOptions({ enabled: !open });
    chrome.sidePanel.open({ tabId });
    open = !open;
  });
};

chrome.tabs.query({
  active: true,
  currentWindow: true
}).then(res => {
  const [{ id }] = res;
  sidePanelToggle(id);
});
