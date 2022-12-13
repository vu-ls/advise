import React from 'react'
import { useState, useEffect} from 'react';
import { Modal, Button, Form, Alert } from "react-bootstrap";

const ReserveCVEModal = ({ showModal, hideModal, api}) => {
    const [error, setError] = useState(null);
    const [reserveNum, setReserveNum] = useState("1");
    const [year, setYear] = useState("");
    const [reserveType, setReserveType] = useState("Sequential");
    const [feedback, setFeedback] = useState([]);
    const currentYear = new Date().getFullYear();
    const last10years = Array.from(new Array(10),(val, index) => currentYear-index);
    const [showSubmitButton, setShowSubmitButton] = useState(true);

    function submitForm() {
        /* get form check */
	let formField = {};
	if (year === "") {
	    formField['cve_year'] = currentYear;
	} else {
	    formField['cve_year'] = year;
	}
        formField['amount'] = reserveNum;

	formField['batch_type'] = reserveType;
	formField['short_name'] = api.org_name;
	console.log(formField);
	try {
	    api.reserveCVEs(formField).then((response) => {
		console.log(response);
		setFeedback(response.cve_ids);
		setShowSubmitButton(false);

	    });
	} catch(err) {
	    console.log(err);
	    setError("Err: " + err.message);
	    
	}
	
    };


    return (
        <Modal show={showModal} onHide={hideModal}>
        <Modal.Header closeButton>
            <Modal.Title>Reserve CVE</Modal.Title>
        </Modal.Header>
            <Modal.Body>
		{error &&
		 <Alert variant="danger">{error}</Alert>
		}
		{feedback.length > 0 ?
		 <>
		 <Alert variant="success">Success! The following CVEs have been reserved:</Alert>
		 <ul>
		     {feedback.map((cve, index) => {
			 return (
			     <li>{cve.cve_id}</li>
			 )
		     })}
		 </ul>
		 </>
		 :
		 <>
		<Form.Group className="mb-3">
		    <Form.Label>Number of CVE's</Form.Label>
		    <Form.Control
			name="amount"
			type="number"
			value={reserveNum}
			max={10}
			onChange={(e)=>setReserveNum(e.target.value)}
		    />
		</Form.Group>
		<Form.Group className="mb-3">
		    <Form.Label>Year</Form.Label>
		    <Form.Select
			name="year"
			value={year}
			onChange={(e)=>setYear(e.target.value)}
		    >
			{last10years.map((year, index) => {
			    return <option key={`year${index}`} value={year}>{year}</option>
			})
			}
		    </Form.Select>
		</Form.Group>
		<Form.Group className="mb-3">
		    <Form.Label>Reserve Type</Form.Label>
		    <Form.Select
			name="batch_type"
			value={reserveType}
			onChange={(e)=>setReserveType(e.target.value)}
			>
			<option value="Sequential">Sequential</option>
			<option value="Random">Random</option>
		    </Form.Select>
		</Form.Group>
		     </>
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
                 Done                                                             
		 </Button>
		} 
	    </Modal.Footer>
	</Modal>
     )
}

export default ReserveCVEModal;
