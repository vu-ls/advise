import React from 'react';
import ReactDOM from "react-dom";
//import 'react-quill/dist/quill.snow.css';
import { createRoot } from 'react-dom/client';
import InboxApp from './InboxApp.js';

const container = document.getElementById("app");
const coord = container.getAttribute("val");
const root = createRoot(container);


root.render(
    <React.StrictMode>
        <InboxApp
	    coord={coord}
        />
    </React.StrictMode>

);
