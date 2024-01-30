import React from 'react';
import { OverlayTrigger, Tooltip, ToggleButton,  Modal, Row, Col, Alert, ButtonGroup, Badge, Button, Form, Tab } from "react-bootstrap";
import { useState, useEffect } from 'react';
import ComponentAPI from './ComponentAPI.js'
import { format, formatDistance } from 'date-fns'

const VERSION_RANGE_CHOICES = [
    {val:null, desc:''},
    {val: '<', desc: '< (less than)'},
    {val: '<=', desc: '<= (less than or Equal)'},
];

const VERSION_TYPE_CHOICES = [
    {val: null, desc: ''},
    {val: "custom", desc: "custom"},
    {val: "git", desc: "git"},
    {val: "maven", desc: "maven"},
    {val: "python", desc: "python"},
    {val: "rpm", desc: "rpm"},
    {val: "semver", desc: "semver"},
]

const CVE_STATUS_CHOICES = [
    {val: 0, desc: 'Unknown'},
    {val: 1, desc: 'Affected'},
    {val: 2, desc: 'Unaffected'},
]

const STATUS_CHOICES = [
    {val: 0, desc: 'Not Affected'},
    {val: 1, desc: 'Affected'},
    {val: 2, desc: 'Fixed'},
    {val: 3, desc: 'Under Investigation'},
    {val: 4, desc: 'Unknown'},
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
    const [defaultStatus, setDefaultStatus] = useState("Unknown");
    const [versionType, setVersionType] = useState("");
    const [statusWarning, setStatusWarning] = useState(null);
    const [invalidStatus, setInvalidStatus] = useState(false);
    
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
	    setDefaultStatus(compstatus.default_status)
	    setVersionType(compstatus.version_type);
	    setInvalidVersion(false);
	    setInvalidJustification(false);
	}
    }, [compstatus]);



    useEffect(() => {
        console.log(status);
        if (status) {
            switch (status) {
            case 'Not Affected':
                setShowJustification(true);
                setStatusWarning(null);
                return;
            case 'Fixed':
                setStatusWarning("CVE will publish this status as \"Not Affected\"");
                setShowJustification(false);
                return;
            case 'Under Investigation':
                setStatusWarning("CVE will publish this status as \"Unknown\"");
                setShowJustification(false);
                return;
            case 'Unknown':
                setStatusWarning("Any VEX statements produced will use \"Under Investigation\"");
                setShowJustification(false);
                return;
            default:
                setStatusWarning(null);
                setShowJustification(false);

            }
        }
    }, [status]);


    const validateVersion = () => {

        console.log(versionRange);

        /* insert complicated version validation */
        if (versionRange && !endVersion) {
            setInvalidVersion({'field':'version_end_range', 'msg':"End version is required when selecting range"});
        } else if (endVersion && !versionRange) {
            setInvalidVersion({'field': 'version_affected', 'msg': "Version range is required when providing End Range"});
        } else if (versionRange && !versionType) {
            setInvalidVersion({'field': 'version_type', 'msg': "Version type is required when selecting range"});
        } else if (version == endVersion) {
            setInvalidVersion({'field': 'version_end_range', 'msg':"End is the same as the start"});
        } else if (versionType && !versionRange) {
            setInvalidVersion({'field': 'version_type', 'msg':"Version type is only used for ranges. Clear this or define a r\
ange"});
        } else {
            setInvalidVersion({});
        }
        console.log("validating...")

    }

    useEffect(() => {

	if (version) {
            validateVersion();
        }

    }, [version, versionType, versionRange, endVersion]);


    const submitStatus = (event) => {
	let error = false;
	const formDataObj = {}


	if (version === "") {
            setInvalidVersion({'field': 'version', 'msg': 'Version is required'});
            error = true;
        } else if (Object.keys(invalidVersion).length > 0) {
            error = true;
        }

	if (status == "") {
            setInvalidStatus(true);
            error = true;
        } else {
            setInvalidStatus(false);
        }

	formDataObj['version'] = version;
	formDataObj['version_end_range']= endVersion;
	formDataObj['version_affected']= versionRange;
	formDataObj['share'] = shareStatus
	formDataObj['statement'] = vulStatement;
	formDataObj['status'] = status;
	formDataObj['vuls'] = [compstatus.vul.id];
	formDataObj['default_status'] = defaultStatus;
	formDataObj['version_type'] = versionType;
	
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
				isInvalid={invalidStatus}
                                key={`status-${type.desc}`}
                                name="status"
                                checked = {status === type.desc ? true : false }
                                value={type.desc}
                                onChange={setStatus}
                                type="radio"
                            />
                        ))}
                    </div>

		    {invalidStatus &&
                     <Form.Text className="error">
                         This field is required.
                     </Form.Text>
                    }
                    {statusWarning &&
                     <Alert variant="warning">{statusWarning}</Alert>
                    }
                </Form.Group>

		<Form.Group className="mb-3" controlId="_type">
                    <Form.Label>Default Status <OverlayTrigger overlay={<Tooltip>Versions not matched by any version object take the status listed in defaultStatus. When defaultStatus is itself omitted, it defaults to unknown.</Tooltip>}><i className="fas fa-question-circle"></i></OverlayTrigger></Form.Label> <br/>
		    <div onChange={(e)=>setDefaultStatus(e.target.value)}>
                        {CVE_STATUS_CHOICES.map((type) => (
                            <Form.Check
                                inline
                                label={type.desc}
                                aria-label={type.desc}
                                key={`defaultstatus-${type.desc}`}
                                name="default_status"
                                checked = {defaultStatus === type.desc ? true : false }
                                value={type.desc}
                                onChange={setDefaultStatus}
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
                        <Col lg={3} md={6} sm={12}>
                            <Form.Label>Version (or start range) <span className="required">*</span></Form.Label>
                            <Form.Control name="version" isInvalid={invalidVersion.field == "version"} value={version} onChange={(e)=>setVersion(e.target.value)}/>
                            {invalidVersion &&
                             <Form.Text className="error">
                                 This field is required.
                             </Form.Text>
                            }

                        </Col>
			<Col lg={3} md={6} sm={12}>
                            <Form.Label>Version Range</Form.Label>
                            <Form.Select isInvalid={invalidVersion.field == "version_affected"} name="version_affected" value={versionRange} onChange={(e)=>setVersionRange(e.target.value)} aria-label="Range Select">
                                {VERSION_RANGE_CHOICES.map((choice) => (
                                    <option key={choice.val} value={choice.val}>{choice.desc} </option>
                                ))}
                            </Form.Select>
                        </Col>
                        <Col lg={3} md={6} sm={12}>

                            <Form.Label>End Version Range</Form.Label>
                            <Form.Control isInvalid={invalidVersion.field == "version_end_range"} name="version_end_range" value={endVersion}  onChange={(e)=>setEndVersion(e.target.value)}/>
                        </Col>
			<Col lg={3} md={6} sm={12}>
                            <Form.Label>Version Type</Form.Label>
                            <Form.Select name="version_type" value={versionType} isInvalid={invalidVersion.field == "version_type"} onChange={(e)=>setVersionType(e.target.value)} aria-label="Version Type Select">
                                {VERSION_TYPE_CHOICES.map((choice) => (
                                    <option key={choice.val} value={choice.val}>{choice.desc} </option>
                                ))}
                            </Form.Select>
                        </Col>
			{Object.keys(invalidVersion).length > 0 &&
                         <Row>
                             <Col lg={12}>
                                 <Alert variant="danger">
                                     {invalidVersion.msg}
                                 </Alert>
                             </Col>
                         </Row>
                        }
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
