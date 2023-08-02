import React from 'react';
import { ToggleButton,  Modal, Row, Col, Alert, ButtonGroup, Badge, Button, Form, Tab } from "react-bootstrap";
import { useState, useEffect } from 'react';
import ComponentAPI from './ComponentAPI.js'
import { format, formatDistance } from 'date-fns'

const VERSION_RANGE_CHOICES = [
    {val:null, desc:'None'},
    {val: '<', desc: '< (affects X versions prior to n)'},
    {val: '<=', desc: '<= (affects X versions up to n)'},
    {val: '=', desc: '= (affects n)'},
    {val: '>', desc: '> (affects X versions above n)'},
    {val: '>=', desc: '>= (affects X versions n and above)'}
];


const STATUS_CHOICES = [
    {val: 0, desc: 'Not Affected'},
    {val: 1, desc: 'Affected'},
    {val: 2, desc: 'Fixed'},
    {val: 3, desc: 'Under Investigation'},
]

const JUSTIFICATION_CHOICES = [
    {val: "component_not_present", desc: "Component Not Present"},
    {val: "vulnerable_code_not_present", desc: "Vulnerable Code Not Present"},
    {val: "vulnerable_code_not_in_execute_path", desc: "Vulnerable Code not in Execute Path"},
    {val: "vulnerable_code_cannot_be_controlled_by_adversary", desc: "Vulnerable Code cannot be controlled by adversary"},
    {val: "inline_mitigations_already_exist", desc: "Inline mitigations already exist"},
]

const componentapi = new ComponentAPI();

