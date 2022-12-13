import React from 'react';
import ReactDOM from "react-dom";
import { createRoot } from 'react-dom/client';
import ComponentTable from './ComponentTable.js';

const container = document.getElementById("app");
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <ComponentTable

        />
    </React.StrictMode>

);
