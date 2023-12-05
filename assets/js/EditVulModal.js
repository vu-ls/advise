import React from 'react';
import { Modal, Badge, FloatingLabel, Button, InputGroup, Form, Row, Col } from "react-bootstrap";
import {Typeahead} from 'react-bootstrap-typeahead';
import { useState, useRef, useCallback, useEffect } from 'react';
import { format, parse, addHours } from 'date-fns';
import ThreadAPI from './ThreadAPI';
import 'react-bootstrap-typeahead/css/Typeahead.bs5.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import '../css/casethread.css';

const threadapi = new ThreadAPI();


const ActiveIndexWatcher = ({ update }) => {
    useEffect(update);
    return null;
};

const EditVulModal = (props) => {
    const [error, setError] = useState("");
    const [invalidCVE, setInvalidCVE] = useState(null);
    const [invalidDescription, setInvalidDescription] = useState(null);
    const [vulCVE, setVulCVE] = useState("");
    const [cweFormInputs, setCWEFormInputs] = useState([]);
    const [vulDescription, setVulDescription] = useState("");
    const [vulTags, setVulTags] = useState("");
    const [vulDate, setVulDate] = useState("");
    const [cwes, setCWEs] = useState([]);
    const [cweSelected, setCWESelected] = useState([]);
    const [references, setReferences] = useState([]);
    const [tags, setTags] = useState([]);
    const [datePublic, setDatePublic] = useState("");
    const [userInput, setUserInput] = useState(false);
    const [alert, setAlert] = useState(null);
    const [activeIndex, setActiveIndex] = useState(-1);
    const ref_typeahead = useRef(null);

    
    useEffect(() => {
	if (props.vul) {
	    /* check to make sure these things aren't null, otherwise react complains */
	    if (props.vul.cve) {
		setVulCVE(props.vul.vul);
	    }

	    setVulDescription(props.vul.description);
	    if (props.vul.problem_types) {
		let x = props.vul.problem_types.map((c) => ({'cwe': c}))
		setCWESelected(x);
	    }
	    if (props.vul.references) {
		setReferences(props.vul.references);
	    }
	    if (props.vul.tags) {
		setTags(props.vul.tags);
	    }
	    if (props.vul.date_public) {
		setDatePublic(props.vul.date_public);
	    }
	    setUserInput(false);

	}
	if (props.showModal) {
	    setUserInput(false);
	    setAlert(null);
	}
    }, [props]);

    useEffect(() => {
	threadapi.getCWEs().then((response) => {
	    setCWEs(response);
	});

	/* load cwe */
    }, []);

    const changeDate = (value) => {
	/* this is to avoid weird timezone issues */
	setUserInput(true);
	setDatePublic(value);
    };


    const tryReserve = () => {
	if (userInput) {
	    setAlert("Save changes before reserving CVE.");
	} else {
	    props.reserveCVE();
	}
    }
    
    const submitVul = async (event) => {
        event.preventDefault();
        const error = false;
        const formData = new FormData(event.target),
              formDataObj = Object.fromEntries(formData.entries());

	formDataObj['problem_types'] = cweSelected.map((item)=> item.cwe);
	formDataObj['references'] = references.map((item) => {
	    if (item.label) {
		return item.label;
	    } else {
		return item;
	    }
	});
	formDataObj['date_public'] = datePublic;
	formDataObj['tags'] = tags.map((item) => {
	    if (item.label) {
		return item.label;
	    }else {
		return item;
	    }
	});
        console.log(formDataObj);

        if (formDataObj.description === "") {
            setInvalidDescription(true);
            error = true;
	    setError("Please fill in required fields.")
        } else {
            setInvalidDescription(false);
        }
	if (error == false) {
            /* else submit form */
            await threadapi.updateVul(props.vul, formDataObj).then((response) => {
                /* get all questions updated */
		props.updateVul();
		props.hideModal();
	    }).catch(err => {
                console.log(err);
		setError(`Error submitting vulnerability information: ${err.response?.data.detail}`);
            });
        }
    }


    const onKeyDown = useCallback(
	(e) => {
	    if (e.keyCode === 13 && activeIndex === -1) {
		const input_target = e.target.getAttribute('aria-owns');
		//if ("reference" in e.target) {
		if (input_target.includes('reference')) {
		    setUserInput(true);
		    setReferences(references => [...references, e.target.value])
		    ref_typeahead.current.clear()
		}

	    }
	},
	[activeIndex]
    );
    
    return (
	props.vul ?
        <Modal show={props.showModal} onHide={props.hideModal} size="lg" centered backdrop="static">
            <Modal.Header closeButton className="border-bottom">
                <Modal.Title>Edit Vulnerability {props.vul.vul}</Modal.Title>
            </Modal.Header>
	    <Form onSubmit={(e)=>submitVul(e)}>
		<Modal.Body>
		    {alert &&
		     <div className="alert alert-info">{alert}</div>
		    }
                    {error &&
                     <div className="alert alert-danger">{error}</div>
                    }

		    <Row>
			<Col lg={6}>
			    <Form.Group className="mb-3" controlId="_type">
				<div className="d-flex justify-content-between">
                                    <Form.Label>CVE 
				    </Form.Label>
				    {vulCVE ?
				     <Button
					 size="sm"
					 className="mb-2"
					 onClick={(e)=>props.syncCVE()}
					 variant="outline-secondary">
					 Sync CVE
				     </Button>
				     :
				     <Button
					 size="sm"
					 className="mb-2"
					 onClick={(e)=>tryReserve()}
					 variant="outline-secondary">
					 Reserve CVE
				     </Button>
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
                                <Form.Label>Vulnerability Description</Form.Label>
                                <Form.Control name="description" as="textarea" rows={3} isInvalid={invalidDescription} value={vulDescription} onChange={(e)=>(setUserInput(true),setVulDescription(e.target.value))}/>
                                {invalidDescription &&
                                 <Form.Text className="error">
                                     This field is required.
                                 </Form.Text>
                                }
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="_type">
                                <Form.Label>Tags</Form.Label>
				<Typeahead
                                    id="tags"
                                    multiple
                                    options={[]}
                                    allowNew
                                    onChange={setTags}
				    className="typeahead"
                                    selected={tags}
                                    placeholder="Add Tags"
                                />
                            </Form.Group>
			    <Form.Group className="mb-3" controlId="_type">
                                <Form.Label>Date Public</Form.Label>
                                <Form.Control type="date" name="date_public" value={datePublic} onChange={(e)=>changeDate(e.target.value)}/>
                            </Form.Group>
			</Col>
			<Col lg={6}>
			    <Form.Group className="mb-3">
				<Form.Label>Problem Types</Form.Label>

				<Typeahead
				    id="cwe"
				    multiple
				    labelKey="cwe"
				    options={cwes}
				    className="typeahead"
				    onChange={(e)=>(setUserInput(true), setCWESelected(e))}
				    selected={cweSelected}
				    placeholder="Add problem type(s)..."
				/>
			    </Form.Group>
			    <Form.Group className="mb-3 typeahead" controlId="_type">
				<Form.Label>References</Form.Label>
				<Typeahead
				    id="reference"
				    ref={ref_typeahead}
				    labelKey="references"
				    onKeyDown={onKeyDown}
				    multiple
				    options={[]}
				    allowNew
				    onChange={(e)=>(setUserInput(true), setReferences(e))}
				    selected={references}
				    placeholder="Add references"
				>
				    {({ activeIndex }) => (
					<ActiveIndexWatcher update={() => setActiveIndex(activeIndex)} />
				    )}
				</Typeahead>
				
			    </Form.Group>
			</Col>
		    </Row>
		</Modal.Body>
		<Modal.Footer>
		    <Button variant="outline-secondary" data-testid="cancel-editvul" type="cancel" onClick={(e)=>(e.preventDefault(), props.hideModal())}>Cancel</Button>
		    <Button type="submit" variant="primary"><i className="fas fa-plus"></i> Save Vulnerability </Button>
		</Modal.Footer>
	    </Form>
	</Modal>
	: <></>

    )
}

export default EditVulModal;
