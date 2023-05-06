function genInputzkRepl(text, len) {
  let result = new Array(len).fill("");
  for (let i = 0; i < text.length; i++) {
    result[i] = text.charCodeAt(i).toString();
  }
  return result;
}

module.exports = { genInputzkRepl };
