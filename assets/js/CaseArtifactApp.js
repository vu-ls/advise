import React, { useState, useEffect } from 'react'
import {Card, Alert, NavDropdown, DropdownButton, Dropdown, InputGroup, FloatingLabel, Form, Container, Row, Col, Badge, Button} from 'react-bootstrap';
import { format, formatDistance } from 'date-fns'
import CaseThreadAPI from './ThreadAPI';
import '../css/casethread.css';
import DisplayStatus from './DisplayStatus';
import DisplayLogo from './DisplayLogo';
import {Typeahead} from 'react-bootstrap-typeahead';
import UploadFileModal from './UploadFileModal';
import DisplayFilePreview from './DisplayFilePreview';
import DeleteConfirmation from "./DeleteConfirmation";

const threadapi = new CaseThreadAPI();


const CaseArtifactApp = (props) => {

    const [caseInfo, setCaseInfo] = useState(null);
    const [reqUser, setReqUser] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [artifacts, setArtifacts] = useState([]);
    const [showRemove, setShowRemove] = useState(false);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [removeID, setRemoveID] = useState(null);
    const [showShare, setShowShare] = useState(false);
    const [error, setError] = useState(null);
    
    const hideUploadModal = () => {
        setShowUploadModal(false);
    };

    function submitFile(data) {
	console.log("IN SUBMIT!!!");
	console.log(data);
	threadapi.addArtifact(caseInfo, data).then((response) => {
	    setArtifacts(artifacts => [...artifacts, response])
        })
	
	hideUploadModal();
    }
    
    useEffect(() => {
        setCaseInfo(props.caseInfo);
	setReqUser(props.user);
    }, [props]);


    const getArtifacts = async () => {
        console.log("fetching artifacts");
        try {
            await threadapi.getArtifacts(caseInfo).then((response) => {
                console.log(response);
                setArtifacts(response);
            })
        } catch (err) {
            console.log('Error:', err)
        }
    }

    function confirmRemoveFile(file) {
	setRemoveID(file.uuid);
	setDisplayConfirmationModal(true);
	setDeleteMessage(`Are you sure you want to remove this file \"${file.filename}\"?`);
    }
    
    useEffect(() => {
	if (caseInfo) {
	    getArtifacts();
	}
    }, [caseInfo]);

    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
    }

    const submitRemoveFile = (id) => {
        console.log("HEREEEE");
        threadapi.removeArtifact(id).then((response) => {
	    getArtifacts();
        })
        setDisplayConfirmationModal(false);
    }

    const shareFile = async (file) => {
	
	await threadapi.shareCaseArtifact(file).then(response => {
	    getArtifacts();
	    setShowShare(false);
	}).catch(err => {
	    setError(`Error changing artifact permissions: ${err.message}`);
	});
    };
    
    return (
        caseInfo ?
	    <Card className="pt-2">
		<Card.Header className="d-flex align-items-center justify-content-between">
		    <Card.Title className="m-0">Case Artifacts</Card.Title>
		    <DropdownButton variant="btn p-0"
                                    title={<i className="bx bx-dots-vertical-rounded"></i>}
                    >
                        <Dropdown.Item eventKey='edit' onClick={(e)=>setShowUploadModal(true)}>Add Artifact</Dropdown.Item>
			{reqUser.role === "owner" &&
			<Dropdown.Item eventKey='share' onClick={(e)=>setShowShare(true)}>Share Files</Dropdown.Item>
			}
			<Dropdown.Item eventKey='remove' onClick={(e)=>setShowRemove(true)}>Remove Files</Dropdown.Item>
                    </DropdownButton>
		</Card.Header>
		<Card.Body>
		    <>
			{error &&
			 <Alert variant="danger">{error}</Alert>
			}
		    </>

		    <>
			{showRemove &&
			 <div className="d-grid mb-3"><Button variant="danger" size="sm" onClick={(e)=>setShowRemove(false)}>Cancel Remove Files</Button></div>
			}
		    </>
		    
		    {artifacts.map((a, index) => {
			return (
			    <DisplayFilePreview
				key={`artifact-${index}`}
				file={a}
				remove = {showRemove}
				share = {showShare}
				removeFile = {confirmRemoveFile}
				shareFile = {shareFile}
			    />
			)
		    })
		    }
		</Card.Body>
		<UploadFileModal
		    showModal = {showUploadModal}
		    hideModal = {hideUploadModal}
		    confirmModal = {submitFile}
		/>
		<DeleteConfirmation
                    showModal={displayConfirmationModal}
                    confirmModal={submitRemoveFile}
                    hideModal={hideConfirmationModal}
                    id={removeID}
                    message={deleteMessage} />   
	    </Card>
	:<></>
    )
}

export default CaseArtifactApp;
