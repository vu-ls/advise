import React, { useState, useEffect } from 'react'
import {Card, Badge, Alert, DropdownButton, Dropdown, InputGroup, FloatingLabel, Form, Container, Row, Col, Tab, Tabs, Nav, Button} from 'react-bootstrap';
import CaseThreadAPI from './ThreadAPI';
import '../css/casethread.css';
import {format, formatDistance} from 'date-fns';
import VulAddForm from './VulAddForm';
import StatusAddForm from './StatusAddForm';
import CaseSummaryApp from './CaseSummaryApp';
import ViewReport from './ViewReport';

const threadapi = new CaseThreadAPI();

const CaseDetailApp = (props) => {

    const [caseInfo, setCaseInfo] = useState(null);
    const [caseTitle, setCaseTitle] = useState("");
    const [invalidTitle, setInvalidTitle] = useState(false);
    const [caseSummary, setCaseSummary] = useState("");
    const [feedback, setFeedback] = useState(null);
    const [activeTab, setActiveTab] = useState("report");
    const [vuls, setVuls] = useState([]);
    const [owner, setOwner] = useState(false);
    const [status, setStatus] = useState(false);


    useEffect(() => {
	if (!(['coordinator', 'owner'].includes(props.user.role))) {
	    if (props.caseInfo.status === "Pending") {
		setCaseInfo(null);
	    } else {
		setCaseInfo(props.caseInfo);
	    }
	    
	    setOwner(false);
	} else {
	    setOwner(true);
	    setCaseInfo(props.caseInfo);
	    setCaseTitle(props.caseInfo.title);
	    setCaseSummary(props.caseInfo.summary);
	}
    }, [props]);

    const fetchInitialData = async () => {
	
        try {
            await threadapi.getVuls(caseInfo).then((response) => {
		console.log("VULS are ", response);
                setVuls(response);
            });

        } catch (err) {
            console.log('Error:', err)
        }
    }

    useEffect(() => {
	
	if (caseInfo) {
	    console.log('fetching vuls');
	    fetchInitialData();
	    if (caseInfo.report == null) {
		setActiveTab("addcasedetails");
	    }

	}
    }, [caseInfo]);

    useEffect(() => {
	if (vuls) {
	    setStatus(vuls.some(item => item.affected_products.length > 0));
	    console.log("vuls are updated");
	}
    }, [vuls]);
    
    const submitDetails = (event) => {
	event.preventDefault();
	const formData = new FormData(event.target),
              formDataObj = Object.fromEntries(formData.entries());
	try {
	    threadapi.updateCase(props.caseInfo, formDataObj).then((response) => {
		let f = <Alert variant="success">Got it! Thanks for adding more information!</Alert>;
		setFeedback(f);
	    });
	} catch (err) {
	    let f= <Alert variant="error">An error occurred: {err}</Alert>
	    setFeedback(f);
	}
    };

    return (
	caseInfo && owner ?
	    <div className="nav-align-top mb-4">
		<Tab.Container
                    defaultActiveKey={activeTab}
		    activeKey={activeTab}
                    id="report"
                    className="mb-3"
		    onSelect={(e)=>(setFeedback(null),setActiveTab(e.eventKey))}
                >
                    <Nav variant="pills" className="mb-3" fill justify>
			{caseInfo.report &&
			<Nav.Item>
                            <Nav.Link eventKey="report"><i className="fas fa-file-alt"></i>  Original Report</Nav.Link>
                        </Nav.Item>
			}
			<Nav.Item>
                            <Nav.Link eventKey="addcasedetails">
				{caseSummary && caseTitle ?
				 <span className="text-nowrap">Case Details <i className="fas fa-check text-success"></i></span>
				 :
				 <>
				     <i className="fas fa-plus"></i>  Add Case Details
				 </>
				}</Nav.Link>
                        </Nav.Item>
			<Nav.Item>
                            <Nav.Link eventKey="addvuls">
				{vuls.length > 0 ?
				 <>
				     <span className="text-nowrap">Vulnerabilities <Badge bg="info" pill>{vuls.length}</Badge></span>
				 </>
				 :
				 <>
				     <i className="fas fa-plus"></i>  Add Vulnerabilties
				 </>
				}
			    </Nav.Link>
							 
                        </Nav.Item>

			<Nav.Item>
                            <Nav.Link eventKey="addstatus">
				{status ?
				 <>
				     <span className="text-nowrap">Status <i className="fas fa-check text-success"></i></span>
				 </>
				 :
				 <>
				     <i className="fas fa-plus"></i>  Add Status
				 </>
				}
			    </Nav.Link>
                        </Nav.Item>
			
		    </Nav>
		    <Tab.Content>
			{caseInfo.report &&
			<Tab.Pane eventKey="report">

			     <ViewReport
				 report={caseInfo.report}
			     />
			</Tab.Pane>
			}
			<Tab.Pane eventKey="addcasedetails">
			    {caseInfo.report ? ""
			     :
			     <Alert variant="warning">This case was created manually and does not have a report associated with it.  Do you want to add one?
			     </Alert>
			    }
			    {feedback &&
			     feedback
			    }
			    <Form onSubmit={(e)=>submitDetails(e)} id="detailsform">
				<Form.Group className="mb-3" controlId="case_title">
				    <Form.Label>Title</Form.Label>
				    <Form.Text className="text-muted">
					Give this case a better title
				    </Form.Text>
				    <Form.Control name="title" isInvalid={invalidTitle} value={caseTitle} onChange={(e)=>setCaseTitle(e.target.value)}/>
				    {invalidTitle &&
				    <Form.Text className="error">
					This field is required.
				    </Form.Text>
				    }
				</Form.Group>
				<Form.Group className="mb-3" controlId="case_summary">
				    <Form.Label>Summary</Form.Label>
				    <Form.Text className="text-muted">
					Add a summary of this case (optional)
				    </Form.Text>
				    <Form.Control name="summary" as="textarea" rows={3}  value={caseSummary} onChange={(e)=>setCaseSummary(e.target.value)}/>
				</Form.Group>
				<Button variant="primary" type="submit">
				    Submit
				</Button>
			    </Form>
			</Tab.Pane>
			<Tab.Pane eventKey="addvuls">
			    <VulAddForm
				caseInfo = {caseInfo}
				vuls = {vuls}
				updateVuls = {fetchInitialData}
			    />
			    
			</Tab.Pane>
			<Tab.Pane eventKey="addstatus">
			    <StatusAddForm
				caseInfo = {caseInfo}
				vuls = {vuls}
				user={props.user}
			    />
			</Tab.Pane>
		    </Tab.Content>
		</Tab.Container>
	    </div>
	:
	<>
	{caseInfo ?
	 <CaseSummaryApp
	     caseInfo = {caseInfo}
	     vuls={vuls}
	     user={props.user}
	 />

	 :
	 <Card className="p-4 mb-3">
	     <Alert variant="warning">This case is currently pending. We are working on adding details. In the meantime, you can start the discussion below or add related artifacts.</Alert>
	 </Card>
	}
	</>
    )
}

export default CaseDetailApp;
