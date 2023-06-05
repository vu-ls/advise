import React from 'react';
import ReactDOM from "react-dom";
import { createRoot } from 'react-dom/client';
import ContactApp from './ContactApp';
const container = document.getElementById("app");
const contact = container.getAttribute("contact");
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <ContactApp
	    contact={contact}
        />
    </React.StrictMode>
);
