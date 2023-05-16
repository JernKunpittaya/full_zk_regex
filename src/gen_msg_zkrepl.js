export function genInputzkRepl(text, len) {
  let result = [];
  let extra = 0;
  for (let i = 0; i < text.length; i++) {
    // if (text == "\n") {
    //   result.push("\r".toString());
    //   extra += 1;
    // }
    result.push(text.charCodeAt(i).toString());
  }
  for (let j = text.length + extra; j < len; j++) {
    result.push("");
  }
  // console.log("ress: ", result);
  return result;
}

// module.exports = { genInputzkRepl };
