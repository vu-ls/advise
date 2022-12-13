import React, { useState, useEffect } from 'react'
import {hydrateRoot} from 'react-dom/client';
import { Dropdown } from 'react-bootstrap';
import { PDFDownloadLink, usePDF, Document, Text, View, StyleSheet, Page } from '@react-pdf/renderer';
import CaseThreadAPI from './ThreadAPI';
import {AdvisoryPDF} from './AdvisoryPDF';

const threadapi = new CaseThreadAPI();


const PDFDownloader = (props) => {
    const [instance, updateInstance] = useState(null);
    const [data, setData] = useState(null);
    const [newInstance, updateNewInstance] = usePDF({'document': <myPDF/> });
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

    const HelloWorldPDF = (data) => (
	<Document>
	    <Page size="A4">
		<View>
		    <Text>{data.data.title}</Text>
		</View>
	    </Page>
	</Document>
    )
    
    return (
	<>
	    {data ?
	     <PDFDownloadLink document={<AdvisoryPDF data={data}/>} fileName="somename.pdf" className="dropdown-item">
		 {
		     ({loading}) => loading ? 'PDF' : 'PDF'
		 }     
	     </PDFDownloadLink>
	     :
	     <Dropdown.Item key="pdf">
		 PDF
	     </Dropdown.Item>
	    }
	</>
    );

}

export default PDFDownloader;
