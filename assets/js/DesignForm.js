import React, { useState, useEffect, useRef } from 'react';
import FormAPI from './FormAPI';
import DeleteConfirmation from "./DeleteConfirmation";
import {Card, Accordion, Row, Col, Button, Form} from 'react-bootstrap';
import '../css/casethread.css';

/*import '../css/core.css';*/

const formapi = new FormAPI();

const DesignForm = (form) => {

    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [theForm, setTheForm] = useState(null);
    const [formTitle, setFormTitle] = useState("Add a new question");
    const [showForm, setShowForm] = useState(false);
    const [showChoices, setShowChoices] = useState(false);
    const [selectValue, setSelectValue] = useState("");
    const [questionValue, setQuestionValue] = useState("");
    const [choicesValue, setChoicesValue] = useState("");
    const [required, setRequired] = useState(false);
    const [priv, setPriv] = useState(false);
    const [invalidQuestion, setInvalidQuestion] = useState(false);
    const [invalidQuestionType, setInvalidQuestionType] = useState(false);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [removeID, setRemoveID] = useState(null);
    const [editQuestion, setEditQuestion] = useState(null);
    const formRef = useRef(null);
    
    const fetchInitialData = async () => {
	try {

	    await formapi.getForm(form).then((response) => {
		setTheForm(response);
	    });
	    
	    await formapi.getQuestions(form).then((response) => {
		setQuestions(response);
		setIsLoading(false);
	    })
	    
	} catch (err) {
	    console.log('Error:', err)
	}
    }

    const submitQuestion = (event) => {
	event.preventDefault();
	const error = false;
	const formData = new FormData(event.target),
	      formDataObj = Object.fromEntries(formData.entries());
	console.log(formDataObj);
	if (formDataObj.question === "") {
	    setInvalidQuestion(true);
	    error = true;
	} else {
	    setInvalidQuestion(false);
	}
	if (formDataObj.question_type === "") {
	    setInvalidQuestionType(true);
	    error = true;
	} else {
	    setInvalidQuestionType(false);
	}
	if (error == false) {
	    /* else submit form */
	    try {
		if (editQuestion) {
		    formapi.updateQuestion(editQuestion, formDataObj).then((response) => {
			/* get all questions updated */
			fetchInitialData();
			addQuestion();
			setShowForm(false);
		    })
		} else {
		    formapi.addQuestion(form, formDataObj).then((response) => {
			setQuestions(questions => [...questions, response])
			addQuestion();
			setShowForm(false);
		    })
		}
	    } catch (err) {
		console.log(err);
	    }
	}
	
	    
	
    }	

    function editQuestionNow(q) {
	const choice_options = ['Checkbox Multiple', 'Select', 'Radio Buttons'];
	setSelectValue(q.question_type);
	setQuestionValue(q.question);
	setEditQuestion(q.id);
	setRequired(q.required);
	setPriv(q.private);
	setFormTitle("Edit question")
	if (choice_options.includes(q.question_type)) {
	    setChoicesValue(q.question_choices);
            setShowChoices(true);
	} else {
	    setChoicesValue("");
	    setShowChoices(false);
	}
	setShowForm(true);
    }
    
    function removeQuestion(id) {
	console.log("remove", id);
	setRemoveID(id);
	setDeleteMessage("Are you sure you want to remove this question?");
	setDisplayConfirmationModal(true);
    };

    const submitRemoveQuestion = (id) => {
	console.log("HEREEEE");
	formapi.deleteQuestion(id).then((response) => {
	    setQuestions((qs) =>
		qs.filter((select) => select.id !== id))
	})
	setDisplayConfirmationModal(false);
    }

    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
    };
    
    function makeSelect(e) {
	setSelectValue(e.target.value);
	console.log(e.target.value);
	const choice_options = ['Checkbox Multiple', 'Select', 'Radio Buttons'];
	if (choice_options.includes(e.target.value)) {
	    setShowChoices(true);
	} else {
	    setShowChoices(false);
	}
    }

    function addQuestion() {
	setEditQuestion(null);
	setFormTitle("Add a new question");
	setSelectValue("");
	setChoicesValue("");
	setRequired(false);
	setQuestionValue("");
	setPriv(false);
    }
    
    useEffect(() => {
	fetchInitialData();
    }, [])

    useEffect(() => {
	if (showForm) {
	    formRef.current.scrollIntoView();
	}
    }, [showForm]);

    
    return (

	isLoading ? 
	    <h3>Loading...</h3>
 	:
	    <Card>
	    <Card.Header>
		<div className="d-flex align-items-center justify-content-between">
		    <Card.Title>
			Add questions to your new form: {theForm.title}
		    </Card.Title>
		    <Button type="button" className="btn btn-primary" onClick={()=>(addQuestion(), setShowForm(true))}>
			Add Question
		    </Button>
		</div>
            </Card.Header>
	    <Card.Body>
		<Accordion>
		    
		    { questions.map((question, index) => {
			return (
			    <Accordion.Item className={question.id == editQuestion ? "card active" : "card"} eventKey={index} key={question.id}>
				<Accordion.Header>
				    {question.id == editQuestion ? <i className="fas fa-edit p-2"></i> : "" }
				    {question.question}
				</Accordion.Header>
				<Accordion.Body>
				    <div className="p-3">
					<label className="form-label">Question Type:</label> <b>{ question.question_type }</b>
					<br/>
					<label className="form-label">Required:</label> <b>{question.required ? "True" : "False" }</b>
					<br/>
					<label className="form-label">Keep answers private:</label> <b>{question.private ? "True" : "False" }</b>
					
					{question.question_choices && 
					 <>
					     <br/>
					     <label className="form-label">Choices:</label><br/>
					     {question.question_choices}
					 </>
					}
					<div className="actions text-end">
					    <Button className="p-2 m-2" variant="outline-secondary" onClick={(e)=>editQuestionNow(question)}><i className="fas fa-edit"></i></Button><Button variant="danger" className="p-2" onClick={(e)=>removeQuestion(question.id)}><i className="fas fa-trash"></i></Button>
					</div>
				    </div>
				</Accordion.Body>
			    </Accordion.Item>
			)}
				   )}
		</Accordion>
		<div id="testref" ref={formRef}>&nbsp; </div>
		{showForm &&
		 <Card className="mt-3">
		     <Card.Header>
			 <Card.Title>{formTitle}</Card.Title>
		     </Card.Header>
		     <Card.Body>

		 <Form onSubmit={(e)=>submitQuestion(e)} id="questionform">
		     <Form.Group className="mb-3" controlId="question_type">
			 <Form.Label>Question Type</Form.Label>
			 <Form.Text className="text-muted">
			     How should this question be presented?
			 </Form.Text>
			 <Form.Select name="question_type" value={selectValue} className="select form-select" required="" id="id_question_type" onChange={(e)=> makeSelect(e)} isInvalid={invalidQuestionType}>
			     <option value="">Select Question Type</option>
			     <option>Single Line Text</option>
			     <option>Multi Line Text</option>
			     <option>Number</option>
			     <option>Checkbox Multiple</option>
			     <option>Checkbox</option>
			     <option>Select</option>
			     <option>Email</option>
			     <option>Date</option>
			     <option>Radio Buttons</option>
			     
			 </Form.Select>
			 {invalidQuestionType &&
			  <Form.Text className="error">
			      This field is required.
			  </Form.Text>
			 }
		     </Form.Group>
		     <Form.Group className="mb-3" controlId="Question">
			 <Form.Label>Question</Form.Label>
			 <Form.Control name="question" as="textarea" rows={3} isInvalid={invalidQuestion} value={questionValue} onChange={(e)=>setQuestionValue(e.target.value)}/>
			 {invalidQuestion &&
			  <Form.Text className="error">
			      This field is required.
			  </Form.Text>
			 }
		     </Form.Group>
		     {showChoices &&
		      <Form.Group className="mb-3" controlId="QuestionChoices">
			  <Form.Label>Choices</Form.Label>
			  <Form.Control value={choicesValue} onChange={(e)=>setChoicesValue(e.target.value)} name="question_choices" as="textarea" rows={3} />
		      </Form.Group>
		     }
		     <Form.Group className="mb-3" controlId="RequiredCheck">
			 <Form.Label>Required</Form.Label>
			 <Form.Check type="checkbox" name="required" label="Is this field required?" checked={required} onChange={(e)=>(console.log(e), setRequired(e.target.checked))}/>
		     </Form.Group>
		     <Form.Group className="mb-3" controlId="PrivateCheck">
			 <Form.Label>Keep answers private</Form.Label>
			 <Form.Check type="checkbox" name="private" label="Keep answers private?" checked={priv} onChange={(e)=>(console.log(e), setPriv(e.target.checked))}/>
		     </Form.Group>
		     <Button className="m-2" type="Cancel" variant="secondary" onClick={(e)=>(e.preventDefault(), setShowForm(false), setEditQuestion(null))}>
			 Cancel
		     </Button>
		     <Button variant="primary" type="submit">
			 Submit
		     </Button>
		 </Form>
			 </Card.Body>
		 </Card>
		}
		     
		<DeleteConfirmation
                    showModal={displayConfirmationModal}
                    confirmModal={submitRemoveQuestion}
                    hideModal={hideConfirmationModal}
                    id={removeID}
                    message={deleteMessage} /> 
	    </Card.Body>
	    </Card>
    )

}

export default DesignForm;
									 
									  

			     
			 

	    
	    
