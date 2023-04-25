import React from 'react';
import ReactDOM from "react-dom";
//import 'react-quill/dist/quill.snow.css';
import { createRoot } from 'react-dom/client';
import InboxApp from './InboxApp.js';
import LoadInboxApp from './LoadInboxApp.js'
import {Tab, Tabs} from 'react-bootstrap';
const container = document.getElementById("app");
var contactmsg=null;
if (document.getElementById('contact')) {
    contactmsg = document.getElementById('contact').getAttribute("val");
}
const coord = container.getAttribute("val");
const root = createRoot(container);


root.render(
    <LoadInboxApp
	coord = {coord}
	contactmsg = {contactmsg}
    />

);
