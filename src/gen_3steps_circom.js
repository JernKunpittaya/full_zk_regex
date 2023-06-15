// Assume only 1 regex matched
// Show where to start running M4, and corresponding transition for M4
import { simplifyGraph } from "./gen_dfa";
import { formatForCircom } from "./gen_tagged_dfa";
// generating circom for backward DFA
// Step 1:  naive gen_forw_circom
// Step 2: gen m3
// Step 3: gen m4
export function gen_forw_circom(regex) {
  const forw_graph = formatForCircom(simplifyGraph(regex));
  // lib_head, join with \n
  let forw_final_text = "";
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

  forw_final_text += forw_lib_head.join("\n") + "\n";
  // build tpl_head, join with \n
  const forw_tpl_head = [];
  forw_tpl_head.push("template forw_Regex (msg_bytes){");
  forw_tpl_head.push("\tsignal input in[msg_bytes];");
  // add adj_reveal (adjusted reveal) to reverse forw_reveal
  forw_tpl_head.push("\tsignal output adj_reveal[msg_bytes];");
  forw_tpl_head.push("");
  forw_tpl_head.push("");

  forw_final_text += forw_tpl_head.join("\n") + "\n";
  // compile content placeholder, join with \n\t
  // format tags stuffs
  const forw_N = forw_graph["states"].size;
  const forw_accept_states = forw_graph["accepted_states"];

  let forw_eq_i = 0;
  let forw_lt_i = 0;
  let forw_and_i = 0;
  let forw_multi_or_i = 0;

  let forw_lines = [];
  forw_lines.push("for (var i = 0; i < msg_bytes; i++) {");
  for (let i = 1; i < forw_N; i++) {
    const forw_outputs = [];
    for (let [k, prev_i] of forw_graph["rev_transitions"][i]) {
      let forw_vals = new Set(JSON.parse(k));
      const forw_eq_outputs = [];

      const forw_uppercase = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
      const forw_lowercase = new Set("abcdefghijklmnopqrstuvwxyz".split(""));
      const forw_digits = new Set("0123456789".split(""));

      if (
        new Set([...forw_uppercase].filter((x) => forw_vals.has(x))).size ===
        forw_uppercase.size
      ) {
        forw_vals = new Set(
          [...forw_vals].filter((x) => !forw_uppercase.has(x))
        );
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
        new Set([...forw_lowercase].filter((x) => forw_vals.has(x))).size ===
        forw_lowercase.size
      ) {
        forw_vals = new Set(
          [...forw_vals].filter((x) => !forw_lowercase.has(x))
        );
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
        new Set([...forw_digits].filter((x) => forw_vals.has(x))).size ===
        forw_digits.size
      ) {
        forw_vals = new Set([...forw_vals].filter((x) => !forw_digits.has(x)));
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
  // TO BE CONTINUED
  forw_reveal_code.push("\tadj_reveal[i] <== forw_check_accepted[i].out;");
  forw_reveal_code.push("}");
  forw_reveal_code.push("");
  forw_lines = [
    ...forw_declarations,
    ...forw_init_code,
    ...forw_lines,
    ...forw_reveal_code,
  ];

  forw_final_text += "\n\t" + forw_lines.join("\n\t") + "\n}";

  // add main function
  forw_final_text += "\n\ncomponent main { public [in] } = forw_Regex(100);";
  return forw_final_text;
}
