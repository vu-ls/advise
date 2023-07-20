import React, {useEffect, useCallback, createRef, useState, useRef} from 'react';
import ReactQuill, { Quill, editor } from 'react-quill';
import ImageResize from 'quill-image-resize-module-react';
import CaseThreadAPI from './ThreadAPI';
import "quill-mention";

import 'react-quill/dist/quill.snow.css';
import 'quill-mention/dist/quill.mention.css';

Quill.register('modules/imageResize', ImageResize);

const threadapi = new CaseThreadAPI();

var people = [
    {id: 1, participant: {name: 'Example'}},
]

var globalref = null;

const mention = {
    allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
    mentionDenotationChars: ["@"],
    spaceAfterInsert: true,
    source: function(searchTerm, renderList, mentionChar) {
        let values;
        console.log("IN CALLBACK ", searchTerm);
        values = people.map(v => {
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
    }
}

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


    const imageHandler = useCallback(() => {
	
	const input = document.createElement('input');  
	
	input.setAttribute('type', 'file');  
	input.setAttribute('accept', 'image/*');  
	input.click();  
    
	input.onchange = async () => {  
	    var file = input.files[0];  
	    var formData = new FormData();  
	    
	    formData.append('image', file);  
	    
	    var fileName = file.name;  
	    
	    const res = await props.uploadFiles(formData, fileName);
	    console.log(res);
	    console.log(globalref);
	    const range = globalref.current.selection;
	    console.log(range);
            globalref.current.getEditor().insertEmbed(range.index, 'image', res);
	    globalref.current.getEditor().setSelection(range.index + 1);
	    
	};
    }, []);
    
    const modules = {
	toolbar: {
	    container: [
	    [{ font: [] }],
	    [{ size: ["small", false, "large", "huge"] }],
	    ["bold", "italic", "underline", "strike", "blockquote"],
	    [{ list: "ordered" }, { list: "bullet" }],
	    [{ align: [] }],
	    [{ color: [] }, { background: [] }],
	    ["image"],
		["clean"],
	    ],
	    handlers: {
		'image': imageHandler
	    }
	},
	mention: mention,
	imageResize: {
	    parchment: Quill.import('parchment')
	},
	clipboard: {
	    matchVisual: false,
	},
    };


    useEffect(() => {
	people = props.people;
	globalref = ref;
    }, [props.people, ref]);
    
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
