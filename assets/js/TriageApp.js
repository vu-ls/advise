import React from 'react';
import ReactDOM from "react-dom";
import { Route, Routes } from "react-router-dom"
import TriageList from './TriageList.js';
import SearchCases from './SearchCases.js';
import CaseThreadApp from './CaseThreadApp'
import NoAccess from './NoAccess.js';
import CaseRoutes from './CaseRoutes.js';

export default function TriageApp() {
  return (
      <Routes>
	  <Route index path="/advise/triage" element={<TriageList />}/>
	  <Route path="/advise/cases/*" element={<CaseRoutes />} />
    </Routes>
  )
}
