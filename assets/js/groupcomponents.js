import React from 'react';
import ReactDOM from "react-dom";
//import 'react-quill/dist/quill.snow.css';
import { createRoot } from 'react-dom/client';
import ComponentTable from './ComponentTable';
const container = document.getElementById("app");
const group = container.getAttribute("group");
const root = createRoot(container);

root.render(
    <React.StrictMode>
	<ComponentTable
	    group={group}
	/>
    </React.StrictMode>

);

