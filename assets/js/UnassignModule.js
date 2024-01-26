import React from 'react'
import { useState, useEffect} from 'react';
import { Modal, Button, Form } from "react-bootstrap";

const UnassignModule = ({ showModal, hideModal, confirmModal, owners }) => {

    const [showSubmitButton, setShowSubmitButton] = useState(true);
    const [invalidSelection, setInvalidSelection] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState([]);
    
    function submitForm() {
	/* get form check */
	if (owners.length == 1) {
	    confirmModal([owners[0].id]);
	} else {
	    /* check to make sure selection was made */
	    if (selectedOwner.length > 0) {
		confirmModal(selectedOwner)
	    } else {
		setInvalidSelection(true);
	    }
	}
    };

    const setOwners = (e, o) => {
	const { value, checked } = e.target;

	if (checked) {
	    setSelectedOwner(selectedOwner => [...selectedOwner, o]);
	} else {
	    /*remove */
	    setSelectedOwner((selectedOwner) => selectedOwner.filter((item) => item != o));
	}
    }
	

    
    return (
        <Modal show={showModal} onHide={hideModal} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Select User to Unassign</Modal.Title>
        </Modal.Header>
	    <Modal.Body>
		{owners.length > 1 ?
		 <>
		     <Form.Label>There are multiple users assigned to this case. Who would you like to remove?</Form.Label>
		     {owners.map((r, index) => {
			 return (
			     <Form.Check
				 key={`owner-${r.id}`}
				 id={`owner-${r.id}`}
				 label={r.name}
				 onChange={(e)=>setOwners(e, r.id)}
			     />
			 )
		     })
		     }
		     {invalidSelection &&
		      <Form.Text className="error">
                          Please select at least one.
                      </Form.Text>
		     }
		 </>
		 :
		 <div className="alert alert-danger">Are you sure you want to unassign this case?</div>
		}
	    </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={hideModal}>
		Cancel
            </Button>
            <Button data-testid="submit-unassign" variant="primary" onClick={() => submitForm() }>
		Submit
            </Button>
        </Modal.Footer>
      </Modal>
    )
}

export default UnassignModule;
