import React from 'react';
import { Modal, Badge, FloatingLabel, Button, InputGroup, Form, Row, Col } from "react-bootstrap";
import { useState, useEffect } from 'react';


const ComponentDetailModal = ({showModal, hideModal, id}) => {

    if (id) {
	return (
	    <Modal show={showModal} onHide={hideModal} size="lg" centered>
		<Modal.Header closeButton className="border-bottom">                
                    <Modal.Title>Component Detail {id.name}</Modal.Title>                        
		</Modal.Header>                                                     
		<Modal.Body>
		    <div>
			{
			    Object.entries(id)
				.map( ([key, value]) => {
				    if (value) {
				    return (
					<div className="mt-2" key={`{key}-{value}`}><label className="form-label">{key}:</label>
					    { Array.isArray(value) ?
					      <><br/><ul>
						  {value.map((v, index) => {
						      if (typeof v === "object") {
							  return (
							      <li key={index}>{v.name}</li>
							  )
						      } else {
							  return (
							      <li key={index}>{v}</li>
							  )
						      }
						  })
						  }
					      </ul></>
					      :
					      <span className="m-2"><b>{value}</b></span>
					    }
					</div>
				    )}})
				    
			}
		    </div>
		</Modal.Body>
	    </Modal>
	)
    }


};

export default ComponentDetailModal;
