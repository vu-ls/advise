import React, { useState, useEffect, useRef } from 'react';
import CaseThreadAPI from './ThreadAPI';
import PickCVEModalAccount from "./PickCVEModalAccount";
import DeleteConfirmation from "./DeleteConfirmation";
import {Table, Card, Badge, DropdownButton, Dropdown, Alert, Accordion, Row, Col, Button, Form} from 'react-bootstrap';
import EditVulModal from "./EditVulModal";
import { format, formatDistance } from 'date-fns';
import AdminAPI from './AdminAPI'
import CVEAPI from './CVEAPI';
import ScoreModal from './ScoreModal';
import PublishCVEApp from './PublishCVEApp';
import PopulateCVEModal from './PopulateCVEModal';
import PublishVulModal from './PublishVulModal';
import ErrorModal from "./ErrorModal";

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
    const [populate, setPopulate] = useState(false);
    const [cveAccount, setCVEAccount] = useState(null);
    const [showPopulateModal, setShowPopulateModal] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [publishVul, setPublishVul] = useState(null);
    const [displayErrorModal, setDisplayErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const formRef = useRef(null);
    const navRef = useRef(null);

    const hideErrorModal = () => {
        setDisplayErrorModal(false);
    }

    const hidePublishModal = () => {
        setShowPublishModal(false);
    }

    const submitVul = async (event, newcve) => {

	console.log("IN SUBMITVUL");
	
	if (event) {
	    event.preventDefault();
	}
	let error = false;
	const formData = {'description': vulDescription, 'cve': vulCVE}
	if (newcve) {
	    formData['cve'] = newcve;
	}

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
		console.log(formData);
		let res = threadapi.addVul(caseInfo, formData).then(function(response) {
		    
		    addVul();
		    setShowForm(false);
		    props.updateVuls();
		}).catch(function (err) {
		    if (err.response?.status == 403) {
			setReserveMessage(<Alert variant="danger">You are not authorized to add a vulnerability to this case. Are you the case owner?</Alert>)
		    } else {
			setReserveMessage(<Alert variant="danger">Error submitting vulnerability data: {err.message} {err.response?.data.detail}</Alert>);
		    }
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
	/*setFormTitle(`Edit vulnerability ${q.vul}`)
	setShowForm(true);*/
    }

    function removeVul(id) {
	console.log("remove", id);
	setRemoveID(id);
	/* TODO - pull related status to show user before confirmation */
	setDeleteMessage("Are you sure you want to remove this vulnerability and all related status?");
	setDisplayConfirmationModal(true);
    };

    const submitRemoveQuestion = (id) => {
	threadapi.deleteVulnerability(id).then((response) => {
	    setVuls((qs) =>
		qs.filter((select) => select.id !== id))
	}).catch(err => {
	    setErrorMessage(`Error removing vulnerability: ${err.message}. Is this case assigned?`);
            setDisplayErrorModal(true);
            console.log(err);
	});
	setDisplayConfirmationModal(false);
    }

    const hideCVEModal = () => {
	setShowCVEModal(false);
    }

    const hidePopulateModal = () => {
	setShowPopulateModal(false);
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
	setShowForm(false);
    }

    const fetchCVEAccounts = async () => {
        try {
	    const response = await adminapi.getActiveCVEAccounts();
	    return response;

        } catch(err) {
	    console.log(err);
        }
    }

    const pullCVENow = async (account) => {
        hideCVEModal();
	setCVEAccount(account);
	setShowPopulateModal(true);
	setPopulate(false);
	console.log("DO IT!", account);
    }

    const reserveCVENow = async (account) => {
	console.log("DO IT!", account);

	if (populate) {
	    /*got here after picking account*/
	    pullCVENow(account);
	    return;
	}

	let cveAPI = new CVEAPI(account.org_name, account.email, account.api_key, account.server);
	try {
	    let newcve = await cveAPI.reserve1CVE();
	    console.log(newcve);
	    let newcveid = await newcve.data;
	    console.log(newcveid);
	    setVulCVE(newcveid.cve_ids[0].cve_id);
	    /* also need to save it in AdVISE */
	    setReserveMessage(<Alert variant="success">Success! {newcveid.cve_ids[0].cve_id} has been reserved.  Don't forget to save!</Alert>)
	    submitVul(null, newcveid.cve_ids[0].cve_id);
	    hideCVEModal();
	} catch (err) {
	    setReserveMessage(<Alert variant="danger">Error reserving CVE {err.message}</Alert>)
	    console.log(err);
	}
    }

    const preReserveCVE = async () => {

	let accs = await fetchCVEAccounts();
	let rj = await accs.data
	if (rj.length > 1) {
	    setModalMessage(rj);
	    setShowCVEModal(true);
	} else if (rj.length == 1) {
	    reserveCVENow(rj[0]);
	} else {
	    setModalMessage([])
	    setShowCVEModal(true);
	}
	
    }

    const ReserveCVEButton = () => {

	const [buttonText, setButtonText] = useState("Reserve CVE");

	const reserveCVE = async (e) => {
	    /*get user CVE account */
            setButtonText("Loading...");
	    preReserveCVE();
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

    const pullCVEInfo = async (e) => {
	/*get user CVE account */
	setShowEditVulModal(false);
        let accs = await fetchCVEAccounts();
	let rj = await accs.data;
	if (rj.length > 0) {
	    /* add unauth prod */
	    rj.push({'id': 0, 'org_name': 'None', 'email': 'unauthenticated', 'server_type': 'Prod', 'server': null})
	    setPopulate(true);
	    setModalMessage(rj);
	    setShowCVEModal(true);
	    
	/*} else if (rj.length == 1) {
	    setPopulate(true);
	    pullCVENow(rj[0]); */
	} else {
	    /* no accounts - plan B pull from prod */
	    pullCVENow(null);
	}
    }

    const FillCVEButton = () => {
	const [buttonText, setButtonText] = useState("Auto-populate CVE");

        return (

            <Button
                size="sm"
                className="mb-2"
                onClick={(e)=>pullCVEInfo(e)}
                variant="outline-secondary">
		{buttonText}
            </Button>
        )
    }

    function addVul() {
	setEditVul(null);
	setVulDescription("");
	setVulCVE("");
	setReserveMessage(null);
	setFormTitle("Add a new vulnerability");
    }

    const hidePublishApp = () => {
	setPublishCVE(false);
    }

    useEffect(() => {
	setIsLoading(false);
	setShowForm(false);
	setVulCVE("");
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
					  id="vul-dropdown"
					  title={<i className="bx bx-dots-vertical-rounded"></i>}
			  >
                              <Dropdown.Item eventKey='add' onClick={()=>(addVul(), setShowForm(true))} >Add Vulnerability</Dropdown.Item>
			  </DropdownButton>
			  :
			  <Button type="button" className="btn btn-primary" onClick={()=>(addVul(), setShowForm(true))}>
			      Add Vul
			  </Button>
			 }
		     </>

		    }
		</div>
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
				     <div className="mb-3">
				     <div>
					 <b>CVSS:</b> {vul.cvss_vector}
				     </div>
				     <div>
                                         <b>CVSS Base Score:</b> {vul.cvss_score}
				     </div>
				     <div>
                                         <b>CVSS Severity:</b> {vul.cvss_severity}
                                     </div>
				     </div>
				    }
				    {vul.ssvc_decision_tree &&
				     <>
					 <div>
					     <Table>
						 <thead>
						     <tr colSpan={2}>
							 <td><b>SSVC Decision Tree:</b></td>
						     </tr>
						 </thead>
						 <tbody>
						     {vul.ssvc_decision_tree.map((item, index) => {
							 if (item.label == "Decision") {
							     return (
								 <tr key={`ssvc-dec-${index}`} className="table-info">
								     <th>{item.label}</th>
                                                                     <td>{item.value}</td>
								 </tr>
							     )
							 } else if (item.label == "date_scored") {
							     return (
								 <tr key={`ssvc-dec-${index}`}>
                                                                     <th>Date Scored</th>
                                                                     <td>{format(new Date(item.value), 'yyyy-MM-dd')}</td>
                                                                 </tr>
                                                             )
							 } else {
							     return (
								 <tr key={`ssvc-dec-${index}`}>
								     <th>{item.label}</th>
								     <td>{item.value}</td>
								 </tr>
							     )
							 }
						     })}
						 </tbody>
					     </Table>
					 </div>

				     </>
				    }
				    {props.updateVuls &&
				    <div className="d-flex justify-content-end mt-3">
					<DropdownButton
					    variant="outline-secondary"
					    title="Options"
					    className="dropdown-toggle-after"
					>
					    <Dropdown.Item eventKey="edit" onClick={(e)=>(editVulNow(vul), setShowEditVulModal(true))}>Edit</Dropdown.Item>
					    <Dropdown.Item eventKey="score" onClick={(e)=>(setScoreVul(vul), setViewScoreModal(true))}>Score</Dropdown.Item>
					    <Dropdown.Item eventKey="delete" onClick={(e)=>removeVul(vul.id)}>Delete</Dropdown.Item>
					    {vul.cve &&
					     <Dropdown.Item eventKey="publish" onClick={(e)=>(setPublishVul(vul), setShowPublishModal(true))}>Publish</Dropdown.Item>
					    }
					    {vul.affected_products && vul.affected_products.length > 0 &&
					     <Dropdown.Item eventKey="vex" href={`/advise/api/vul/${vul.id}/vex/`}>Download VEX</Dropdown.Item>
					    }
					</DropdownButton>
				    </div>
				    }
				</Accordion.Body>
			    </Accordion.Item>
			)}
			      )}
		</Accordion>
		{vuls.length == 0 &&
		 <p>No vulnerabilities have been added.</p>
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
				     {vulCVE ?
				      <FillCVEButton />
				      :
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
				 <Form.Control name="description" as="textarea" rows={3} isInvalid={invalidDescription} data-testid="vuldescription" value={vulDescription} onChange={(e)=>setVulDescription(e.target.value)}/>
				 {invalidDescription &&
				  <Form.Text className="error">
				      This field is required.
				  </Form.Text>
				 }
			     </Form.Group>
			     <Row>
				 <Col lg={6}>
				     <Button className="m-2" type="Cancel" data-testid="cancel-add-vul" variant="secondary" onClick={(e)=>(e.preventDefault(), setReserveMessage(null), setShowForm(false), setEditVul(null), setVulDescription(""), setVulCVE(""))}>
					 Cancel
				     </Button>
				     <Button variant="primary" data-testid="submit-vul" type="submit" disabled={buttonDisabled}>
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
		{props.updateVuls &&
		 <>
		     <EditVulModal
			 showModal={showEditVulModal}
			 hideModal={hideVulModal}
			 vul={editVul}
			 updateVul={doneEdit}
			 syncCVE={pullCVEInfo}
			 reserveCVE={preReserveCVE}
		     />

		     <PickCVEModalAccount
			 showModal = {showCVEModal}
			 hideModal = {hideCVEModal}
			 message = {modalMessage}
			 confirmModal = {reserveCVENow}
			 test = {populate ? false: true}
		     />
		     <PopulateCVEModal
			 showModal = {showPopulateModal}
			 hideModal = {hidePopulateModal}
			 cveAccount = {cveAccount}
			 vul = {vulCVE}
			 caseInfo = {caseInfo}
			 edit={editVul}
			 updateVuls = {props.updateVuls}
		     />
		     <ScoreModal
			 showModal = {viewScoreModal}
			 hideModal = {hideScoreModal}
			 vul = {scoreVul}
		     />

		     <PublishVulModal
			 showModal={showPublishModal}
			 hideModal={hidePublishModal}
			 vul={publishVul}
			 updateVul={doneEdit}
		     />
		     <DeleteConfirmation
			 showModal={displayConfirmationModal}
			 confirmModal={submitRemoveQuestion}
			 hideModal={hideConfirmationModal}
			 id={removeID}
			 message={deleteMessage} />
		     <ErrorModal
                         showModal = {displayErrorModal}
	                 hideModal = {hideErrorModal}
                         message = {errorMessage}
                     />
		 </>

		}
	    </>
    )

}

export default VulAddForm;
