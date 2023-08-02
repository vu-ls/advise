import React from 'react';
import ReactDOM from "react-dom";
import { Route, Routes } from "react-router-dom"
import ComponentTable from './ComponentTable.js';
import ComponentDetail from './ComponentDetail.js';
import NoAccess from './NoAccess.js';

export default function ComponentApp() {
  return (
    <Routes>
	<Route path="/advise/components">
	    <Route index element={<ComponentTable />} />
	    <Route path=":id">
		<Route index element={<ComponentDetail />}/>
		<Route path="err" element={<NoAccess />} />
	    </Route>
	</Route>
    </Routes>
  )
}
