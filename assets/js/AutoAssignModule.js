import React from 'react'
import { useState, useEffect} from 'react';
import { Modal, Button, Form } from "react-bootstrap";

const AutoAssignModule = ({ showModal, hideModal, confirmModal, roles }) => {

    const [showSubmitButton, setShowSubmitButton] = useState(true);
    const [selectedRole, setSelectedRole] = useState(null);
    const [invalidSelection, setInvalidSelection] = useState(false);

    useEffect(() => {
	console.log("ROLES", roles);
	if (roles.length > 0) {
	    setShowSubmitButton(true);
	} else {
	    setShowSubmitButton(false);
	}
    }, [roles])

    function submitForm() {
	/* get form check */
	if (selectedRole) {
	    confirmModal(selectedRole.r)
	} else {
	    setInvalidSelection(true);
	}
    };

    return (
        <Modal show={showModal} onHide={hideModal}>
        <Modal.Header closeButton>
          <Modal.Title>Auto Assign</Modal.Title>
        </Modal.Header>
	    <Modal.Body>
		{roles.length > 0 ?
		 <>
		     <Form.Label>Choose role to assign case.</Form.Label>
		     {roles.map((r, index) => {
			 return (
			     <Form.Check
				 key={`role-${r}`}
				 type='radio'
				 id={`role-${r}`}
				 label={r}
				 onChange={(e)=>setSelectedRole({r})}
			     />
			 )
		     })
		     }
		     {invalidSelection &&
		      <Form.Text className="error">
                          Role is required.
                      </Form.Text>
		     }
		 </>
		 :
		 <div className="alert alert-danger">Auto assignment requires user roles.</div>
		}
	    </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={hideModal}>
            Cancel
          </Button>
	    {showSubmitButton ?
             <Button variant="primary" onClick={() => submitForm() }>
		 Submit
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

export default AutoAssignModule;
