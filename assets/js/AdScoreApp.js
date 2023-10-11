import React from 'react';
import ReactDOM from "react-dom";
import { Route, Routes } from "react-router-dom"
import ScoreList from './ScoreList.js';

export default function AdScoreApp() {
  return (
      <Routes>
	  <Route index path="/advise/score/" element={<ScoreList />}/>
    </Routes>
  )
}
