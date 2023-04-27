import React, {useEffect, useCallback, createRef, useState, useRef} from 'react';
import ReactQuill, { Quill,editor } from 'react-quill';
import RichText from './RichText.js';
import {Alert} from "react-bootstrap";
import axios from 'axios'
import CaseThreadAPI from './ThreadAPI';
const API_URL = process.env.API_URL || 'http://localhost:8000/advise';

const threadapi = new CaseThreadAPI();

export default function Editor(props) {
    let initialText = props.post ? props.post.content: "";
    let thread = props.thread;
    let post = props.post;
    //this.attachQuillRefs = this.attachQuillRefs.bind(this);
    const [reply, setReply] = useState(""); 
    const [text,setText] = useState(initialText);
    const editorRef = React.createRef(null);
    const cardRef = useRef(null);
    const [users, setUsers] = useState(props.participants);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const handleChange= (html)=> {
	setText(html);
    }

    useEffect(() => {
	if (props.reply) {
	    setText(props.reply.author.name)
	    console.log(editorRef);
	    const qm = editorRef.current.getEditor().getModule('mention');
	    qm.insertItem({denotationChar: "@",id:'1', value:props.reply.author.name}, true);
	    editorRef.current.focus();
	    cardRef.current.scrollIntoView();


	}
    }, [props.reply]);

    useEffect(() => {
	console.log("USERS CHANGED", props.thread);
	console.log(props.participants);
	setUsers(props.participants);
    }, [props.participants]);


    const clearText = () => {
	setText('');
    }
    
    const submitPost = async () => {
	let formField = new FormData()
	console.log("IN SUBMIT POST");
	console.log(thread);
	console.log(post);
	if (post) {
	    /* just need to update this post */
	    threadapi.editPost(text, post).then((response) => {
		props.dataUpdated()
	    });
	} else {
	    let url = `${API_URL}/api/case/${thread.id}/posts/`;
	    formField.append('content', text);
	    if (props.reply) {
		formField.append('reply', props.reply.id);
	    }
	    await axios({
		method: 'post',
		url: url,
		data: formField,
	    }). then(( response) => {
		console.log(response.data)
		setText('');
		console.log("NOW UPDATE THIS");
		props.dataUpdated();
	    }).catch(err => {
		setError(`Error posting message: ${err.message}`);
	    })
	}
    }

    return (
	<div className="card">
	    {error &&
	     <Alert variant="danger"> {error}</Alert>
	    }
	    {users.length > 0 ?
	     <>
		 <div className="card-body" ref={cardRef}>
		     
		     <RichText
			 people = {users}
			 placeholder="Write a post or use @ to tag someone"
			 setValue={handleChange}
			 value={text}
			 ref={editorRef}
		     />
		 </div>
		 <div className="card-footer text-end">
                     <button onClick={clearText} className="mx-1 btn btn-outline-secondary">Cancel</button>
                     <button onClick={submitPost} className="btn btn-primary">Submit</button>
		 </div>
	     </>
	     :
	     <div className="card-body">Assign this case before starting the discussion.</div>
	    }
        </div>
	)
} 




