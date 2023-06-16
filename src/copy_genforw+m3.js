// Assume only 1 regex matched
// Show where to start running M4, and corresponding transition for M4
import { simplifyGraph } from "./gen_dfa";
import { formatForCircom, tagged_simplifyGraph } from "./gen_tagged_dfa";
import { M1ToM2 } from "./gen_m2";
import { M2ToM3 } from "./gen_m3";
import { createM4, registerToState } from "./gen_m4";
import { reassignM3M4 } from "./reassign_m3_m4";
// generating circom for backward DFA
// Step 1:  naive gen_forw_circom
// Step 2: gen m3
// Step 3: gen m4
export function gen_all_circom(regex, submatches) {
  const forw_graph = formatForCircom(simplifyGraph(regex));
  // lib_head, join with \n
  let final_text = "";
  const forw_lib_head = [];
  forw_lib_head.push("pragma circom 2.1.4;");
  forw_lib_head.push("");
  forw_lib_head.push('include "circomlib/circuits/comparators.circom";');
  forw_lib_head.push('include "circomlib/circuits/gates.circom";');
  forw_lib_head.push("");
  // build template MultiOR(n)
  forw_lib_head.push("template MultiOR(n) {");
  forw_lib_head.push("\tsignal input in[n];");
  forw_lib_head.push("\tsignal output out;");
  forw_lib_head.push("");
  forw_lib_head.push("\tsignal sums[n];");
  forw_lib_head.push("\tsums[0] <== in[0];");
  forw_lib_head.push("\tfor (var i = 1; i < n; i++) {");
  forw_lib_head.push("\t\tsums[i] <== sums[i-1] + in[i];");
  forw_lib_head.push("\t}");
  forw_lib_head.push("\tcomponent is_zero = IsZero();");
  forw_lib_head.push("\tis_zero.in <== sums[n-1];");
  forw_lib_head.push("\tout <== 1 - is_zero.out;");
  forw_lib_head.push("}");
  forw_lib_head.push("");

  // build tpl_head, join with \n
  const forw_tpl_head = [];
  forw_tpl_head.push("template Regex (msg_bytes){");
  forw_tpl_head.push("\tsignal input in[msg_bytes];");
  // add forw_adj_reveal (adjusted reveal) to mark the matched points for m3 dfa
  forw_tpl_head.push("\tsignal forw_adj_reveal[msg_bytes];");
  forw_tpl_head.push("");

  // compile content placeholder, join with \n\t
  // format tags stuffs
  const forw_N = forw_graph["states"].size;
  const forw_accept_states = forw_graph["accepted_states"];

  let forw_eq_i = 0;
  let forw_lt_i = 0;
  let forw_and_i = 0;
  let forw_multi_or_i = 0;

  let forw_lines = [];
  const uppercase = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
  const lowercase = new Set("abcdefghijklmnopqrstuvwxyz".split(""));
  const digits = new Set("0123456789".split(""));
  forw_lines.push("for (var i = 0; i < msg_bytes; i++) {");
  for (let i = 1; i < forw_N; i++) {
    const forw_outputs = [];
    for (let [k, prev_i] of forw_graph["rev_transitions"][i]) {
      let forw_vals = new Set(JSON.parse(k));
      const forw_eq_outputs = [];

      if (
        new Set([...uppercase].filter((x) => forw_vals.has(x))).size ===
        uppercase.size
      ) {
        forw_vals = new Set([...forw_vals].filter((x) => !uppercase.has(x)));
        forw_lines.push("\t//UPPERCASE");
        forw_lines.push(`\tforw_lt[${forw_lt_i}][i] = LessThan(8);`);
        forw_lines.push(`\tforw_lt[${forw_lt_i}][i].in[0] <== 64;`);
        forw_lines.push(`\tforw_lt[${forw_lt_i}][i].in[1] <== in[i];`);

        forw_lines.push(`\tforw_lt[${forw_lt_i + 1}][i] = LessThan(8);`);
        forw_lines.push(`\tforw_lt[${forw_lt_i + 1}][i].in[0] <== in[i];`);
        forw_lines.push(`\tforw_lt[${forw_lt_i + 1}][i].in[1] <== 91;`);

        forw_lines.push(`\tforw_and[${forw_and_i}][i] = AND();`);
        forw_lines.push(
          `\tforw_and[${forw_and_i}][i].a <== forw_lt[${forw_lt_i}][i].out;`
        );
        forw_lines.push(
          `\tforw_and[${forw_and_i}][i].b <== forw_lt[${forw_lt_i + 1}][i].out;`
        );

        forw_eq_outputs.push(["forw_and", forw_and_i]);
        forw_lt_i += 2;
        forw_and_i += 1;
      }
      if (
        new Set([...lowercase].filter((x) => forw_vals.has(x))).size ===
        lowercase.size
      ) {
        forw_vals = new Set([...forw_vals].filter((x) => !lowercase.has(x)));
        forw_lines.push("\t//lowercase");
        forw_lines.push(`\tforw_lt[${forw_lt_i}][i] = LessThan(8);`);
        forw_lines.push(`\tforw_lt[${forw_lt_i}][i].in[0] <== 96;`);
        forw_lines.push(`\tforw_lt[${forw_lt_i}][i].in[1] <== in[i];`);

        forw_lines.push(`\tforw_lt[${forw_lt_i + 1}][i] = LessThan(8);`);
        forw_lines.push(`\tforw_lt[${forw_lt_i + 1}][i].in[0] <== in[i];`);
        forw_lines.push(`\tforw_lt[${forw_lt_i + 1}][i].in[1] <== 123;`);

        forw_lines.push(`\tforw_and[${forw_and_i}][i] = AND();`);
        forw_lines.push(
          `\tforw_and[${forw_and_i}][i].a <== forw_lt[${forw_lt_i}][i].out;`
        );
        forw_lines.push(
          `\tforw_and[${forw_and_i}][i].b <== forw_lt[${forw_lt_i + 1}][i].out;`
        );

        forw_eq_outputs.push(["forw_and", forw_and_i]);
        forw_lt_i += 2;
        forw_and_i += 1;
      }
      if (
        new Set([...digits].filter((x) => forw_vals.has(x))).size ===
        digits.size
      ) {
        forw_vals = new Set([...forw_vals].filter((x) => !digits.has(x)));
        forw_lines.push("\t//digits");
        forw_lines.push(`\tforw_lt[${forw_lt_i}][i] = LessThan(8);`);
        forw_lines.push(`\tforw_lt[${forw_lt_i}][i].in[0] <== 47;`);
        forw_lines.push(`\tforw_lt[${forw_lt_i}][i].in[1] <== in[i];`);

        forw_lines.push(`\tforw_lt[${forw_lt_i + 1}][i] = LessThan(8);`);
        forw_lines.push(`\tforw_lt[${forw_lt_i + 1}][i].in[0] <== in[i];`);
        forw_lines.push(`\tforw_lt[${forw_lt_i + 1}][i].in[1] <== 58;`);

        forw_lines.push(`\tforw_and[${forw_and_i}][i] = AND();`);
        forw_lines.push(
          `\tforw_and[${forw_and_i}][i].a <== forw_lt[${forw_lt_i}][i].out;`
        );
        forw_lines.push(
          `\tforw_and[${forw_and_i}][i].b <== forw_lt[${forw_lt_i + 1}][i].out;`
        );

        forw_eq_outputs.push(["forw_and", forw_and_i]);
        forw_lt_i += 2;
        forw_and_i += 1;
      }
      for (let c of forw_vals) {
        // assert.strictEqual(c.length, 1);
        forw_lines.push(`\t//${c}`);
        forw_lines.push(`\tforw_eq[${forw_eq_i}][i] = IsEqual();`);
        forw_lines.push(`\tforw_eq[${forw_eq_i}][i].in[0] <== in[i];`);
        forw_lines.push(
          `\tforw_eq[${forw_eq_i}][i].in[1] <== ${c.charCodeAt(0)};`
        );
        forw_eq_outputs.push(["forw_eq", forw_eq_i]);
        forw_eq_i += 1;
      }

      forw_lines.push(`\tforw_and[${forw_and_i}][i] = AND();`);
      forw_lines.push(
        `\tforw_and[${forw_and_i}][i].a <== forw_states[i][${prev_i}];`
      );

      if (forw_eq_outputs.length === 1) {
        forw_lines.push(
          `\tforw_and[${forw_and_i}][i].b <== ${forw_eq_outputs[0][0]}[${forw_eq_outputs[0][1]}][i].out;`
        );
      } else if (forw_eq_outputs.length > 1) {
        forw_lines.push(
          `\tforw_multi_or[${forw_multi_or_i}][i] = MultiOR(${forw_eq_outputs.length});`
        );
        for (let output_i = 0; output_i < forw_eq_outputs.length; output_i++) {
          forw_lines.push(
            `\tforw_multi_or[${forw_multi_or_i}][i].in[${output_i}] <== ${forw_eq_outputs[output_i][0]}[${forw_eq_outputs[output_i][1]}][i].out;`
          );
        }
        forw_lines.push(
          `\tforw_and[${forw_and_i}][i].b <== forw_multi_or[${forw_multi_or_i}][i].out;`
        );
        forw_multi_or_i += 1;
      }
      forw_outputs.push(forw_and_i);
      forw_and_i += 1;
    }

    if (forw_outputs.length === 1) {
      forw_lines.push(
        `\tforw_states[i+1][${i}] <== forw_and[${forw_outputs[0]}][i].out;`
      );
    } else if (forw_outputs.length > 1) {
      forw_lines.push(
        `\tforw_multi_or[${forw_multi_or_i}][i] = MultiOR(${forw_outputs.length});`
      );
      for (let output_i = 0; output_i < forw_outputs.length; output_i++) {
        forw_lines.push(
          `\tforw_multi_or[${forw_multi_or_i}][i].in[${output_i}] <== forw_and[${forw_outputs[output_i]}][i].out;`
        );
      }
      forw_lines.push(
        `\tforw_states[i+1][${i}] <== forw_multi_or[${forw_multi_or_i}][i].out;`
      );
      forw_multi_or_i += 1;
    }
  }

  forw_lines.push("}");
  // deal with accepted
  forw_lines.push("component forw_check_accepted[msg_bytes+1];");

  forw_lines.push("for (var i = 0; i <= msg_bytes; i++) {");
  forw_lines.push(
    `\tforw_check_accepted[i] = MultiOR(${forw_accept_states.size});`
  );
  let forw_count_setInd = 0;
  for (let element of forw_accept_states) {
    forw_lines.push(
      `\tforw_check_accepted[i].in[${forw_count_setInd}] <== forw_states[i][${parseInt(
        element
      )}] ;`
    );
    forw_count_setInd++;
  }

  forw_lines.push("}");

  let forw_declarations = [];

  if (forw_eq_i > 0) {
    forw_declarations.push(`component forw_eq[${forw_eq_i}][msg_bytes];`);
  }
  if (forw_lt_i > 0) {
    forw_declarations.push(`component forw_lt[${forw_lt_i}][msg_bytes];`);
  }
  if (forw_and_i > 0) {
    forw_declarations.push(`component forw_and[${forw_and_i}][msg_bytes];`);
  }
  if (forw_multi_or_i > 0) {
    forw_declarations.push(
      `component forw_multi_or[${forw_multi_or_i}][msg_bytes];`
    );
  }
  forw_declarations.push(`signal forw_states[msg_bytes+1][${forw_N}];`);
  forw_declarations.push("");

  let forw_init_code = [];

  forw_init_code.push("for (var i = 0; i < msg_bytes; i++) {");
  forw_init_code.push("\tforw_states[i][0] <== 1;");
  forw_init_code.push("}");

  forw_init_code.push(`for (var i = 1; i < ${forw_N}; i++) {`);
  forw_init_code.push("\tforw_states[0][i] <== 0;");
  forw_init_code.push("}");

  forw_init_code.push("");

  const forw_reveal_code = [];

  // new_tags region below

  // calculate reveal
  forw_reveal_code.push("for (var i = 0; i < msg_bytes; i++) {");
  // forw_adj_reveal is in reading backwards to be compatible with m3 reverse reading
  forw_reveal_code.push(
    "\tforw_adj_reveal[i] <== forw_check_accepted[msg_bytes - i].out;"
  );
  forw_reveal_code.push("}");
  forw_reveal_code.push("");
  forw_lines = [
    ...forw_declarations,
    ...forw_init_code,
    ...forw_lines,
    ...forw_reveal_code,
  ];

  // add main function

  // return forw_final_text;

  // ========================= step 2 region (m3 region) =============================
  const tagged_simp_graph = tagged_simplifyGraph(regex, submatches);
  let m2_graph = M1ToM2(tagged_simp_graph);
  let m3_graph = M2ToM3(m2_graph);
  let m4_graph = createM4(tagged_simp_graph);
  let tagged_m4_graph = registerToState(m4_graph);
  let final_m3_m4 = reassignM3M4(m3_graph, tagged_m4_graph);
  const m3_circom_graph = formatForCircom(final_m3_m4["final_m3_graph"]);
  const m4_circom_graph = formatForCircom(final_m3_m4["final_m4_graph"]);
  let m3_tpl_head = [];
  m3_tpl_head.push("\tsignal m3_in[msg_bytes];");
  m3_tpl_head.push("\tsignal output m3_adj_reveal[msg_bytes];");
  m3_tpl_head.push("\tfor (var i = 0; i < msg_bytes; i++) {");
  // backward input msgs
  m3_tpl_head.push("\t\tm3_in[i] <== in[msg_bytes - i - 1];");
  m3_tpl_head.push("\t}");

  const m3_N = m3_circom_graph["states"].size;
  const m3_accept_states = m3_circom_graph["accepted_states"];

  let m3_eq_i = 0;
  let m3_lt_i = 0;
  let m3_and_i = 0;
  let m3_multi_or_i = 0;

  let m3_lines = [];
  m3_lines.push("for (var i = 0; i < msg_bytes; i++) {");
  for (let i = 1; i < m3_N; i++) {
    const m3_outputs = [];
    for (let [k, prev_i] of m3_circom_graph["rev_transitions"][i]) {
      let m3_vals = new Set(JSON.parse(k));
      const m3_eq_outputs = [];

      if (
        new Set([...uppercase].filter((x) => m3_vals.has(x))).size ===
        uppercase.size
      ) {
        m3_vals = new Set([...m3_vals].filter((x) => !uppercase.has(x)));
        m3_lines.push("\t//UPPERCASE");
        m3_lines.push(`\tm3_lt[${m3_lt_i}][i] = LessThan(8);`);
        m3_lines.push(`\tm3_lt[${m3_lt_i}][i].in[0] <== 64;`);
        m3_lines.push(`\tm3_lt[${m3_lt_i}][i].in[1] <== m3_in[i];`);

        m3_lines.push(`\tm3_lt[${m3_lt_i + 1}][i] = LessThan(8);`);
        m3_lines.push(`\tm3_lt[${m3_lt_i + 1}][i].in[0] <== m3_in[i];`);
        m3_lines.push(`\tm3_lt[${m3_lt_i + 1}][i].in[1] <== 91;`);

        m3_lines.push(`\tm3_and[${m3_and_i}][i] = AND();`);
        m3_lines.push(
          `\tm3_and[${m3_and_i}][i].a <== m3_lt[${m3_lt_i}][i].out;`
        );
        m3_lines.push(
          `\tm3_and[${m3_and_i}][i].b <== m3_lt[${m3_lt_i + 1}][i].out;`
        );

        m3_eq_outputs.push(["m3_and", m3_and_i]);
        m3_lt_i += 2;
        m3_and_i += 1;
      }
      if (
        new Set([...lowercase].filter((x) => m3_vals.has(x))).size ===
        lowercase.size
      ) {
        m3_vals = new Set([...m3_vals].filter((x) => !lowercase.has(x)));
        m3_lines.push("\t//lowercase");
        m3_lines.push(`\tm3_lt[${m3_lt_i}][i] = LessThan(8);`);
        m3_lines.push(`\tm3_lt[${m3_lt_i}][i].in[0] <== 96;`);
        m3_lines.push(`\tm3_lt[${m3_lt_i}][i].in[1] <== m3_in[i];`);

        m3_lines.push(`\tm3_lt[${m3_lt_i + 1}][i] = LessThan(8);`);
        m3_lines.push(`\tm3_lt[${m3_lt_i + 1}][i].in[0] <== m3_in[i];`);
        m3_lines.push(`\tm3_lt[${m3_lt_i + 1}][i].in[1] <== 123;`);

        m3_lines.push(`\tm3_and[${m3_and_i}][i] = AND();`);
        m3_lines.push(
          `\tm3_and[${m3_and_i}][i].a <== m3_lt[${m3_lt_i}][i].out;`
        );
        m3_lines.push(
          `\tm3_and[${m3_and_i}][i].b <== m3_lt[${m3_lt_i + 1}][i].out;`
        );

        m3_eq_outputs.push(["m3_and", m3_and_i]);
        m3_lt_i += 2;
        m3_and_i += 1;
      }
      if (
        new Set([...digits].filter((x) => m3_vals.has(x))).size === digits.size
      ) {
        m3_vals = new Set([...m3_vals].filter((x) => !digits.has(x)));
        m3_lines.push("\t//digits");
        m3_lines.push(`\tm3_lt[${m3_lt_i}][i] = LessThan(8);`);
        m3_lines.push(`\tm3_lt[${m3_lt_i}][i].in[0] <== 47;`);
        m3_lines.push(`\tm3_lt[${m3_lt_i}][i].in[1] <== m3_in[i];`);

        m3_lines.push(`\tm3_lt[${m3_lt_i + 1}][i] = LessThan(8);`);
        m3_lines.push(`\tm3_lt[${m3_lt_i + 1}][i].in[0] <== m3_in[i];`);
        m3_lines.push(`\tm3_lt[${m3_lt_i + 1}][i].in[1] <== 58;`);

        m3_lines.push(`\tm3_and[${m3_and_i}][i] = AND();`);
        m3_lines.push(
          `\tm3_and[${m3_and_i}][i].a <== m3_lt[${m3_lt_i}][i].out;`
        );
        m3_lines.push(
          `\tm3_and[${m3_and_i}][i].b <== m3_lt[${m3_lt_i + 1}][i].out;`
        );

        m3_eq_outputs.push(["m3_and", m3_and_i]);
        m3_lt_i += 2;
        m3_and_i += 1;
      }
      for (let c of m3_vals) {
        // assert.strictEqual(c.length, 1);
        m3_lines.push(`\t//${c}`);
        m3_lines.push(`\tm3_eq[${m3_eq_i}][i] = IsEqual();`);
        m3_lines.push(`\tm3_eq[${m3_eq_i}][i].in[0] <== m3_in[i];`);
        m3_lines.push(`\tm3_eq[${m3_eq_i}][i].in[1] <== ${c.charCodeAt(0)};`);
        m3_eq_outputs.push(["m3_eq", m3_eq_i]);
        m3_eq_i += 1;
      }

      m3_lines.push(`\tm3_and[${m3_and_i}][i] = AND();`);
      m3_lines.push(`\tm3_and[${m3_and_i}][i].a <== m3_states[i][${prev_i}];`);

      if (m3_eq_outputs.length === 1) {
        m3_lines.push(
          `\tm3_and[${m3_and_i}][i].b <== ${m3_eq_outputs[0][0]}[${m3_eq_outputs[0][1]}][i].out;`
        );
      } else if (m3_eq_outputs.length > 1) {
        m3_lines.push(
          `\tm3_multi_or[${m3_multi_or_i}][i] = MultiOR(${m3_eq_outputs.length});`
        );
        for (let output_i = 0; output_i < m3_eq_outputs.length; output_i++) {
          m3_lines.push(
            `\tm3_multi_or[${m3_multi_or_i}][i].in[${output_i}] <== ${m3_eq_outputs[output_i][0]}[${m3_eq_outputs[output_i][1]}][i].out;`
          );
        }
        m3_lines.push(
          `\tm3_and[${m3_and_i}][i].b <== m3_multi_or[${m3_multi_or_i}][i].out;`
        );
        m3_multi_or_i += 1;
      }
      m3_outputs.push(m3_and_i);
      m3_and_i += 1;
    }

    if (m3_outputs.length === 1) {
      m3_lines.push(
        `\tm3_states[i+1][${i}] <== m3_and[${m3_outputs[0]}][i].out;`
      );
    } else if (m3_outputs.length > 1) {
      m3_lines.push(
        `\tm3_multi_or[${m3_multi_or_i}][i] = MultiOR(${m3_outputs.length});`
      );
      for (let output_i = 0; output_i < m3_outputs.length; output_i++) {
        m3_lines.push(
          `\tm3_multi_or[${m3_multi_or_i}][i].in[${output_i}] <== m3_and[${m3_outputs[output_i]}][i].out;`
        );
      }
      m3_lines.push(
        `\tm3_states[i+1][${i}] <== m3_multi_or[${m3_multi_or_i}][i].out;`
      );
      m3_multi_or_i += 1;
    }
  }

  m3_lines.push("}");
  // deal with accepted
  m3_lines.push("component m3_check_accepted[msg_bytes+1];");

  m3_lines.push("for (var i = 0; i <= msg_bytes; i++) {");
  m3_lines.push(`\tm3_check_accepted[i] = MultiOR(${m3_accept_states.size});`);
  let m3_count_setInd = 0;
  for (let element of m3_accept_states) {
    m3_lines.push(
      `\tm3_check_accepted[i].in[${m3_count_setInd}] <== m3_states[i][${parseInt(
        element
      )}] ;`
    );
    m3_count_setInd++;
  }

  m3_lines.push("}");

  let m3_declarations = [];

  if (m3_eq_i > 0) {
    m3_declarations.push(`component m3_eq[${m3_eq_i}][msg_bytes];`);
  }
  if (m3_lt_i > 0) {
    m3_declarations.push(`component m3_lt[${m3_lt_i}][msg_bytes];`);
  }
  if (m3_and_i > 0) {
    m3_declarations.push(`component m3_and[${m3_and_i}][msg_bytes];`);
  }
  if (m3_multi_or_i > 0) {
    m3_declarations.push(`component m3_multi_or[${m3_multi_or_i}][msg_bytes];`);
  }
  // m3_states[i+1][j] = 1 iff index i makes transition into state j. similar to others
  m3_declarations.push(`signal m3_states[msg_bytes+1][${m3_N}];`);
  m3_declarations.push("");

  let m3_init_code = [];
  // add forw_adj_reveal to not make there exist different j,k that makes both m3_states[i][j] and m3_states[i][k] = 1 for some i
  m3_init_code.push("for (var i = 0; i < msg_bytes; i++) {");
  m3_init_code.push("\tm3_states[i][0] <== forw_adj_reveal[i];");
  m3_init_code.push("}");

  m3_init_code.push(`for (var i = 1; i < ${m3_N}; i++) {`);
  m3_init_code.push("\tm3_states[0][i] <== 0;");
  m3_init_code.push("}");

  m3_init_code.push("");

  const m3_reveal_code = [];

  // new_tags region below

  // calculate reveal
  m3_reveal_code.push("for (var i = 0; i < msg_bytes; i++) {");
  // TO BE CONTINUED
  m3_reveal_code.push("\tm3_adj_reveal[i] <== m3_check_accepted[i].out;");
  m3_reveal_code.push("}");
  m3_reveal_code.push("");
  m3_lines = [
    ...m3_declarations,
    ...m3_init_code,
    ...m3_lines,
    ...m3_reveal_code,
  ];
  // ============================= final_text aggregation ===========================
  final_text += forw_lib_head.join("\n") + "\n";
  final_text += forw_tpl_head.join("\n") + "\n" + m3_tpl_head.join("\n") + "\n";
  final_text +=
    "\n\t" + forw_lines.join("\n\t") + "\n\t" + m3_lines.join("\n\t") + "\n}";
  final_text += "\n\ncomponent main { public [in] } = Regex(100);";
  return final_text;
}
