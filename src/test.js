import { simplifyGraph, findSubstrings, simplifyRegex } from "./gen_dfa";
import {
  tagged_simplifyGraph,
  findMatchStateTagged,
  formatForCircom,
} from "./gen_tagged_dfa";
import { reverseDFA } from "./gen_rev_dfa";
function test() {
  const text =
    "adsfasd DKI: v=12/; d=22; a=//121; d=1; bh=xUqTs2T2FPGCOB52 sdflj";
  const regex = "DKI: (([vad]=([12/]+); )+)bh";
  const simp_regex = simplifyRegex(regex);
  console.log("simp_regex: ", simp_regex);
  const submatches = [
    [5, 29],
    [7, 13],
    [15, 24],
  ];
  const simp_graph = simplifyGraph(regex);
  console.log("simp graph: ", simp_graph);
  const rev_graph = reverseDFA(simp_graph);
  console.log("rev graph: ", rev_graph);
  const matched_dfa = findSubstrings(simp_graph, text);
  // for (const subs of matched_dfa[1]) {
  //   var matched = text.slice(subs[0], subs[1] + 1);
  //   console.log("matched: ", matched);
  // }
  const tagged_simp_graph = tagged_simplifyGraph(regex, submatches);
  var final_graph = findMatchStateTagged(tagged_simp_graph);
  var allTags = final_graph["tags"];
  var transitions = final_graph["transitions"];
  console.log("final graph: ", final_graph);
  var circom_graph = formatForCircom(final_graph);
  var circom_rev_graph = formatForCircom(rev_graph);
  console.log("Done!");
}
describe("test backend", function () {
  it("should print correctly", function () {
    test();
  });
});
