import React from 'react';
import ReactDOM from "react-dom";
import { createRoot } from 'react-dom/client';
import AdScoreApp from './AdScoreApp.js';
import {BrowserRouter} from 'react-router-dom';
const container = document.getElementById("app");
const root = createRoot(container);

root.render(
    <BrowserRouter>  
	<AdScoreApp
	/>
    </BrowserRouter>

);


