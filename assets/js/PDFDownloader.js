import React, { useState, useEffect } from 'react'
import {hydrateRoot} from 'react-dom/client';
import { renderToString } from "react-dom/server";
import { Dropdown } from 'react-bootstrap';
import jsPDF from 'jspdf';
import CaseThreadAPI from './ThreadAPI';

const threadapi = new CaseThreadAPI();


const PDFDownloader = (props) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const fetchAdvisory = async() => {
	threadapi.getCurrentAdvisory({'case': props.case_id}).then((response) => {
	    setData(response);
	}).catch(err => {
            console.log(err);
        });
    }

    useEffect(() => {
	fetchAdvisory();
    }, []);


    const downloadPDF = () => {
	setLoading(true);
	var doc = new jsPDF('p', 'pt', 'a4');
	var pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
	var pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
	const string = renderToString(data.content);
	let margins = [25, 20, 25, 20];
        doc.setFont("Helvetica");
	doc.setFontSize(24);
	doc.text(data.title, pageWidth/2, 50, {align: 'center'});
	let content = `<div class="advisorypdf" style="width:1350px">${data.content}</div>`;
        doc.html(content, {
	    callback: function(doc) {
		doc.save(`CASE${props.case_id}-advisory_DRAFT.pdf`);
	    },
	    margin:margins,
	    x: 40,
	    y: 60
	});
	
    }
    
    return (
	data ?
	    <Dropdown.Item key="pdf" onClick={(e)=>downloadPDF()}>
		PDF
	    </Dropdown.Item>
	:
	<>
	</>
    );

}

export default PDFDownloader;
