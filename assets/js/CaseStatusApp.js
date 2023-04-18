import React, { useState, useEffect } from 'react'
import {Card, Alert, NavDropdown, DropdownButton, Dropdown, InputGroup, FloatingLabel, Form, Container, Row, Col, Badge, Button} from 'react-bootstrap';
import { format, formatDistance } from 'date-fns'
import CaseThreadAPI from './ThreadAPI';
import '../css/casethread.css';
import PDFDownloader from './PDFDownloader';
import DisplayStatus from './DisplayStatus';
import DisplayLogo from './DisplayLogo';
import {Typeahead} from 'react-bootstrap-typeahead';
import AutoAssignModule from './AutoAssignModule';

const threadapi = new CaseThreadAPI();

const CaseStatusApp = (props) => {

    const [caseInfo, setCaseInfo] = useState(null);
    const [date, setDate] = useState("")
    const [datePublic, setDatePublic] = useState("");
    const [dateDue, setDateDue] = useState("");
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [showAutoAssign, setShowAutoAssign] = useState(false);
    const [error, setError] = useState(null);

    
    const hideAutoAssign = () => {
        setShowAutoAssign(false);
    };

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

    function changeStatus(evtKey, evt) {
	const data = {'status': evtKey};
        threadapi.updateCase(caseInfo, data).then((response) => {
            props.updateStatus();
        });
    };

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
		<a href="advisory/">
		    <Badge pill bg={badgetype}>
			{props.advisory}
		    </Badge>
		</a>
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
	if (props.owners.length > 0 && props.options.length > 0) {
	    let owner = props.options.filter((item) => props.owners.includes(item.name));
	    console.log("OWNER is", owner);
	    if (owner) {
		title = owner.map(item => {
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
	}
	return (
	    <Dropdown onSelect={assignUser}>
		<Dropdown.Toggle className="p-0" variant="light">
		    {title}
		</Dropdown.Toggle>
		<Dropdown.Menu as={CustomMenu}>

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
	)
    }

    useEffect(() => {
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
	threadapi.getUserAssignments().then((response) => {
	    setUsers(response['users']);
	    setRoles(response['roles']);
	});
    }, []);


    return (
        caseInfo ?
	    <Card className="mb-3">
		<Card.Header className="d-flex align-items-center justify-content-between pb-2">
		    <Card.Title>Case Details</Card.Title>
		    {props.user.role === "owner" &&
		    <DropdownButton variant="btn p-0"
                                    title={<i className="bx bx-dots-vertical-rounded"></i>}
                    >
                        <Dropdown.Item eventKey='edit' href="edit/">Edit Details</Dropdown.Item>
			<Dropdown.Item eventKey='advisory' href="advisory/">Edit Advisory</Dropdown.Item>
			{caseInfo.advisory_status === "DRAFT SHARED" ?
			 <Dropdown.Item eventKey='share' onClick={(e)=>shareAdvisory()}>Unshare Advisory</Dropdown.Item>
			 :
			 <Dropdown.Item eventKey='share' onClick={(e)=>shareAdvisory()}>Share Latest Advisory</Dropdown.Item>
			}
                    </DropdownButton>
		    }
		</Card.Header>
		<Card.Body>
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
		    {['owner', 'coordinator'].includes(props.user.role) &&
                    <Row className="mb-2">
                        <Col sm={4}>
                            <Form.Label>Assigned To</Form.Label>
                        </Col>
                        <Col sm={8}>
			    <AssignmentDropdownButton
				owners={caseInfo.owners}
				options={users}
			    />
                        </Col>
                    </Row>
		    }
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
			     format(dateDue, 'yyyy-MM-dd')
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
		<AutoAssignModule
		    showModal = {showAutoAssign}
		    hideModal = {hideAutoAssign}
		    confirmModal = {autoAssignUser}
		    roles = {roles}
		/>
		}
	    </Card>
	:<></>
    )
}

export default CaseStatusApp;
