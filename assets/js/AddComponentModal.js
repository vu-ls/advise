import React from 'react';
import { Modal, Alert, Badge, FloatingLabel, Button, InputGroup, Form, Row, Col } from "react-bootstrap";
import { useState, useEffect } from 'react';
import ComponentAPI from './ComponentAPI.js'
import ContactAPI from './ContactAPI';

const componentapi = new ComponentAPI();
const contactapi = new ContactAPI();

const AddComponentModal = ({showModal, hideModal, title, edit, group}) => {

    const [error, setError] = useState(null);
    const [formContent, setFormContent] = useState(null);
    const [loading, setIsLoading] = useState(true);
    const [groupName, setGroupName] = useState("");
    
    // Async Fetch
    const fetchInitialData = async () => {
	if (group) {
	    console.log("IN FETCH!!!");
	    let res = await contactapi.getMyGroup(group).then(response => {
		let data = response.data;
		console.log(data);
		setGroupName(data.name);
	    }).catch(err => {
		console.log(err);
		setError(`Error getting group information: ${err.response.data.message}`);
	    });
	}
        try {
	    console.log("EDIT IS ", edit);
	    if (edit) {
		await componentapi.getEditComponentForm(edit).then((response) => {
		    setFormContent(response);
		})
	    } else {
		await componentapi.getComponentForm().then((response) => {
                    setFormContent(response);
                    setIsLoading(false);
		})
	    }
        } catch (err) {
            console.log('Error:', err)
        }
    }

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
	fetchInitialData();
    }, [edit]);


    const handleSubmit = (event) => {
	event.preventDefault();
	const formData = new FormData(event.target),
              formDataObj = Object.fromEntries(formData.entries());
	console.log(formDataObj);
	try {
	    if (edit) {
		componentapi.updateComponent(edit, formDataObj).then((response) => {
		    hideModal();
		})
	    } else if (group) {
		componentapi.addGroupComponent(group, formDataObj).then((response) => {
		    hideModal();
		})
	    } else {
		componentapi.addComponent(formDataObj).then((response) => {
		    hideModal();
		})
	    }
	} catch (err) {
	    console.log(err);
	}
	
    }

    
    return (

	<Modal show={showModal} onHide={hideModal} size="lg" centered>
            <Modal.Header closeButton className="border-bottom">                
                <Modal.Title>{title}</Modal.Title>                        
            </Modal.Header>                                                     
            <Modal.Body>                                                        
		{groupName &&
		 <Alert variant="info">Adding component to {groupName}</Alert>
		}
		
		{error ?
                 <div className="alert alert-danger">{error}</div>
                 : ""}
		
		{formContent ?
		 <form onSubmit={(e)=>handleSubmit(e)}>
		     <div dangerouslySetInnerHTML={{__html: formContent}} />

		     <div className="d-flex justify-content-end gap-2">
			 <Button variant="outline-secondary" type="cancel" onClick={(e)=>(e.preventDefault(), hideModal())}>Cancel</Button> 
			 
			 <Button variant="primary" type="submit">
			 Submit</Button>
		     </div>
		 </form>
		 : <p>Loading...</p>

		}
	    </Modal.Body>
	</Modal>
    )

};

export default AddComponentModal;
