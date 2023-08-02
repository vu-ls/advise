import React, { useState, useEffect, useMemo } from 'react';
import {Row, Button, Form, InputGroup, Dropdown, DropdownButton, Alert, ListGroup, Card, Col} from 'react-bootstrap';
import AdminAPI from './AdminAPI';
import DeleteConfirmation from "./DeleteConfirmation";
import ErrorModal from "./ErrorModal";

const adminapi = new AdminAPI();

import '../css/casethread.css';

const CaseSettings = () => {

    const [options, setOptions] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [resolution, setResolution] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [removeID, setRemoveID] = useState(null);
    const [displayErrorModal, setDisplayErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const hideErrorModal = () => {
	setDisplayErrorModal(false);
    }

    /* need to add code to retrieve resolutions, add new ones, and remove one. */

    const fetchInitialData = async () => {
	setResolution("");

        adminapi.getResolutionOptions().then((response) => {
            console.log(response);
            setOptions(response);
	    setIsLoading(false);
        }).catch(err => {
	    console.log(err);
	    setErrorMessage(`Error retrieving options: ${err.message}.`);
            setDisplayErrorModal(true);
	});
    }

    const submitRemoveOption = (id) => {
        adminapi.deleteResolutionOption(id).then((response) => {
            setOptions((qs) =>
                qs.filter((select) => select.id !== id))
        }).catch(err => {
            setErrorMessage(`Error removing option: ${err.message}.`);
            setDisplayErrorModal(true);
            console.log(err);
        });
        setDisplayConfirmationModal(false);
    }

    
    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
    }
    
    function removeOption(id) {
        setRemoveID(id);
        /* TODO - pull related status to show user before confirmation */
        setDeleteMessage("Are you sure you want to remove this resolution option?");
	setDisplayConfirmationModal(true);
    };
    
    useEffect(() => {
        fetchInitialData();
    }, []);
    
    const submitResolution = async () => {
	console.log(`do something! ${resolution}`);
	const data = {'description': resolution}
	adminapi.addResolutionOption(data).then((response) => {
            fetchInitialData();
        }).catch(err => {
	    setErrorMessage(`Error adding option: ${err.message}.`);
            setDisplayErrorModal(true);
	    console.log(err);
	});
    }
	
    return (
	 <Card className="mb-4">
             <Card.Header><Card.Title>Case Settings</Card.Title></Card.Header>
             <Card.Body>
		 <Row xs={1} md={2} className="g-4">
		     <Col>
			 <Card bg="light">
			     <Card.Header className="d-flex justify-content-between">
				 <Card.Title>Case Resolution Options
				 </Card.Title>
				 <DropdownButton variant="btn p-0"
						 title={<i className="bx bx-dots-vertical-rounded"></i>}>
				     <Dropdown.Item eventKey="add" onClick={(e)=>setShowForm(true)}>Add Option</Dropdown.Item>
				 </DropdownButton>
			     </Card.Header>
			     <Card.Body>
				 {isLoading ?
				  <div className="text-center">                                                                  
				      <div className="lds-spinner"><div></div><div></div><div></div></div>                       
				  </div>
				  :
				  <ListGroup>
				      {options.map((o, index) => {
					  return (
					      <ListGroup.Item key={`resolution-${index}`} className="d-flex justify-content-between align-items-center">
						  <span>{o.description}</span>
						  <Button variant="btn p-0" onClick={(e)=>removeOption(o.id)}><i className="fas fa-trash"></i></Button>
					      </ListGroup.Item>
					  )
				      })}
				  </ListGroup>
				 }
				 {showForm &&
				  <InputGroup className="my-3">
				      <Form.Control placeholder="Add resolution" value={resolution} onChange={(e)=>setResolution(e.target.value)}/>
				      <Button variant="outline-secondary" onClick={(e)=>submitResolution()}><i className="fas fa-check"></i></Button>
				      <Button variant="outline-secondary" onClick={(e)=>setShowForm(false)}><i className="fas fa-times"></i></Button>
				  </InputGroup>
				 }
				      
			     </Card.Body>
			     
			 </Card>
		     </Col>
		 </Row>
		 <DeleteConfirmation
                     showModal={displayConfirmationModal}
                     confirmModal={submitRemoveOption}
                     hideModal={hideConfirmationModal}
                     id={removeID}
                     message={deleteMessage} />
		 <ErrorModal
                     showModal = {displayErrorModal}
                     hideModal = {hideErrorModal}
                     message = {errorMessage}
                 /> 
	     </Card.Body>
	 </Card>
    )

}

export default CaseSettings;
