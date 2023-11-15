import React from 'react';
import ReactDOM from "react-dom";
//import 'react-quill/dist/quill.snow.css';
import { createRoot } from 'react-dom/client';
import AdminRoutes from "./AdminRoutes.js"
import {BrowserRouter} from 'react-router-dom';
import { Route, Routes } from "react-router-dom"

const container = document.getElementById("app");
const root = createRoot(container);

root.render(
    <BrowserRouter>                                                                                                 
        <Routes>                                                                                                    
            <Route path="/advise/manage/system/*" element={<AdminRoutes />} />
        </Routes>                                                                                                   
    </BrowserRouter>
);


