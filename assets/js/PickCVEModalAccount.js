import React from 'react'
import { useState, useEffect} from 'react';
import { Modal, Alert, Form, Button } from "react-bootstrap";
import CVEAPI from './CVEAPI';

const PickCVEModalAccount = ({ showModal, hideModal, message, confirmModal, test }) => {

    const [showDeleteButton, setShowDeleteButton] = useState(true);
    const [accountID, setAccountID] = useState("");
    const [apiError, setApiError] = useState(false);
    
    const testSubmit = async () => {
	/* test to make sure this account works before proceeding */
	if (!test) {
	    /*if this is used to simply pull a CVE, it doesn't matter
	      if the credentials are legit.*/
	    confirmModal(accountID);
	    return;
	}
	let cveAPI = new CVEAPI(accountID.org_name, accountID.email, accountID.api_key, accountID.server);
	try {
            let account = await cveAPI.getUser(accountID.email);
	    let rj = await account.data;
	    if (rj) {
		confirmModal(accountID);
	    }
        } catch (err) {
            setApiError(err.message);

        }
    }
	
    
    return (
        <Modal show={showModal} onHide={hideModal} centered backdrop="static">
        <Modal.Header closeButton>
            <Modal.Title>{message.length > 1 ?
			  <>Pick a CVE Account to use</> :
			  <>There are no active CVE accounts</>
			 }</Modal.Title>
        </Modal.Header>
            <Modal.Body>
		{apiError &&
		 <Alert variant="danger">Error with account {accountID.org_name} {accountID.email}: {apiError}</Alert>
		}
		
		
		{message.length > 1 ?
		 (
		     <>
			 <div className="alert alert-danger">There are multiple active CVE accounts to choose from.</div>
			 {message.map((acc, index) => {
			     return (
				 <Form.Check
				     type="radio"
				     key={`account-${acc.id}`}
				     onChange={(e)=>setAccountID(acc)}
				     name="account"
				     label={<div>{acc.org_name}: {acc.email}, <b>{acc.server_type} API</b></div>}
				 />
			     )
			 })
			 }
		     </>
		 )
		 :
		 <div className="alert alert-danger">Add an account in CVE Services Settings to continue.</div>
		}
	    </Modal.Body>
            <Modal.Footer>
		<Button variant="secondary" onClick={hideModal}>
		    Cancel
		</Button>
		{message.length > 1 ?
		 <Button variant="danger" onClick={() => testSubmit()}>
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
 
export default PickCVEModalAccount;
