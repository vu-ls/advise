import React, { useState, useEffect } from 'react'
import {Card, Modal, Alert, NavDropdown, DropdownButton, Dropdown, InputGroup, FloatingLabel, Form, Container, Row, Col, Badge, Button, OverlayTrigger, Tooltip} from 'react-bootstrap';
import {createEvent} from 'ics';
import { format, formatDistance } from 'date-fns'
import CaseThreadAPI from './ThreadAPI';
import AdminAPI from './AdminAPI';
import '../css/casethread.css';
import PDFDownloader from './PDFDownloader';
import DisplayStatus from './DisplayStatus';
import DisplayLogo from './DisplayLogo';
import {Typeahead} from 'react-bootstrap-typeahead';
import AutoAssignModule from './AutoAssignModule';
import NotifyVendorModal from "./NotifyVendorModal";
import TransferCaseModal from "./TransferCaseModal";
import ErrorModal from "./ErrorModal";
import {Link} from "react-router-dom"

const threadapi = new CaseThreadAPI();
const adminapi = new AdminAPI();

const CaseStatusApp = (props) => {

    const [apiError, setApiError] = useState(null);
    const [caseInfo, setCaseInfo] = useState(null);
    const [date, setDate] = useState("")
    const [datePublic, setDatePublic] = useState("");
    const [dateDue, setDateDue] = useState("");
    const [caseResolution, setCaseResolution] = useState("");
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [showAutoAssign, setShowAutoAssign] = useState(false);
    const [error, setError] = useState(null);
    const [showNotifyPrompt, setShowNotifyPrompt] = useState(false);
    const [showResolutionPrompt, setShowResolutionPrompt] = useState(false);
    const [newStatus, setNewStatus] = useState(null);
    const [displayVNModal, setDisplayVNModal] = useState(false);
    const [notifyVendorCount, setNotifyVendorCount] = useState(0);
    const [displayTransferModal, setDisplayTransferModal] = useState(false);
    const [displayErrorModal, setDisplayErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const hideErrorModal = () => {
	setDisplayErrorModal(false);
    }

    const hideTransferModal = () => {
	setDisplayTransferModal(false);
	/*if transfer was successful, case status should have changed */
	props.updateStatus();
    }

    const hideAutoAssign = () => {
        setShowAutoAssign(false);
    };

    const hideVNModal = () => {
	setDisplayVNModal(false);
	/* if we get here, that means user decided not to notify vendors
	   at the email prompt, so we need to update status */
	props.updateStatus();
    }

    const hideNotifyPrompt = () => {
	setShowNotifyPrompt(false);
	updateStatus("Active");
    }

    const hideResolutionPrompt = () => {
	setShowResolutionPrompt(false);
    }

    function assignUser(evtKey, evt) {
	if (evtKey == 0) {
	    setShowAutoAssign(true);
	} else {
	    threadapi.assignCase(caseInfo.case_id, evtKey).then((response) => {
		props.updateStatus();
	    });
	}
    };

    function autoAssignUser(role) {
	threadapi.autoAssignCase(caseInfo.case_id, role).then((response) => {
            props.updateStatus();
	    hideAutoAssign();
        });
    }

    const submitNotifyVendors = async (subject, content) => {

	let formField = new FormData();
	formField.append('subject', subject);
        formField.append('content', content);
        console.log(formField);

        await threadapi.notifyAllParticipants({'case': caseInfo.case_id}, formField).then((response) => {
	    setDisplayVNModal(false);
	    props.updateStatus();
	    props.reload();

        }).catch(err => {
	    console.log(err);
	});

    }

    function updateStatus(status) {
	setShowResolutionPrompt(false);
	const data = {'status': status};
        threadapi.updateCase(caseInfo, data).then((response) => {
	    props.updateStatus();
        }).catch(err => {
	    setErrorMessage(`Error updating status: ${err.message}. Is this case assigned?`);
	    setDisplayErrorModal(true);
	    console.log(err);
	});

    }

    function changeStatus(evtKey, evt) {
	if (caseInfo.status != "Active" && evtKey == "Active") {
	    /*check to see if there are unnotified vendors and prompt user to notify*/
	    threadapi.getCaseParticipantSummary({'case':caseInfo.case_id}).then((response) => {
		console.log("SUMMARY", response);
		if (response.data.count != response.data.notified) {
		    setNotifyVendorCount(response.data.count-response.data.notified);
		    /* prompt user to notify participants */
		    console.log("PROMPT USER MODAL");
		    setShowNotifyPrompt(true);
		} else {
		    updateStatus(evtKey);
		}
	    });
	} else if (caseInfo.status != "Inactive" && evtKey == "Inactive") {
	    setShowResolutionPrompt(true);
	} else {
	    updateStatus(evtKey);
	}
    };



    async function downloadCalendar () {
	const filename = `${caseInfo.case_identifier}.ics`;
	console.log(dateDue);
	const dueDate = [dateDue.getFullYear(), dateDue.getMonth()+1, dateDue.getDate(), 9, 0];
	console.log(dueDate);
	const event = {
	    start: dueDate,
	    title: `${caseInfo.case_identifier}: ${caseInfo.title}`,
	    description: `${caseInfo.summary}`,
	    url: window.location.href,
	    status: 'TENTATIVE',
	    organizer: { name: 'AdVISE', email: '' },
	}
	const file = await new Promise((resolve, reject) => {
	    createEvent(event, (error, value) => {
		if (error) {
		    reject(error)
	  }

		resolve(new File([value], filename, { type: 'plain/text' }))
	    })
	})
	const url = URL.createObjectURL(file);

	// trying to assign the file URL to a window could cause cross-site
	// issues so this is a workaround using HTML5
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;

	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);

	URL.revokeObjectURL(url);
    }


    const shareAdvisory = async() => {
	threadapi.shareAdvisory(caseInfo.case_id).then(response => {
	    props.updateStatus();
	}).catch(err => {
	    console.log(err);
	    setError(`Error sharing advisory: ${err.message}`);
	});
    }

    const StatusChanger = (props) => {
	return (
	    <Dropdown onSelect={changeStatus}>
            <Dropdown.Toggle className="p-0" variant="light">
                <DisplayStatus
                    status={props.status}
                />
            </Dropdown.Toggle>
            <Dropdown.Menu>
		<Dropdown.Item key="Pending" eventKey="Pending">
		    <DisplayStatus
                        status="Pending"
		    />
		</Dropdown.Item>
		<Dropdown.Item key="Active" eventKey="Active">
                    <DisplayStatus
                        status="Active"
                    />
                </Dropdown.Item>
                <Dropdown.Item key="Inactive" eventKey="Inactive">
		<DisplayStatus
                    status="Inactive"
                />
                </Dropdown.Item>
	    </Dropdown.Menu>
	</Dropdown>
	)
    }

    const notifyAll = async () => {
	setShowNotifyPrompt(false);
        const data = {'status': "Active"};
        await threadapi.updateCase(caseInfo, data).then((response) => {
	    setDisplayVNModal(true);
	});
    }

    const updateResolution = async () => {
	const data = {'resolution': caseResolution, 'status': 'Inactive'};
        threadapi.updateCase(caseInfo, data).then((response) => {
            props.updateStatus();
        }).catch(err => {
            setErrorMessage(`Error updating status: ${err.message}. Is this case assigned?`);
            setDisplayErrorModal(true);
            console.log(err);
        });
    }

    
    useEffect(()=> {
	if (caseResolution && showResolutionPrompt) {
	    console.log(`do something ${caseResolution}`);
	    setShowResolutionPrompt(false);
	    updateResolution();
	}
    }, [caseResolution]);


    const NotifyPrompt = (props) => {

	return (
            <Modal show={props.show} centered onHide={props.hide} backdrop="static">
		<Modal.Header closeButton>
		    <Modal.Title>{props.title}</Modal.Title>
		</Modal.Header>
		<Modal.Body>{props.message}</Modal.Body>
		<Modal.Footer>
		    <Button variant="secondary" onClick={props.hide}>
			No
		    </Button>
		    <Button variant="primary" onClick={notifyAll}>
			Yes
		    </Button>
		</Modal.Footer>
	    </Modal>
	)
    }

    const AddResolutionPrompt = (props) => {

	const [resolution, setResolution] = useState("");
	const [other, setOther] = useState("");
	const [showOther, setShowOther] = useState(false);
	const [options, setOptions] = useState([]);
	const [error, setError] = useState(null);
	
	const fetchInitialData = async () => {
	    adminapi.getResolutionOptions().then((response) => {
		setOptions(response);
		if (response.length == 0) {
		    setError("Improperly configured. No resolutions available. Ask admin to create resolution options.");
		}
            }).catch(err => {
		console.log(err);
		setError(`Error retrieving resolutions - ${err.message}`);
            });
	}
	
	useEffect(() => {
	    if (props.show) {
		fetchInitialData();
	    }
	}, []);
	
	const addResolution = async () => {
	    if (other) {
		setCaseResolution(other);
	    } else if (resolution) {
		setCaseResolution(resolution);
	    } else {
		updateStatus("Inactive");
	    }
	}

	return (
            <Modal show={props.show} centered onHide={props.hide} backdrop="static">
                <Modal.Header closeButton>
                    <Modal.Title>Add Resolution</Modal.Title>
                </Modal.Header>
                <Modal.Body><p>Optional: Add a resolution for this case.</p>
		    {error &&
		     <Alert variant="danger">{error}</Alert>
		    }
		    <Form.Group className="mb-3" controlId="_type">
			<Form.Label>Resolution </Form.Label>
			{options.map((o, index) => {
			    return (
				<Form.Check
				    label={o.description}
				    name="resolution"
				    type="radio"
				    value="fixed"
				    onChange={(e)=>setResolution(o.description)}
				    key={`resolution-${o.id}`}
				/>
			    )
			})}
			<Form.Check
			    label="Other"
			    name="resolution"
			    type="radio"
			    value="other"
			    onChange={(e)=>setShowOther(true)}
			    key="resolution-other"
			/>
		    </Form.Group>
		    {showOther &&
		     <Form.Group className="mb-3">
			 <Form.Control autoFocus placeholder="Required: resolution" name="resolution" as="textarea" rows={3} value={other} onChange={(e)=>setOther(e.target.value)}/>
		     </Form.Group>
		     }
		     
		</Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={addResolution}>
			{resolution || other ?
                         `Add Resolution`
			 :
			 `Continue without resolution`
			}
                    </Button>
                </Modal.Footer>
            </Modal>
        )
    }

    const downloadJSON = () => {
	let obj = {};
	threadapi.getCurrentAdvisory({'case':caseInfo.case_id}).then((response) => {
	    let obj = response;
	    delete obj['diff'];
	    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
	    const a = document.createElement('a');
	    a.setAttribute("href",     dataStr);
	    a.setAttribute("download", `${caseInfo.case_identifier}` + ".json");
	    document.body.appendChild(a);
	    a.click();
	    a.remove();
	});
    }

    const AdvisoryBadge = (props) => {
	let badgetype = "info";

	console.log(props.case_id);

	switch(props.advisory) {
	case "NOT STARTED":
	    badgetype="warning"
	    break;
	case "PUBLISHED":
	    badgetype="success"
	    break;
	default:
	    break;
	}
	return (
	    <div className="d-flex align-items-center gap-3">
		<Link to="advisory/" state={{caseInfo: caseInfo}}>
		    <Badge pill bg={badgetype}>
			{props.advisory}
		    </Badge>
		</Link>
		{props.advisory !== "NOT STARTED" &&
                <DropdownButton variant="btn p-0"
                                title={<i className="fas fa-download"></i>}
		>
		    <Dropdown.Item key="json" eventKey="json" onClick={(e)=>downloadJSON()}>
			JSON
		    </Dropdown.Item>
		    <PDFDownloader
			case_id = {props.case_id}
		    />
		    <Dropdown.Item key="csaf" eventKey="csaf" href={`/advise/api/case/${props.case_id}/advisory/csaf/`}>
			CSAF
		    </Dropdown.Item>
		    <Dropdown.Item key="api" eventKey="api" href={`/advise/api/case/${props.case_id}/advisory/`}>
			API
		    </Dropdown.Item>
		</DropdownButton>
		}
	    </div>

	)
    }

    const CustomMenu = React.forwardRef(
	({ children, style, className, 'aria-labelledby': labeledBy }, ref) => {
	    const [value, setValue] = useState('');
	    return (
		<div
		    ref={ref}
		    style={style}
		    className={className}
		    aria-labelledby={labeledBy}
		>
		    <Form.Control
			autoFocus
			className="mx-3 my-2 w-auto"
			placeholder="Type to filter..."
			onChange={(e) => setValue(e.target.value)}
			value={value}
		    />
		    <ul className="list-unstyled">
			{React.Children.toArray(children).filter(
			    (child) =>
			    !value || child.props.children.key.toLowerCase().startsWith(value),
			)}
		    </ul>
		</div>
	    );
	},
    );

    const AssignmentDropdownButton = (props) => {

	const popperConfig = {
	    strategy: "fixed"
	};

	let title = (
	    <div className="d-flex align-items-center gap-2 mt-2 mb-2">
		<DisplayLogo
		    name="?"
		/>
		<span className="participant">
		    Unassigned
		</span>
	    </div>
	);
	if (props.owners.length > 0) {
	    title = props.owners.map((item, index) => {
		return (
		    <div className="d-flex align-items-center gap-2 mt-2 mb-2" key={`owner=${item.id}`}>
			<DisplayLogo
			    name={item.name}
			    color={item.logocolor}
			    photo={item.photo}
			/>
			<span className="participant">
			    {item.name}
			</span>
		    </div>
		)
	    })
	}
	return (
	    <>
		{['coordinator', 'owner'].includes(props.role) ?
		 <Dropdown onSelect={assignUser} className="assignment_dropdown">
		     <Dropdown.Toggle className="p-0" variant="light">
			 {title}
		     </Dropdown.Toggle>
		     <Dropdown.Menu style={{ margin:0}} as={CustomMenu} popperConfig={popperConfig} renderOnMount>

		    {props.options ?
		     props.options.map((u, index) => {
			 return (
			     <Dropdown.Item key={u.name} eventKey={u.id}>
				 <div className="d-flex align-items-center gap-2 mt-2 mb-2" key={u.name}>
				     <DisplayLogo
					 name={u.name}
					 color={u.logocolor}
					 photo={u.photo}
				     />
				     <span className="participant">
					 {u.name}
				     </span>
				 </div>
			     </Dropdown.Item>
			 )
		     })
		     :""
		    }
		    <Dropdown.Item key="Auto Assign" eventKey={0}>
			<div className="d-flex align-items-center gap-2 mt-2 mb-2" key="Auto Assign">
                            <DisplayLogo
                                name="?"
                            />
                            <span className="participant">
                                Auto Assign
                            </span>
                        </div>
                    </Dropdown.Item>
		    {props.owners.length > 0 &&
		     <Dropdown.Item key="Unassign" eventKey={-1}>
                        <div className="d-flex align-items-center gap-2 mt-2 mb-2" key="Unassign">
                            <DisplayLogo
                                name="?"
                            />
                            <span className="participant">
                                Unassign
                            </span>
                        </div>
                     </Dropdown.Item>
		    }
		</Dropdown.Menu>
	    </Dropdown>
	     :
	     <>{title}</>
		}
	    </>
	)
    }

    useEffect(() => {
	console.log("case info updating");
        setCaseInfo(props.caseInfo);
	setDate(new Date(props.caseInfo.created));
	if (props.caseInfo.due_date) {
	    setDateDue(new Date(props.caseInfo.due_date));
	}
	if (props.caseInfo.public_date) {
	    setDatePublic(new Date(props.caseInfo.public_date));
	}
    }, [props.caseInfo]);

    useEffect(() => {
	console.log("user updating");
	if (['coordinator', 'owner'].includes(props.user.role)) {
	    try {
		threadapi.getUserAssignments().then((response) => {
		    console.log(response);
		    if ('users' in response) {
			setUsers(response['users']);
		    }
		    if ('roles' in response) {
			setRoles(response['roles']);
		    }
		})
	    } catch (err) {
		console.log(err);
		setApiError("API Error");
	    }
	}
    }, [props.user])

    return (
        caseInfo ?
	    <Card className="mb-3">
		<Card.Header className="d-flex align-items-center justify-content-between pb-2">
		    <Card.Title>Case Details</Card.Title>
		    {apiError &&
		     <Alert variant="danger">{apiError}</Alert>
		    }

		    {props.user.role === "owner" &&
		     <DropdownButton variant="btn p-0"
				     id="case-status-dropdown"
                                    title={<i className="bx bx-dots-vertical-rounded"></i>}
                    >
                         <Dropdown.Item eventKey='edit' href={`${caseInfo.case_id}/edit/`}>Edit Details</Dropdown.Item>
			 <Dropdown.Item eventKey='advisory' href={`${caseInfo.case_id}/advisory/`}>Edit Advisory</Dropdown.Item>
			 {caseInfo.advisory_status !== "NOT STARTED" &&
			  <>
			      {caseInfo.advisory_status === "DRAFT SHARED" ?
			       <Dropdown.Item eventKey='share' onClick={(e)=>shareAdvisory()}>Unshare Advisory</Dropdown.Item>
			       :
			       <Dropdown.Item eventKey='share' onClick={(e)=>shareAdvisory()}>Share Latest Advisory</Dropdown.Item>
			      }
			  </>
			 }
			<Dropdown.Item eventKey='transfer' onClick={(e)=>setDisplayTransferModal(true)}>Transfer Case</Dropdown.Item>
                    </DropdownButton>
		    }
		</Card.Header>
		<Card.Body className="overflow-hidden">
		    <Row className="mb-2">
			<Col sm={4}>
			    <Form.Label>Status</Form.Label>
			</Col>
			<Col sm={8}>
			    {props.user.role==="owner" ?
			    <StatusChanger
				status = {caseInfo.status}
				user = {props.user}
			    />
			     :
			     <DisplayStatus
				 status={caseInfo.status}
			     />
			    }
			</Col>
		    </Row>
		    {props.user.role ==="owner" && caseInfo.resolution &&
		     <Row className="mb-2 align-items-center">
			 <Col sm={4}>
			     <Form.Label>Resolution</Form.Label>
			 </Col>
			 <Col sm={8}>
			     {caseInfo.resolution}
			 </Col>
		     </Row>
		    }
                    <Row className="mb-2 align-items-center">
                        <Col sm={4}>
                            <Form.Label>Assigned To</Form.Label>
                        </Col>
                        <Col sm={8}>
			    <AssignmentDropdownButton
				owners={caseInfo.owners}
				options={users}
				role={props.user.role}
			    />
                        </Col>
                    </Row>
                    <Row className="mb-2">
                        <Col sm={4}>
                            <Form.Label>Public</Form.Label>
                        </Col>
                        <Col sm={8}>
			    {caseInfo.public_date ?
			     <Badge pill bg="success">
				 Public
				 </Badge>
			     :
			     <Badge pill bg="warning">
				 NOT Public
			     </Badge>
			    }

                        </Col>
                    </Row>
		    {datePublic &&
                    <Row className="mb-2">
                        <Col sm={4}>
                            <Form.Label>Date Public</Form.Label>
                        </Col>
                            <Col sm={8}>
                                {format(datePublic, 'yyyy-MM-dd')}
                            </Col>
                    </Row>
		    }
                    <Row className="mb-2">
                        <Col sm={4}>
                            <Form.Label>Date Created</Form.Label>
                        </Col>
                            <Col sm={8}>
				{format(date, 'yyyy-MM-dd H:mm:ss')}
                            </Col>
                    </Row>
		    <Row className="mb-2">
                        <Col sm={4}>
                            <Form.Label>Est. Date Public</Form.Label>
                        </Col>
                        <Col sm={8}>
			    {dateDue ?
			     <>{format(dateDue, 'yyyy-MM-dd')}<OverlayTrigger overlay={<Tooltip>Download Calendar reminder</Tooltip>}><a href="#" data-testid="calendar-download" onClick={(e)=>downloadCalendar()}><i className="mx-2 fas fa-calendar-plus"></i></a></OverlayTrigger></>
			     :
			     <b>TBD</b>
			    }
                        </Col>
                    </Row>
		    {['owner', 'coordinator'].includes(props.user.role) &&
                    <Row className="mb-2">
                        <Col sm={4}>
                            <Form.Label>Advisory</Form.Label>
                        </Col>
                        <Col sm={8}>
			    <AdvisoryBadge
				advisory = {caseInfo.advisory_status}
				case_id = {caseInfo.case_id}
			    />
                        </Col>
			{error &&
			 <Alert variant="danger">{error}</Alert>
			}
                    </Row>
		    }

		</Card.Body>
		{['owner', 'coordinator'].includes(props.user.role) &&
		 <>
		     <AutoAssignModule
			 showModal = {showAutoAssign}
			 hideModal = {hideAutoAssign}
			 confirmModal = {autoAssignUser}
			 roles = {roles}
		     />
		     <AddResolutionPrompt
			 show = {showResolutionPrompt}
			 hide = {hideResolutionPrompt}
		     />
		     <NotifyPrompt
			 show = {showNotifyPrompt}
			 hide = {hideNotifyPrompt}
			 title="Do you want to notify all participants?"
			 message="Now that the case is active, do you want to notify all participants that haven't been notified?"
		     />
		     <NotifyVendorModal
			 showModal = {displayVNModal}
			 hideModal = {hideVNModal}
			 confirmModal = {submitNotifyVendors}
			 count={notifyVendorCount}
		     />
		     <TransferCaseModal
			 showModal = {displayTransferModal}
			 hideModal = {hideTransferModal}
			 caseInfo = {caseInfo}
		     />
		     <ErrorModal
			 showModal = {displayErrorModal}
			 hideModal = {hideErrorModal}
			 message = {errorMessage}
		     />

		 </>
		}
	    </Card>
	:
	<div className="text-center"><div className="lds-spinner"><div></div><div></div><div></div></div></div>
    )
}

export default CaseStatusApp;
