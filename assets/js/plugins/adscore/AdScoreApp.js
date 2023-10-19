import React from 'react';
import ReactDOM from "react-dom";
import { Route, Routes } from "react-router-dom"
import ScoreList from './ScoreList.js';

export default function AdScoreApp() {
    return (
	<Routes>
	    <Route path="/advise/score">
		<Route index element={<ScoreList />} />
		<Route path=":id">
		    <Route index element={<ScoreList />} />
		</Route>
	    </Route>
	</Routes>
    )
}
