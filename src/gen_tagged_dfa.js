const gen = require("./gen");
const lexical = require("./lexical");
const gen_dfa = require("./gen_dfa");
const regexpTree = require("regexp-tree");

function tagged_nfaToDfa(nfa) {
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

function tagged_compile(regex, submatches) {
  let nfa = gen.regexToM1(regex, submatches);
  let dfa = lexical.minDfa(tagged_nfaToDfa(nfa));

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
      top.nature = gen_dfa.toNature(top.id);
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
function tagged_simplifyGraph(regex, submatches) {
  let after_plus = gen_dfa.simplifyPlus(
    gen_dfa.simplifyRegex(regex),
    submatches
  );
  const regex_spec = after_plus["regex"];
  const ast = regexpTree.parse(`/${regex_spec}/`);
  regexpTree.traverse(ast, {
    "*": function ({ node }) {
      if (node.type === "CharacterClass") {
        throw new Error("CharacterClass not supported");
      }
    },
  });

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
// show what state transition is included for revealing a subgroup match in all tagged_dfa
// memTags {tag1: set("[from1, to1]","[from2, to2]"", ...), tag2: [...]}
// memTag {tag1: }
// boolTag{tag1: true, tag2: False}
function findMatchStateTagged(tagged_dfa) {
  // run each tag separately
  let tranGraph = tagged_dfa["transitions"];
  let allTags = {};
  let visited_tran = new Set();
  let num_outward = {};
  let track_outward = {};
  let tagged_start = {};
  let tagged_end = {};
  let old_accepted_states = tagged_dfa["accepted_states"];
  let new_accepted_states = new Set(old_accepted_states);
  for (const key in tranGraph) {
    num_outward[key] = Object.keys(tranGraph[key]).length;
    track_outward[key] = 0;
  }
  // accepted states already included
  //   for (var states of tagged_dfa["accepted_states"]){
  //     num_outward[states] = 0;
  //     track_outward[states] = 0;
  //   }

  let stack = [];
  stack.push({ node_id: tagged_dfa["start_state"], memTags: {}, boolTags: {} });

  while (stack.length > 0) {
    let { node_id, memTags, boolTags } = stack.pop();

    if (track_outward[node_id] == num_outward[node_id]) {
      for (const key in memTags) {
        if (!allTags.hasOwnProperty(key)) {
          allTags[key] = new Set();
        }
        for (const strTran of memTags[key]) {
          allTags[key].add(strTran);
        }
      }
      //   console.log("FINISH");
      continue;
    }

    for (const key in tranGraph[node_id]) {
      // if already visit that transition, skip it
      //   console.log("From: ", node_id);
      //   console.log("by: ", key);
      //   console.log("to: ", tranGraph[node_id][key]);
      track_outward[node_id] += 1;
      if (
        visited_tran.has(JSON.stringify([node_id, tranGraph[node_id][key]]))
      ) {
        // console.log("return cl memtag: ", memTags);
        continue;
      }
      // if not add this visit in
      visited_tran.add(JSON.stringify([node_id, tranGraph[node_id][key]]));
      //   track_outward[node_id] += 1;
      let cl_memTags = {};
      for (const key in memTags) {
        cl_memTags[key] = new Set(memTags[key]);
      }
      // console.log("check ", node_id, cl_memTags);
      let cl_boolTags = Object.assign({}, boolTags);
      if (key.length > 1) {
        if (key[0] == "E") {
          cl_boolTags[key[1]] = false;
          if (!tagged_end.hasOwnProperty(key[1])) {
            tagged_end[key[1]] = new Set();
          }
          tagged_end[key[1]].add(
            JSON.stringify([node_id, tranGraph[node_id][key]])
          );
        } else {
          cl_boolTags[key[1]] = true;
          if (!tagged_start.hasOwnProperty(key[1])) {
            tagged_start[key[1]] = new Set();
          }
          tagged_start[key[1]].add(
            JSON.stringify([node_id, tranGraph[node_id][key]])
          );
        }
      }
      //   console.log("bool tag: ", cl_boolTags);
      for (const boolTag in cl_boolTags) {
        if (cl_boolTags[boolTag]) {
          if (!cl_memTags.hasOwnProperty(boolTag)) {
            cl_memTags[boolTag] = new Set();
          }
          cl_memTags[boolTag].add(
            JSON.stringify([node_id, tranGraph[node_id][key]])
          );
        }
      }
      //   console.log("cl memtag: ", cl_memTags);
      stack.push({
        node_id: tranGraph[node_id][key],
        memTags: cl_memTags,
        boolTags: cl_boolTags,
      });
    }
  }
  let flat_tagged_start = [];
  for (let key in tagged_start) {
    for (let states of tagged_start[key]) {
      flat_tagged_start.push(states);
    }
  }
  // remove start_tag from alltags
  for (const key in allTags) {
    for (const val of flat_tagged_start) {
      if (allTags[key].has(val)) {
        allTags[key].delete(val);
      }
    }
  }

  // merge both tagged_start and tagged_end
  let tagged_both = {};
  for (const key in tagged_start) {
    tagged_both[key] = new Set([...tagged_start[key], ...tagged_end[key]]);
  }

  let new_tagged_both = collapseTag(tagged_both);
  //   console.log("BOTH ", new_tagged_both);
  // need to adjust number of stuffs later
  // Now edit DFA:
  let cl_tranGraph = JSON.parse(JSON.stringify(tranGraph));
  for (let ele of new_tagged_both) {
    // check if keys can be same value?
    cl_tranGraph[ele[0]] = { ...cl_tranGraph[ele[0]], ...cl_tranGraph[ele[1]] };
    if (old_accepted_states.has(ele[1])) {
      new_accepted_states.add(ele[0]);
    }
  }
  // delete those S stuffs
  for (let key in tagged_start) {
    for (let ele of tagged_start[key]) {
      let arr = JSON.parse(ele);
      delete cl_tranGraph[arr[0]]["S" + key];
    }
  }
  // delete those E stuffs
  for (let key in tagged_end) {
    for (let ele of tagged_end[key]) {
      let arr = JSON.parse(ele);
      delete cl_tranGraph[arr[0]]["E" + key];
    }
  }

  //   console.log("tagg start: ", tagged_start);
  //   console.log("allTags: ", allTags);
  //   console.log("almost final tran: ", cl_tranGraph);
  // delete node that gets gone once remove S, E
  let reached_states = new Set();
  for (let state in cl_tranGraph) {
    for (let key in cl_tranGraph[state]) {
      reached_states.add(cl_tranGraph[state][key]);
    }
  }
  reached_states.add(tagged_dfa["start_state"]);
  let deleted_states = [];
  for (let state in cl_tranGraph) {
    if (!reached_states.has(state)) {
      deleted_states.push(state);
    }
  }
  deleted_states.sort((a, b) => parseInt(a) - parseInt(b));
  let states_dic = {};
  for (let i = 0; i < tagged_dfa["states"].length; i++) {
    if (!deleted_states.includes(i.toString())) {
      states_dic[i.toString()] = (
        i - findInsertionIndex(deleted_states, i)
      ).toString();
    }
  }
  // reformat states number in states [array], alphabets [set], accepted_states [set]
  // ,transitions and allTags
  let final_tranGraph = {};
  for (let state in states_dic) {
    final_tranGraph[states_dic[state]] = {};
    for (let key in cl_tranGraph[state]) {
      final_tranGraph[states_dic[state]][key] =
        states_dic[cl_tranGraph[state][key]];
    }
  }
  //   console.log("final tran: ", final_tranGraph);
  let final_accepted_states = new Set();
  for (const ele of new_accepted_states) {
    final_accepted_states.add(states_dic[ele]);
  }
  //   console.log("final accepted: ", final_accepted_states);
  let final_states = Object.keys(final_tranGraph);
  //   console.log("final states; ", final_states);
  let final_alphabets = new Set();
  for (const ele of tagged_dfa["alphabets"]) {
    if (ele.length <= 1) {
      final_alphabets.add(ele);
    }
  }
  //   console.log("alp ", final_alphabets);
  //   console.log("all Tags: ", allTags);
  let new_tagged_both_dic = {};
  for (const ele of new_tagged_both) {
    if (!new_tagged_both_dic.hasOwnProperty(ele[1])) {
      new_tagged_both_dic[ele[1]] = new Set();
    }
    new_tagged_both_dic[ele[1]].add(ele[0]);
  }
  //   console.log("so cute: ", new_tagged_both_dic);
  //   console.log("all tags jjj: ", allTags);
  // adjust after we shifting edge of those with S, E
  let almost_allTags = {};
  for (const state in allTags) {
    almost_allTags[state] = new Set();
    // iterate inside set
    for (const subset of allTags[state]) {
      let arr = JSON.parse(subset);
      let count = 0;
      for (let group of new_tagged_both) {
        if (JSON.stringify(group) == subset) {
          count += 1;
          break;
        }
      }
      if (count == 1) {
        continue;
      }
      let fromState = new Set();
      fromState.add(arr[0]);
      let toState = new Set();
      toState.add(arr[1]);
      //   console.log("chcccc: ,", toState);
      if (new_tagged_both_dic.hasOwnProperty(arr[0])) {
        fromState = new_tagged_both_dic[arr[0]];
      }
      if (new_tagged_both_dic.hasOwnProperty(arr[1])) {
        toState = new_tagged_both_dic[arr[1]];
      }
      //   console.log("subbb: ", subset);
      //   console.log("from :", fromState);
      //   console.log("tooo: ", toState);
      for (let from of fromState) {
        for (let to of toState) {
          almost_allTags[state].add(JSON.stringify([from, to]));
        }
      }
      //   console.log(arr)
    }
  }
  //   console.log("almost: ", almost_allTags);

  let final_allTags = {};
  for (const state in almost_allTags) {
    final_allTags[state] = new Set();
    for (const tran of almost_allTags[state]) {
      let arr = JSON.parse(tran);
      //   console.log(arr);
      final_allTags[state].add(
        JSON.stringify([states_dic[arr[0]], states_dic[arr[1]]])
      );
    }
  }
  //   console.log("dicc: ", states_dic);
  //   console.log("final allTags: ", final_allTags);
  //   console.log("end: ", tagged_end);
  // print
  return {
    states: final_states,
    alphabets: final_alphabets,
    start_state: tagged_dfa["start_state"],
    accepted_states: final_accepted_states,
    transitions: final_tranGraph,
    tags: final_allTags,
  };
}

function collapseTag(tagged_start) {
  let og_tags = [];
  for (let key in tagged_start) {
    for (let states of tagged_start[key]) {
      const arr = JSON.parse(states);
      og_tags.push(arr);
    }
  }
  //   console.log("og tag: ", og_tags);
  let old_stack = Array.from(og_tags);
  let new_stack = [];
  let count = 0;
  while (old_stack.length != new_stack.length) {
    if (count != 0) {
      old_stack = new_stack;
    }
    count = 1;
    new_stack = [];
    let mem = new Set();
    for (let i = 0; i < old_stack.length; i++) {
      for (let j = 0; j < old_stack.length; j++) {
        if (old_stack[i][1] == old_stack[j][0] && i != j) {
          new_stack.push([old_stack[i][0], old_stack[j][1]]);
          mem.add(i);
          mem.add(j);
        }
      }
    }
    for (let k = 0; k < old_stack.length; k++) {
      if (!mem.has(k)) {
        new_stack.push(old_stack[k]);
      }
    }
  }
  return new_stack;
}

function findInsertionIndex(arr, target) {
  let left = 0;
  let right = arr.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);

    if (Number(arr[mid]) < Number(target)) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

// // return all indexes that is included in a certain subgroup match.
// text is already matched by plain DFA!
function regexSubmatchState(text, tagged_simp_graph) {
  let final_graph = findMatchStateTagged(tagged_simp_graph);
  let allTags = final_graph["tags"];
  let transitions = final_graph["transitions"];
  console.log("final: ", final_graph);
  //   console.log("tran: ", transitions);
  //   console.log("all tags: ", allTags);
  let submatch = {};
  let latest_ele = {};
  let latest_arr = {};
  for (const tag in allTags) {
    submatch[tag] = [];
    latest_ele[tag] = 0;
    latest_arr[tag] = -1;
  }
  // run through Transition
  let node = final_graph["start_state"];

  for (let i = 0; i < text.length; i++) {
    for (const tag in allTags) {
      if (
        allTags[tag].has(JSON.stringify([node, transitions[node][text[i]]]))
      ) {
        if (i == latest_ele[tag] + 1) {
          submatch[tag][latest_arr[tag]].push(i);
          latest_ele[tag] = i;
        } else {
          submatch[tag].push([i]);
          latest_arr[tag] += 1;
        }
        latest_ele[tag] = i;
      }
    }
    node = transitions[node][text[i]];
  }
  return submatch;
}

function finalRegexExtractState(regex, submatches, text) {
  const simp_graph = gen_dfa.simplifyGraph(regex);
  console.log("min_dfa num states: ", simp_graph["states"].length);
  const tagged_simp_graph = tagged_simplifyGraph(regex, submatches);
  console.log("tagged dfa num states: ", tagged_simp_graph["states"].length);
  const matched_dfa = gen_dfa.findSubstrings(simp_graph, text);
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
//     states: [
//       '0',  '1', '2',  '3',
//       '4',  '5', '6',  '7',
//       '8',  '9', '10', '11',
//       '12'
//     ],
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
function formatForCircom(final_graph) {
  let og_transitions = final_graph["transitions"];
  let forward_transitions = {};
  let rev_transitions = Array.from(
    { length: final_graph["states"].length },
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
  //   console.log("og tran: ", og_transitions);
  console.log("forward_tran: ", forward_transitions);
  console.log("rev_tran: ", rev_transitions);

  // Careful!, it modifies final_graph
  final_graph["forward_transitions"] = forward_transitions;
  final_graph["rev_transitions"] = rev_transitions;
  return final_graph;
}

module.exports = {
  tagged_simplifyGraph,
  tagged_nfaToDfa,
  findMatchStateTagged,
  regexSubmatchState,
  finalRegexExtractState,
  formatForCircom,
};
