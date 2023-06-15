// explore space, for writing circom b4 integrating with frontend.
import {
  tagged_simplifyGraph,
  findMatchStateTagged,
  formatForCircom,
} from "./gen_tagged_dfa";
import { reverseDFA } from "./gen_rev_dfa";
import { simplifyGraph } from "./gen_dfa";
import { M1ToM2 } from "./gen_m2";
import { M2ToM3 } from "./gen_m3";
import { createM4, registerToState } from "./gen_m4";
import { reassignM3M4 } from "./reassign_m3_m4";

export function explore_gen_circom(regex, submatches) {
  const tagged_simp_graph = tagged_simplifyGraph(regex, submatches);
  console.log("eden aka m1: ", tagged_simp_graph);
  let m2_graph = M1ToM2(tagged_simp_graph);
  console.log("m2 jya: ", m2_graph);
  let m3_graph = M2ToM3(m2_graph);
  console.log("m3 jya: ", m3_graph);
  let m4_graph = createM4(tagged_simp_graph);
  let tagged_m4_graph = registerToState(m4_graph);
  console.log("tagged m4: ", tagged_m4_graph);
  let final_m3_m4 = reassignM3M4(m3_graph, tagged_m4_graph);
  console.log("final m3: ", final_m3_m4["final_m3_graph"]);
  console.log("final m4: ", final_m3_m4["final_m4_graph"]);

  // console.log("b4 everything: ", findMatchStateTagged(tagged_simp_graph));
  // const forw_graph = formatForCircom(findMatchStateTagged(tagged_simp_graph));
  // const rev_graph = formatForCircom(reverseDFA(simplifyGraph(regex)));
  // console.log("rev OG: ", reverseDFA(simplifyGraph(regex)));
  // console.log("rev for circom: ", rev_graph);
  // lib_head, join with \n
  let final_text = "";
  const lib_head = [];
  lib_head.push("pragma circom 2.1.4;");
  lib_head.push("");
  lib_head.push('include "circomlib/circuits/comparators.circom";');
  lib_head.push('include "circomlib/circuits/gates.circom";');
  lib_head.push("");
  // build template MultiOR(n)
  lib_head.push("template MultiOR(n) {");
  lib_head.push("\tsignal input in[n];");
  lib_head.push("\tsignal output out;");
  lib_head.push("");
  lib_head.push("\tsignal sums[n];");
  lib_head.push("\tsums[0] <== in[0];");
  lib_head.push("\tfor (var i = 1; i < n; i++) {");
  lib_head.push("\t\tsums[i] <== sums[i-1] + in[i];");
  lib_head.push("\t}");
  lib_head.push("\tcomponent is_zero = IsZero();");
  lib_head.push("\tis_zero.in <== sums[n-1];");
  lib_head.push("\tout <== 1 - is_zero.out;");
  lib_head.push("}");
  lib_head.push("");

  final_text += lib_head.join("\n") + "\n";
  // build tpl_head, join with \n
  const tpl_head = [];
  tpl_head.push("template Regex (msg_bytes, reveal_bytes, group_idx){");
  tpl_head.push("\tsignal input msg[msg_bytes];");
  tpl_head.push("\tsignal input match_idx;");
  tpl_head.push("\tsignal output start_idx;");
  tpl_head.push("\tsignal output group_match_count;");
  tpl_head.push("\tsignal output entire_count;");
  tpl_head.push("");
  tpl_head.push(
    "\tsignal reveal_shifted_intermediate[reveal_bytes][msg_bytes];"
  );
  tpl_head.push("\tsignal output reveal_shifted[reveal_bytes];");
  // add adj_reveal (adjusted reveal) to reverse rev_reveal
  tpl_head.push("\tsignal adj_reveal[msg_bytes];");
  tpl_head.push("");
  tpl_head.push("\tsignal in[msg_bytes];");
  tpl_head.push("\tsignal rev_in[msg_bytes];");
  tpl_head.push("\tfor (var i = 0; i < msg_bytes; i++) {");
  tpl_head.push("\t\tin[i] <== msg[i];");
  // backward input msgs
  tpl_head.push("\t\trev_in[i] <== msg[msg_bytes - i - 1];");
  tpl_head.push("\t}");

  final_text += tpl_head.join("\n") + "\n";
  // compile content placeholder, join with \n\t
  // format tags stuffs
  let new_tags = {};
  for (let key in forw_graph["tags"]) {
    let tran_arr = [];
    for (let ele of forw_graph["tags"][key]) {
      tran_arr.push(ele);
    }
    new_tags[key] = tran_arr;
  }
  const N = forw_graph["states"].length;
  const accept_states = forw_graph["accepted_states"];

  let eq_i = 0;
  let lt_i = 0;
  let and_i = 0;
  let multi_or_i = 0;

  // rev portion
  const rev_N = rev_graph["states"].length;
  const rev_accept_states = rev_graph["accepted_states"];

  let rev_eq_i = 0;
  let rev_lt_i = 0;
  let rev_and_i = 0;
  let rev_multi_or_i = 0;

  let rev_lines = [];
  rev_lines.push("for (var i = 0; i < msg_bytes; i++) {");

  for (let i = 1; i < rev_N; i++) {
    const rev_outputs = [];
    for (let [k, prev_i] of rev_graph["rev_transitions"][i]) {
      let rev_vals = new Set(JSON.parse(k));
      const rev_eq_outputs = [];

      const rev_uppercase = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
      const rev_lowercase = new Set("abcdefghijklmnopqrstuvwxyz".split(""));
      const rev_digits = new Set("0123456789".split(""));

      if (
        new Set([...rev_uppercase].filter((x) => rev_vals.has(x))).size ===
        rev_uppercase.size
      ) {
        rev_vals = new Set([...rev_vals].filter((x) => !rev_uppercase.has(x)));
        rev_lines.push("\t//rev_UPPERCASE");
        // og
        rev_lines.push(`\trev_lt[${rev_lt_i}][i] = LessThan(8);`);
        rev_lines.push(`\trev_lt[${rev_lt_i}][i].in[0] <== 64;`);
        rev_lines.push(`\trev_lt[${rev_lt_i}][i].in[1] <== rev_in[i];`);

        rev_lines.push(`\trev_lt[${rev_lt_i + 1}][i] = LessThan(8);`);
        rev_lines.push(`\trev_lt[${rev_lt_i + 1}][i].in[0] <== rev_in[i];`);
        rev_lines.push(`\trev_lt[${rev_lt_i + 1}][i].in[1] <== 91;`);

        rev_lines.push(`\trev_and[${rev_and_i}][i] = AND();`);
        rev_lines.push(
          `\trev_and[${rev_and_i}][i].a <== rev_lt[${rev_lt_i}][i].out;`
        );
        rev_lines.push(
          `\trev_and[${rev_and_i}][i].b <== rev_lt[${rev_lt_i + 1}][i].out;`
        );

        rev_eq_outputs.push(["rev_and", rev_and_i]);
        rev_lt_i += 2;
        rev_and_i += 1;

        // Optimization
        // rev_lines.push(`\trev_lt[${rev_lt_i}][i] = LessThan(8);`);
        // rev_lines.push(`\trev_lt[${rev_lt_i}][i].in[0] <== rev_in[i]-64;`);
        // rev_lines.push(`\trev_lt[${rev_lt_i}][i].in[1] <== 27;`);

        // rev_eq_outputs.push(["rev_lt", rev_lt_i]);
        // rev_lt_i += 1;
      }
      if (
        new Set([...rev_lowercase].filter((x) => rev_vals.has(x))).size ===
        rev_lowercase.size
      ) {
        rev_vals = new Set([...rev_vals].filter((x) => !rev_lowercase.has(x)));
        rev_lines.push("\t//rev_lowercase");
        rev_lines.push(`\trev_lt[${rev_lt_i}][i] = LessThan(8);`);
        rev_lines.push(`\trev_lt[${rev_lt_i}][i].in[0] <== 96;`);
        rev_lines.push(`\trev_lt[${rev_lt_i}][i].in[1] <== rev_in[i];`);

        rev_lines.push(`\trev_lt[${rev_lt_i + 1}][i] = LessThan(8);`);
        rev_lines.push(`\trev_lt[${rev_lt_i + 1}][i].in[0] <== rev_in[i];`);
        rev_lines.push(`\trev_lt[${rev_lt_i + 1}][i].in[1] <== 123;`);

        rev_lines.push(`\trev_and[${rev_and_i}][i] = AND();`);
        rev_lines.push(
          `\trev_and[${rev_and_i}][i].a <== rev_lt[${rev_lt_i}][i].out;`
        );
        rev_lines.push(
          `\trev_and[${rev_and_i}][i].b <== rev_lt[${rev_lt_i + 1}][i].out;`
        );

        rev_eq_outputs.push(["rev_and", rev_and_i]);
        rev_lt_i += 2;
        rev_and_i += 1;
      }
      if (
        new Set([...rev_digits].filter((x) => rev_vals.has(x))).size ===
        rev_digits.size
      ) {
        rev_vals = new Set([...rev_vals].filter((x) => !rev_digits.has(x)));
        rev_lines.push("\t//digits");
        rev_lines.push(`\trev_lt[${rev_lt_i}][i] = LessThan(8);`);
        rev_lines.push(`\trev_lt[${rev_lt_i}][i].in[0] <== 47;`);
        rev_lines.push(`\trev_lt[${rev_lt_i}][i].in[1] <== rev_in[i];`);

        rev_lines.push(`\trev_lt[${rev_lt_i + 1}][i] = LessThan(8);`);
        rev_lines.push(`\trev_lt[${rev_lt_i + 1}][i].in[0] <== rev_in[i];`);
        rev_lines.push(`\trev_lt[${rev_lt_i + 1}][i].in[1] <== 58;`);

        rev_lines.push(`\trev_and[${rev_and_i}][i] = AND();`);
        rev_lines.push(
          `\trev_and[${rev_and_i}][i].a <== rev_lt[${rev_lt_i}][i].out;`
        );
        rev_lines.push(
          `\trev_and[${rev_and_i}][i].b <== rev_lt[${rev_lt_i + 1}][i].out;`
        );

        rev_eq_outputs.push(["rev_and", rev_and_i]);
        rev_lt_i += 2;
        rev_and_i += 1;
      }
      for (let c of rev_vals) {
        // assert.strictEqual(c.length, 1);
        rev_lines.push(`\t//${c}`);
        rev_lines.push(`\trev_eq[${rev_eq_i}][i] = IsEqual();`);
        rev_lines.push(`\trev_eq[${rev_eq_i}][i].in[0] <== rev_in[i];`);
        rev_lines.push(
          `\trev_eq[${rev_eq_i}][i].in[1] <== ${c.charCodeAt(0)};`
        );
        rev_eq_outputs.push(["rev_eq", rev_eq_i]);
        rev_eq_i += 1;
      }

      rev_lines.push(`\trev_and[${rev_and_i}][i] = AND();`);
      rev_lines.push(
        `\trev_and[${rev_and_i}][i].a <== rev_states[i][${prev_i}];`
      );

      if (rev_eq_outputs.length === 1) {
        rev_lines.push(
          `\trev_and[${rev_and_i}][i].b <== ${rev_eq_outputs[0][0]}[${rev_eq_outputs[0][1]}][i].out;`
        );
      } else if (rev_eq_outputs.length > 1) {
        rev_lines.push(
          `\trev_multi_or[${rev_multi_or_i}][i] = MultiOR(${rev_eq_outputs.length});`
        );
        for (let output_i = 0; output_i < rev_eq_outputs.length; output_i++) {
          rev_lines.push(
            `\trev_multi_or[${rev_multi_or_i}][i].in[${output_i}] <== ${rev_eq_outputs[output_i][0]}[${rev_eq_outputs[output_i][1]}][i].out;`
          );
        }
        rev_lines.push(
          `\trev_and[${rev_and_i}][i].b <== rev_multi_or[${rev_multi_or_i}][i].out;`
        );
        rev_multi_or_i += 1;
      }
      rev_outputs.push(rev_and_i);
      rev_and_i += 1;
    }

    if (rev_outputs.length === 1) {
      rev_lines.push(
        `\trev_states[i+1][${i}] <== rev_and[${rev_outputs[0]}][i].out;`
      );
    } else if (rev_outputs.length > 1) {
      rev_lines.push(
        `\trev_multi_or[${rev_multi_or_i}][i] = MultiOR(${rev_outputs.length});`
      );
      for (let output_i = 0; output_i < rev_outputs.length; output_i++) {
        rev_lines.push(
          `\trev_multi_or[${rev_multi_or_i}][i].in[${output_i}] <== rev_and[${rev_outputs[output_i]}][i].out;`
        );
      }
      rev_lines.push(
        `\trev_states[i+1][${i}] <== rev_multi_or[${rev_multi_or_i}][i].out;`
      );
      rev_multi_or_i += 1;
    }
  }

  rev_lines.push("}");
  // deal with accepted
  rev_lines.push("component rev_check_accepted[msg_bytes+1];");

  rev_lines.push("for (var i = 0; i <= msg_bytes; i++) {");
  rev_lines.push(
    `\trev_check_accepted[i] = MultiOR(${rev_accept_states.size});`
  );
  let rev_count_setInd = 0;
  for (let element of rev_accept_states) {
    rev_lines.push(
      `\trev_check_accepted[i].in[${rev_count_setInd}] <== rev_states[i][${parseInt(
        element
      )}] ;`
    );
    rev_count_setInd++;
  }

  rev_lines.push("}");

  let rev_declarations = [];

  if (rev_eq_i > 0) {
    rev_declarations.push(`component rev_eq[${rev_eq_i}][msg_bytes];`);
  }
  if (rev_lt_i > 0) {
    rev_declarations.push(`component rev_lt[${rev_lt_i}][msg_bytes];`);
  }
  if (rev_and_i > 0) {
    rev_declarations.push(`component rev_and[${rev_and_i}][msg_bytes];`);
  }
  if (rev_multi_or_i > 0) {
    rev_declarations.push(
      `component rev_multi_or[${rev_multi_or_i}][msg_bytes];`
    );
  }
  rev_declarations.push(`signal rev_states[msg_bytes+1][${rev_N}];`);
  rev_declarations.push("");

  let rev_init_code = [];

  rev_init_code.push("for (var i = 0; i < msg_bytes; i++) {");
  rev_init_code.push("\trev_states[i][0] <== 1;");
  rev_init_code.push("}");

  rev_init_code.push(`for (var i = 1; i < ${rev_N}; i++) {`);
  rev_init_code.push("\trev_states[0][i] <== 0;");
  rev_init_code.push("}");

  rev_init_code.push("");

  const rev_reveal_code = [];

  // new_tags region below

  // calculate reveal
  rev_reveal_code.push("for (var i = 0; i < msg_bytes; i++) {");
  // TO BE CONTINUED
  rev_reveal_code.push(
    "\tadj_reveal[i] <== rev_check_accepted[msg_bytes-i].out;"
  );
  rev_reveal_code.push("}");
  rev_reveal_code.push("");
  rev_lines = [
    ...rev_declarations,
    ...rev_init_code,
    ...rev_lines,
    ...rev_reveal_code,
  ];

  final_text += "\n\t" + rev_lines.join("\n\t") + "\n";

  let lines = [];
  lines.push("for (var i = 0; i < msg_bytes; i++) {");

  for (let i = 1; i < N; i++) {
    const outputs = [];
    for (let [k, prev_i] of forw_graph["rev_transitions"][i]) {
      let vals = new Set(JSON.parse(k));
      const eq_outputs = [];

      const uppercase = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
      const lowercase = new Set("abcdefghijklmnopqrstuvwxyz".split(""));
      const digits = new Set("0123456789".split(""));

      if (
        new Set([...uppercase].filter((x) => vals.has(x))).size ===
        uppercase.size
      ) {
        vals = new Set([...vals].filter((x) => !uppercase.has(x)));
        lines.push("\t//UPPERCASE");
        lines.push(`\tlt[${lt_i}][i] = LessThan(8);`);
        lines.push(`\tlt[${lt_i}][i].in[0] <== 64;`);
        lines.push(`\tlt[${lt_i}][i].in[1] <== in[i];`);

        lines.push(`\tlt[${lt_i + 1}][i] = LessThan(8);`);
        lines.push(`\tlt[${lt_i + 1}][i].in[0] <== in[i];`);
        lines.push(`\tlt[${lt_i + 1}][i].in[1] <== 91;`);

        lines.push(`\tand[${and_i}][i] = AND();`);
        lines.push(`\tand[${and_i}][i].a <== lt[${lt_i}][i].out;`);
        lines.push(`\tand[${and_i}][i].b <== lt[${lt_i + 1}][i].out;`);

        eq_outputs.push(["and", and_i]);
        lt_i += 2;
        and_i += 1;
      }
      if (
        new Set([...lowercase].filter((x) => vals.has(x))).size ===
        lowercase.size
      ) {
        console.log("startttt", i);
        console.log("KK: ", k);
        console.log("prev: ", prev_i);
        vals = new Set([...vals].filter((x) => !lowercase.has(x)));
        lines.push("\t//lowercase");
        lines.push(`\tlt[${lt_i}][i] = LessThan(8);`);
        lines.push(`\tlt[${lt_i}][i].in[0] <== 96;`);
        lines.push(`\tlt[${lt_i}][i].in[1] <== in[i];`);

        lines.push(`\tlt[${lt_i + 1}][i] = LessThan(8);`);
        lines.push(`\tlt[${lt_i + 1}][i].in[0] <== in[i];`);
        lines.push(`\tlt[${lt_i + 1}][i].in[1] <== 123;`);

        lines.push(`\tand[${and_i}][i] = AND();`);
        lines.push(`\tand[${and_i}][i].a <== lt[${lt_i}][i].out;`);
        lines.push(`\tand[${and_i}][i].b <== lt[${lt_i + 1}][i].out;`);

        eq_outputs.push(["and", and_i]);
        lt_i += 2;
        and_i += 1;
        console.log("ENDD");
      }
      if (
        new Set([...digits].filter((x) => vals.has(x))).size === digits.size
      ) {
        vals = new Set([...vals].filter((x) => !digits.has(x)));
        lines.push("\t//digits");
        lines.push(`\tlt[${lt_i}][i] = LessThan(8);`);
        lines.push(`\tlt[${lt_i}][i].in[0] <== 47;`);
        lines.push(`\tlt[${lt_i}][i].in[1] <== in[i];`);

        lines.push(`\tlt[${lt_i + 1}][i] = LessThan(8);`);
        lines.push(`\tlt[${lt_i + 1}][i].in[0] <== in[i];`);
        lines.push(`\tlt[${lt_i + 1}][i].in[1] <== 58;`);

        lines.push(`\tand[${and_i}][i] = AND();`);
        lines.push(`\tand[${and_i}][i].a <== lt[${lt_i}][i].out;`);
        lines.push(`\tand[${and_i}][i].b <== lt[${lt_i + 1}][i].out;`);

        eq_outputs.push(["and", and_i]);
        lt_i += 2;
        and_i += 1;
      }
      for (let c of vals) {
        // assert.strictEqual(c.length, 1);
        lines.push(`\t//${c}`);
        lines.push(`\teq[${eq_i}][i] = IsEqual();`);
        lines.push(`\teq[${eq_i}][i].in[0] <== in[i];`);
        lines.push(`\teq[${eq_i}][i].in[1] <== ${c.charCodeAt(0)};`);
        eq_outputs.push(["eq", eq_i]);
        eq_i += 1;
      }

      lines.push(`\tand[${and_i}][i] = AND();`);
      lines.push(`\tand[${and_i}][i].a <== states[i][${prev_i}];`);

      if (eq_outputs.length === 1) {
        lines.push(
          `\tand[${and_i}][i].b <== ${eq_outputs[0][0]}[${eq_outputs[0][1]}][i].out;`
        );
      } else if (eq_outputs.length > 1) {
        lines.push(
          `\tmulti_or[${multi_or_i}][i] = MultiOR(${eq_outputs.length});`
        );
        for (let output_i = 0; output_i < eq_outputs.length; output_i++) {
          lines.push(
            `\tmulti_or[${multi_or_i}][i].in[${output_i}] <== ${eq_outputs[output_i][0]}[${eq_outputs[output_i][1]}][i].out;`
          );
        }
        lines.push(`\tand[${and_i}][i].b <== multi_or[${multi_or_i}][i].out;`);
        multi_or_i += 1;
      }
      outputs.push(and_i);
      and_i += 1;
    }

    if (outputs.length === 1) {
      lines.push(`\tstates[i+1][${i}] <== and[${outputs[0]}][i].out;`);
    } else if (outputs.length > 1) {
      lines.push(`\tmulti_or[${multi_or_i}][i] = MultiOR(${outputs.length});`);
      for (let output_i = 0; output_i < outputs.length; output_i++) {
        lines.push(
          `\tmulti_or[${multi_or_i}][i].in[${output_i}] <== and[${outputs[output_i]}][i].out;`
        );
      }
      lines.push(`\tstates[i+1][${i}] <== multi_or[${multi_or_i}][i].out;`);
      multi_or_i += 1;
    }
  }

  lines.push("}");
  lines.push("signal final_state_sum[msg_bytes+1];");
  // deal with accepted
  lines.push("component check_accepted[msg_bytes+1];");
  lines.push(`check_accepted[0] = MultiOR(${accept_states.size});`);
  let count_setInd = 0;
  for (let element of accept_states) {
    lines.push(
      `check_accepted[0].in[${count_setInd}] <== states[0][${parseInt(
        element
      )}];`
    );
    count_setInd++;
  }
  lines.push(`final_state_sum[0] <== check_accepted[0].out;`);
  lines.push("for (var i = 1; i <= msg_bytes; i++) {");
  lines.push(`\tcheck_accepted[i] = MultiOR(${accept_states.size});`);
  count_setInd = 0;
  for (let element of accept_states) {
    lines.push(
      `\tcheck_accepted[i].in[${count_setInd}] <== states[i][${parseInt(
        element
      )}] ;`
    );
    count_setInd++;
  }
  lines.push(
    `\tfinal_state_sum[i] <== final_state_sum[i-1] + check_accepted[i].out;`
  );
  lines.push("}");
  lines.push("entire_count <== final_state_sum[msg_bytes];");

  let declarations = [];

  if (eq_i > 0) {
    declarations.push(`component eq[${eq_i}][msg_bytes];`);
  }
  if (lt_i > 0) {
    declarations.push(`component lt[${lt_i}][msg_bytes];`);
  }
  if (and_i > 0) {
    declarations.push(`component and[${and_i}][msg_bytes];`);
  }
  if (multi_or_i > 0) {
    declarations.push(`component multi_or[${multi_or_i}][msg_bytes];`);
  }
  declarations.push(`signal states[msg_bytes+1][${N}];`);
  declarations.push("");

  let init_code = [];

  init_code.push("for (var i = 0; i < msg_bytes; i++) {");
  init_code.push("\tstates[i][0] <== adj_reveal[i];");
  init_code.push("}");

  init_code.push(`for (var i = 1; i < ${N}; i++) {`);
  init_code.push("\tstates[0][i] <== 0;");
  init_code.push("}");

  init_code.push("");

  const reveal_code = [];

  reveal_code.push("signal reveal[msg_bytes];");
  for (let i = 0; i < Object.keys(new_tags).length; i++) {
    reveal_code.push(
      `component and_track${i}[msg_bytes][${new_tags[i].length}];`
    );
  }

  reveal_code.push(
    `component or_track[msg_bytes][${Object.keys(new_tags).length}];`
  );

  // calculate or_track for all tags
  reveal_code.push("for (var i = 0; i < msg_bytes; i++) {");

  for (let tagId = 0; tagId < Object.keys(new_tags).length; tagId++) {
    reveal_code.push(
      `\tor_track[i][${tagId}] = MultiOR(${new_tags[tagId].length});`
    );
    for (let tranId = 0; tranId < new_tags[tagId].length; tranId++) {
      reveal_code.push(`\tand_track${tagId}[i][${tranId}] = AND();`);
      reveal_code.push(
        `\tand_track${tagId}[i][${tranId}].a <== states[i+1][${
          JSON.parse(new_tags[tagId][tranId])[1]
        }];`
      );
      reveal_code.push(
        `\tand_track${tagId}[i][${tranId}].b <== states[i][${
          JSON.parse(new_tags[tagId][tranId])[0]
        }];`
      );

      reveal_code.push(
        `\tor_track[i][${tagId}].in[${tranId}] <== and_track${tagId}[i][${tranId}].out;`
      );
    }
  }
  reveal_code.push("}");
  reveal_code.push("");
  // calculate reveal
  reveal_code.push("for (var i = 0; i < msg_bytes; i++) {");
  reveal_code.push("\treveal[i] <== in[i] * or_track[i][group_idx].out;");
  reveal_code.push("}");
  reveal_code.push("");
  lines = [...declarations, ...init_code, ...lines, ...reveal_code];

  final_text += "\n\t" + lines.join("\n\t") + "\n";

  // tpl_end
  let tpl_end = [];
  tpl_end.push("\tvar start_index = 0;");
  tpl_end.push("var count = 0;");
  tpl_end.push("");
  tpl_end.push("component check_start[msg_bytes + 1];");
  tpl_end.push("component check_match[msg_bytes + 1];");
  tpl_end.push("component check_matched_start[msg_bytes + 1];");
  tpl_end.push("component matched_idx_eq[msg_bytes];");
  tpl_end.push("");
  tpl_end.push("for (var i = 0; i < msg_bytes; i++) {");
  tpl_end.push("\tif (i == 0) {");
  tpl_end.push("\t\tcount += or_track[0][group_idx].out;");
  tpl_end.push("\t}");
  tpl_end.push("\telse {");
  tpl_end.push("\t\tcheck_start[i] = AND();");
  tpl_end.push("\t\tcheck_start[i].a <== or_track[i][group_idx].out;");
  tpl_end.push("\t\tcheck_start[i].b <== 1 - or_track[i-1][group_idx].out;");
  tpl_end.push("\t\tcount += check_start[i].out;");
  tpl_end.push("");
  tpl_end.push("\t\tcheck_match[i] = IsEqual();");
  tpl_end.push("\t\tcheck_match[i].in[0] <== count;");
  tpl_end.push("\t\tcheck_match[i].in[1] <== match_idx + 1;");
  tpl_end.push("");
  tpl_end.push("\t\tcheck_matched_start[i] = AND();");
  tpl_end.push("\t\tcheck_matched_start[i].a <== check_match[i].out;");
  tpl_end.push("\t\tcheck_matched_start[i].b <== check_start[i].out;");
  tpl_end.push("\t\tstart_index += check_matched_start[i].out * i;");
  tpl_end.push("\t}");
  tpl_end.push("");
  tpl_end.push("\tmatched_idx_eq[i] = IsEqual();");
  tpl_end.push(
    "\tmatched_idx_eq[i].in[0] <== or_track[i][group_idx].out * count;"
  );
  tpl_end.push("\tmatched_idx_eq[i].in[1] <== match_idx + 1;");
  tpl_end.push("}");
  tpl_end.push("");
  tpl_end.push("component match_start_idx[msg_bytes];");
  tpl_end.push("for (var i = 0; i < msg_bytes; i++) {");
  tpl_end.push("\tmatch_start_idx[i] = IsEqual();");
  tpl_end.push("\tmatch_start_idx[i].in[0] <== i;");
  tpl_end.push("\tmatch_start_idx[i].in[1] <== start_index;");
  tpl_end.push("}");
  tpl_end.push("");
  tpl_end.push("signal reveal_match[msg_bytes];");
  tpl_end.push("for (var i = 0; i < msg_bytes; i++) {");
  tpl_end.push("\treveal_match[i] <== matched_idx_eq[i].out * reveal[i];");
  tpl_end.push("}");
  tpl_end.push("");
  tpl_end.push("for (var j = 0; j < reveal_bytes; j++) {");
  tpl_end.push("\treveal_shifted_intermediate[j][j] <== 0;");
  tpl_end.push("\tfor (var i = j + 1; i < msg_bytes; i++) {");
  tpl_end.push(
    "\t\treveal_shifted_intermediate[j][i] <== reveal_shifted_intermediate[j][i - 1] + match_start_idx[i-j].out * reveal_match[i];"
  );
  tpl_end.push("\t}");
  tpl_end.push(
    "\treveal_shifted[j] <== reveal_shifted_intermediate[j][msg_bytes - 1];"
  );
  tpl_end.push("}");
  tpl_end.push("");
  tpl_end.push("group_match_count <== count;");
  tpl_end.push("start_idx <== start_index;");
  final_text += tpl_end.join("\n\t") + "\n}";

  // add main function
  final_text +=
    "\n\ncomponent main { public [msg, match_idx] } = Regex(100,44,2);";
  return final_text;
}
