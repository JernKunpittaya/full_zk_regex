import { simplifyGraph, findSubstrings } from "./gen_dfa";
function test() {
  const text =
    "adsfasd DKI: v=12/; d=22; a=//121; d=1; bh=xUqTs2T2FPGCOB52 sdflj";
  const regex = "DKI: (([vad]=([12/]+); )+)bh";
  const simp_graph = simplifyGraph(regex);
  const matched_dfa = findSubstrings(simp_graph, text);
  for (const subs of matched_dfa[1]) {
    var matched = text.slice(subs[0], subs[1] + 1);
    console.log("matched: ", matched);
  }
}
describe("test backend", function () {
  it("should print correctly", function () {
    test();
  });
});
