import React from 'react';
import ReactDOM from "react-dom";
import { Route, Routes } from "react-router-dom"
import NoAccess from './NoAccess.js';
import SysAdminApp from './SysAdminApp.js';

const AdminRoutes = () => (
    <Routes>
	<Route index element={<SysAdminApp />} />
        <Route path=":id">
	    <Route index element={<SysAdminApp />} />
            <Route path="err" element={<NoAccess />} />
	    <Route path="case" element={<SysAdminApp />} />
	    <Route path="tags" element={<SysAdminApp />} />
        </Route>
    </Routes>
)

export default AdminRoutes;
