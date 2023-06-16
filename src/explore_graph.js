// explore space, for writing circom b4 integrating with frontend.
import { tagged_simplifyGraph } from "./gen_tagged_dfa";
import { M1ToM2 } from "./gen_m2";
import { M2ToM3 } from "./gen_m3";
import { createM4, registerToState } from "./gen_m4";
import { reassignM3M4 } from "./reassign_m3_m4";

export function explore_graph(regex, submatches) {
  const tagged_simp_graph = tagged_simplifyGraph(regex, submatches);
  // console.log("eden aka m1: ", tagged_simp_graph);
  let m2_graph = M1ToM2(tagged_simp_graph);
  // console.log("m2 jya: ", m2_graph);
  let m3_graph = M2ToM3(m2_graph);
  // console.log("m3 jya: ", m3_graph);
  let m4_graph = createM4(tagged_simp_graph);
  let tagged_m4_graph = registerToState(m4_graph);
  // console.log("tagged m4: ", tagged_m4_graph);
  let final_m3_m4 = reassignM3M4(m3_graph, tagged_m4_graph);
  console.log("final m3: ", final_m3_m4["final_m3_graph"]);
  console.log("final m4: ", final_m3_m4["final_m4_graph"]);
}
