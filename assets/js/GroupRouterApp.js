import React from 'react';
import ReactDOM from "react-dom";
import { Route, Routes } from "react-router-dom"
import SearchGroupsApp from "./SearchGroupsApp";
import GroupAdminApp from "./GroupAdminApp";
import NoAccess from './NoAccess.js';

export default function GroupRouterApp() {
  return (
    <Routes>
        <Route path="/advise/groups">
            <Route index element={<SearchGroupsApp />} />
            <Route path=":id">
                <Route index element={<GroupAdminApp />}/>
                <Route path="err" element={<NoAccess />} />
            </Route>
        </Route>
	<Route path="/advise/group/admin" element={<GroupAdminApp />}/>
    </Routes>
  )
}
