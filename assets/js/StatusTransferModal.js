import React from 'react';
import { Accordion, Modal, Table, Tabs, Alert, Badge, Button, Form, Tab } from "react-bootstrap";
import { useState, useEffect } from 'react';
import ComponentAPI from './ComponentAPI.js'
import { format, formatDistance } from 'date-fns'

const componentapi = new ComponentAPI();

const StatusTransferModal = ({showModal, hideModal, transfers}) => {

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [approvals, setApprovals] = useState([]);

    useEffect(() => {
	if (showModal) {
	    setApprovals(transfers);
	}

    }, [showModal])

    const sendRejection = async (transfer) => {
	await componentapi.rejectStatus(transfer).then((response) => {
	    let nt = approvals.filter((item) => item.id != transfer);
	    setApprovals(nt);

	}).catch(err => {
	    setError(`Error rejecting status: ${err.response.data.detail}`);
	});
    }

    const mergeStatus = async(transfer) => {
	await componentapi.mergeStatus(transfer).then((response) => {
	    let nt = approvals.filter((item) => item.id != transfer);
            setApprovals(nt);
	}).catch(err => {
	    setError(`Error merging status: ${err.response.data.detail}`);
	});
    }

    const hideAndSend = () => {
	hideModal(approvals.length);
    }
	    
    
    return (

	<Modal show={showModal} onHide={hideAndSend} size="xl" centered backdrop="static">
            <Modal.Header closeButton className="border-bottom">
                <Modal.Title>Status Transfers</Modal.Title>
            </Modal.Header>
            <Modal.Body>
		{error ?
                 <div className="alert alert-danger">{error}</div>
                 : ""}
		<p>Review the following transfers and approve or reject the transfer.</p>
		{approvals.length == 0 &&
		 <Alert variant="success">Got it!</Alert>
		}
		{approvals.map((rev, index) => {
		    return (
			<>
			    <div className="d-flex justify-content-between mb-3 border-bottom align-items-center py-2">
				<div>
				{rev.vex.statements.map((stmt, k) => {
				    return (
					<div key={`vex-${k}`}>
					    {stmt.products.map((product, y) => {
						return (
						    <span key={`product-${y}`}>{product}, </span>
						)
					    })}
					    {" "}<b>{stmt.status}</b>{" "}
					    {stmt.vulnerability}
					    {stmt.justification &&
					     <b>{" "}({stmt.justification})</b>
					    }
					</div>
				)
				})}
				</div>
				<div className="d-flex gap-2"><Button size="sm" onClick={(e)=>mergeStatus(rev.id)} variant="primary">Approve</Button><Button size="sm" variant="danger" onClick={(e)=>sendRejection(rev.id)}>Reject</Button></div>
			    </div>

			</>
		    )
		})}
	    </Modal.Body>
	    <Modal.Footer>
		<Button variant="primary" onClick={hideAndSend}>Close</Button>
	    </Modal.Footer>
	    
	</Modal>
    )

};

export default StatusTransferModal;
