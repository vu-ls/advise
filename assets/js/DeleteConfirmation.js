import React from 'react'
import { useState, useEffect} from 'react';
import { Modal, Button } from "react-bootstrap";
 
const DeleteConfirmation = ({ showModal, hideModal, confirmModal, id, message, buttonText="Delete" }) => {

    const [showDeleteButton, setShowDeleteButton] = useState(true);


    useEffect(() => {
	if (id) {
	    if (id.isArray) {
		if (id.length) {
		    setShowDeleteButton(true);
		} else {
		    setShowDeleteButton(false);
		}
	    } else {
		setShowDeleteButton(true);
	    }
	} else {
	    setShowDeleteButton(false);
	}
    }, [id])
    
    return (
        <Modal show={showModal} onHide={hideModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm this action</Modal.Title>
        </Modal.Header>
        <Modal.Body><div className="alert alert-danger">{message}</div></Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={hideModal}>
            Cancel
          </Button>
	    {showDeleteButton ?
             <Button variant="danger" onClick={() => confirmModal(id) }>
		 {buttonText}
             </Button>
	     :
	     <Button variant="primary" onClick={hideModal}>
		 Ok
	     </Button>
	    }
        </Modal.Footer>
      </Modal>
    )
}
 
export default DeleteConfirmation;
