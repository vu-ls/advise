import React from 'react';
import { Modal, Alert, Badge, FloatingLabel, Button, InputGroup, Form, Row, Col } from "react-bootstrap";
import { useState, useEffect } from 'react';
import ContactAPI from './ContactAPI';
import ThreadAPI from './ThreadAPI';
import DisplayLogo from './DisplayLogo.js';
const contactapi = new ContactAPI();
const threadapi = new ThreadAPI();

const ParticipantModal = (props) => {
    const [suggested, setSuggested] = useState([]);
    const [selected, setSelected] = useState([]);
    const [btnDisabled, setBtnDisabled] = useState("disabled");
    const [error, setError] = useState(null);
    const [role, setRole] = useState("supplier");
    const [selectRole, setSelectRole] = useState(false);
    const [caseInfo, setCaseInfo] = useState(null);
    
    const handleSearch = (event) => {
	let search = "";
	if (event) {
	    search = event.target.value;
	}
	if (props.allowSelectRole) {
	    /* only search contacts that have already been added to the case */
	    contactapi.searchAllContacts(search).then((response) => {
		setSuggested(response);
	    });
	} else {
	    contactapi.searchCaseContacts(props.caseid, search).then((response) => {
                setSuggested(response);
	    });

	}
    }

    

    const sendInvites = async () => {
	let participants = selected.map(item => item.uuid);
	console.log(participants);
	let thread = props.thread;
	if (thread) {
	    threadapi.createThreadParticipants(props.thread, participants, role).then((response) => {
		setSelected([]);
		props.hideModal();
		props.confirmInvite();
	    }).catch(err => {
		setError(`Error adding participant: ${err.response.data.error}`);
	    });
	} else if (props.caseid) {
	    threadapi.createCaseParticipants(props.caseid, participants, role).then((response) => {
                setSelected([]);
                props.hideModal();
                props.confirmInvite();
            }).catch(err=> {
		setError(`Error adding participant: ${err.response.data.error}`);
	    });
	}
    }

    useEffect(() => {
	if (props.showModal) {
	    setCaseInfo(props.caseInfo);
	    /* get initial suggestions */
	    handleSearch();
	    if (props.allowSelectRole) {
		setRole("supplier");
	    } else {
		/* leave this blank and the app will use the case role to decide thread permissions*/
		setRole("");
	    }
	}
    }, [props]);
    
    const removeSelected = (uuid) => {
	console.log("IN REMOVE SELECTED", uuid);
	setSelected((current) =>
	    current.filter((select) => select.uuid !== uuid)
	);
    };

    const handleCheck = (event, name, logo, color, uuid) => {
	if (event.target.checked) {
	    const test = {'name': name, 'logo': logo, 'color': color, 'uuid': uuid};
	    setSelected(selected => [...selected, test]);
	    setBtnDisabled("");
	} else {
	    // remove item from selected
	    removeSelected(uuid);
	    if (selected.length == 0) {
		setBtnDisabled("disabled");
	    }
	}
    }

    function changeRole(e) {
	setRole(e.target.value);
	setSelectRole(false);
    };

    return (
        <Modal show={props.showModal} onHide={props.hideModal} size="lg" centered>
            <Modal.Header closeButton className="border-bottom">
		<Modal.Title>{props.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
		<>
		{props.caseInfo && props.caseInfo.status !== "Active" &&
		 <Alert variant="warning">This case is in <b>{props.caseInfo.status}</b> state. Participants will not be notified until the case is changed to <b>Active</b>.</Alert>
		}
		</>
		<>
		{error &&
		 <Alert variant="danger">{error}</Alert>
		}
		</>
		{props.allowSelectRole &&
		<Row className="mb-3">
		    <Col>
			{selectRole ?
			<FloatingLabel controlId="floatingSelect" label="Select Participant Role">

			    <Form.Select value={role} aria-label="Select Participant Role" onChange={(e)=>changeRole(e)}>
				<option value="Supplier">
				    Supplier
				</option>
				<option value="Owner">Owner</option>
				<option value="Participant">Participant</option>
				<option value="Reporter">Reporter</option>
				<option value="Observer">Observer</option>
			    </Form.Select>			    
			</FloatingLabel>
			 :
			 (
			     <div className="d-flex align-items-center gap-2">
				 <Form.Label>
				     Adding Participant as Role:
				 </Form.Label>
				 <Button
				     onClick={()=>setSelectRole(true)}
				 >
				     <Badge pill bg="primary">
					 {role}
				     </Badge>
				 </Button>
			     </div>
			 )}
		    </Col>
		</Row>
		}
		<Row>
		    <Col lg={8}>
			<InputGroup className="w-100">
			    <InputGroup.Text id="basic-addon1"><i className="fas fa-search"></i></InputGroup.Text>
			    <Form.Control
				placeholder="Search for Contacts or Groups by name"
				aria-label="contact"
				aria-describedby="basic-addon1"
				onChange={handleSearch}
			    />

			</InputGroup>
			<div className="mt-3">
			    {suggested.length > 0 ?
			     (
				 suggested.map((s, index) => {
				     let isChecked=false;
				     let isDisabled="";
				     if (selected.some(e => e.name == s.name)) {
					 isChecked=true;
				     }
				     if (props.currentParticipants && props.currentParticipants.some(e=> e.participant.uuid == s.uuid)) {
					 isChecked=true;
					 isDisabled="disabled";
				     }
					 
				     return (
					 <div className="d-flex justify-content-between mt-2" key={index}>
					     <div className="d-flex align-items-center gap-2">
						 <DisplayLogo
						     name={s.name}
						     photo={s.logo}
						     color={s.color}
						 />
						 <h4>{s.name}</h4>
					     </div>
					     <Form.Check
						 disabled={isDisabled}
						 type='checkbox'
						 id={s.name}
						 checked={isChecked}
						 onChange={(event)=>handleCheck(event, s.name, s.logo, s.color, s.uuid)}
					     />
					 </div>
				     )
				 }
					      )
			     ) :
			     <p>No suggestions for you</p>
			    }
			</div>

		    </Col>
		    <Col lg={4} className="participant_selected">
			{selected.length > 0 ?
                         (
                             selected.map((s,index) => {
				 if (s.name) {
                                     return (
					 <div className="d-flex justify-content-between" key={index}>
					     <div className="d-flex align-items-center gap-2">
						 <DisplayLogo
						     name={s.name}
						     photo={s.logo}
						     color={s.color}
						 />
						 <h4>{s.name}</h4>
					     </div>
					     <Button variant="btn p-0"
						     onClick={()=>removeSelected(s.uuid)}>
						 <i className="fas fa-times"></i>
					     </Button>
					 </div>
                                     )
				 } else {
				     
				     console.log("in weird" + s);
				     return (<p>weird</p>)
				 }
                             }
                                         )
			     
                         ) :
                         <p>0 Participants Selected</p>
                        }
		    </Col>
		</Row>
	    </Modal.Body>
        <Modal.Footer className="border-top">
          <Button variant="secondary" onClick={props.hideModal}>
            Cancel
          </Button>
            <Button variant="primary" disabled={btnDisabled} onClick={sendInvites}>
		Add to Case
          </Button>
        </Modal.Footer>
      </Modal>
    )
}

export default ParticipantModal;
