export function createTopoGraph(tag_set) {
  let transition = {};
  let rev_transition = {};
  let state_set = new Set();
  for (const substr of tag_set) {
    let subarr = JSON.parse(substr);
    if (!transition.hasOwnProperty(subarr[0])) {
      transition[subarr[0]] = [];
    }
    if (!rev_transition.hasOwnProperty(subarr[1])) {
      rev_transition[subarr[1]] = [];
    }
    transition[subarr[0]].push(subarr[1]);
    rev_transition[subarr[1]].push(subarr[0]);
    state_set.add(subarr[0]);
    state_set.add(subarr[1]);
  }
  let state_dict = {};
  for (const state of state_set) {
    if (transition.hasOwnProperty(state)) {
      state_dict[state] = transition[state].length;
    } else {
      state_dict[state] = 0;
    }
  }
  return {
    states: state_dict,
    transitions: transition,
    rev_transitions: rev_transition,
  };
}
