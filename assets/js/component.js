import React from 'react';
import ReactDOM from "react-dom";
import { createRoot } from 'react-dom/client';
import ComponentApp from './ComponentApp';
import {BrowserRouter} from 'react-router-dom';

const container = document.getElementById("app");
const root = createRoot(container);

root.render(
    <React.StrictMode>
	<BrowserRouter>
	    <ComponentApp />
	</BrowserRouter>
    </React.StrictMode>

);
