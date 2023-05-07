import { regexToNfa, minDfa, nfaToDfa } from "./lexical";

const a2z = "a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z";
const A2Z = "A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z";
const r0to9 = "0|1|2|3|4|5|6|7|8|9";
const alphanum = `${a2z}|${A2Z}|${r0to9}`;

const key_chars = `(${a2z})`;
// hypothesis: is key_chars in email only limit to these chars below?
const succ_key_chars = "(v|a|c|d|s|t|h)";
const catch_all =
  "(0|1|2|3|4|5|6|7|8|9|a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|!|\"|#|$|%|&|'|\\(|\\)|\\*|\\+|,|-|.|\\/|:|;|<|=|>|\\?|@|\\[|\\\\|]|^|_|`|{|\\||}|~| |\t|\n|\r|\x0b|\x0c)";
// Not the same: \\[ and ]
const catch_all_without_semicolon =
  "(0|1|2|3|4|5|6|7|8|9|a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|!|\"|#|$|%|&|'|\\(|\\)|\\*|\\+|,|-|.|\\/|:|<|=|>|\\?|@|\\[|\\\\|]|^|_|`|{|\\||}|~| |\t|\n|\r|\x0b|\x0c)";

const email_chars = `${alphanum}|_|.|-`;
const base_64 = `(${alphanum}|\\+|\\/|=)`;
const word_char = `(${alphanum}|_)`;
const a2z_nosep = "abcdefghijklmnopqrstuvwxyz";
const A2Z_nosep = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const r0to9_nosep = "0123456789";
const email_address_regex = `([a-zA-Z0-9._%\\+-]+@[a-zA-Z0-9.-]+.[a-zA-Z0-9]+)`;

