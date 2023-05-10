import React from 'react';
import ReactDOM from "react-dom";
//import 'react-quill/dist/quill.snow.css';
import { createRoot } from 'react-dom/client';
import SearchAll from './SearchAll.js';

const container = document.getElementById("app");
const search = container.getAttribute("searchval");
const root = createRoot(container);

root.render(
    <SearchAll
	search={search}
    />

);
