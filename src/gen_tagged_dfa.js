import { regexToM1 } from "./gen";
import { minDfa } from "./lexical";
import { toNature, simplifyGraph, findSubstrings } from "./gen_dfa";
import { M1ToM2 } from "./gen_m2";
import { M2ToM3 } from "./gen_m3";
import { createM4, registerToState } from "./gen_m4";
import { reassignM3M4 } from "./reassign_m3_m4";
export function tagged_nfaToDfa(nfa) {
  "use strict";
  function getClosure(nodes) {
    let i,
      closure = [],
      stack = [],
      symbols = [],
      type = "",
      top;
    for (i = 0; i < nodes.length; i += 1) {
      stack.push(nodes[i]);
      closure.push(nodes[i]);
      if (nodes[i].type === "accept") {
        type = "accept";
      }
    }
    while (stack.length > 0) {
      top = stack.pop();
      for (i = 0; i < top.edges.length; i += 1) {
        if (top.edges[i][0] === "ϵ") {
          if (closure.indexOf(top.edges[i][1]) < 0) {
            stack.push(top.edges[i][1]);
            closure.push(top.edges[i][1]);
            if (top.edges[i][1].type === "accept") {
              type = "accept";
            }
          }
        } else {
          if (symbols.indexOf(top.edges[i][0]) < 0) {
            // console.log("symbb: ", top.edges[i][0]);
            // console.log("type: ", typeof top.edges[i][0]);
            symbols.push(top.edges[i][0]);
          }
        }
      }
    }
    closure.sort(function (a, b) {
      return a.id - b.id;
    });
    // console.log("closure: ", closure);
    symbols.sort();
    // console.log("sorted symbol: ", symbols);
    return {
      key: closure
        .map(function (x) {
          return x.id;
        })
        .join(","),
      items: closure,
      symbols: symbols,
      type: type,
      edges: [],
      trans: {},
    };
  }
  function getClosedMove(closure, symbol) {
    let i,
      j,
      node,
      nexts = [];
    for (i = 0; i < closure.items.length; i += 1) {
      node = closure.items[i];
      for (j = 0; j < node.edges.length; j += 1) {
        if (symbol === node.edges[j][0]) {
          if (nexts.indexOf(node.edges[j][1]) < 0) {
            nexts.push(node.edges[j][1]);
          }
        }
      }
    }
    return getClosure(nexts);
  }
  function toAlphaCount(n) {
    let a = "A".charCodeAt(0),
      z = "Z".charCodeAt(0),
      len = z - a + 1,
      s = "";
    while (n >= 0) {
      s = String.fromCharCode((n % len) + a) + s;
      n = Math.floor(n / len) - 1;
    }
    return s;
  }
  let i,
    first = getClosure([nfa]),
    states = {},
    front = 0,
    top,
    closure,
    queue = [first],
    count = 0;
  first.id = toAlphaCount(count);
  states[first.key] = first;
  while (front < queue.length) {
    top = queue[front];
    front += 1;
    for (i = 0; i < top.symbols.length; i += 1) {
      closure = getClosedMove(top, top.symbols[i]);
      if (!states.hasOwnProperty(closure.key)) {
        count += 1;
        closure.id = toAlphaCount(count);
        states[closure.key] = closure;
        queue.push(closure);
      }
      top.trans[top.symbols[i]] = states[closure.key];
      top.edges.push([top.symbols[i], states[closure.key]]);
    }
  }
  return first;
}

