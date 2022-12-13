import React from 'react';
import { Modal, Badge, Alert, FloatingLabel, Button, InputGroup, Form, Row, Col } from "react-bootstrap";
import { useState, useEffect } from 'react';


const UserDetailModal = ({showModal, hideModal, id, api}) => {

    const [feedback, setFeedback] = useState(null);
    const [data, setData] = useState(null);
    
    const deactivate = () => {
	api.deactivateUser(id.username).then((response) => {
	    console.log(response);
	    setFeedback(<Alert variant="warning">Done! User has been deactivated.</Alert>);
	    setData(response.updated);
	});
    }

    const reactivate = () => {
	api.reactivateUser(id.username).then((response) => {
            console.log(response);
            setFeedback(<Alert variant="success">Done! User has been activated.</Alert>);
	    setData(response.updated);
	});
    }
    
    const resetKey = () => {
	console.log('reset');
	api.resetKey(id.username).then((response) => {
	    console.log(response);
	    setFeedback(<Alert variant="success">Done! Key has been reset to {response["API-secret"]}</Alert>);
	});
    }

    useEffect(() => {
	if (id) {
	    setData(id);
	}
    }, [id]);
    
    
    if (data) {
	return (
	    <Modal show={showModal} onHide={hideModal} size="lg" centered>
		<Modal.Header closeButton className="border-bottom">
                    <Modal.Title>User Detail {data.username}</Modal.Title>
		</Modal.Header>
		<Modal.Body>
		    {feedback &&
		     <>
			 {feedback}
		     </>
		    }
		    <div className="mt-2"><label className="form-label">Username:</label> <b>{data.username}</b></div>
		    <div className="mt-2"><label className="form-label">Name:</label> <b>{data.name.first}{" "}{data.name.last}</b></div>
		    <div className="mt-2"><label className="form-label">ORG UUID:</label> <b>{data.org_UUID}</b></div>
		    <div className="mt-2"><label className="form-label">Created:</label> <b>{data.time.created}</b></div>
		    <div className="mt-2"><label className="form-label">UUID:</label> <b>{data.UUID}</b></div>
		    <div className="mt-2"><label className="form-label">Active:</label> <b>{data.active.toString()}</b></div>
		    <div className="mt-2"><label className="form-label">Roles:</label> <b>{data.authority.active_roles.length> 0 ?
											   data.authority.active_roles[0]:""}</b></div>
		    
		    

		</Modal.Body>
		<Modal.Footer>
		    {data.active ?
		     <Button variant="danger" onClick={(e)=>deactivate()}>Deactivate User</Button>
		     :
		     <Button variant="danger" onClick={(e)=>reactivate()}>Activate User</Button>
		    }
		    <Button variant="secondary" onClick={(e)=>resetKey()}>Reset Key</Button>
		</Modal.Footer>
	    </Modal>
	)
    }


};

export default UserDetailModal;
