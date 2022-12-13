import React, {useEffect, useCallback, createRef, useState, useRef} from 'react';
import ReactQuill, { Quill,editor } from 'react-quill';
import "quill-mention";

import 'react-quill/dist/quill.snow.css';
import 'quill-mention/dist/quill.mention.css';

const RichText = React.forwardRef((props, ref) => {


    const formats = [
        'font','size', 'mention',
        'bold','italic','underline','strike',
        'color','background',
	'header','blockquote','code-block',
        'indent','list',
	'direction','align',
        'link','image','video','formula',
    ]
    
    const modules = {
	toolbar: [
	    [{ font: [] }],
	    [{ size: ["small", false, "large", "huge"] }],
	    ["bold", "italic", "underline", "strike", "blockquote"],
	    [{ list: "ordered" }, { list: "bullet" }],
	    [{ align: [] }],
	    [{ color: [] }, { background: [] }],
	    ["image"],
	    ["clean"],
    ],
	mention: {
	    allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
	    mentionDenotationChars: ["@"],
	    spaceAfterInsert: true,
	    source: useCallback((searchTerm, renderList, mentionChar) => {
		let values;
                console.log("IN CALLBACK ", searchTerm);
                console.log(props.people);
		values = props.people.map(v => {
                    return {
                        id: v.id,
                        value: v.participant.name
                    }
                })
		if (searchTerm.length === 0) {
		    renderList(values, searchTerm);
		} else {
		    const matches = [];
		    console.log("val", values);
		    for (let i = 0; i < values.length; i++)
			if (
			    ~values[i].value.toLowerCase().indexOf(searchTerm.toLowerCase())
			)
			    matches.push(values[i]);
		    renderList(matches, searchTerm);
		}
	    }, []),
	},
    };
    
    return (
	<ReactQuill
	    style={{
                height: '30vh',
                fontSize: '18px',
                marginBottom: '20px',
		paddingBottom: '40px'
            }}
            defaultValue={props.defaultValue || ""}
            value={props.value || ""}
            theme="snow"
            ref={ref}
            placeholder={props.placeholder}
            className={`note_input`}
            formats={formats}
            modules={modules}
            onChange={(content, delta, source, editor) => {
		props.setValue(content, delta, source, editor);
            }}
	/>
    );
});

export default React.memo(RichText);
