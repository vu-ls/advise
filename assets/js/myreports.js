import React from 'react';
import ReactDOM from "react-dom";
import { createRoot } from 'react-dom/client';
import MyReportsApp from './MyReportsApp.js';

const container = document.getElementById("app");
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <MyReportsApp
        />
    </React.StrictMode>

);
