import React from 'react';
import ReactDOM from "react-dom";
import { createRoot } from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import GroupRouterApp from './GroupRouterApp';

const container = document.getElementById("app");
const root = createRoot(container);

/* this is the group search page */

root.render(
    <React.StrictMode>
	<BrowserRouter>
	    <GroupRouterApp />
	</BrowserRouter>
    </React.StrictMode>

);

