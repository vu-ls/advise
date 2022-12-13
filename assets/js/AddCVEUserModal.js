import React from 'react'
import { useState, useEffect} from 'react';
import { Modal, Button, Form, Alert } from "react-bootstrap";

const AddCVEUserModal = ({ showModal, hideModal, confirmModal, editUser }) => {

    const [showSubmitButton, setShowSubmitButton] = useState(true);
    const [invalidEmail, setInvalidEmail] = useState(false);
    const [invalidFirst, setInvalidFirst] = useState(false);
    const [invalidLast, setInvalidLast] = useState(false);
    const [email, setEmail] = useState("");
    const [first, setFirst] = useState("");
    const [last, setLast] = useState("");
    const [role, setRole] = useState("User");
    const [emailWarning, setEmailWarning] = useState(false);
    
    useEffect(() => {
	if (editUser) {
	    setFirst(editUser.name.first);
	    setLast(editUser.name.last);
	    setEmail(editUser.username);
	}
    }, [editUser]);

    useEffect(()=> {
	if (editUser) {
	    if (editUser.username != email) {
		setEmailWarning(true);
	    } else {
		setEmailWarning(false);
	    }
	}
    }, [email]);
    
    function submitForm() {
        /* get form check */
	if (email == "") {
	    setInvalidEmail(true);
	    return;
	}
	if (first == "") {
	    setInvalidFirst(true);
	    return;
	}
	if (last == "") {
	    setInvalidLast(false);
	    return;
	}
        confirmModal(email, first, last, role)
    };


    return (
        <Modal show={showModal} onHide={hideModal}>
        <Modal.Header closeButton>
            <Modal.Title>{editUser ? ("Edit") : ("Add") } CVE User</Modal.Title>
        </Modal.Header>
            <Modal.Body>
		<Form.Group className="mb-3">
		    {emailWarning &&
		     <Alert variant="warning">By editing the email address, you are modifying this user's login credentials. Be aware!</Alert>
		    }
		    <Form.Label>Email</Form.Label>
		    <Form.Control
			name="email"
			isInvalid={invalidEmail}
			value={email}
			onChange={(e)=>setEmail(e.target.value)}
		    />
		    {invalidEmail &&
                     <Form.Text className="error">
                         Field is required.
                     </Form.Text>
                     }
		</Form.Group>
		<Form.Group className="mb-3">
		    <Form.Label>First Name</Form.Label>
		    <Form.Control
			name="first"
			isInvalid={invalidFirst}
			value={first}
			onChange={(e)=>setFirst(e.target.value)}
		    />
		    {invalidFirst &&
                      <Form.Text className="error">
                          Field is required.
                      </Form.Text>
                     }
		</Form.Group>
		<Form.Group className="mb-3">
		    <Form.Label>Last Name</Form.Label>
		    <Form.Control
			name="last"
			isInvalid={invalidLast}
			value={last}
			onChange={(e)=>setLast(e.target.value)}
		    />
		    {invalidLast &&
                      <Form.Text className="error">
                          Last is required.
                      </Form.Text>
                     }
		</Form.Group>
		<Form.Label>
		    Choose role
		</Form.Label><br/>
		{['User', 'Administer'].map((r, index) => {
		    return (
			    <Form.Check
				key={`role-${r}`}
				inline
                                type='radio'
				name="role"
                                id={`role-${r}`}
                                label={r}
				defaultChecked={role === r ? true : false}
                                onChange={setRole}
                            />
		    )
		})
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

export default AddCVEUserModal;
