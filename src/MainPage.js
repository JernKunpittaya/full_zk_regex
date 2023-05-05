import React, { useState, useEffect } from "react";
import styled, { CSSProperties } from "styled-components";
import { useAsync, useMount, useUpdateEffect } from "react-use";
import { RegexInput } from "./components/RegexInput";
import { Button } from "./components/Button";
import { Highlighter } from "./components/Highlighter";
import { HighlightedText } from "./components/HighlightedText";
const {
  simplifyGraph,
  findSubstrings,
  simplifyPlus,
  simplifyRegex,
} = require("./gen_dfa");
const {
  tagged_simplifyGraph,
  regexSubmatchState,
} = require("./gen_tagged_dfa");
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

  function generateSegments(regex) {
    const graph = simplifyGraph(regex);
    return findSubstrings(graph, text);
  }
  function generateTaggedDFA(regex, submatches) {
    const tagged_simp_graph = tagged_simplifyGraph(regex, submatches);
    const matched_dfa = generateSegments(regex);
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
    const graph = simplifyGraph(regex);
    setRawDFA(graph);
  }
  function handleGenerateSimpleRegex() {
    setSimpleRegex(simplifyRegex(regex));
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
    console.log("new data: ", newData);
    setNewSubmatches((prevState) => {
      const updatedSubmatches = { ...prevState, ...newData };
      return updatedSubmatches;
    });
  }
  function handleUpdateSubmatch(newSubmatches) {
    console.log("submatch change to ", newSubmatches);
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
    console.log("create dfa jyaa ", submatchesArr);
    generateTaggedDFA(regex, submatchesArr);
  }
  function handleUpdateColor(newData) {
    setUserColors((prevState) => {
      const updatedState = { ...prevState, ...newData };
      return updatedState;
    });
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
      <RegexInput
        label="Enter your text here:"
        value={text}
        onChange={(e) => {
          //   console.log("text input: ");
          //   console.log(text);
          setText(e.currentTarget.value);
        }}
      />
      <RegexInput
        label="Enter your regex here:"
        value={regex}
        onChange={(e) => {
          //   console.log("regex input: ");
          //   console.log(regex);
          setRegex(e.currentTarget.value);
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
      <Highlighter
        sampleText={text}
        sampleRegex={simpleRegex}
        newHighlight={{}}
        setNewHighlight={setNewHighlight}
        newColor={{}}
        setNewColor={setNewColor}
        staticHighlights={staticHighlights}
      />{" "}
      <h3>Extracted Subgroup:</h3>
      {/* <div>
        {Object.entries(newSubmatches).map(([tagname, substrings]) => (
          <div>
            <td>{tagname}</td>
            <td>{substrings[0]}</td>
            <td>,</td>
            <td>{substrings[1]}</td>
          </div>
        ))}
      </div> */}
      <div>
        {Object.entries(tagDict).map(([dfa_match, tag_dict]) => (
          <div>
            <h4>DFA matched</h4>
            <td>{dfa_match}</td>
            <div>
              {Object.entries(tag_dict).map(([tagNum, content]) => (
                <div>
                  <h5>{groupMatch[tagNum]}</h5>
                  <div>
                    {content.map((item) => (
                      <h5>{item}</h5>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* <HighlightedText
        userHighlights={userHighlights}
        DFAActiveState={AllDFAHighlights}
        sampleText={text}
        userColors={userColors}
        staticHighlights={staticHighlights}
      /> */}
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
