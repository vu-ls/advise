import React from 'react';
import ReactDOM from "react-dom";
//import 'react-quill/dist/quill.snow.css';
import { createRoot } from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import TriageApp from './TriageApp.js';

const container = document.getElementById("app");
const root = createRoot(container);

root.render(
    <React.StrictMode>
	<BrowserRouter>
	    <TriageApp
	    />
	</BrowserRouter>
    </React.StrictMode>

);


