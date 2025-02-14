const textarea = document.querySelector('textarea[name=text]');
const reset = document.querySelector('#controls [type=reset]');
const transAll = document.querySelector('#controls [type=button]');
const submit = document.querySelector('#controls [type=submit]');
const form = document.querySelector('form');
const list = document.querySelector('ul');
const textList = document.querySelector('#list');

const onChange = () => {
  textarea.removeAttribute('style');
  if (textarea.scrollHeight > textarea.style.height && textarea.value.trim()) {
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
};

const onReset = () => {
  list.replaceChildren();
  form.reset();
  textarea.removeAttribute('style');
};

textarea.addEventListener('input', onChange);
reset.addEventListener('click', onReset);