export function tagged_compile(regex, submatches) {
  let nfa = regexToM1(regex, submatches);
  let dfa = minDfa(tagged_nfaToDfa(nfa));

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
export function tagged_simplifyGraph(regex, submatches) {
  //   let after_plus = simplifyPlus(simplifyRegex(regex), submatches);
  //   const regex_spec = after_plus["regex"];
  //   const ast = regexpTree.parse(`/${regex_spec}/`);
  //   regexpTree.traverse(ast, {
  //     "*": function ({ node }) {
  //       if (node.type === "CharacterClass") {
  //         throw new Error("CharacterClass not supported");
  //       }
  //     },
  //   });

  //   const graph_json = tagged_compile(regex_spec);
  const graph_json = tagged_compile(regex, submatches);
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

// // return all indexes that is included in a certain subgroup match.
// text is already matched by plain DFA!
export function regexSubmatchState(text, tagged_simp_graph) {
  let m2_graph = M1ToM2(tagged_simp_graph);
  let m3_graph = M2ToM3(m2_graph);
  let m4_graph = createM4(tagged_simp_graph);
  let tagged_m4_graph = registerToState(m4_graph);
  let final_m3_m4 = reassignM3M4(m3_graph, tagged_m4_graph);
  // console.log("final m3: ", final_m3_m4["final_m3_graph"]);
  // console.log("final m4: ", final_m3_m4["final_m4_graph"]);

  // run reversed text via m3
  let m3_states = [];
  let m3_node = final_m3_m4["final_m3_graph"]["start_state"];
  m3_states.push(m3_node);
  for (let index = text.length - 1; index >= 0; index--) {
    m3_node =
      final_m3_m4["final_m3_graph"]["transitions"][m3_node][text[index]];
    m3_states.push(m3_node);
  }
  m3_states.reverse();
  // run m4
  let allTags = final_m3_m4["final_m4_graph"]["tags"];
  let submatch = {};
  let latest_ele = {};
  let latest_arr = {};
  for (const tag in allTags) {
    submatch[tag] = [];
    latest_ele[tag] = -2;
    latest_arr[tag] = -1;
  }
  let m4_node = final_m3_m4["final_m4_graph"]["start_state"];
  m4_node = final_m3_m4["final_m4_graph"]["transitions"][m4_node][m3_states[0]];
  for (let i = 0; i < text.length; i++) {
    for (const tag in allTags) {
      if (
        allTags[tag].has(
          JSON.stringify([
            m4_node,
            final_m3_m4["final_m4_graph"]["transitions"][m4_node][
              m3_states[i + 1]
            ],
          ])
        )
      ) {
        if (i == latest_ele[tag] + 1) {
          submatch[tag][latest_arr[tag]].push(i);
        } else {
          submatch[tag].push([i]);
          latest_arr[tag] += 1;
        }
        latest_ele[tag] = i;
      }
    }
    m4_node =
      final_m3_m4["final_m4_graph"]["transitions"][m4_node][m3_states[i + 1]];
  }

  return submatch;
}

export function finalRegexExtractState(regex, submatches, text) {
  const simp_graph = simplifyGraph(regex);
  console.log("min_dfa num states: ", simp_graph["states"].size);
  const tagged_simp_graph = tagged_simplifyGraph(regex, submatches);
  console.log("tagged dfa num states: ", tagged_simp_graph["states"].length);
  const matched_dfa = findSubstrings(simp_graph, text);
  console.log("matched dfa: ", matched_dfa);

  for (const subs of matched_dfa[1]) {
    let matched = text.slice(subs[0], subs[1] + 1);
    let tag_result = regexSubmatchState(matched, tagged_simp_graph);
    // console.log("tag result", tag_result);
    for (let index in tag_result) {
      for (let groupInd = 0; groupInd < tag_result[index].length; groupInd++) {
        console.log(
          "Group: ",
          index,
          " #",
          groupInd,
          " is ",
          matched.slice(
            tag_result[index][groupInd][0],
            tag_result[index][groupInd][0] + tag_result[index][groupInd].length
          )
        );
      }
    }
  }
}

// call after final graph of tagged dfa e.g.
// final:  {
//     states: Set(13) {
//       '0',  '1', '2',  '3',
//       '4',  '5', '6',  '7',
//       '8',  '9', '10', '11',
//       '12'
//     },
//     alphabets: Set(15) {
//       'D',
//       '/',
//       '1',
//       '2',
//       ';',
//       ' ',
//       'K',
//       'I',
//       ':',
//       'a',
//       'd',
//       'v',
//       '=',
//       'b',
//       'h'
//     },
//     start_state: '0',
//     accepted_states: Set(1) { '12' },
//     transitions: {
//       '0': { D: '4' },
//       '1': { '1': '1', '2': '1', '/': '1', ';': '2' },
//       '2': { ' ': '3' },
//       '3': { b: '11', a: '9', d: '9', v: '9' },
//       '4': { K: '5' },
//       '5': { I: '6' },
//       '6': { ':': '7' },
//       '7': { ' ': '8' },
//       '8': { a: '9', d: '9', v: '9' },
//       '9': { '=': '10' },
//       '10': { '1': '1', '2': '1', '/': '1' },
//       '11': { h: '12' },
//       '12': {}
//     },
//     tags: {
//       '0': Set(7) {
//         '["8","9"]',
//         '["3","9"]',
//         '["9","10"]',
//         '["10","1"]',
//         '["1","2"]',
//         '["2","3"]',
//         '["1","1"]'
//       },
//       '1': Set(2) { '["8","9"]', '["3","9"]' },
//       '2': Set(2) { '["10","1"]', '["1","1"]' }
//     }
//   }
// Will format transition into forward and backward, with list of transitions that lead to same state
export function formatForCircom(final_graph) {
  let og_transitions = final_graph["transitions"];
  let forward_transitions = {};
  let rev_transitions = Array.from(
    { length: final_graph["states"].size },
    () => []
  );
  for (let node in og_transitions) {
    forward_transitions[node] = {};
    let memState = {};
    for (const alp in og_transitions[node]) {
      if (!memState.hasOwnProperty(og_transitions[node][alp])) {
        memState[og_transitions[node][alp]] = [];
      }
      memState[og_transitions[node][alp]].push(alp);
      // Not sort to see original value
      // memState[og_transitions[node][alp]].sort();
    }

    for (const toState in memState) {
      forward_transitions[node][JSON.stringify(memState[toState])] = toState;
    }
  }
  for (let node in forward_transitions) {
    for (let arr in forward_transitions[node]) {
      rev_transitions[parseInt(forward_transitions[node][arr])].push([
        arr,
        node,
      ]);
    }
  }
  // Print: uncomment to print forward_tran, rev_tran after concatenating alphabets that cause the same state transition
  // console.log("og tran: ", og_transitions);
  // console.log("forward_tran: ", forward_transitions);
  // console.log("rev_tran: ", rev_transitions);

  // Careful!, it modifies final_graph
  final_graph["forward_transitions"] = forward_transitions;
  final_graph["rev_transitions"] = rev_transitions;
  return final_graph;
}
