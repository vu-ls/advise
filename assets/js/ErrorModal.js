import React from 'react'
import { useState, useEffect} from 'react';
import { Modal, Button } from "react-bootstrap";
 
const ErrorModal = ({ showModal, hideModal, message }) => {

    return (
        <Modal show={showModal} onHide={hideModal}>
        <Modal.Header closeButton>
          <Modal.Title>Error</Modal.Title>
        </Modal.Header>
        <Modal.Body><div className="alert alert-danger">{message}</div></Modal.Body>
        <Modal.Footer>
	    <Button variant="primary" onClick={hideModal}>
		Ok
	    </Button>
        </Modal.Footer>
      </Modal>
    )
}
 
export default ErrorModal;
