const queryActive = (cb) => chrome.tabs.query({
  active: true,
  currentWindow: true
}).then(cb);
const executeScript = (cb) => queryActive(([{ id }]) => chrome.scripting.executeScript({
  target: { tabId: id },
  func: cb
}));

const onMessage = (cb) => chrome.runtime.onMessage.addListener(cb);
const onCommand = cb => chrome.commands.onCommand.addListener(cb);
const onActionClick = cb => chrome.action.onClicked.addListener(cb);
const onCommandPanel = cb => onCommand(command => command === 'show-panel' ? cb() : null);
const onCommandSpeak = cb => onCommand(command => command === 'speak' ? cb() : null);
const onActivated = cb => chrome.tabs.onActivated.addListener(cb);
const onUpdated = cb => chrome.tabs.onUpdated.addListener(cb);
