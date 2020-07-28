import React from 'react';

import './App.css';

import P5Wrapper from 'react-p5-wrapper';
import Sketch from "./Sketch/Sketch";

function App() {
  return (
    <div className="App">
        <P5Wrapper sketch={Sketch}/>
    </div>
  );
}

export default App;
