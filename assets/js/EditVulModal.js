import React from 'react';
import { Modal, Badge, FloatingLabel, Button, InputGroup, Form, Row, Col } from "react-bootstrap";
import {Typeahead} from 'react-bootstrap-typeahead';
import { useState, useEffect } from 'react';
import { format, parse, addHours } from 'date-fns';
import ThreadAPI from './ThreadAPI';
import 'react-bootstrap-typeahead/css/Typeahead.bs5.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import '../css/casethread.css';

const threadapi = new ThreadAPI();


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
    const [datePublic, setDatePublic] = useState(null);

    useEffect(() => {
	if (props.vul) {
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
	    setTags(props.vul.tags);
	    setDatePublic(props.vul.date_public);
	    
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
	setDatePublic(value);
    };

    
    const submitVul = (event) => {
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
            try {
                threadapi.updateVul(props.vul, formDataObj).then((response) => {
                    /* get all questions updated */
		    props.updateVul();
		    props.hideModal();
                })

            } catch (err) {
                console.log(err);
            }
        }
    }

    return (
	props.vul ?
        <Modal show={props.showModal} onHide={props.hideModal} size="lg" centered backdrop="static">
            <Modal.Header closeButton className="border-bottom">
                <Modal.Title>Edit Vulnerability {props.vul.vul}</Modal.Title>
            </Modal.Header>
	    <Form onSubmit={(e)=>submitVul(e)}>
		<Modal.Body>
                    {error &&
                     <div className="alert alert-danger">{error}</div>
                    }

		    <Row>
			<Col lg={6}>
			    <Form.Group className="mb-3" controlId="_type">
                                <Form.Label>CVE</Form.Label>
                                <Form.Control name="cve" isInvalid={invalidCVE} value={vulCVE} onChange={(e)=>setVulCVE(e.target.value)}/>
                                {invalidCVE &&
                                 <Form.Text className="error">
                                     This field is required.
                                 </Form.Text>
                                }
                            </Form.Group>
			    <Form.Group className="mb-3" controlId="_type">
                                <Form.Label>Vulnerability Description</Form.Label>
                                <Form.Control name="description" as="textarea" rows={3} isInvalid={invalidDescription} value={vulDescription} onChange={(e)=>setVulDescription(e.target.value)}/>
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
				    onChange={setCWESelected}
				    selected={cweSelected}
				    placeholder="Add problem type(s)..."
				/>
			    </Form.Group>
			    <Form.Group className="mb-3" controlId="_type">
				<Form.Label>References</Form.Label>
				<Typeahead
				    id="reference"
				    multiple
				    options={[]}
				    allowNew
				    onChange={setReferences}
				    selected={references}
				    placeholder="Add references"
				/> 
			    </Form.Group>
			</Col>
		    </Row>
		</Modal.Body>
		<Modal.Footer>
		    <Button variant="outline-secondary" type="cancel" onClick={(e)=>(e.preventDefault(), props.hideModal())}>Cancel</Button>
		    <Button type="submit" variant="primary"><i className="fas fa-plus"></i> Save Vulnerability </Button>
		</Modal.Footer>
	    </Form>
	</Modal>
	: <></>

    )
}

export default EditVulModal;
