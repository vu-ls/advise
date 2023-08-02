import React from 'react';
import { Modal, Badge, FloatingLabel, Button, InputGroup, Form, Row, Col } from "react-bootstrap";
import { useState, useEffect } from 'react';
import ContactAPI from './ContactAPI.js'

const contactapi = new ContactAPI();

const AddComponentModal = ({showModal, hideModal, addNewGroup}) => {

    const [error, setError] = useState("");
    const [formContent, setFormContent] = useState(null);
    const [loading, setIsLoading] = useState(true);
    
    // Async Fetch
    const fetchInitialData = async () => {
        try {
	    await contactapi.getGroupForm().then((response) => {
                setFormContent(response);
                setIsLoading(false);
	    })
	    
        } catch (err) {
            console.log('Error:', err)
        }
    }

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
	setError("");
    }, [showModal]);


    const handleSubmit = async(event) => {
	event.preventDefault();
	const formData = new FormData(event.target),
              formDataObj = Object.fromEntries(formData.entries());
	console.log(formDataObj);
	await contactapi.addGroup(formDataObj).then(response => {
	    console.log(response);
	    let data = response.data;
	    console.log(data);
	    addNewGroup(data);
	}).catch(err =>  {
	    console.log(err);
	    setError(`Error adding group: ${err.response.data.message}`);
	});
    }

    
    return (

	<Modal show={showModal} onHide={hideModal} size="lg" centered>
            <Modal.Header closeButton className="border-bottom">                
                <Modal.Title>Add New Group</Modal.Title>                        
            </Modal.Header>                                                     
            <Modal.Body>                                                        
                {error ?
                 <div className="alert alert-danger">{error}</div>
                 : ""}
		
		{formContent ?
		 
		 <form onSubmit={(e)=>handleSubmit(e)}>
		     <div dangerouslySetInnerHTML={{__html: formContent}} />

		     <div className="d-flex justify-content-end gap-2">
			 <Button variant="secondary" onClick={(e)=>hideModal()}>
			 Cancel</Button>
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
