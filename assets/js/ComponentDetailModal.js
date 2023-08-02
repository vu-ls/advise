import React from 'react';
import { Modal } from "react-bootstrap";
import { useState, useEffect } from 'react';
import '../css/casethread.css';
import ComponentDetailInternal from './ComponentDetailInternal';


const ComponentDetailModal = ({showModal, hideModal, id}) => {

    if (id) {
	return (
	    <Modal show={showModal} onHide={hideModal} size="lg" centered backdrop="static">
		<Modal.Header closeButton className="border-bottom">
                    <Modal.Title>Component Detail {id.name}</Modal.Title>
		</Modal.Header>
		<Modal.Body id="component-modal">
		    <ComponentDetailInternal
			component={id}
			loadactivity = {true}
			
		    />
		</Modal.Body>
	    </Modal>
	)
    }


};

export default ComponentDetailModal;
