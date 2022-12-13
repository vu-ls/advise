import React from 'react';
import ReactDOM from "react-dom";
import { useEffect, useState } from 'react';
import Editor from "./Editor";

export default function CaseThreads({ caseid }) {
    const [thread, setThread] = useState([]);
    const [post, setPosts] = useState([]);
    
    const [editorStatus, setEditorStatus] = useState(false);

    return (
	<Editor
	    thread = {caseid}
	/>
    )
}
