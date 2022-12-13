import React from 'react';
import ReactDOM from "react-dom";
//import 'react-quill/dist/quill.snow.css';
import { createRoot } from 'react-dom/client';
import AdvisoryApp from './AdvisoryApp';
const container = document.getElementById("app");
const caseid = container.getAttribute("caseid");
const root = createRoot(container);

root.render(
    <React.StrictMode>
	<AdvisoryApp
	    case = {caseid}
	/>
    </React.StrictMode>

);

