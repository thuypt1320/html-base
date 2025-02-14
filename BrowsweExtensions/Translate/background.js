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
handleToggle();
onFocusChanged(handleToggle);
