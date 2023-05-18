import React from 'react'
import { useState, useEffect} from 'react';
import { Modal, Button, Form } from "react-bootstrap";

const UploadFileModal = ({ showModal, hideModal, confirmModal}) => {

    const [invalidSelection, setInvalidSelection] = useState(false);
    const [buttonDisabled, setButtonDisabled] = useState(false);
    
    function submitForm(e) {
	/* get form check */
	e.preventDefault();
	if (buttonDisabled) {
            return;
        }
	const formData = new FormData(e.target),
              formDataObj = Object.fromEntries(formData.entries());
        console.log(formDataObj);
	console.log(e);
	if (formDataObj.file.size > 0) {
            setButtonDisabled(true);	
	    confirmModal(formDataObj);
	} else {
	    setInvalidSelection(true);
	}
    };

    useEffect(() => {
	setButtonDisabled(false);
    }, [showModal]);
    
    return (
        <Modal show={showModal} onHide={hideModal}>
	    <Form onSubmit={(e) => submitForm(e) }>
		<Modal.Header closeButton>
		    <Modal.Title>Upload File to Case</Modal.Title>
		</Modal.Header>
		<Modal.Body>
		    
		    <small className="form-text text-muted">                                  
			You can attach a file such as a document or screenshot to this case.
		    </small>
		    <Form.Group controlId="formFile" className="mb-3">
			<Form.Label>File</Form.Label>
			<Form.Control name="file" type="file" />
		    </Form.Group>
		    {invalidSelection &&
		     <Form.Text className="error">
			 File is required.
		     </Form.Text>
		    }

		</Modal.Body>
		<Modal.Footer>
		    <Button variant="secondary" onClick={hideModal}>
			Cancel
		    </Button>
		    <Button variant="primary" type="submit" disabled={buttonDisabled}>
			Submit
		    </Button>
		</Modal.Footer>
	    </Form>
      </Modal>
    )
}

export default UploadFileModal;
