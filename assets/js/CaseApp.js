import React from 'react';
import ReactDOM from "react-dom";
import { Route, Routes } from "react-router-dom"
import SearchCases from './SearchCases.js';
import CaseThreadApp from './CaseThreadApp';
import CaseStatusTable from './CaseStatusTable';
import NoAccess from './NoAccess.js';

export default function CaseApp() {
  return (
    <Routes>
	<Route path="/advise/cases">
	    <Route index element={<SearchCases />} />
	    <Route path=":id">
		<Route index element={<CaseThreadApp />}/>
		<Route path="err" element={<NoAccess />} />
		<Route path="status" element={<CaseStatusTable />} />
	    </Route>
	</Route>
    </Routes>
  )
}
