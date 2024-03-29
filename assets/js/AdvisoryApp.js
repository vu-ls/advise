import React, { useState, useEffect } from 'react';
import {Card, DropdownButton, Dropdown, InputGroup, Form, Row, Col, Table, Accordion, Alert, Button} from 'react-bootstrap';
import CaseThreadAPI from './ThreadAPI';
import ReactQuill, { Quill,editor } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { format, formatDistance } from 'date-fns'
import {useParams, useNavigate, Link, useLocation} from "react-router-dom"

const threadapi = new CaseThreadAPI();

const AdvisoryApp = () => {

    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [caseInfo, setCaseInfo] = useState(location.state?.caseInfo);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [advisory, setAdvisory] = useState("");
    const [title, setTitle] = useState("");
    const [revisions, setRevisions] = useState("");
    const [content, setContent] = useState("");
    const [invalidContent, setInvalidContent] = useState(false);
    const [log, setLog] = useState("");
    const [invalidTitle, setInvalidTitle] = useState(false);
    const [disableButton, setDisableButton] = useState(false);

    const modules = React.useMemo(
        () => ({
            toolbar: [
            [{ header: '1' }, { header: '2' }],
                [('bold', 'italic', 'indent', 'underline', 'strike', 'blockquote')],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['link', 'image', 'formula'],
                ['code-block']
            ],
        }), []
    );

    // Async Fetch
    const fetchInitialData = async () => {

	if (caseInfo == null) {
            await threadapi.getCase({'case': id}).then((response) => {
                console.log(response);
                setCaseInfo(response);
            }).catch(err => {
		if (err.response.status == 403 || err.response.status==404) {
                    navigate("../err");
                }
                console.log(err);
            });
	}
	
        await threadapi.getCurrentAdvisory({'case':id }).then(async function (response) {
            console.log(response);
            setAdvisory(response);
	    setTitle(response.title);
	    setContent(response.content);
	    setLoading(false);

	    await threadapi.getAdvisoryRevisions({'case': id}).then((response)=> {
		setRevisions(response);
	    }).catch(err => {
		console.log(err);
	    });

	    
        }).catch(err => {
	    console.log(err);
	    if (err.response.status == 403) {
                navigate("../err");
            } else if (err.response.status == 404) {
		setLoading(false);
	    }
	});

    };


    const saveAdvisory = () => {
	let formData = {}
	if (title === "") {
	    setInvalidTitle(true);
	    return;
	}
	if (content === "") {
	    setInvalidContent(true);
	    return;
	}
	formData['title'] = title
	formData['content'] = content
	formData['user_message'] = log

	threadapi.saveAdvisory({'case': id}, formData).then((response) => {
	    setSuccess("Got it! Advisory saved!");
	    fetchInitialData();
	    console.log(response);
	}).catch(err => {
	    setError(`Error saving advisory: ${err.message}`);
	});
    }

    useEffect(() => {
        fetchInitialData();
    }, []);

    return (
	<>
	    {caseInfo &&
	     <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light">Cases /</span> <Link to={'..'}>{caseInfo.case_identifier} {caseInfo.title}</Link> / Advisory</h4>
	    }
	    {loading ?
	     <div className="text-center"><div className="lds-spinner"><div></div><div></div><div></div></div></div>
	     :
             <Row>
		 <Col lg={8} md={8}>
		     {error &&
		      <Alert variant="danger">{error}</Alert>
		     }
		     {success &&
		      <Alert variant="success"> {success}</Alert>
		     }
		     <Form.Group className="mb-3" controlId="Title">
			 <Form.Label>Title</Form.Label>
			 <Form.Control name="title" isInvalid={invalidTitle} value={title} onChange={(e)=>setTitle(e.target.value)}/>
			 {invalidTitle &&
			  <Form.Text className="error">
                              This field is required.
			  </Form.Text>
			 }
                     </Form.Group>
		    <Card className="mb-3">
			<ReactQuill
			    style={{
				height: '45vh',
				fontSize: '18px',
				marginBottom: '50px',
			    }}
			    
			    value={content}
			    modules={{...modules}}
			    placeholder="Write advisory contents here"
			    onChange={setContent}
			/>
		    </Card>
		    <Form.Group className="mb-3" controlId="Log">
			<Form.Label>Revision Message</Form.Label>
			<Form.Control name="log" value={log} onChange={(e)=>setLog(e.target.value)}/>
                    </Form.Group>
		    <div className="mb-3">
			<Button type="Cancel" variant="secondary" onClick={(e)=>fetchInitialData()}>
			    Cancel
			</Button>
			<Button
                            variant="outline-primary"
                            className="float-end"
                            disabled={disableButton ? true : false}
                            onClick={(e)=>saveAdvisory()}>
                            {disableButton ? <>Saving...</>:<>Save</>}
			</Button>
		    </div>
		</Col>
		<Col lg={4}>
		    {revisions.length > 0 &&
		     <>
			 <h4>Revision History</h4>
			 <Accordion>
			     {revisions.map((rev, index) => {
				 let created = new Date(rev.created);
				 return (
				     <Accordion.Item eventKey={index} key={`rev-${rev.revision_number}`}>
					 <Accordion.Header>
					     <div>
						 {rev.revision_number == advisory.revision_number ?
						  <i className="fas fa-flag"></i>
						  :
						  <i className="fas fa-plus"></i>
						 }
						 <span className="px-2">#{rev.revision_number} {format(created, 'yyyy-MM-dd')} by {rev.author}</span>
					     </div>
					 </Accordion.Header>
					 <Accordion.Body>
					     <div className="border-bottom pb-2 mb-2"><small>Log: {rev.user_message}</small></div>
					     
					     {rev.diff.length > 0 && (
						 <Table>
						     <tbody>
							 {
							     rev.diff.map((post, index) => {
								 let firstchar = post.charAt();
								 let cn = "equal";
								 switch(firstchar) {
								 case "-":
								     cn = "delete";
								     break;
								 case "+":
								     cn="insert";
								     break;
								 case "?":
								     cn="skip";
								 default:
								     break;
								     
								 }
								 if (cn != "skip") {
								     return (
									 <tr className={cn} key={index}>
									     <td><div dangerouslySetInnerHTML={{__html: post}} /></td>
									 </tr>
								     )
								 }
							     })
							 }
						     </tbody>
						 </Table>
					     )
					     }
					 </Accordion.Body>
				     </Accordion.Item>
				 )
			     })}
			 </Accordion>
		     </>
		    }
		</Col>
	     </Row>
	    }
	</>
     )
}

export default AdvisoryApp;
