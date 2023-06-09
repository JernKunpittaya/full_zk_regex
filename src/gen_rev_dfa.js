// given simp_graph (plain dfa), return its reversed version.
export function reverseDFA(simp_graph) {
  // simp_q = [
  //     '0',  '1', '2',  '3',
  //     '4',  '5', '6',  '7',
  //     '8',  '9', '10', '11',
  //     '12'
  //   ]
  var simp_q = simp_graph["states"];
  var simp_transition = simp_graph["transitions"];
  var rev_q = [];
  // set rev_q to [{f}]
  rev_q.push(simp_graph["accepted_states"]);
  var rev_q_all = new Set();
  var rev_transition = {};
  var visited = new Set();
  var simp_start = new Set();
  simp_start.add(simp_graph["start_state"]);
  var rev_accepted = new Set();
  var rev_start = simp_graph["accepted_states"];

  // inside loop
  while (rev_q.length > 0) {
    var state_set = rev_q.pop();
    var states_id = [];
    for (const state of state_set) {
      states_id.push(parseInt(state));
    }
    states_id.sort((a, b) => a - b);
    states_id = states_id.toString();
    if (visited.has(states_id)) {
      continue;
    }
    var checkStart = states_id.split(",");
    for (const state of checkStart) {
      if (simp_start.has(state)) {
        rev_accepted.add(states_id);
        break;
      }
    }
    rev_q_all.add(states_id);
    visited.add(states_id);
    var alp_dict = {};
    for (let from in simp_transition) {
      for (let alphabet in simp_transition[from]) {
        if (state_set.has(simp_transition[from][alphabet])) {
          if (!alp_dict.hasOwnProperty(alphabet)) {
            alp_dict[alphabet] = new Set();
          }
          alp_dict[alphabet].add(from);
        }
      }
    }
    for (let alp in alp_dict) {
      if (alp_dict[alp].size > 0) {
        rev_q.push(alp_dict[alp]);
        var alp_string = [];
        for (const state of alp_dict[alp]) {
          alp_string.push(parseInt(state));
        }
        alp_string.sort((a, b) => a - b);
        alp_string = alp_string.toString();
        if (!rev_transition.hasOwnProperty(states_id)) {
          rev_transition[states_id] = {};
        }
        rev_transition[states_id][alp] = alp_string;
      }
    }
  }
  return {
    states: Array.from(rev_q_all),
    start_state: rev_start,
    accept_states: rev_accepted,
    transitions: rev_transition,
  };
}
