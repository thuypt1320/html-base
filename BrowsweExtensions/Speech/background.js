importScripts('./chrome.js');

const handleToggle = () => {
  queryActive(([{ id: tabId }]) => {
    let open = false;
    const toggle = () => {
      chrome.sidePanel.setOptions({ enabled: !open });
      chrome.sidePanel.open({ tabId });
      open = !open;
    };
    onCommandPanel(toggle);
    onActionClick(toggle);
  });
};

handleToggle();
onActivated(handleToggle);
