import React from 'react';
import ReactDOM from "react-dom";
//import 'react-quill/dist/quill.snow.css';
import { createRoot } from 'react-dom/client';
import GroupAdminApp from './GroupAdminApp';
const container = document.getElementById("app");
const root = createRoot(container);

root.render(
    <React.StrictMode>
	<GroupAdminApp
	/>
    </React.StrictMode>

);