export function simplifyRegex(str) {
  // Replace all A-Z with A2Z etc
  let combined_nosep = str
    .replaceAll("A-Z", A2Z_nosep)
    .replaceAll("a-z", a2z_nosep)
    .replaceAll("0-9", r0to9_nosep)
    .replaceAll("\\w", A2Z_nosep + r0to9_nosep + a2z_nosep);

  function addPipeInsideBrackets(str) {
    let result = "";
    let insideBrackets = false;
    let index = 0;
    let currChar;
    while (true) {
      currChar = str[index];
      if (index >= str.length) {
        break;
      }
      if (currChar === "[") {
        result += "(";
        insideBrackets = true;
        index++;
        continue;
      } else if (currChar === "]") {
        currChar = insideBrackets ? ")" : currChar;
        insideBrackets = false;
      }
      if (currChar === "\\") {
        index++;
        currChar = str[index];
        // in case with escape +
        if (currChar === "+") {
          currChar = "\\+";
        }
        if (currChar === "*") {
          currChar = "\\*";
        }
        if (currChar === "/") {
          currChar = "\\/";
        }
        if (currChar === "?") {
          currChar = "\\?";
        }
        if (currChar === "(") {
          currChar = "\\(";
        }
        if (currChar === ")") {
          currChar = "\\)";
        }
        if (currChar === "[") {
          currChar = "\\[";
        }
        if (currChar === "\\") {
          currChar = "\\\\";
        }
        if (currChar === "|") {
          currChar = "\\|";
        }
        // } else if (currChar === "n") {
        //   currChar = "\\n";
        // } else if (currChar === "t") {
        //   currChar = "\\t";
        // } else if (currChar === "r") {
        //   currChar = "\\r";
        // }
      }
      result += insideBrackets ? "|" + currChar : currChar;
      index++;
    }
    return result.replaceAll("(|", "(");
  }

  return addPipeInsideBrackets(combined_nosep);
}
export function simplifyPlus(regex, submatches) {
  // console.log("og submatches: ", submatches);
  let stack = [];
  let new_submatches = {};
  // console.log("gen dfa: ", submatches);
  for (const submatch of submatches) {
    new_submatches[submatch] = [[...submatch]];
  }

  // console.log("og submatch: ", new_submatches);
  let numStack = 0;
  let index_para = {};
  let i = 0;
  while (i < regex.length) {
    // console.log("char: ", i, " :  ", regex[i]);
    if (regex[i] == "\\") {
      stack.push(regex[i]);
      stack.push(regex[i + 1]);
      i += 2;
      continue;
    }
    if (regex[i] == "(") {
      numStack += 1;
      index_para[numStack] = stack.length;
    }
    if (regex[i] == ")") {
      numStack -= 1;
    }
    if (regex[i] == "+") {
      let popGroup = "";
      let j = stack.length - 1;
      // consolidate from each alphabet to one string
      while (j >= index_para[numStack + 1]) {
        // popGroup = stack.pop() + popGroup;
        popGroup = stack[j] + popGroup;
        j -= 1;
      }

      // console.log("len pop: ", popGroup.length);
      // console.log("curr i: ", i);
      // console.log("pop len: ", popGroup.length);
      // console.log("i regex: ", i);
      for (const key in new_submatches) {
        // console.log("key sp: ", key.split(",")[1]);
        // console.log("border: ", index_para[numStack + 1]);
        // if submatch in that () that got extended by +
        let len_before = new_submatches[key].length;

        if (
          key.split(",")[1] > index_para[numStack + 1] &&
          key.split(",")[1] <= i - 1
        ) {
          // console.log("bef: ", new_submatches);
          for (let k = 0; k < len_before; k++) {
            new_submatches[key].push([
              new_submatches[key][k][0] + popGroup.length,
              new_submatches[key][k][1] + popGroup.length,
            ]);
          }
          // console.log("aff1: ", submatches);
        }
        // if submatch end is affected  by enlarging this group
        else if (key.split(",")[1] > i) {
          // console.log("b2: ", submatches);
          for (let k = 0; k < len_before; k++) {
            if (key.split(",")[0] > i) {
              new_submatches[key][k][0] += popGroup.length;
            }
            new_submatches[key][k][1] += popGroup.length;
          }
          // console.log("aff2: ", submatches);
        }
        // console.log("NEW SUB: ", new_submatches);
      }

      popGroup = popGroup + "*";
      // console.log("curr Stack: ", stack);
      // console.log("popGroup ", popGroup);
      stack.push(popGroup);
      // console.log("stack after: ", stack);
      i += 1;
      continue;
    }
    stack.push(regex[i]);
    i += 1;
  }

  let almost_submatches = [];
  // console.log("b4: ", submatches);
  // console.log("b5: ", new_submatches);
  for (const submatch of submatches) {
    almost_submatches.push(new_submatches[submatch[0] + "," + submatch[1]]);
  }
  let regex_for_parse = stack.join("");
  let regex_for_show = "";
  let escape_pos = [];
  for (let i = 0; i < regex_for_parse.length; i++) {
    if (regex_for_parse[i] != "\\") {
      regex_for_show += regex_for_parse[i];
    } else {
      escape_pos.push(i);
    }
  }
  escape_pos.sort((a, b) => a - b);
  let final_submatches = [];
  for (const group of almost_submatches) {
    let group_arr = [];
    for (const index of group) {
      group_arr.push([
        index[0] - findIndex(escape_pos, index[0]),
        index[1] - findIndex(escape_pos, index[1]),
      ]);
    }
    final_submatches.push(group_arr);
  }
  // console.log("almost: ", almost_submatches);
  // console.log("final sub: ", final_submatches);
  return {
    regex: regex_for_parse,
    submatches: almost_submatches,
    regex_show: regex_for_show,
    final_submatches: final_submatches,
  };
}

function findIndex(arr, num) {
  let left = 0;
  let right = arr.length - 1;
  let mid = 0;

  while (left <= right) {
    mid = Math.floor((left + right) / 2);

    if (arr[mid] < num) {
      left = mid + 1;
    } else if (arr[mid] > num) {
      right = mid - 1;
    } else {
      return mid;
    }
  }

  return arr[mid] < num ? mid + 1 : mid;
}

