import React, { useState, useEffect } from "react";
import styled, { CSSProperties } from "styled-components";
import { useUpdateEffect } from "react-use";
import { RegexInput } from "./components/RegexInput";
import { TextInput } from "./components/TextInput";
import { Button } from "./components/Button";
import { Highlighter } from "./components/Highlighter";
import { saveAs } from "file-saver";
import { genInputzkRepl } from "./gen_msg_zkrepl";
import { gen_circom } from "./gen_circom";
import { simplifyGraph, findSubstrings, simplifyRegex } from "./gen_dfa";
import {
  tagged_simplifyGraph,
  regexSubmatchState,
  findMatchStateTagged,
  formatForCircom,
} from "./gen_tagged_dfa";
export const MainPage = () => {
  // to be input in the future
  //   const testText = "hello Jern ja I'm here";
  //   const testRegex = "(h|e|l|o)*";
  const [convertActive, setConvertActive] = useState(false);

  //============================ highlight states
  const [userHighlights, setUserHighlights] = useState({});
  const [staticHighlights, setStaticHighlights] = useState([]);
  const [userColors, setUserColors] = useState({});
  const [newHighlight, setNewHighlight] = useState({});
  const [newColor, setNewColor] = useState({});

  //============================= text states
  const [text, setText] = useState("");
  //============================ regex states
  const [regex, setRegex] = useState("");
  const [simpleRegex, setSimpleRegex] = useState("");
  const [displayMessage, setDisplayMessage] = useState("Match RegEx!");

  //============================ DFA states
  const [rawDFA, setRawDFA] = useState({
    accepted_states: new Set(),
    alphabets: new Set(),
    or_sets: new Set(),
    start_state: "",
    states: [],
    transitions: {},
  });
  const [AllDFAHighlights, setAllDFAHighlights] = useState({});
  // =============================Submatches
  const [newSubmatches, setNewSubmatches] = useState({});
  const [submatchesArr, setSubmatchesArr] = useState([]);
  const [tagDict, setTagDict] = useState({});
  const [groupMatch, setGroupMatch] = useState([]);

  //==============================zkREPL
  const [replMsg, setReplMsg] = useState("");
  const [replMsgLen, setReplMsgLen] = useState("");

  function generateSegments(regex) {
    const graph = simplifyGraph(
      String.raw`${regex}`
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r")
        .replace(/\\x0b/g, "\x0b")
        .replace(/\\x0c/g, "\x0c")
    );
    return findSubstrings(graph, text);
  }
  function generateTaggedDFA(regex, submatches) {
    const tagged_simp_graph = tagged_simplifyGraph(
      String.raw`${regex}`
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r")
        .replace(/\\x0b/g, "\x0b")
        .replace(/\\x0c/g, "\x0c"),
      submatches
    );
    const matched_dfa = generateSegments(
      String.raw`${regex}`
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r")
        .replace(/\\x0b/g, "\x0b")
        .replace(/\\x0c/g, "\x0c")
    );
    let tagged_dictionary = {};
    for (const subs of matched_dfa[1]) {
      let matched = text.slice(subs[0], subs[1] + 1);
      tagged_dictionary[matched] = {};
      let tag_result = regexSubmatchState(matched, tagged_simp_graph);
      // now iterate through each tag result
      for (let index in tag_result) {
        tagged_dictionary[matched][index] = [];
        for (
          let groupInd = 0;
          groupInd < tag_result[index].length;
          groupInd++
        ) {
          tagged_dictionary[matched][index].push(
            matched.slice(
              tag_result[index][groupInd][0],
              tag_result[index][groupInd][0] +
                tag_result[index][groupInd].length
            )
          );
        }
      }
    }
    setTagDict(tagged_dictionary);
    console.log("result tagged dict: ", tagged_dictionary);
  }
  // ========================= DFA function ======================
  function handleGenerateDFA() {
    // Generate graph parameters
    const graph = simplifyGraph(
      String.raw`${regex}`
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r")
        .replace(/\\x0b/g, "\x0b")
        .replace(/\\x0c/g, "\x0c")
    );
    setRawDFA(graph);
  }
  function handleGenerateSimpleRegex() {
    // console.log("b4: ", regex);
    // console.log("simppp: ", simplifyRegex(regex));
    // console.log("simp22: ", simplifyRegex(regex.replace(/\\n/g, "\n")));
    setSimpleRegex(
      simplifyRegex(
        String.raw`${regex}`
          .replace(/\\n/g, "\n")
          .replace(/\\t/g, "\t")
          .replace(/\\r/g, "\r")
          .replace(/\\x0b/g, "\x0b")
          .replace(/\\x0c/g, "\x0c")
      )
    );
  }

  useEffect(() => {
    // Renders accepted segments & create full Regex
    if (convertActive) {
      handleGenerateDFA();
      handleGenerateSimpleRegex();
      //   console.log("DFA ", rawDFA); // rawDFA is always behind???? we need some argument to pass this in at a timely manner
      handleUpdateStaticHighlight();
      setConvertActive(false);
    }
  }, [convertActive]);

  // =================== Text Highlight Functions ===========

  function handleUpdateStaticHighlight() {
    // Displaying accepted segments in input text after Regex.
    const indices = generateSegments(regex)[1];
    // console.log("jern indices: ", indices);
    // console.log("reached");
    setStaticHighlights(indices);
  }

  function handleUpdateHighlight(newData) {
    // console.log("new data: ", newData);
    setNewSubmatches((prevState) => {
      const updatedSubmatches = { ...prevState, ...newData };
      return updatedSubmatches;
    });
  }
  function handleUpdateSubmatch(newSubmatches) {
    // console.log("submatch change to ", newSubmatches);
    // sort dictionary into array linked
    let submatches_arr = [];
    let key_arr = [];
    for (let key in newSubmatches) {
      key_arr.push(key);
      submatches_arr.push([
        parseInt(newSubmatches[key][0]),
        parseInt(newSubmatches[key][1]),
      ]);
    }
    const original = submatches_arr.slice();
    submatches_arr.sort((a, b) => a[0] - b[0]);
    console.log("new Submatches Array: ", submatches_arr);
    setSubmatchesArr(submatches_arr);
    let shuffledIndex = submatches_arr.map((item) => original.indexOf(item));
    let group_match = [];
    for (let ele of shuffledIndex) {
      group_match.push(key_arr[ele]);
    }
    setGroupMatch(group_match);
    // remember what each how to line up groupy stuffs
  }
  // Show what text corresponds to that group match
  function handleUpdateSubmatchArr(submatchesArr) {
    // console.log("create dfa jyaa ", submatchesArr);
    generateTaggedDFA(regex, submatchesArr);
  }
  function handleUpdateColor(newData) {
    setUserColors((prevState) => {
      const updatedState = { ...prevState, ...newData };
      return updatedState;
    });
  }
  function handleGenerateCircom(event) {
    event.preventDefault();
    const tagged_simp_graph = tagged_simplifyGraph(
      String.raw`${regex}`
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r")
        .replace(/\\x0b/g, "\x0b")
        .replace(/\\x0c/g, "\x0c"),
      submatchesArr
    );
    let final_graph = findMatchStateTagged(tagged_simp_graph);
    let graphforCircom = formatForCircom(final_graph);
    let rev_tran = graphforCircom["rev_transitions"];
    const text = gen_circom(final_graph, rev_tran);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "circom.txt");
  }

  function handleGenMsgRepl(event) {
    event.preventDefault();
    const blob = new Blob(
      [JSON.stringify(genInputzkRepl(replMsg, replMsgLen))],
      { type: "text/plain;charset=utf-8" }
    );
    saveAs(blob, "msg.txt");
  }

  useUpdateEffect(() => {
    handleUpdateHighlight(newHighlight);
  }, [newHighlight]);

  useUpdateEffect(() => {
    handleUpdateColor(newColor);
  }, [newColor]);
  useUpdateEffect(() => {
    handleUpdateSubmatch(newSubmatches);
  }, [newSubmatches]);
  useUpdateEffect(() => {
    handleUpdateSubmatchArr(submatchesArr);
  }, [submatchesArr]);

  return (
    <Container>
      <h1>ZK RegEX</h1>
      <TextInput
        label="Enter your text here:"
        value={text}
        onChange={(e) => {
          //   console.log("text input: ");
          //   console.log(JSON.stringify(text));
          setText(e.currentTarget.value.replace(/\n/g, "\r\n"));
        }}
      />
      {/* <pre>{text}</pre> */}
      <RegexInput
        label="Enter your regex here:"
        value={regex}
        onChange={(e) => {
          //   console.log("jernjaa input: ");
          //   console.log(e.currentTarget.value);
          setRegex(e.currentTarget.value);
          //   console.log("regex ", regex);
        }}
      />
      <Button
        disabled={displayMessage != "Match RegEx!" || regex.length === 0}
        onClick={async () => {
          //   console.log("yes");
          setConvertActive(true);
          setDisplayMessage("Match RegEx!");
        }}
      >
        {displayMessage}
      </Button>
      {/* <h4>{regex}</h4>
      <h4>{simpleRegex}</h4> */}
      <Highlighter
        sampleText={text}
        sampleRegex={simpleRegex}
        newHighlight={{}}
        setNewHighlight={setNewHighlight}
        newColor={{}}
        setNewColor={setNewColor}
        staticHighlights={staticHighlights}
      />{" "}
      <div>
        <h3 style={{ padding: 0 }}>Extracted Subgroup:</h3>
        <div
          style={{
            margin: "20px 0",
            padding: "10px",
            border: "1px solid white",
            padding: 0,
          }}
        >
          {Object.entries(tagDict).map(([dfa_match, tag_dict]) => (
            <div style={{ position: "relative", padding: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                <h4
                  style={{
                    fontWeight: "bold",
                    marginRight: "10px",
                  }}
                >
                  DFA matched:
                </h4>
                <pre>
                  <h4 style={{ fontWeight: "normal" }}>{dfa_match}</h4>
                </pre>
              </div>
              <div style={{ marginLeft: "50px" }}>
                {Object.entries(tag_dict).map(([tagNum, content]) => (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: 0,
                      }}
                    >
                      <h5
                        style={{
                          fontWeight: "bold",
                          marginRight: "10px",
                        }}
                      >
                        {groupMatch[tagNum]}
                      </h5>
                      <h4 style={{ fontWeight: "normal" }}>
                        (Group: {tagNum})
                      </h4>
                    </div>
                    <pre>
                      <div style={{ marginLeft: "50px" }}>
                        {content.map((item) => (
                          <h5>{item}</h5>
                        ))}
                      </div>
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Button onClick={handleGenerateCircom}>Download Circom</Button>
      <h2 style={{ fontWeight: "normal" }}>Msg generator for zkREPL</h2>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <textarea
          placeholder="msg"
          value={replMsg}
          onChange={(e) => setReplMsg(e.target.value)}
        />
        <input
          style={{ maxWidth: "200px" }}
          type="number"
          placeholder="msg max length"
          value={replMsgLen}
          onChange={(e) => setReplMsgLen(e.target.value)}
        />
        <button style={{ maxWidth: "200px" }} onClick={handleGenMsgRepl}>
          Download msg for zkREPL
        </button>
      </div>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  & .title {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  & .main {
    & .signaturePane {
      flex: 1;
      display: flex;
      flex-direction: column;
      & > :first-child {
        height: calc(30vh + 24px);
      }
    }
  }

  & .bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    & p {
      text-align: center;
    }
    & .labeledTextAreaContainer {
      align-self: center;
      max-width: 50vw;
      width: 500px;
    }
  }
`;
