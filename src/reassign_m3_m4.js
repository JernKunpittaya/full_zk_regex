// m4_graph is after getting allTags
export function reassignM3M4(m3_graph, m4_graph) {
  // reassign state number in m3
  let new_m3_states = new Set();
  new_m3_states.add("0");
  let m3_state_dict = {};
  m3_state_dict[m3_graph["start_state"]] = "0";
  let i = 1;
  for (const prev_m3_state of m3_graph["states"]) {
    if (prev_m3_state != m3_graph["start_state"]) {
      new_m3_states.add(i.toString());
      m3_state_dict[prev_m3_state] = i.toString();
      i++;
    }
  }
  let new_m3_transitions = {};
  for (const key in m3_graph["transitions"]) {
    new_m3_transitions[m3_state_dict[key]] = {};
    for (const alp in m3_graph["transitions"][key]) {
      new_m3_transitions[m3_state_dict[key]][alp] =
        m3_state_dict[m3_graph["transitions"][key][alp]];
    }
  }
  let new_m3_accepted_states = new Set();
  for (const ele of m3_graph["accepted_states"]) {
    new_m3_accepted_states.add(m3_state_dict[ele]);
  }
  let new_m3_graph = {
    states: new_m3_states,
    start_state: m3_state_dict[m3_graph["start_state"]],
    accepted_states: new_m3_accepted_states,
    transitions: new_m3_transitions,
  };
  // hence reassign transition alphabet in m4
  let new_m4_transitions = {};
  for (const key in m4_graph["transitions"]) {
    new_m4_transitions[key] = {};
    for (const alp in m4_graph["transitions"][key]) {
      new_m4_transitions[key][m3_state_dict[alp]] =
        m4_graph["transitions"][key][alp];
    }
  }
  let new_m4_states = new Set();
  new_m4_states.add("0");
  let m4_state_dict = {};
  m4_state_dict[m4_graph["start_state"]] = "0";
  i = 1;
  for (const prev_m4_state of m4_graph["states"]) {
    if (prev_m4_state != m4_graph["start_state"]) {
      new_m4_states.add(i.toString());
      m4_state_dict[prev_m4_state] = i.toString();
      i++;
    }
  }
  let final_m4_transitions = {};
  for (const key in new_m4_transitions) {
    final_m4_transitions[m4_state_dict[key]] = {};
    for (const alp in new_m4_transitions[key]) {
      final_m4_transitions[m4_state_dict[key]][alp] =
        m4_state_dict[new_m4_transitions[key][alp]];
    }
  }
  let new_m4_accepted_states = new Set();
  for (const ele of m4_graph["accepted_states"]) {
    new_m4_accepted_states.add(m4_state_dict[ele]);
  }
  let new_allTags = {};
  for (const key in m4_graph["tags"]) {
    new_allTags[key] = new Set();
    for (const arrStr of m4_graph["tags"][key]) {
      let arr = JSON.parse(arrStr);
      new_allTags[key].add(
        JSON.stringify([m4_state_dict[arr[0]], m4_state_dict[arr[1]]])
      );
    }
  }
  let new_m4_graph = {
    states: new_m4_states,
    start_state: m4_state_dict[m4_graph["start_state"]],
    accepted_states: new_m4_accepted_states,
    transitions: final_m4_transitions,
    tags: new_allTags,
  };

  //   console.log("final finall m4: ", new_m4_graph);
  return { final_m3_graph: new_m3_graph, final_m4_graph: new_m4_graph };
}