export function toNature(col) {
  let i,
    j,
    base = "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    result = 0;
  if ("1" <= col[0] && col[0] <= "9") {
    result = parseInt(col, 10);
  } else {
    for (i = 0, j = col.length - 1; i < col.length; i += 1, j -= 1) {
      result += Math.pow(base.length, j) * (base.indexOf(col[i]) + 1);
    }
  }
  return result;
}
function compile(regex) {
  let nfa = regexToNfa(regex);
  let dfa = minDfa(nfaToDfa(nfa));

  let i,
    j,
    states = {},
    nodes = [],
    stack = [dfa],
    symbols = [],
    top;

  while (stack.length > 0) {
    top = stack.pop();
    if (!states.hasOwnProperty(top.id)) {
      states[top.id] = top;
      top.nature = toNature(top.id);
      nodes.push(top);
      for (i = 0; i < top.edges.length; i += 1) {
        if (top.edges[i][0] !== "ϵ" && symbols.indexOf(top.edges[i][0]) < 0) {
          symbols.push(top.edges[i][0]);
        }
        stack.push(top.edges[i][1]);
      }
    }
  }
  nodes.sort(function (a, b) {
    return a.nature - b.nature;
  });
  symbols.sort();

  let graph = [];
  for (let i = 0; i < nodes.length; i += 1) {
    let curr = {};
    curr.type = nodes[i].type;
    curr.edges = {};
    for (let j = 0; j < symbols.length; j += 1) {
      if (nodes[i].trans.hasOwnProperty(symbols[j])) {
        curr.edges[symbols[j]] = nodes[i].trans[symbols[j]].nature - 1;
      }
    }
    graph[nodes[i].nature - 1] = curr;
  }
  //   console.log("lexical out: ", JSON.stringify(graph));
  return graph;
}
export function simplifyGraph(regex) {
  const regex_spec = simplifyRegex(regex);
  //   const ast = regexpTree.parse(`/${regex_spec}/`);
  //   regexpTree.traverse(ast, {
  //     "*": function ({ node }) {
  //       if (node.type === "CharacterClass") {
  //         throw new Error("CharacterClass not supported");
  //       }
  //     },
  //   });

  const graph_json = compile(regex_spec);
  // console.log("jern here");
  // console.log(graph_json);
  const N = graph_json.length;
  let states = [];
  let alphabets = new Set();
  let start_state = "0";
  let accepted_states = new Set();
  let transitions = {};
  for (let i = 0; i < N; i++) {
    states.push(i.toString());
    transitions[i.toString()] = {};
  }

  //loop through all the graph
  for (let i = 0; i < N; i++) {
    if (graph_json[i]["type"] == "accept") {
      accepted_states.add(i.toString());
    }
    if (graph_json[i]["edges"] != {}) {
      const keys = Object.keys(graph_json[i]["edges"]);
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j];
        let arr_key = key.substring(1, key.length - 1).split(",");
        for (let k = 0; k < arr_key.length; k++) {
          let alp = arr_key[k].substring(1, arr_key[k].length - 1);
          if (!(alp in alphabets)) {
            alphabets.add(alp);
          }
          transitions[i][alp] = graph_json[i]["edges"][key].toString();
        }
      }
    }
  }

  return {
    states: states,
    alphabets: alphabets,
    start_state: start_state,
    accepted_states: accepted_states,
    transitions: transitions,
  };
}

// Define a function to check whether a string is accepted by the finite automata
function accepts(simp_graph, str) {
  let state = simp_graph["start_state"];
  for (let i = 0; i < str.length; i++) {
    const symbol = str[i];
    if (simp_graph["transitions"][state][symbol]) {
      state = simp_graph["transitions"][state][symbol];
    } else {
      return false;
    }
  }
  return simp_graph["accepted_states"].has(state);
}
export function findSubstrings(simp_graph, text) {
  const substrings = [];
  const indexes = [];
  for (let i = 0; i < text.length; i++) {
    for (let j = i; j < text.length; j++) {
      const substring = text.slice(i, j + 1);
      if (accepts(simp_graph, substring)) {
        substrings.push(substring);
        indexes.push([i, j]);
      }
    }
  }
  // indexes is inclusive at the end
  // return [substrings, indexes];
  return [substrings, indexes];
}

// module.exports = {
//   simplifyGraph,
//   findSubstrings,
//   simplifyRegex,
//   simplifyPlus,
//   toNature,
// };
