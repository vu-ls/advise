import React from 'react';
import ReactDOM from "react-dom";
import ReactQuill from 'react-quill';
//import 'react-quill/dist/quill.snow.css';
import { createRoot } from 'react-dom/client';
import CaseThreads from './casethreads';
import CaseThreadAPI from './ThreadAPI';
import { useState, useEffect } from 'react';
import ThreadDisplay from './ThreadDisplay';
import ThreadSearchForm from './ThreadSearch';
///get threads first

const threadapi = new CaseThreadAPI();

export function ThreadList(caseid) {
    const [threads, setThreads] = useState([]);
    useEffect(() => {
	console.log("in this 1");
	getAllThreads();
    }, []);


    const [requser, setReqUser] = useState("");
    useEffect(() => {
	console.log("in this 2");
	getUserCaseState();
    }, []);

    const [search, setSearch] = useState("");
    
    console.log("IN THREADLIS");
    console.log(caseid);

    const searchThreads=(props) => {
	setSearch(props.value);
    }
    
    const getUserCaseState=() => {
        console.log("IN User case state");
        threadapi.getUserCaseState(caseid).then((response) => {
            setReqUser(response);
        })
    }
    
    const getAllThreads = () => {
	console.log("get threads");
	threadapi.getThreads(caseid).then((response) => {
	    setThreads(response);
	})
    }

    const loadOnce = () => {
	getUserCaseState();
	getAllThreads();
    }

    
    return (
	<div>
	    <ThreadSearchForm
		onSubmit={searchThreads}
	    />
	    <ThreadDisplay
		threads={threads}
		user = {requser}
		search={search}
	    />
	</div>
    )
}

const container = document.getElementById("quilljs");
const caseid = container.getAttribute("caseid");
const root = createRoot(container);
root.render(
    <React.StrictMode>
	<ThreadList
	    case = {caseid}
	/>
    </React.StrictMode>

);



/*
var options = {
    placeholder: 'Ask a question or post a reply.  Use @ to tag someone in your post.',
    theme: 'snow'
};

var editor = new Quill("#id_content", options);

*/


/*
const DEPARTMENT_CHOICES = JSON.parse(document.getElementById('department-choices').textContent);

console.log(DEPARTMENT_CHOICES)

fetch(URLS.GROUP_API)
    .then(res => res.json())
    .then(
	(result) => {
	    console.log(result);
	},
	(error) => {
	    console.log('problemo');
	}
    );

*/

/*



ReactDOM.render(
  <h1>Hello, react!</h1>,
  document.getElementById('root')
);
*/
/*
function component() {
  const element = document.createElement('div');
  element.innerHTML = 'Hello webpack';
  return element;
}
document.body.appendChild(component());
*/
