// generating circom for backward DFA
export function gen_back_circom(rev_graph, rev_rev_tran) {
  // lib_head, join with \n
  let rev_final_text = "";
  const rev_lib_head = [];
  rev_lib_head.push("pragma circom 2.1.4;");
  rev_lib_head.push("");
  rev_lib_head.push('include "circomlib/circuits/comparators.circom";');
  rev_lib_head.push('include "circomlib/circuits/gates.circom";');
  rev_lib_head.push("");
  // build template MultiOR(n)
  rev_lib_head.push("template MultiOR(n) {");
  rev_lib_head.push("\tsignal input in[n];");
  rev_lib_head.push("\tsignal output out;");
  rev_lib_head.push("");
  rev_lib_head.push("\tsignal sums[n];");
  rev_lib_head.push("\tsums[0] <== in[0];");
  rev_lib_head.push("\tfor (var i = 1; i < n; i++) {");
  rev_lib_head.push("\t\tsums[i] <== sums[i-1] + in[i];");
  rev_lib_head.push("\t}");
  rev_lib_head.push("\tcomponent is_zero = IsZero();");
  rev_lib_head.push("\tis_zero.in <== sums[n-1];");
  rev_lib_head.push("\tout <== 1 - is_zero.out;");
  rev_lib_head.push("}");
  rev_lib_head.push("");

  rev_final_text += rev_lib_head.join("\n") + "\n";
  // build tpl_head, join with \n
  const rev_tpl_head = [];
  rev_tpl_head.push("template rev_Regex (msg_bytes){");
  rev_tpl_head.push("\tsignal input msg[msg_bytes];");
  // add adj_reveal to reverse rev_reveal
  rev_tpl_head.push("\tsignal output adj_reveal[msg_bytes];");
  rev_tpl_head.push("");
  rev_tpl_head.push("");
  rev_tpl_head.push("\tvar num_bytes = msg_bytes;");
  rev_tpl_head.push("\tsignal rev_in[num_bytes];");
  rev_tpl_head.push("\tfor (var i = 0; i < msg_bytes; i++) {");
  // backward input msgs
  rev_tpl_head.push("\t\trev_in[i] <== msg[msg_bytes - i - 1];");
  rev_tpl_head.push("\t}");

  rev_final_text += rev_tpl_head.join("\n") + "\n";
  // compile content placeholder, join with \n\t
  // format tags stuffs
  const rev_N = rev_graph["states"].length;
  const rev_accept_states = rev_graph["accepted_states"];

  let rev_eq_i = 0;
  let rev_lt_i = 0;
  let rev_and_i = 0;
  let rev_multi_or_i = 0;

  let rev_lines = [];
  rev_lines.push("for (var i = 0; i < num_bytes; i++) {");

  for (let i = 1; i < rev_N; i++) {
    const rev_outputs = [];
    for (let [k, prev_i] of rev_rev_tran[i]) {
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
        rev_lines.push("\t//UPPERCASE");
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
      }
      if (
        new Set([...rev_lowercase].filter((x) => rev_vals.has(x))).size ===
        rev_lowercase.size
      ) {
        rev_vals = new Set([...rev_vals].filter((x) => !rev_lowercase.has(x)));
        rev_lines.push("\t//lowercase");
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
  rev_lines.push("component rev_check_accepted[num_bytes+1];");

  rev_lines.push("for (var i = 0; i <= num_bytes; i++) {");
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
    rev_declarations.push(`component rev_eq[${rev_eq_i}][num_bytes];`);
  }
  if (rev_lt_i > 0) {
    rev_declarations.push(`component rev_lt[${rev_lt_i}][num_bytes];`);
  }
  if (rev_and_i > 0) {
    rev_declarations.push(`component rev_and[${rev_and_i}][num_bytes];`);
  }
  if (rev_multi_or_i > 0) {
    rev_declarations.push(
      `component rev_multi_or[${rev_multi_or_i}][num_bytes];`
    );
  }
  rev_declarations.push(`signal rev_states[num_bytes+1][${rev_N}];`);
  rev_declarations.push("");

  let rev_init_code = [];

  rev_init_code.push("for (var i = 0; i < num_bytes; i++) {");
  rev_init_code.push("\trev_states[i][0] <== 1;");
  rev_init_code.push("}");

  rev_init_code.push(`for (var i = 1; i < ${rev_N}; i++) {`);
  rev_init_code.push("\trev_states[0][i] <== 0;");
  rev_init_code.push("}");

  rev_init_code.push("");

  const rev_reveal_code = [];

  //   rev_reveal_code.push("signal rev_reveal[num_bytes];");
  // new_tags region below

  // calculate reveal
  rev_reveal_code.push("for (var i = 0; i < num_bytes; i++) {");
  // TO BE CONTINUED
  rev_reveal_code.push(
    "\tadj_reveal[i] <== rev_check_accepted[num_bytes-i].out;"
  );
  rev_reveal_code.push("}");
  rev_reveal_code.push("");
  rev_lines = [
    ...rev_declarations,
    ...rev_init_code,
    ...rev_lines,
    ...rev_reveal_code,
  ];

  rev_final_text += "\n\t" + rev_lines.join("\n\t") + "\n}";

  // add main function
  rev_final_text += "\n\ncomponent main { public [msg] } = rev_Regex(100);";
  return rev_final_text;
}
