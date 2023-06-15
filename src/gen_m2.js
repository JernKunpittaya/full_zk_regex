// Find the states in m1 that have outgoing edge with alphabet to use as states in m2
function findQ2(m1_node, m1_graph, q2, mem = new Set()) {
  if (mem.has(m1_node)) {
    // console.log("exist already: ", m1)
    return;
  } else {
    mem.add(m1_node);
  }
  var edges = m1_graph["transitions"][m1_node];
  if (m1_graph["accepted_states"].has(m1_node)) {
    q2.push(m1_node);
    return;
  }
  for (const alp in edges) {
    if (alp.length == 1) {
      q2.push(m1_node);
      break;
    }
  }
  for (const alp in edges) {
    findQ2(edges[alp], m1_graph, q2, mem);
  }
}

// Check if pi(start, end) is defined or not
function piOnM1(m1_graph, start, end, visited = new Set()) {
  if (start == end) {
    return true;
  }
  visited.add(start);
  let edges = m1_graph["transitions"][start];
  for (const alp in edges) {
    // skip alphabet edge
    if (alp.length == 1) {
      continue;
    }
    if (visited.has(edges[alp])) {
      continue;
    }
    if (piOnM1(m1_graph, edges[alp], end, visited)) {
      return true;
    }
  }
  return false;
}

// Get all transitions for m2
function deltaQ2(m1_graph, q2) {
  let result = [];
  for (let i = 0; i < q2.length; i++) {
    for (let j = 0; j < q2.length; j++) {
      let start = q2[i];
      let end = q2[j];
      let edges = m1_graph["transitions"][start];
      for (const alp in edges) {
        if (alp.length == 1) {
          //   console.log(
          //     "from: ",
          //     edges[alp],
          //     "to ",
          //     end,
          //     " is ",
          //     piOnM1(m1_graph, edges[alp], end)
          //   );
          if (piOnM1(m1_graph, edges[alp], end)) {
            result.push([start, alp, end]);
          }
        }
      }
    }
  }
  return result;
}

// create m2 from m1
export function M1ToM2(m1_graph) {
  let q2 = [];
  let q2_start_state = new Set();
  findQ2(m1_graph["start_state"], m1_graph, q2);
  for (let i = 0; i < q2.length; i++) {
    if (piOnM1(m1_graph, m1_graph["start_state"], q2[i])) {
      q2_start_state.add(q2[i]);
    }
  }
  let transition = deltaQ2(m1_graph, q2);
  return {
    states: q2,
    start_state: q2_start_state,
    accepted_states: m1_graph["accepted_states"],
    transitions: transition,
  };
}
