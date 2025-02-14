const DOMAIN = `https://translate.google.com`;
const createUrl = (text, lang = 'vi') => DOMAIN + `?sl=auto&tl=${lang}&text=${encodeURIComponent(text)}&op=translate`;

const sameOrigin = (tar, src) => {
  const tarUrl = new URL(tar);
  const srcUrl = new URL(src);
  return tarUrl.origin === srcUrl.origin;
};

const getActiveTab = async () => chrome.tabs.query({
  active: true,
  currentWindow: true
}).then(([res]) => res);

const queryActive = async cb => chrome.tabs.query({
  active: true,
  currentWindow: true
}).then(cb);
const onMessage = cb => chrome.runtime.onMessage.addListener(cb);
const executeScript = async cb => queryActive(([{ id }]) => chrome.scripting.executeScript({
  target: { tabId: id },
  func: cb
}));
const onActivated = cb => chrome.tabs.onActivated.addListener(cb);
const onUpdated = cb => chrome.tabs.onUpdated.addListener(cb);

const navigate = (to) => queryActive(([{
  url,
  id
}]) => {
  if (to === url) return;
  if (sameOrigin(to, url)) return chrome.tabs.update(id, { url: to });// ≅ window.location.replace(<url>)
  window.open(to);
});
