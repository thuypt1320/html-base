/**
 * CSS to hide everything on the page,
 * except for elements that have the "beastify-image" class.
 */
const hidePage = `body > :not(.beastify-image) {
                    display: none;
                  }`;

/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks () {
  document.addEventListener('click', (e) => {

    /**
     * Given the name of a beast, get the URL to the corresponding image.
     */
    function beastNameToURL (beastName) {
      switch (beastName) {
        case 'Frog':
          return chrome.runtime.getURL('beasts/frog.jpg');
        case 'Snake':
          return chrome.runtime.getURL('beasts/snake.jpg');
        case 'Turtle':
          return chrome.runtime.getURL('beasts/turtle.jpg');
      }
    }

    /**
     * Insert the page-hiding CSS into the active tab,
     * then get the beast URL and
     * send a "beastify" message to the content script in the active tab.
     */
    function beastify (tabs) {
      // V2 → V3 chrome.tabs.insertCSS → chrome.scripting.insertCSS
      // required: `target`, `code` → `css`
      chrome.scripting.insertCSS({
        css: hidePage,
        target: { tabId: tabs[0].id }
      }).then(() => {
        const url = beastNameToURL(e.target.textContent);
        chrome.tabs.sendMessage(tabs[0].id, {
          command: 'beastify',
          beastURL: url
        });
      });
    }

    /**
     * Remove the page-hiding CSS from the active tab,
     * send a "reset" message to the content script in the active tab.
     */
    function reset (tabs) {
      // V2 → V3 chrome.tabs.insertCSS → chrome.scripting.insertCSS
      // required: `target`, `code` → `css`
      chrome.scripting.removeCSS({
        css: hidePage,
        target: { tabId: tabs[0].id }
      }).then(() => {
        chrome.tabs.sendMessage(tabs[0].id, {
          command: 'reset',
        });
      });
    }

    /**
     * Just log the error to the console.
     */
    function reportError (error) {
      console.error(`Could not beastify: ${error}`);
    }

    /**
     * Get the active tab,
     * then call "beastify()" or "reset()" as appropriate.
     */
    if (e.target.tagName !== 'BUTTON' || !e.target.closest('#popup-content')) {
      // Ignore when click is not on a button within <div id="popup-content">.
      return;
    }
    if (e.target.type === 'reset') {
      chrome.tabs.query({
        active: true,
        currentWindow: true
      })
        .then(reset)
        .catch(reportError);
    } else if (e.target.id === 'notify') {
      chrome.notifications.create('beast', {
        title: 'Beastify',
        message: 'Hi there!',
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/beasts-32.png')
      });
      chrome.notifications.clear('beast')
    } else {
      chrome.tabs.query({
        active: true,
        currentWindow: true
      })
        .then(beastify)
        .catch(reportError);
    }
  });
}

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError (error) {
  document.querySelector('#popup-content').classList.add('hidden');
  document.querySelector('#error-content').classList.remove('hidden');
  // console.error(`Failed to execute beastify content script: ${error}`);
}

/**
 * When the popup loads, inject a content script into the active tab,
 * and add a click handler.
 * If we couldn't inject the script, handle the error.
 */

chrome.tabs.query({
  active: true,
  currentWindow: true
}).then(async ([{ id: tabId }]) => {
  // V2 → V3: chrome.tabs → chrome.scripting
  // required: `target`, `file` → `files`
  await chrome.scripting.executeScript({
    files: ['content_scripts/beastify.js'],
    target: { tabId }
  });
  listenForClicks();
}).catch(reportExecuteScriptError);




