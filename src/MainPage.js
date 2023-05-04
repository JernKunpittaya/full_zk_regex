import React, { useState, useEffect } from "react";
import styled, { CSSProperties } from "styled-components";
import { useAsync, useMount, useUpdateEffect } from "react-use";
import { RegexInput } from "./components/RegexInput";
import { Button } from "./components/Button";
import { Highlighter } from "./components/Highlighter";
import { HighlightedText } from "./components/HighlightedText";
const { simplifyGraph, findSubstrings } = require("./gen_dfa");

export const MainPage = () => {
  // to be input in the future
  const testText = "hello Jern ja I'm here";
  const testRegex = "(h|e|l|o)*";
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

  function generateSegments(regex) {
    // Generate accepted substrings and a function used to
    // match segments and states given an index pair.

    // console.log("idxPair, ", idxPair)

    const graph = simplifyGraph(regex);
    const [substr, idxs] = findSubstrings(graph, text);

    // function matchSegments(idxPair) {
    //   const states = matchDFAfromSub(graph, idxs, idxPair, text);
    //   console.log("jjjj state: ", states);
    //   const final = matchSubfromDFA(graph, text, idxs, states);
    //   console.log("final sub: ", final);
    //   return [states, final];
    // }
    return [idxs];
  }
  // ========================= DFA function ======================
  function handleGenerateDFA() {
    // Generate graph parameters
    const graph = simplifyGraph(regex);
    setRawDFA(graph);
  }

  useEffect(() => {
    // Generates DFA and renders accepted segments
    if (convertActive) {
      handleGenerateDFA();
      console.log("DFA ", rawDFA); // rawDFA is always behind???? we need some argument to pass this in at a timely manner
      handleUpdateStaticHighlight();
      setConvertActive(false);
    }
  }, [convertActive]);

  // =================== Text Highlight Functions ===========

  function handleUpdateStaticHighlight() {
    // Displaying accepted segments in input text after Regex.
    const indices = generateSegments(regex)[0];
    console.log("jern indices: ", indices);
    console.log("reached");
    setStaticHighlights(indices);
  }

  //   function handleUpdateHighlight(newData) {
  //     // updates highlight on text input and also DFA
  //     const key = Object.keys(newData)[0];
  //     const raw = newData[key];
  //     const processedStates = {};
  //     const processedSegments = {};
  //     processedSegments[key] = generateSegments(regex)[1](raw)[1];
  //     console.log("new seg: ", processedSegments);
  //     processedStates[key] = generateSegments(regex)[1](raw)[0];
  //     console.log("new states: ", processedStates);

  //     setUserHighlights((prevState) => {
  //       const updatedState = { ...prevState, ...processedSegments };
  //       return updatedState;
  //     });

  //     setAllDFAHighlights((prevState) => {
  //       const updatedState = { ...prevState, ...processedStates };
  //       return updatedState;
  //     });
  //   }
  function handleUpdateColor(newData) {
    setUserColors((prevState) => {
      const updatedState = { ...prevState, ...newData };
      return updatedState;
    });
  }
  //   useUpdateEffect(() => {
  //     handleUpdateHighlight(newHighlight);
  //   }, [newHighlight]);

  useUpdateEffect(() => {
    handleUpdateColor(newColor);
  }, [newColor]);
  return (
    <Container>
      <RegexInput
        label="Enter your text here:"
        value={text}
        onChange={(e) => {
          console.log("text input: ");
          console.log(text);
          setText(e.currentTarget.value);
        }}
      />
      <RegexInput
        label="Enter your regex here:"
        value={regex}
        onChange={(e) => {
          console.log("regex input: ");
          console.log(regex);
          setRegex(e.currentTarget.value);
        }}
      />
      <Button
        disabled={displayMessage != "Match RegEx!" || regex.length === 0}
        onClick={async () => {
          console.log("yes");
          setConvertActive(true);
          setDisplayMessage("Match RegEx!");
        }}
      >
        {displayMessage}
      </Button>
      <h4>Regex matched:</h4>
      <Highlighter
        sampleText={text}
        newHighlight={{}}
        setNewHighlight={setNewHighlight}
        newColor={{}}
        setNewColor={setNewColor}
        staticHighlights={staticHighlights}
      />{" "}
      <HighlightedText
        userHighlights={userHighlights}
        DFAActiveState={AllDFAHighlights}
        sampleText={text}
        userColors={userColors}
        staticHighlights={staticHighlights}
      />
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
