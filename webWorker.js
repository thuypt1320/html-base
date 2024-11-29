const calculator = function (params) {
  if (parseInt(params[0]) && parseInt(params[1])) return params[0] * params[1];
  return '';
};

const autoResizeData = function (style) {
  const { fontSize, fontFamily, color, paddingLeft, paddingRight } = style;
  const ctx = {
    font: fontSize + ' ' + fontFamily,
    color,
  };
  const dw = parseFloat(paddingLeft) + parseFloat(paddingRight) + 12;
  return {
    ctx,
    dw,
  };
};

onmessage = function (e) {
  const { type, params } = e.data;
  if (type === 'CALC') postMessage({ type, result: calculator(params) });
  if (type === 'AUTO-RESIZE') postMessage({ type, result: autoResizeData(params) });
};
