import React from 'react';
import ReactDOM from "react-dom";
//import 'react-quill/dist/quill.snow.css';                                                                                             
import { createRoot } from 'react-dom/client';
import DesignForm from './DesignForm.js';

const container = document.getElementById("app");
const formid = container.getAttribute("formid");
const root = createRoot(container);

root.render(
    <React.StrictMode>                                                                                                               
        <DesignForm
            form = {formid}
        />                                                                                                                              
    </React.StrictMode>

);
