// file for testing outputs of these js files in src folder
// Just console.log(what you want), and run "yarn testfunc"
import { explore_graph } from "./explore_graph";
import { readSubmatch } from "./gen";
import { gen_circom } from "./gen_circom";
import { finalRegexExtractState } from "./gen_tagged_dfa";
function test() {
  const text =
    "adsfasd DKI d=2211; DKI: v=12/; d=22; a=//121; d=1; bh=xUqTs2T2FPGCOB52 sdflj";
  // const regex = "DKI: (([vad]=([12/]+); )+)bh";
  // const regex = "DKI: (([bvad]=([12/]+); )+)bh";
  const regex = "DKI: (([a-z]=([12/]+); )+)bh";

  // const simp_regex = simplifyRegex(regex);
  // console.log("simp_regex: ", simp_regex);

  // smallest [vad]
  // const submatches = [
  //   [5, 29],
  //   [7, 13],
  //   [15, 24],
  // ];
  // middle: [bvad] repeats b with bh
  // const submatches = [
  //   [5, 31],
  //   [7, 15],
  //   [17, 26],
  // ];
  // longest case [a-z]
  const submatches = [
    [5, 75],
    [7, 59],
    [61, 70],
  ];
  // readSubmatch(regex, submatches);
  finalRegexExtractState(regex, submatches, text);
  console.log("circom here: ");
  // test1: test generate circom circuit
  // let circom = gen_circom(regex, submatches);
  // console.log(circom);
  // test 2: test those m1 - m4 stuffs, especially m3, m4
  // explore_graph(regex, submatches);
  console.log("Done!");
}
describe("test backend", function () {
  it("should print correctly", function () {
    test();
  });
});
