# frontend_zk_regex

Slide: https://docs.google.com/presentation/d/1nSZdmwDKXjEM6bP6WBYyAWbCgK4cjpm-SXqDAA-MOjE/edit?usp=sharing

We allow users to easily create circom circuit to reveal subgroup. After the steps shown on frontend, we can deal with our newly baked circom circuit by

component main { public [msg, match_idx] } = Regex(max_msg_byte,max_reveal_byte,group_idx);

where msg is the whole text, match_idx is to tell which occurance of a certain subgroup match we are interested in, and group_idx is to tell which subgroup we are interested in.

For Dev:

# regex_submatch_simplified

Simplified version regex_submatch

Input: regex, submatches, text
Output: Return circom that allows us to reveal a specific submatch we defined through frontend.

Data flow and related functions

1. User type regex format like regex = "DKI: (([vad]=([12\\/]+); )+)bh"
2. Frontend process this regex, by simp_regex = gen_dfa.simplifyRegex
   (to deal with escape and change [] into or statements), then let users high light start and end of each group (inclusive) of this simp_regex. Save the value as submatches e.g.
   const submatches = [
   [5, 30],
   [7, 13],
   [15, 25],
   ];
3. Match all the strings that satisfies regex as a whole. ฺ(like previously version)
   Run
   const simp_graph = gen_dfa.simplifyGraph(regex);
   const matched_dfa = gen_dfa.findSubstrings(simp_graph, text);
   for (const subs of matched_dfa[1]) {
   var matched = text.slice(subs[0], subs[1] + 1);} Very important of +1!!
4. Now for each matched, we start extract substring state (we can have multiple matched values!)

   const tagged_simp_graph = gen_tagged_dfa.tagged_simplifyGraph(regex, submatches);
   var final_graph = gen_tagged_dfa.findMatchStateTagged(tagged_simp_graph);
   var allTags = final_graph["tags"];
   var transitions = final_graph["transitions"];

5. For Circom, we run
   gen_tagged_dfa.formatForCircom(final_graph); --> return
   {
   forward_transitions: forward_transitions,
   rev_transitions: rev_transitions,
   };

6. For frontend, will need to show that this stuff really correct. Look at gen_tagged_dfa.finalRegexExtractState

[Optional]

- Show final regex matching and what submatches become after expanding +, by running: after_plus = gen_dfa.simplifyPlus(simp_regex, submatches).
  var final_regex = after_plus["regex_show"];
  var final_submatches = after_plus["final_submatches"]; i.e.[
  [ [ 5, 65 ] ],
  [ [ 7, 13 ], [ 36, 42 ] ],
  [ [ 15, 31 ], [ 44, 60 ] ]
  ]
  (inclusive)

- Show the full tagged DFA, with its corresponding state transition that belong to each tag.
