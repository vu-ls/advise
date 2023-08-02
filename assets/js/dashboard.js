import React from 'react';
import ReactDOM from "react-dom";
//import 'react-quill/dist/quill.snow.css';
import { createRoot } from 'react-dom/client';
import DashboardApp from './DashboardApp.js';
import {BrowserRouter} from 'react-router-dom';
const container = document.getElementById("app");
const root = createRoot(container);

root.render(
    <BrowserRouter>  
	<DashboardApp
	/>
    </BrowserRouter>

);


