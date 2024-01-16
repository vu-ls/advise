import React from 'react'
import { useState, useEffect} from 'react';
import { Alert } from "react-bootstrap";

function parseErrors (data) {
    function _camelCaseToVerbose(text) {
        return text.replace(/(?=[A-Z])/g, ' ');
    }

    function _underscoredToVerbose(text) {
        return text.replace(/[\d_]/g, ' ');
    }

    function _capitalize(text) {
        text = text.toLowerCase();
        text = text.charAt(0).toUpperCase() + text.slice(1);
        return text;
    }

    function _parseErrorItem(item, listPos) {
	console.log(item);
	console.log(typeof item);

	let isString = value => typeof value === 'string';
	let output = [];
	let content;
	
	for (const [key, value] of Object.entries(item)) {
	    console.log(`${key}: ${value}`);
	    let plainValue;
	    let listValue;


	    if (Array.isArray(value)) {
		if (isString(value[0])) {
		    plainValue = value.join(' ');
		} else {
		    listValue = _parseErrorList(value);
		}
	    } else if (isString(value)) {
		plainValue = value;
	    }

	    if (plainValue) {
		content = `<span class="value">${plainValue}</span>`;
	    } else {
		content = listValue;
	    }

	    if (content) {
		name = key
		if (key.search(/[A-Z]/) != -1)
                    name =_camelCaseToVerbose(key);

                if (key.search(/[\d_]/) != -1)
                    name =_underscoredToVerbose(key);

                name = _capitalize(name);

                output.push(`<li class="field"><span class="name">${name}</span>${content}</li>`);
	    }

	}
	
	output = output.join('');

	
        if (output) {
	    if (listPos) {
		return output;
	    }
            output = `<ul class="item">${output}</ul>`;
        }

	return output;

    }

    function _parseErrorList(items) {
	let output = [];
	items.forEach((item, i) => {
	    if (!item.isEmpty()) {
		output.push(_parseErrorItem(item, i+1))
	    }
	})

	output = output.join('');

	if (output) {
	    output = `<ul class="list">${output}</ul>`
	}

	return output
	
    }

    if (Array.isArray(data)) {
        return _parseErrorList(data);
    } else {
        return _parseErrorItem(data);
    }
};



const DRFErrorMessage = ({ error }) => {

    const [errorAlert, setErrorAlert] = useState(null);

    useEffect(() => {
	if (error) {
	    let errorbody = parseErrors(error);
	    setErrorAlert(errorbody);
	}
    }, [error]);

    return (
	errorAlert ?
	    <div className="alert alert-danger" dangerouslySetInnerHTML={{__html: errorAlert}}></div>
	 :
	 ""

    )
}

export default DRFErrorMessage;
