import React, {useEffect, useCallback, createRef, useState, useRef} from 'react';
import ReactQuill, { Quill,editor } from 'react-quill';
import RichText from './RichText.js';
import {Alert, Form} from "react-bootstrap";
import axios from 'axios'
import CaseThreadAPI from './ThreadAPI';
const API_URL = process.env.API_URL || 'http://localhost:8000/advise';

const threadapi = new CaseThreadAPI();

export default function Editor(props) {
    const [reply, setReply] = useState(""); 
    const [text,setText] = useState("");
    const editorRef = React.createRef(null);
    const cardRef = useRef(null);
    const [users, setUsers] = useState(props.participants);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [invalidPost, setInvalidPost] = useState(false);
    
    const handleChange = (html) => {
	setText(html);
    }

    useEffect(() => {
	if (props.post) {
	    const delta = editorRef.current.getEditor().clipboard.convert(props.post.content);
	    editorRef.current.getEditor().setContents(delta, 'silent');
	}
    }, [props.post]);

    useEffect(() => {
	if (props.reply) {
	    const qm = editorRef.current.getEditor().getModule('mention');
	    qm.insertItem({denotationChar: "@",id:'1', value:props.reply.author.name}, true);
	    editorRef.current.focus();
	    cardRef.current.scrollIntoView();


	}
    }, [props.reply]);

    useEffect(() => {
	setUsers(props.participants);
    }, [props.participants]);


    const uploadFiles = async(formData, filename, ref) => {
	console.log(`Uploading ${filename}: ${formData}`);
	let data = await threadapi.addPostImage(formData, props.thread)
	let results = await data.data;
	console.log(results);
	return results['image_url'];
	
    };

    
    const clearText = (e) => {
	e.preventDefault()
	if (props.post) {
	    props.dataUpdated()
	}
	editorRef.current.getEditor().setContents([]);
	setText('');
    }
    
    const submitPost = async (e) => {
	e.preventDefault();
	let formField = new FormData()
	console.log("IN SUBMIT POST");
	console.log(props.thread);
	console.log(props.post);

	if (text.replace(/<(.|\n)*?>/g, '').trim().length === 0) {
	    console.log("INVALID POST!");
	    setInvalidPost(true);
	    return;
	} else {
	    setInvalidPost(false);
	}
	
	if (props.post) {
	    /* just need to update this post */
	    threadapi.editPost(text, props.post).then((response) => {
		props.dataUpdated()
	    }).catch(err => {
		setError(`Error editing post: ${err.response.data.error}`);
	    });
	} else {
	    let url = `${API_URL}/api/case/thread/${props.thread.id}/posts/`;
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
		 <Form>
		     <div className="card-body" ref={cardRef}>
			 
			 <RichText
			     people = {users}
			     placeholder="Write a post or use @ to tag someone"
			     setValue={handleChange}
			     value={text}
			     ref={editorRef}
			     uploadFiles = {uploadFiles}
			 />
			 {invalidPost &&
			  <Form.Text className="error">
                              This field is required.                                                                                  
			  </Form.Text>
			 } 
		     </div>
		     <div className="card-footer text-end">
			 <button onClick={(e)=>clearText(e)} className="mx-1 btn btn-outline-secondary">Cancel</button>
			 <button onClick={(e)=>submitPost(e)} className="btn btn-primary">Submit</button>
		     </div>
		 </Form>
	     </>
	     :
	     <div className="card-body">Assign this case before starting the discussion.</div>
	    }
        </div>
	)
} 




