import React from 'react';
import ReactDOM from "react-dom";
import { Route, Routes } from "react-router-dom"
import SearchCases from './SearchCases.js';
import CaseThreadApp from './CaseThreadApp';
import CaseStatusTable from './CaseStatusTable';
import NoAccess from './NoAccess.js';
import AdvisoryApp from './AdvisoryApp.js';
import ParticipantTable from './ParticipantTable.js';

const CaseRoutes = () => (
    <Routes>
	<Route index element={<SearchCases />} />
	<Route path=":id">
	    <Route index element={<CaseThreadApp />}/>
	    <Route path="err" element={<NoAccess />} />
	    <Route path="status" element={<CaseStatusTable />} />
	    <Route path="advisory" element={<AdvisoryApp />} />
	    <Route path="participants" element={<ParticipantTable />} />
	</Route>
    </Routes>
)

export default CaseRoutes;
