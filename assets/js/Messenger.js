import React, {useEffect, useCallback, createRef, useState, useRef} from 'react';
import ReactQuill, { Quill, editor } from 'react-quill';
import ImageResize from 'quill-image-resize-module-react';

import 'react-quill/dist/quill.snow.css';

Quill.register('modules/imageResize', ImageResize);

var globalref = null;

const Messenger = React.forwardRef((props, ref) => {

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
        imageResize: {
            parchment: Quill.import('parchment')
        },
    };

    useEffect(() => {
        globalref = ref;
    }, [props.people, ref]);

    return (

	<ReactQuill
            style={{
                height: '35vh',
                fontSize: '18px',
                marginBottom: '20px',
		paddingBottom: '40px',
            }}
            defaultValue={props.defaultValue || ""}
            value={props.value || ""}
            theme="snow"
            ref={ref}
	    isInvalid={props.isInvalid}
            placeholder={props.placeholder}
            modules={modules}
            onChange={(content, delta, source, editor) => {
                props.setValue(content, delta, source, editor);
            }}
        />
    );
    
});

export default React.memo(Messenger);


