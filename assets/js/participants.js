import React from 'react';
import ReactDOM from "react-dom";
//import 'react-quill/dist/quill.snow.css';
import { createRoot } from 'react-dom/client';
import ParticipantTable from './ParticipantTable.js';

const container = document.getElementById("app");
const caseid = container.getAttribute("caseid");
const root = createRoot(container);

root.render(
    <React.StrictMode>
	<ParticipantTable
	    case = {caseid}
	/>
    </React.StrictMode>

);


