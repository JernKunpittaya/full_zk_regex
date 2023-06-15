// create M3 from M2
export function M2ToM3(m2_graph) {
  let m2_q = m2_graph["states"];
  let m2_transition = m2_graph["transitions"];
  let m2_start_state = m2_graph["start_state"];
  let m2_accepted_states = m2_graph["accepted_states"];
  let q3 = [];
  let m3_q = new Set();
  let m3_transition = {};
  let m3_accepted = new Set();
  let m3_start;

  let visited = new Set();
  // set q3 to [{f}]
  q3.push(m2_accepted_states);
  let m3_tmp_start = [];
  for (const state of m2_accepted_states) {
    m3_tmp_start.push(parseInt(state));
  }
  m3_tmp_start.sort((a, b) => a - b);
  m3_tmp_start = m3_tmp_start.toString();
  m3_start = m3_tmp_start;
  // inside loop
  while (q3.length > 0) {
    let state_set = q3.pop();
    let states_arr = [];
    for (const state of state_set) {
      states_arr.push(parseInt(state));
    }
    states_arr.sort((a, b) => a - b);
    states_arr = states_arr.toString();
    if (visited.has(states_arr)) {
      continue;
    }
    let checkStart = states_arr.split(",");
    for (const state of checkStart) {
      if (m2_start_state.has(state)) {
        m3_accepted.add(states_arr);
        break;
      }
    }
    m3_q.add(states_arr);
    visited.add(states_arr);
    let alp_dict = {};
    for (const state of state_set) {
      for (let i = 0; i < m2_transition.length; i++) {
        if (m2_transition[i][2] == state) {
          if (!alp_dict.hasOwnProperty(m2_transition[i][1])) {
            alp_dict[m2_transition[i][1]] = new Set();
          }
          alp_dict[m2_transition[i][1]].add(m2_transition[i][0]);
        }
      }
    }
    for (let alp in alp_dict) {
      if (alp_dict[alp].size > 0) {
        q3.push(alp_dict[alp]);
        let alp_string = [];
        for (const state of alp_dict[alp]) {
          alp_string.push(parseInt(state));
        }
        alp_string.sort((a, b) => a - b);
        alp_string = alp_string.toString();
        if (!m3_transition.hasOwnProperty(states_arr)) {
          m3_transition[states_arr] = {};
        }
        m3_transition[states_arr][alp] = alp_string;
      }
    }
  }
  return {
    states: m3_q,
    start_state: m3_start,
    accepted_states: m3_accepted,
    transitions: m3_transition,
  };
}