const EditStatusModal = ({showModal, hideModal, component, compstatus}) => {

    const [version, setVersion] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [status, setStatus] = useState("");
    const [showJustification, setShowJustification] = useState(false);
    const [justification, setJustification] = useState("");
    const [versionRange, setVersionRange]=useState("");
    const [endVersion, setEndVersion] = useState("");
    const [invalidJustification, setInvalidJustification] = useState(false);
    const [invalidVersion, setInvalidVersion] = useState(false);
    const [vulStatement, setVulStatement] = useState("");
    const [shareStatus, setShareStatus] = useState(false);

    const radios = [
        { name: 'Share', value: true },
        { name: "Don't Share", value: false },
    ];

    useEffect(() => {
        console.log(status);
        if (status && status === "Not Affected") {
            setShowJustification(true);
        } else if (status) {
            setShowJustification(false);
        }
    }, [status]);

    useEffect(() => {
	if (compstatus) {
	    setVersion(compstatus.version);
	    setEndVersion(compstatus.version_end_range);
	    setVulStatement(compstatus.statement);
	    if (compstatus.version_range) {
		setVersionRange(compstatus.version_range);
	    }
	    if (compstatus.justification) {
		let val = JUSTIFICATION_CHOICES.filter(item => item.desc == compstatus.justification);
		setJustification(val[0].val);
            } else {
		setJustification("");
	    }
	    setStatus(compstatus.status);
	    setShareStatus(compstatus.share)
	    setInvalidVersion(false);
	    setInvalidJustification(false);
	}
    }, [compstatus]);

    const submitStatus = (event) => {
	let error = false;
	const formDataObj = {}
	
	if (version === "") {
            setInvalidVersion(true);
            error = true;
        } else {
            setInvalidVersion(false);
        }
	formDataObj['version'] = version;
	formDataObj['version_end_range']= endVersion;
	formDataObj['version_affected']= versionRange;
	formDataObj['share'] = shareStatus
	formDataObj['statement'] = vulStatement;
	formDataObj['status'] = status;
	formDataObj['vuls'] = [compstatus.vul.id];
	
	if (status === "Not Affected") {
	    if (justification == "") {
                setInvalidJustification(true);
                error=true;
            } else {
                formDataObj['justification'] = justification;
            }
        }

	if (error == false) {
	    componentapi.editStatus(compstatus, formDataObj).then((response) => {
		hideModal();
            }).catch(err => {
                setErrorMessage(`Error editing status: ${err.message}: ${err.response.data.detail}`);
                console.log(err);
            });
	}
    }
    
    return (
	compstatus && component &&
        <Modal show={showModal} onHide={hideModal} size="lg" centered backdrop="static">
            <Modal.Header closeButton className="border-bottom">
                <Modal.Title>Edit Component Status</Modal.Title>
            </Modal.Header>
            <Modal.Body>
		{errorMessage ?
		 <Alert variant="danger">{errorMessage}</Alert>
		 :
		 
		 <Alert variant="info">Editing status for component, <b>{component.name}</b>, and vulnerability {compstatus.vul.vul}</Alert>
		}
		<Form.Group className="mb-3" controlId="_type">
                    <Form.Label>Status</Form.Label><br/>
                    <div onChange={(e)=>setStatus(e.target.value)}>
                        {STATUS_CHOICES.map((type) => (
                            <Form.Check
                                inline
                                label={type.desc}
                                key={`status-${type.desc}`}
                                name="status"
                                checked = {status === type.desc ? true : false }
                                value={type.desc}
                                onChange={setStatus}
                                type="radio"
                            />
                        ))}
                    </div>
                </Form.Group>
		{showJustification &&
                 <Form.Group className="mb-3">
                     <Form.Label>Justification</Form.Label><br/>
                     <Form.Text>A "Not Affected" status requires a justification.</Form.Text>
                     <div onChange={(e)=>setJustification(e.target.value)}>
                         {JUSTIFICATION_CHOICES.map((type) => (
                             <Form.Check
                                 label={type.desc}
                                 key={`status-${type.desc}`}
                                 name="justification"
                                 checked = {justification === type.val ? true : false }
                                 value={type.val}
                                 onChange={setJustification}
                                 type="radio"
                             />
                         ))}
                     </div>
                     {invalidJustification &&
                      <Form.Text className="error">
                          This field is required when status is "Not Affected."
                      </Form.Text>
                     }
                 </Form.Group>
                }

		<Form.Group className="mb-3">
                    <Row>
                        <Col lg={4} md={6} sm={12}>
                            <Form.Label>Affected Version (or start range) <span className="required">*</span></Form.Label>
                            <Form.Control name="version" isInvalid={invalidVersion} value={version} onChange={(e)=>setVersion(e.target.value)}/>
                            {invalidVersion &&
                             <Form.Text className="error">
                                 This field is required.
                             </Form.Text>
                            }

                        </Col>
			<Col lg={4} md={6} sm={12}>
                            <Form.Label>Version Range</Form.Label>
                            <Form.Select name="version_affected" value={versionRange} onChange={(e)=>setVersionRange(e.target.value)} aria-label="Range Select">
                                {VERSION_RANGE_CHOICES.map((choice) => (
                                    <option key={choice.val} value={choice.val}>{choice.desc} </option>
                                ))}
                            </Form.Select>
                        </Col>
                        <Col lg={4} md={6} sm={12}>

                            <Form.Label>End Version Range</Form.Label>
                            <Form.Control name="version_end_range" value={endVersion}  onChange={(e)=>setEndVersion(e.target.value)}/>
                        </Col>
                    </Row>
                </Form.Group>
		<Form.Group className="mb-3">
                    <Form.Label>Optional Statement/Comment</Form.Label>
                    <Form.Control name="statement" as="textarea" rows={3} value={vulStatement} onChange={(e)=>setVulStatement(e.target.value)}/>
                </Form.Group>
		<Form.Group className="mb-3">
                    <Form.Label>Share status with other case participants?</Form.Label><br/>
                    <ButtonGroup>
                        {radios.map((radio, idx) => (
                            <ToggleButton
                                key={idx}
                                id={`radio-${idx}`}
                                type="radio"
                                variant={idx ? 'outline-danger' : 'outline-success'}
                                name="share"

                                value={radio.value}
                                checked={shareStatus === radio.value}
                                onChange={(e) => setShareStatus(e.currentTarget.value)}
                            >
                                {radio.name}
                            </ToggleButton>
                        ))}
                    </ButtonGroup>
                </Form.Group>
	    </Modal.Body>
            <Modal.Footer>
		<div className="d-flex text-end gap-2">
		    <Button variant="secondary" onClick={hideModal}>
			Cancel
		    </Button>
		    <Button variant="primary" onClick={(e) => submitStatus(e)}>
			Save
		    </Button>
		</div>
            </Modal.Footer>
	</Modal>
    )
}

export default EditStatusModal;
