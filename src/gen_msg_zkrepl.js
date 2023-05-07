export function genInputzkRepl(text, len) {
  let result = [];
  for (let i = 0; i < text.length; i++) {
    result.push(text.charCodeAt(i).toString());
  }
  for (let j = text.length; j < len; j++) {
    result.push("");
  }
  // console.log("ress: ", result);
  return result;
}

// module.exports = { genInputzkRepl };
