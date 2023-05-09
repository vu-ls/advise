import React from 'react';
import ReactDOM from "react-dom";
import { createRoot } from 'react-dom/client';
import GroupAdminApp from './GroupAdminApp';
const container = document.getElementById("app");
const group = container.getAttribute("group");
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <GroupAdminApp
	    group={group}
        />
    </React.StrictMode>

);
