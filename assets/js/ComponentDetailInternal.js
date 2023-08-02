import React from 'react';
import { Alert, Card, Nav, ListGroup, Dropdown, Row, Col, Table, Tab, Button, Tabs, Form, DropdownButton } from "react-bootstrap";
import { useState, useEffect } from 'react';
import ActivityApp from './ActivityApp.js';
import '../css/casethread.css';
import ComponentAPI from './ComponentAPI';
import DisplayVulStatus from './DisplayVulStatus';
import AddComponentModal from './AddComponentModal';
import DeleteConfirmation from "./DeleteConfirmation";
import SelectGroupModal from "./SelectGroupModal";


const componentapi = new ComponentAPI();

const ComponentDetailInternal = ({component, loadactivity, updateComponent}) => {

    const [loading, setLoading] = useState(true);
    const [cases, setCases] = useState([]);
    const [activeTab, setActiveTab] = useState("detail");
    const [casesError, setCasesError] = useState(null);
    const [activityError, setActivityError] = useState(null);
    const [activity, setActivity] = useState([]);
    const [selectFormat, setSelectFormat] = useState(false);
    const [format, setFormat] = useState("json");
    const [sbomError, setSbomError] = useState(null);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [addComponentModal, setAddComponentModal] = useState(false);
    const [editComponent, setEditComponent] = useState(null);
    const [error, setError] = useState(null);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [selected, setSelected] = useState([]);
    
    // Async Fetch
    const fetchCases = async () => {
	await componentapi.getComponentCases(component).then((response) => {
            console.log(response);
	    setCases(response);
            setLoading(false);
        }).catch (err => {
	    setLoading(false);
	    setCasesError(err.response.data.detail);
	    console.log(err);
	});
    }

    const showDeleteModal = () => {
        /*get selected rows and add them to removeid */
        setDeleteMessage(`Are you sure you want to remove this component?`);
        setDisplayConfirmationModal(true);
    };

    useEffect(() => {
        if (editComponent) {
            setAddComponentModal(true);
        }
    }, [editComponent]);


    const hideComponentModal = () => {
        setAddComponentModal(false);
        setEditComponent(null);
	updateComponent();
    };


    const hideGroupModal = () => {
        setShowGroupModal(false);
	updateComponent();
    };



    const submitRemoveComponent = () => {
        componentapi.removeComponents([component.id]).then((response) => {
	    window.location="/advise/components/";
        }).catch(err => {
            setError(`Error removing components: ${err.response.data.detail}`);
        })
        setDisplayConfirmationModal(false);
    };
    
    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
    };

    useEffect(() => {
	/* make this look like selected rows from component table */
	let s = {'original': component}
	setSelected([s]);
	
	setActiveTab("detail");
	setCases([]);
	setActivity([]);
	setSbomError(null);
	setCasesError(null);
	setActivityError(null);
    }, [component]);

    //Async fetch activity
    const fetchActivity = async () => {
	await componentapi.getComponentActivity(component).then((response) => {
	    setActivity(response.results);
	    setLoading(false);
	}).catch(err=> {
	    setLoading(false);
	    setActivityError(err.response.data.detail);
	});
    }

    const downloadSBOM = async (e) => {
	try {
	    /* make sure errors get handled properly */
	    let response = await componentapi.getSPDX(component, e);
	    let data = await response.data;
	    const url = window.URL.createObjectURL(new Blob([data],
							    { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download',
			      response.headers["content-disposition"].split("filename=")[1]);
            document.body.appendChild(link);
            link.click();
	} catch (err) {
	    let statusCode = err.response.status
	    let responseObj = await err.response.data.text();
	    let json = JSON.parse(responseObj);
	    setSbomError(json['error']);

	}
    }


    const setActiveTabNow = (props) => {
	setLoading(true);
        if (props == "cases") {
	    fetchCases();
	} else if (props == "activity") {
	    fetchActivity();
	}

	setActiveTab(props);
    }

    if (component) {
	return (
	    <Tab.Container
                defaultActiveKey={"detail"}
		activeKey = {activeTab}
		className="mb-3"
		onSelect={setActiveTabNow}
            >
		<Nav variant="pills" className="mb-3">
		    <Nav.Item key="detail">
			<Nav.Link eventKey="detail">Detail</Nav.Link>
		    </Nav.Item>
		    <Nav.Item key="cases">
			<Nav.Link eventKey="cases">Cases</Nav.Link>
		    </Nav.Item>
		    {loadactivity &&
		    <Nav.Item key="activity">
			<Nav.Link eventKey="activity">Activity</Nav.Link>
		    </Nav.Item>
		    }
		    <Nav.Item key="sbom">
			<Nav.Link eventKey="sbom">SBOM</Nav.Link>
		    </Nav.Item>
		</Nav>
		<Tab.Content className="p-0">
		    <Tab.Pane eventKey="detail" key="detail">
			<Card className="p-0">
			    {loadactivity ?
			     ""
			     :
			     <Card.Header>
				 <div className="d-flex justify-content-between">
				     <Card.Title>Component Detail</Card.Title>
                                     <DropdownButton variant="btn p-0"
                                                     title={<i className="bx bx-dots-vertical-rounded"></i>}>
                                         <Dropdown.Item eventKey="edit" onClick={()=>(setEditComponent(component.id))}>Edit Component</Dropdown.Item>
					 <Dropdown.Item eventKey="delete" onClick={()=>(showDeleteModal())}>Delete Component</Dropdown.Item>
					 {component.owner == "" &&
					  <Dropdown.Item eventKey="add" onClick={()=>(setShowGroupModal(true))}>Add Owner</Dropdown.Item>
					 }
                                     </DropdownButton>
                                 </div>
			     </Card.Header>
			    }
			    <Card.Body>
				{component.owner != "" ?
				 ""
				 :
				 <Alert variant="danger">This component does not have an owner.</Alert>
				}
				
				{
				    Object.entries(component)
					.map( ([key, value]) => {
					    if (value) {
						return (
						    <div className="mt-2" key={`${key}-comp}`}><label className="form-label">{key}:</label>
							{ Array.isArray(value) ?
							  <><br/><ul>
								     {value.map((v, index) => {
									 if (typeof v === "object") {
									     return (
										 <li key={`${v.name}-${index}`}>{v.name}</li>
									     )
									 } else {
									     return (
										 <li key={`${v}-${index}`}>{v}</li>
									     )
									 }
								     })
								     }
								 </ul></>
							  :
							  <>
							      {typeof value === "object" ?
						       <span className="m-2"><b>{value.name}</b></span>
							       :
							       <span className="m-2"><b>{value}</b></span>
							      }
							  </>
							}
						    </div>
						)}})
				    
				}
			    </Card.Body>
			</Card>
		    </Tab.Pane>
		    <Tab.Pane eventKey="cases" key="cases">
			<Card className="p-0">
                            <Card.Body>
				{loading ?
				 <div className="text-center"><div className="lds-spinner"><div></div><div></div><div></div></div></div>
				 :
				 <>{casesError ?
				    <Alert variant="danger">{casesError}</Alert>
				    :
				    
				    <Table>
					<thead>
					    <tr>
						<th>
						    Case
						</th>
						<th>
						    Vul
						</th>
						<th>
						    Status
						</th>
					    </tr>
					</thead>
					<tbody>
					    {cases.length == 0 &&
					     <tr><td colSpan="3" className="text-center"><b>No cases</b></td></tr>
					    }
					    {cases.map((c, index) => {
						return (
						    <tr key={`case-component-${c.id}`}>
							<td><a href={`${c.vul.url}`}>{c.vul.case}</a></td>
							<td>{c.vul.vul}</td>
							<td><DisplayVulStatus
								status={c.status}
							    />
							</td>
						    </tr>
						)
					    })
					    }
					</tbody>
				    </Table>
				   }
				 </>
				}
			    </Card.Body>
			</Card>
		    </Tab.Pane>
		    {loadactivity &&
		    <Tab.Pane eventKey="activity" key="Activity">
			<Card className="p-0">
			    <Card.Body>
				{loading ?
				 <div className="text-center"><div className="lds-spinner"><div></div><div></div><div></div></div></div>
				 :
				 <>
				     {activityError ?
				      <Alert variant="danger">{activityError}</Alert>
				      :
				      <ListGroup variant="flush">
					  {activity.length == 0 &&
					   <ListGroup.Item>No activity</ListGroup.Item>
			      }
					  {activity.map((a, index) => {
					      return (
						  <ListGroup.Item className="p-2 border-bottom" key={`activity-${index}`}>
						      <ActivityApp
							  activity = {a}
						      />
                                      </ListGroup.Item>
					      )
					  })}
				      </ListGroup>
				     }
				 </>
				}
			    </Card.Body>
			</Card>
		    </Tab.Pane>
		    }
		    <Tab.Pane eventKey="sbom" key="SBOM">
			<Card>
			    <Card.Body>
				{component.version && component.source && component.source !== "NOASSERTION" ?
				 <Dropdown onSelect={(e)=>downloadSBOM(e)}>
				     <Dropdown.Toggle className="button-toggle-dropdown">
					 Download
				     </Dropdown.Toggle>
				     <Dropdown.Menu>
					 <Dropdown.Item eventKey="json">
					     JSON
					 </Dropdown.Item>
					 <Dropdown.Item eventKey="xml">XML</Dropdown.Item>
					 <Dropdown.Item eventKey="yaml">YAML</Dropdown.Item>
					 <Dropdown.Item eventKey="rdf">RDF</Dropdown.Item>
				     </Dropdown.Menu>
				 </Dropdown>
				 :
				 <Alert variant="info">Component must have version and source (download location) before SBOM can be generated.</Alert>
				}
				{sbomError &&
				 <Alert variant="danger" className="my-2">{sbomError}</Alert>
				}
				<Table>
				    <thead>
					<tr>
					    <td>File</td>
					    <td>Date</td>
					    <td>Generated by</td>
					    <td>Action</td>
					</tr>
				    </thead>
				    <tbody>
				    </tbody>
				</Table>
			    </Card.Body>
			</Card>
		    </Tab.Pane>
		    
		</Tab.Content>
		<AddComponentModal
                    showModal = {addComponentModal}
                    hideModal = {hideComponentModal}
                    title = {editComponent? "Edit Component" : "Add Component"}
                    edit = {editComponent}
		/>                                                                          
		<DeleteConfirmation
                    showModal={displayConfirmationModal}
                    confirmModal={submitRemoveComponent}
                    hideModal={hideConfirmationModal}
                    id={component.id}
                    message={deleteMessage} />
		<SelectGroupModal
                    showModal = {showGroupModal}
                    hideModal = {hideGroupModal}
                    selected= {selected}
		/>
	    </Tab.Container>
	)
    }


};

export default ComponentDetailInternal;
