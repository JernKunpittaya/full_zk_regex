import { M1ToM2 } from "./gen_m2";
import { M2ToM3 } from "./gen_m3";
// Find all paths without alphabet between start_id and end_id in m1
function findAllPathsBetw(m1_graph, start, end) {
  const visited = new Set();
  const paths = [];

  function dfs(node, path, tran) {
    if (node === end) {
      paths.push({ path: path, tran: tran });
      return;
    }

    visited.add(node);

    for (const key in m1_graph["transitions"][node]) {
      if (key.length > 1 && !visited.has(m1_graph["transitions"][node][key])) {
        dfs(
          m1_graph["transitions"][node][key],
          [...path, m1_graph["transitions"][node][key]],
          [...tran, key]
        );
      }
    }

    visited.delete(node);
  }

  dfs(start, [start], []);

  return paths;
}

// create m4
export function createM4(m1_graph) {
  let m2_graph = M1ToM2(m1_graph);
  let m3_graph = M2ToM3(m2_graph);
  // delta1 is transition in m1 that consists of only alphabet
  let delta1 = {};
  // m4_transitions = {state: {b: next, a: next}, ...}
  for (let key in m1_graph["transitions"]) {
    for (let alp in m1_graph["transitions"][key]) {
      if (alp.length == 1) {
        if (!delta1.hasOwnProperty(key)) {
          delta1[key] = {};
        }
        delta1[key][alp] = m1_graph["transitions"][key][alp];
      }
    }
  }
  // finish delta1, now search in m1 stuffs. From Q3.
  let m4_transitions = {};
  for (const subset of m3_graph["states"]) {
    let states = subset.split(",");
    for (const p in delta1) {
      let paths = [];
      let trans = [];
      for (const key in delta1[p]) {
        for (const state of states) {
          let search = findAllPathsBetw(m1_graph, delta1[p][key], state);
          //   console.log("og ", key, " from: ", delta1[p][key], " to ", state);
          //   console.log("search here: ", search);
          if (search.length > 0) {
            for (const oneSearch of search) {
              paths.push(oneSearch["path"]);
              trans.push(oneSearch["tran"]);
            }
          }
        }
      }
      // make set to get rid of duplicate
      let paths_set = new Set();
      let trans_set = new Set();
      for (const arr of paths) {
        paths_set.add(JSON.stringify(arr));
      }
      paths = [];
      for (const ele of paths_set) {
        paths.push(JSON.parse(ele));
      }
      for (const arr of trans) {
        trans_set.add(JSON.stringify(arr));
      }
      trans = [];
      for (const ele of trans_set) {
        trans.push(JSON.parse(ele));
      }

      if (paths.length > 0) {
        if (paths.length > 1) {
          throw new Error("Ambiguous subgroup matching");
        }
        if (!m4_transitions.hasOwnProperty(p)) {
          m4_transitions[p] = {};
        }
        m4_transitions[p][subset] = [
          paths[0][paths[0].length - 1],
          // PRINT swap comments betw 2 lines below
          //   JSON.stringify(trans[0]),
          trans[0],
        ];
      }
    }
  }
  // "start" is a start node
  m4_transitions["start"] = {};
  for (const subset of m3_graph["states"]) {
    let states = subset.split(",");
    let paths = [];
    let trans = [];
    for (const state of states) {
      let search = findAllPathsBetw(m1_graph, "0", state);
      if (search.length > 0) {
        for (const oneSearch of search) {
          paths.push(oneSearch["path"]);
          trans.push(oneSearch["tran"]);
        }
      }
      if (paths.length > 0) {
        if (paths.length > 1) {
          throw new Error("Ambiguous subgroup matching in starting phase");
        }
        // console.log("all path of ", states, " is ", trans);
        m4_transitions["start"][subset] = [
          paths[0][paths[0].length - 1],
          // PRINT swap comments betw 2 lines below
          //   JSON.stringify(trans[0]),
          trans[0],
        ];
      }
    }
  }

  // PRINT uncomment below lines
  //   console.log("M4 transitions inside: ", m4_transitions);
  return {
    states: [...m2_graph["states"], "start"],
    start_state: "start",
    accepted_states: m2_graph["accepted_states"],
    transitions: m4_transitions,
  };
}
