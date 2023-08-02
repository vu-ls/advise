import React from 'react';
import ReactDOM from "react-dom";
import { createRoot } from 'react-dom/client';
import CaseRoutes from './CaseRoutes.js';
import {BrowserRouter} from 'react-router-dom';
import { Route, Routes } from "react-router-dom"
const container = document.getElementById("app");
const root = createRoot(container);

root.render(
    <BrowserRouter>
	<Routes>
	    <Route path="/advise/cases/*" element={<CaseRoutes />} />
	</Routes>
    </BrowserRouter>

);
