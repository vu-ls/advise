import React from 'react';
import ReactDOM from "react-dom";
//import 'react-quill/dist/quill.snow.css';
import { createRoot } from 'react-dom/client';
import GroupApp from './GroupApp';
const container = document.getElementById("app");
const root = createRoot(container);

/* this is the group search page */

root.render(
    <React.StrictMode>
	<GroupApp
	/>
    </React.StrictMode>

);

