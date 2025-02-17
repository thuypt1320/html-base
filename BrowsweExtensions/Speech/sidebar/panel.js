const selection = document.querySelector('#selection');
const play = document.querySelector('#play');
const select = document.querySelector('#voices');
const search = document.querySelector('input[type=search]');
const list = document.querySelector('datalist#list');
const form = document.querySelector('form');
const reset = document.querySelector('button[type=reset]');
const synth = window.speechSynthesis;

const onResize = () => {
  selection.removeAttribute('style');
  if (selection.scrollHeight > selection.style.height && selection.value) {
    selection.style.height = selection.scrollHeight + 'px';
  }
};
const dispatchResize = () => selection.dispatchEvent(new InputEvent('input'));
const handleScript = () => {
  try {
    executeScript(() => {
      document.addEventListener('selectionchange', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const selectionText = document.getSelection().toString();

        if (selectionText.trim()) {
          chrome.runtime.sendMessage({ selectionText });
        }
      });
    });

    onMessage((message) => {
        selection.value = message.selectionText
        dispatchResize();
    });

    onCommandSpeak(() => play.dispatchEvent(new MouseEvent('click')));

  } catch {
    console.log('Not connect chrome extension!');
  }
};
const getVoices = () => {
  synth.getVoices()
    .forEach(({
      name,
      lang,
      default: defaultVoice
    }, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${name} (${lang})`;
      option.defaultSelected = defaultVoice;

      const option1 = option.cloneNode(true);
      option1.value = option.textContent;

      select.appendChild(option);
      list.appendChild(option1);
    });
};
const handleSelectVoices = () => {
  // In Google Chrome the voices are not ready on page load
  if ('onvoiceschanged' in synth) {
    synth.onvoiceschanged = getVoices;
  } else {
    getVoices();
  }
};
const onSearch = e => {
  const value = e.target.value.toLowerCase();
  const options = [...select.querySelectorAll('option')];

  let option;
  option = options.find((option) => (option.textContent.toLowerCase().includes(value)));
  if (!option) {
    option = options.find(option => option.textContent.toLowerCase().includes(...value));
  }
  if (!option) return;
  select.value = option.value;
  select.dispatchEvent(new Event('change'));
  search.hidden = true;
  search.value = '';
};
const onPlay = () => {
  play.toggleAttribute('data-play');

  const voice = synth.getVoices().at(Number(select.value));
  const utterThis = new SpeechSynthesisUtterance(selection.value);
  utterThis.voice = voice;

  synth.speak(utterThis);
  play.addEventListener('click', () => synth.resume());

  utterThis.onend = () => {
    play.toggleAttribute('data-play', false);
  };
};
const render = () => {
  handleScript();
  handleSelectVoices();
  selection.addEventListener('input', onResize);
  play.addEventListener('click', onPlay);
  search.addEventListener('change', onSearch);
  select.addEventListener('focus', e => {
    e.preventDefault();
    search.hidden = false;
    search.focus();
  });
  search.addEventListener('blur', () => {
    search.hidden = true;
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    dispatchResize();
  });
  reset.addEventListener('click', dispatchResize);
};

render();
onUpdated(render);
onActivated(render);
