import React from 'react';
import ReactDOM from "react-dom";
import CaseThreadAPI from './ThreadAPI';
import { useState, useEffect, useCallback } from 'react';
import DisplayLogo from "./DisplayLogo";
import Dropdown from 'react-bootstrap/Dropdown';
import {Modal, Card, Alert, Button} from 'react-bootstrap';
import DropdownButton from 'react-bootstrap/DropdownButton';
import ParticipantModal from './ParticipantModal.js';
import DeleteConfirmation from "./DeleteConfirmation";
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css'

const threadapi = new CaseThreadAPI();

export default function ParticipantList(props) {
    const [isLoading, setIsLoading] = useState(true);
    const [participants, setParticipants] = useState([]);
    const [profileStore, setProfileStore] = useState([]);
    const [displayParticipantModal, setDisplayParticipantModal] = useState(false);
    const [thread, setThread] = useState(null);
    const [caseid, setCaseId] = useState(null);
    const [showRemove, setShowRemove] = useState(false);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [removeID, setRemoveID] = useState(null);
    const [cardTitle, setCardTitle] = useState("Case Participants")
    const [participantModalTitle, setParticipantModalTitle] = useState("");
    const [allowSelectRole, setAllowSelectRole] = useState(false);
    const [caseInfo, setCaseInfo] = useState(null);
    const [warning, setWarning] = useState(null);
    const [error, setError] = useState(null);
    
    const hideParticipantModal = () => {
        setDisplayParticipantModal(false);

    };

    const showDeleteModal = (id) => {
        setRemoveID(id);
        setDeleteMessage("Are you sure you want to remove this participant?");
        setDisplayConfirmationModal(true);
    };

    const submitRemoveParticipant = (id) => {
        console.log("IN RM PARTICIPANT");
	console.log(id);
        threadapi.removeCaseParticipant(id).then((response) => {
	    props.reload();
        });
        setDisplayConfirmationModal(false);
	setShowRemove(false);
    };

    const reloadParticipants = () => {
	console.log("IN RELOAD!!!");
	console.log(thread);
	props.reload();

    };

    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
    };

    const getSummary = async () => {
	/* only get this info if user is coordinator */
	if (props.caseInfo && props.user && ['owner', 'coordinator'].includes(props.user.role)) {
	    await threadapi.getCaseParticipantSummary({'case': props.caseInfo.case_id}).then((response) => {
		let data = response.data;
		if (data.notified < data.count) {
		    setWarning(<Alert variant="warning">This case has {data.count - data.notified } unnotified participants.</Alert>)
		}
            }).catch(err=> {
		setError(`Error loading case participants ${err.message}`);
            });
	}
    }

    useEffect(() => {
	console.log("IN PARTICIPANTLIST");
	console.log(props.activethread);
	if (props.activethread) {
	    if (props.activethread.official) {
		setCardTitle("Case Participants");
		setParticipantModalTitle("Invite Participants to Case");
		setAllowSelectRole(true);
		getSummary();
	    } else {
		setCardTitle("Thread Participants");
		setParticipantModalTitle("Invite Participants to Thread");
		setAllowSelectRole(false);
	    }
	    setThread(props.activethread.id);
	    setCaseId(props.activethread.case);
	    setParticipants(props.participants);
	    setCaseInfo(props.caseInfo);
	    setIsLoading(false);
	}
    }, [props.activethread, props.participants, props.caseInfo])


    return (
	<Card className="mt-3 mb-3">
	    <Card.Header className="d-flex align-items-center justify-content-between">
		<Card.Title className="m-0">
		    { cardTitle }
		</Card.Title>
		{props.user.role === "owner" &&
		 <DropdownButton variant="btn p-0"
				 title={<i className="bx bx-dots-vertical-rounded"></i>}
		 >
		     <Dropdown.Item eventKey='add' onClick={(e)=>(setDisplayParticipantModal(true))}>Add Participant</Dropdown.Item>
		     <Dropdown.Item eventKey='manage' href="participants/"> Manage Participants </Dropdown.Item>
		     <Dropdown.Item eventKey='remove' onClick={(e)=>(setShowRemove(true))}>Remove Participant</Dropdown.Item>
		     {allowSelectRole ? ""
		      :
		      <>
			  <Dropdown.Item eventKey='archive' onClick={(e)=>props.removeThread(props.activethread)}>Archive Thread</Dropdown.Item>
		      </>
		     }
		     
		 </DropdownButton>
		}
	    </Card.Header>
	    <Card.Body>
		<>
		{warning &&
		 <>{warning}</>
		}
		</>

		<>
		    {error &&
		     <>{error}</>
		    }
		</>
		<div className="participant-list">
		    <PerfectScrollbar>

		{isLoading ?
		 <p>Loading...</p>
		 :
		 (
		     participants.map((post,index) => {
			 return (
			     <div className="d-flex justify-content-between" key={index}>
				 <div className="d-flex align-items-center gap-2 mt-2 mb-2">
				     <DisplayLogo
					 photo = {post.participant.photo}
					 color = {post.participant.logocolor}
					 name= {post.participant.name}
				     />
				     <a href="#" className="participant">
					 { post.participant.name } ({post.participant.role})
				     </a>
				 </div>
				 {showRemove &&
				  <Button variant="btn p-0"
					  onClick={()=>showDeleteModal(post.id)}>
				      <i className="fas fa-times"></i>
				  </Button>
				 }
			     </div>
			     
			 )
		     })
		 )
		}
		    </PerfectScrollbar>
		</div>
	    </Card.Body>
	    {props.user.role === "owner" &&
	     <>
		 <ParticipantModal
		     showModal = {displayParticipantModal}
		     hideModal = {hideParticipantModal}
		     thread={thread}
		     caseid={caseid}
		     allowSelectRole={allowSelectRole}
		     confirmInvite = {reloadParticipants}
		     title={participantModalTitle}
		     currentParticipants = {participants}
		     caseInfo = {caseInfo}
		 />
		 <DeleteConfirmation
                     showModal={displayConfirmationModal}
                     confirmModal={submitRemoveParticipant}
                     hideModal={hideConfirmationModal}
                     id={removeID}
                     message={deleteMessage} />
	     </>
	    }
	</Card>
    )
}

