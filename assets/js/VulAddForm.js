import React, { useState, useEffect, useRef } from 'react';
import CaseThreadAPI from './ThreadAPI';
import PickCVEModalAccount from "./PickCVEModalAccount";
import DeleteConfirmation from "./DeleteConfirmation";
import {Card, Badge, DropdownButton, Dropdown, Alert, Accordion, Row, Col, Button, Form} from 'react-bootstrap';
import EditVulModal from "./EditVulModal";
import { format, formatDistance } from 'date-fns';
import AdminAPI from './AdminAPI'
import CVEAPI from './CVEAPI';
import ScoreModal from './ScoreModal';
import PublishCVEApp from './PublishCVEApp';

import '../css/casethread.css';

const threadapi = new CaseThreadAPI;
const adminapi = new AdminAPI;

const VulAddForm = (props) => {

    const caseInfo = props.caseInfo;
    const [isLoading, setIsLoading] = useState(true);
    const [vuls, setVuls] = useState([]);
    const [formTitle, setFormTitle] = useState("Add a vulnerability");
    const [showForm, setShowForm] = useState(false);
    const [vulDescription, setVulDescription] = useState("");
    const [vulCVE, setVulCVE] = useState("");
    const [invalidDescription, setInvalidDescription] = useState(false);
    const [invalidCVE, setInvalidCVE] = useState(false);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [reserveMessage, setReserveMessage] = useState(null);
    const [removeID, setRemoveID] = useState(null);
    const [viewScoreModal, setViewScoreModal] = useState(false);
    const [editVul, setEditVul] = useState(null);
    const [showEditVulModal, setShowEditVulModal] = useState(false);
    const [scoreVul, setScoreVul] = useState(null);
    const [showCVEModal, setShowCVEModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const [publishCVE, setPublishCVE] = useState(false);
    const [buttonDisabled, setButtonDisabled] = useState(false);
    const [accounts, setAccounts] = useState([]);

    const formRef = useRef(null);
    const navRef = useRef(null);

    const submitVul = async (event) => {
	if (event) {
	    event.preventDefault();
	}
	let error = false;
	const formData = {'description': vulDescription, 'cve': vulCVE}
	if (vulDescription === "") {
	    setInvalidDescription(true);
	    error = true;
	} else {
	    setInvalidDescription(false);
	}
	if (error == false) {
	    /* else submit form */
	    if (editVul) {
		let res = threadapi.updateVul(editVul, formData).then(function(response) {
		    addVul();
		    setShowForm(false);
		    props.updateVuls();
		}).catch(function (error) {
		    setReserveMessage(<Alert variant="danger">Error submitting vulnerability data: {error.message}</Alert>);
		});
		
	    } else {
		let res = threadapi.addVul(caseInfo, formData).then(function(response) {
		    addVul();
		    setShowForm(false);
		    props.updateVuls();
		}).catch(function (err) {
		    setReserveMessage(<Alert variant="danger">Error submitting vulnerability data: {err.message}</Alert>);
		    console.log(err);
		});
	    }
	    setButtonDisabled(false);
	}
    }

    const handleSubmit = (event) => {
	if (buttonDisabled) {
	    return;
	}
	setButtonDisabled(true);
	submitVul(event);
    }



    function doneEdit() {
	props.updateVuls();
	setShowForm(false);
    }

    function editVulNow(q) {
	setEditVul(q);
	setVulDescription(q.description);
	if (q.cve) {
	    setVulCVE(q.vul);
	} else {
	    setVulCVE("");
	}
	setFormTitle(`Edit vulnerability ${q.vul}`)
	setShowForm(true);
    }

    function removeVul(id) {
	console.log("remove", id);
	setRemoveID(id);
	/* TODO - pull related status to show user before confirmation */
	setDeleteMessage("Are you sure you want to remove this vulnerability and all related status?");
	setDisplayConfirmationModal(true);
    };

    const submitRemoveQuestion = (id) => {
	console.log("HEREEEE");
	threadapi.deleteVulnerability(id).then((response) => {
	    setVuls((qs) =>
		qs.filter((select) => select.id !== id))
	})
	setDisplayConfirmationModal(false);
    }

    const hideCVEModal = () => {
	setShowCVEModal(false);
    }

    const hideScoreModal = () => {
	setViewScoreModal(false);
	props.updateVuls();
    }

    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
    }

    const hideVulModal = () => {
	setShowEditVulModal(false);
    }

    const fetchCVEAccounts = async () => {
        try {
	    const response = await adminapi.getActiveCVEAccounts();
	    return response;

        } catch(err) {
	    console.log(err);
        }
    }

    const reserveCVENow = async (account) => {
	console.log("DO IT!", account);
	let cveAPI = new CVEAPI(account.org_name, account.email, account.api_key, account.server);
	try {
	    let newcve = await cveAPI.reserve1CVE();
	    console.log(newcve);
	    let newcveid = await newcve.data;
	    console.log(newcveid);
	    setVulCVE(newcveid.cve_ids[0].cve_id);
	    /* also need to save it in AdVISE */
	    setReserveMessage(<Alert variant="success">Success! {newcveid.cve_ids[0].cve_id} has been reserved.  Don't forget to Save!</Alert>)
	    hideCVEModal();
	} catch (err) {
	    setReserveMessage(<Alert variant="danger">Error reserving CVE {err.message}</Alert>)
	    console.log(err);
	}
    }

    const ReserveCVEButton = () => {

	const [buttonText, setButtonText] =	useState("Reserve CVE");

	const reserveCVE = async (e) => {
	    /*get user CVE account */
            setButtonText("Loading...");
	    let accs = await fetchCVEAccounts();
	    let rj = await accs.data
	    if (rj.length > 1) {
		setButtonText("Checking..");
		setModalMessage(rj);
		setShowCVEModal(true);
	    } else if (rj.length == 1) {
		reserveCVENow(rj[0]);
	    } else {
		setModalMessage([])
		setShowCVEModal(true);
	    }

	}

	return (

            <Button
                size="sm"
                className="mb-2"
                onClick={(e)=>reserveCVE(e)}
                variant="outline-secondary">

                {buttonText}
            </Button>
	)
    }

    function addVul() {
	setEditVul(null);
	setVulDescription("");
	setVulCVE("");
	setFormTitle("Add a new vulnerability");
    }

    const hidePublishApp = () => {
	setPublishCVE(false);
    }
    
    useEffect(() => {
	setIsLoading(false);
    }, [vuls]);

    useEffect(() => {
	console.log("VULS ADD FORM ", props.vuls);
	setVuls(props.vuls)
    }, [props.vuls])

    useEffect(() => {
	if (showForm) {
	    formRef.current.scrollIntoView();
	} else {
	    /* scroll up */
	    try {
		navRef.current.scrollIntoView();
	    } catch (err) {
	    }
	}
    }, [showForm]);


    return (

	isLoading ?
	    <h3>Loading...</h3>
 	:
	    <>
		<div className="d-flex align-items-center justify-content-between" ref={navRef}>
		    <h5>Vulnerabilities</h5>
		    {props.updateVuls &&
		     <>
			 {vuls.length > 0 ?
			  <DropdownButton variant="btn p-0"
					  title={<i className="bx bx-dots-vertical-rounded"></i>}
			  >                                                                            
                              <Dropdown.Item eventKey='add' onClick={()=>(addVul(), setShowForm(true))} >Add Vulnerability</Dropdown.Item>
			      <Dropdown.Item eventKey='publish' onClick={()=>(setPublishCVE(true))} >Publish CVE</Dropdown.Item> 
			  </DropdownButton>
			  :
			  <Button type="button" className="btn btn-primary" onClick={()=>(addVul(), setShowForm(true))}>
			      Add Vul
			  </Button>
			 }
		     </>
		     
		    }
		</div>
		{publishCVE ?
		 <PublishCVEApp
		     vuls = {vuls}
		     cancel = {hidePublishApp}
		 />
		 :
		 <>
		 <Accordion>

		    { vuls.map((vul, index) => {
			return (
			    <Accordion.Item className={vul.id == editVul ? "card active mt-2" : "card mt-2"} eventKey={index} key={vul.id}>
				<Accordion.Header>
				    {vul.id == editVul ? <i className="fas fa-edit p-2"></i> : "" }
				    {vul.vul}: {vul.description}
				</Accordion.Header>
				<Accordion.Body>
				    <p><b>Description:</b> {vul.description}</p>
				    {vul.cve &&
				     <p><b>CVE:</b> {vul.vul} </p>
				    }
				    {vul.tags && vul.tags.length > 0 &&
				     <div className="mb-2">
					 <b>Tags:</b>{" "}
					 {vul.tags.map((t, index) => {
					 return (
					     <Badge key={`tag-${index}`} variant="info">{t}</Badge>
					 )
				     })}
				     </div>
				    }
				    {vul.date_public &&
				     <p><b>Date Public:</b> {vul.date_public} </p>
                                    }
				    
				    {vul.problem_types && vul.problem_types.length > 0 &&
				     <div>
				     <b>Problem Types:</b><br/>
				     <ul className="list-unstyled">
					 {vul.problem_types.map((t, index) => {
					     return (
						 <li key={index}>{t}</li>
					     )
					 })}
				     </ul>
				     </div>
				    }
				    {vul.references && vul.references.length > 0 &&
                                     <div>
                                     <b>References:</b><br/>
                                     <ul className="list-unstyled">
                                         {vul.references.map((t, index) => {
                                             return (
                                                 <li key={index}>{t}</li>
                                             )
                                         })}
                                     </ul>
                                     </div>
                                    }
				    {vul.cvss_vector &&
				     <>
				     <div>
					 <b>CVSS:</b> {vul.cvss_vector}
				     </div>
				     <div>
                                         <b>CVSS Base Score:</b> {vul.cvss_score}
				     </div>
				     <div>
                                         <b>CVSS Severity:</b> {vul.cvss_severity}
                                     </div>
				     </>
				    }
				    {vul.ssvc_vector &&
				     <>
					 <div>
					     <b>SSVC: </b> {vul.ssvc_vector}
					 </div>
					 <div>
					     <b>SSVC Decision: </b> {vul.ssvc_decision}
					 </div>

				     </>
				    }
				    {props.updateVuls &&
				    <div className="d-flex justify-content-between mt-3">
					<Button
					    size="sm"
					    variant="outline-secondary"
					    onClick={(e)=>(setScoreVul(vul), setViewScoreModal(true))}
					    >
					    Score Vul
					</Button>

					<div className="actions text-end">
					    <Button variant="icon" className="p-0" onClick={(e)=>editVulNow(vul)}><i className="fas fa-edit"></i></Button><Button variant="icon" className="p=0" onClick={(e)=>removeVul(vul.id)}><i className="fas fa-trash"></i></Button>
					</div>
				    </div>
				    }
				</Accordion.Body>
			    </Accordion.Item>
			)}
			      )}
		 </Accordion>
		     {vuls.length == 0 &&
		      <p>Vulnerabilities coming soon...</p>
		     }

		<div id="testref" ref={formRef}>&nbsp; </div>
		{showForm &&
		 <Card className="mt-3 unseen">
		     <Card.Header>
			 <Card.Title className='mb-0'>{formTitle}</Card.Title>
		     </Card.Header>
		     <Card.Body>
			 {reserveMessage &&
			  <>
			      {reserveMessage}
			  </>
			 }

			 <Form onSubmit={(e)=>handleSubmit(e)} id="vulform">
			     <Form.Group className="mb-3" controlId="_type">
				 <div className="d-flex align-items-start gap-4">
				     <Form.Label>CVE</Form.Label>
				     {vulCVE ? "" :
				     <ReserveCVEButton
				     />
				     }

				 </div>
				 <Form.Control name="cve" isInvalid={invalidCVE} value={vulCVE} onChange={(e)=>setVulCVE(e.target.value)}/>
				 {invalidCVE &&
				  <Form.Text className="error">
                                      This field is required.
                                  </Form.Text>
                                 }
			     </Form.Group>
			     <Form.Group className="mb-3" controlId="_type">
				 <Form.Label>Vulnerability Description <span className="required">*</span></Form.Label>
				 <Form.Control name="description" as="textarea" rows={3} isInvalid={invalidDescription} value={vulDescription} onChange={(e)=>setVulDescription(e.target.value)}/>
				 {invalidDescription &&
				  <Form.Text className="error">
				      This field is required.
				  </Form.Text>
				 }
			     </Form.Group>
			     <Row>
				 <Col lg={6}>
				     <Button className="m-2" type="Cancel" variant="secondary" onClick={(e)=>(e.preventDefault(), setReserveMessage(null), setShowForm(false), setEditVul(null), setVulDescription(""), setVulCVE(""))}>
					 Cancel
				     </Button>
				     <Button variant="primary" type="submit" disabled={buttonDisabled}>
					 Submit
				     </Button>
				 </Col>
				 <Col lg={6} className="text-end">
				     {editVul &&
				     <Button className="m-2" variant="outline-primary" onClick={(e)=>(e.preventDefault(), setShowEditVulModal(true))}>
					 Edit Details
				     </Button>
				     }
				 </Col>
			     </Row>
			 </Form>
		     </Card.Body>
		 </Card>
		}
		 </>
		}
		{props.updateVuls &&
		 <>
		<EditVulModal
		    showModal={showEditVulModal}
		    hideModal={hideVulModal}
		    vul={editVul}
		    updateVul={doneEdit}
		/>

		<PickCVEModalAccount
		    showModal = {showCVEModal}
		    hideModal = {hideCVEModal}
		    message = {modalMessage}
		    confirmModal = {reserveCVENow}
		/>
		<ScoreModal
		    showModal = {viewScoreModal}
		    hideModal = {hideScoreModal}
		    vul = {scoreVul}
		/>

		<DeleteConfirmation
                    showModal={displayConfirmationModal}
                    confirmModal={submitRemoveQuestion}
                    hideModal={hideConfirmationModal}
                    id={removeID}
                    message={deleteMessage} />
		 </>
		 
		}
	    </>
    )

}

export default VulAddForm;
