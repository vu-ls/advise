import React, { useState, useEffect } from 'react'
import ThreadSearchForm from './ThreadSearch';
import {Card, DropdownButton, Dropdown, InputGroup, FloatingLabel, Form, Container, Alert, Row, Col, Tab, Tabs, Nav, Button} from 'react-bootstrap';
import {useParams, useNavigate, Link, useLocation} from "react-router-dom"
import CaseThreadAPI from './ThreadAPI';
import PostList from './PostList';
import ParticipantList from './ParticipantList';
import '../css/casethread.css';
import CaseDetailApp from './CaseDetailApp';
import CaseStatusApp from './CaseStatusApp';
import CaseArtifactApp from './CaseArtifactApp';
import DeleteConfirmation from "./DeleteConfirmation";
import CaseActivityApp from './CaseActivityApp';

const threadapi = new CaseThreadAPI();

const CaseThreadApp = () => {

    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [crumbs, setCrumbs] = useState(location.state?.breadcrumbs);
    const [crumbLink, setCrumbLink] = useState(location.state?.crumb_link);
    //const [caseid, setCaseId] = useState(location.state?.caseid);
    const [threadError, setThreadError] = useState(null);
    const [threads, setThreads] = useState([]);
    const [threadSubject, setThreadSubject] = useState("");
    const [invalidSubject, setInvalidSubject] = useState(false);
    const [caseInfo, setCaseInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [reqUser, setReqUser] = useState(null);
    const [showRemove, setShowRemove] = useState(false);
    const [searchStr, setSearchStr] = useState(null);
    const [activeTab, setActiveTab] = useState(null);
    const [urlTab, setUrlTab] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [showNewThread, setShowNewThread] = useState(false);
    const [owners, setOwners] = useState([]);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [removeID, setRemoveID] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [reloadActivity, setReloadActivity] = useState(0);

    
    const searchThreads=(searchprop) => {
	const {value, togglebutton} = searchprop;
	console.log("in search threads");
	console.log(searchprop);
	setSearchStr(searchprop);
    }

    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
	setShowRemove(false);
    };


    const submitRemoveThread = (id) => {
        console.log("IN RM Thread");
        console.log(id);
        threadapi.deleteThread(id).then((response) => {
	    if (showArchived) {
		getArchivedThreads();
	    } else {
		fetchInitialData();
	    }
        });
        setDisplayConfirmationModal(false);
	setShowRemove(false);
    };


    const setActiveTabNow = (props) => {
	console.log(props);
	if (props == "addTab") {
	    setShowNewThread(true);
	    setActiveTab("addTab");
	} else {
	    let thread = threads.filter(thread => thread.id==props)
	    setShowNewThread(false);
	    setActiveTab(thread[0]);
	}
    }

    const getThreadParticipants = async () => {
	if (activeTab) {
	    //setIsLoading(true);
	    const thread = activeTab.id;
	    console.log("get participants for", thread);
	    try {
		await threadapi.getThreadParticipants(thread).then((response) => {
		    console.log("GOT NEW PARTICIPANTS");
                    console.log(response);
                    setParticipants(response);
		    //setIsLoading(false);
		})
            } catch (err) {
		console.log('Error:', err)
            }
	} else {
	    setParticipants([]);
	}
    }


    const createThread = (event) => {
	event.preventDefault();

	/*todo: add error handling - null subject not allowed */
	console.log(event);
	console.log(event.target.elements);
	if (event.target.elements[0].value == "") {
	    setInvalidSubject(true);
	} else {
	    threadapi.createThread({'case': id}, event.target.elements[0].value).then((response) => {
		setThreads(threads => [...threads, response]);
		setShowNewThread(false);
		setActiveTab(response);

            });
	    setThreadSubject("");
	    event.target.elements[0].value = "";
	    
	}
    }

    const closeTab = (thread) => {
        setRemoveID(thread.id);
	if (thread.archived) {
	    setDeleteMessage(`Are you sure you want to unarchive this thread wtih subject ${thread.subject}?`);
	} else {
            setDeleteMessage(`Are you sure you want to archive this thread with subject ${thread.subject}?`);

	}
        setDisplayConfirmationModal(true);
    }

    const getArchivedThreads = async () => {
	setShowArchived(true);
	try {
	    await threadapi.getArchivedThreads({'case':id}).then((response) => {
		console.log(response);
		if (response.length > 0) {
		    setActiveTab(response[0]);
		}
                setThreads(response);
            })
	} catch (err) {
	    if (err.response) {
		setThreadError(err.response.data.detail);
	    }else {
		setThreadError("Error retrieving archived threads");
	    }
	    
	    console.log('Error:' , err)
	}
    }


    // Async Fetch
    const fetchInitialData = async () => {
	setShowArchived(false);
	console.log(`FETCH INITIAL CASE DATA ${id}`);
	try {
	    setReloadActivity(reloadActivity + 1);
	    await threadapi.getCase({'case': id}).then(async (response) => {
                console.log(response);
                setCaseInfo(response);
	    
		await threadapi.getCaseOwners({'case': id}).then((response) => {
		    setOwners(response);
		    console.log("owners: ", response);
		});
		await threadapi.getUserCaseState({'case': id}).then((response) => {
		    console.log("USER IS ", response);
		    setReqUser(response);
		})
		await threadapi.getThreads({'case': id}).then((response) => {
		    const queryString = window.location.search;
		    const urlParams = new URLSearchParams(queryString);
		    const thread = urlParams.get('thread')
		    if (thread) {
			/* find thread */
			let findtab = response.filter((item) => item.id == thread)
			if (findtab) {
			    setActiveTab(findtab[0]);
			} else {
			    setActiveTab(response[0]);
			}
		    } else {
			setActiveTab(response[0]);
		    }
		    console.log(response);
                    setThreads(response);
		    
		    //console.log("SETTING ACTIVE TAB");
		    //console.log(response[0].id);

		    //setIsLoading(false);
		})
	    }).catch(err => {
		console.log(err);
		if (err.response && (err.response.status == 403 || err.response.status==404)) {
		    navigate("err");
		}
	    });

	} catch (err) {
	    console.log('Error:', err)
	}
    }

    useEffect(() => {
	fetchInitialData();
    }, []);

    useEffect(() => {
	if (activeTab != "addTab") {
	    getThreadParticipants();
	} else {
	    setParticipants([]);
	}
    }, [activeTab]);

    
    const updateCaseActivity = () => {
	console.log(`RELOAD ACTIVITY, ${reloadActivity}`);
	setReloadActivity(reloadActivity + 1);
    };
    

    return (
	<>
	    {caseInfo && reqUser ? (
		<>
		    {crumbs ?

		     <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light">{crumbs[0]} /</span> <Link to={crumbLink} >{crumbs[1]}</Link> / {caseInfo.case_identifier} {caseInfo.title}</h4>
		     :
		     <>
			 {caseInfo.owners.length == 0 && caseInfo.status=="Pending" ?
			  <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light">Triage /</span> <Link to={"/advise/triage/"}>Unassigned Cases</Link> /  {caseInfo.case_identifier} {caseInfo.title}</h4>    
			  :
			  <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light">Cases /</span> {caseInfo.case_identifier} {caseInfo.title}</h4> 
			 }
		     </>
		    }
		    <Row>
		 <Col lg={8} md={8} className="h-100">
		     <CaseDetailApp
			 caseInfo = {caseInfo}
			 updateStatus = {fetchInitialData}
			 user = {reqUser}
			 updateActivity={updateCaseActivity}
		     />
		     
		     <Card>
			 <Card.Header className="d-flex align-items-center justify-content-between pb-2">
			     <Card.Title className="mb-1">
				 {showArchived &&
				  "Archived "
				 }
			     Case Threads</Card.Title>
			     {
				 <DropdownButton variant="btn p-0"
						 id="thread-dropdown"
						 title={<i className="bx bx-dots-vertical-rounded"></i>}
			     >
				 {showArchived || reqUser.role !== "owner" ? ""
				  :
				  <Dropdown.Item eventKey='add' onClick={(e)=>setActiveTabNow("addTab")}>Add a Thread</Dropdown.Item>
				 }
				 {showArchived ?
				  <>
				      <Dropdown.Item eventKey='current' onClick={(e)=>(fetchInitialData())}> Show Current Threads </Dropdown.Item>
				      {reqUser.role === "owner" && threads.length > 1 &&
				       <Dropdown.Item eventKey='remove' onClick={(e)=>(setShowRemove(true))}> Revive (Unarchive) Threads </Dropdown.Item>

				      }
				  </>
				  :
				  <>
				      <Dropdown.Item eventKey='archived' onClick={(e)=>(getArchivedThreads())}> Show Archived </Dropdown.Item>
				      {reqUser.role === "owner" && threads.length > 1 &&
				       <Dropdown.Item eventKey='remove' onClick={(e)=>(setShowRemove(true))}> Archive Threads </Dropdown.Item>
				      }
				  </>
				 }



			     </DropdownButton>
			      }
			 </Card.Header>
			 <Card.Body>

			     <ThreadSearchForm
				 onSubmit={searchThreads}
			     />
			     {threads.length > 0 && showArchived &&
			      <Alert variant="info">Archived threads are read-only</Alert>
			     }
			     
			     {threads.length == 0 ?
			      
			      <Alert variant="warning">No Threads to display</Alert>
			      : (
				  <Tab.Container
				      defaultActiveKey={threads[0].id}
				      activeKey = {activeTab == "addTab" ? "addTab" : activeTab.id}
				      className="mb-3"
				      onSelect={setActiveTabNow}
			>
				      <Nav variant="pills" className="mb-3">
					  {
					      threads.map((thread, index) => {
						  return (
						      <Nav.Item key={index}>
							  <Nav.Link eventKey={thread.id}>{thread.subject}
							      {showRemove &&
							       <>
								   {thread.official ?


								    ""
								    :
								    <div className="react-tabs-tab-close" onMouseUp={(e)=>closeTab(thread)}>×</div>
								   }
							       </>
							      }
							  </Nav.Link>
						      </Nav.Item>
						  )
					      })
					  }
					      {showArchived || reqUser.role !== "owner" || participants.length == 0 ?
						  ""
						  :
						  <Nav.Item>
						      <Nav.Link eventKey="addTab">Add a Thread</Nav.Link>
						  </Nav.Item>
					      }

				      </Nav>
				      <Tab.Content id="thread-list">
					  
					  {
					      threads.map((thread, index) => {
						  if (thread.id == activeTab.id) {
						      return (
							  <Tab.Pane eventKey={thread.id} key={index}>
							      <PostList
								  thread = {thread}
								  user = {reqUser}
								  search = {searchStr}
								  participants = {participants}
								  update = {updateCaseActivity}
							      />
							  </Tab.Pane>
						      )
						  }
					      })
					  }

					  <Tab.Pane eventKey="addTab">
					      <p>To start a new thread, please provide a subject.</p>
					      <Form onSubmit={(e)=>createThread(e)}>
						  <InputGroup className="mb-3">
						      <Form.Control isInvalid={invalidSubject} name="subject" placeholder="Add a subject for this new thread" />
						      <Button
							  type="submit"
							  variant="outline-primary"
						      >Create</Button>
						      <Button
							  data-testid="cancel-create-thread"
							  type="cancel"
							  variant="outline-secondary"
							  onClick={(e)=>(e.preventDefault(),setActiveTab(threads[0]),setShowNewThread(false))}>
						      Cancel</Button>
							  
						  </InputGroup>
						  {invalidSubject &&
						   <Form.Text className="error">
						       This field is required.
						   </Form.Text>
						  }

					      </Form>
					      
					  </Tab.Pane>
				      </Tab.Content>
				  </Tab.Container>
			      )}
			 </Card.Body>
		     </Card>
		 </Col>
		 <Col lg={4} md={4} className="h-100">
		     <CaseStatusApp
			 caseInfo = {caseInfo}
			 updateStatus = {fetchInitialData}
			 user = {reqUser}
			 reload = {getThreadParticipants}
		     />
		     <CaseArtifactApp
			 caseInfo = {caseInfo}
			 user = {reqUser}
		     />
		     {showNewThread ?
		      <Card className="mt-4">
			  <Card.Header className="d-flex align-items-center justify-content-between">
			      <Card.Title className="m-0">
				  Thread Participants
			      </Card.Title>
			  </Card.Header>
			  <Card.Body>
			      Create thread to add participants
			  </Card.Body>
		      </Card>
		      :
		      <>
			  {participants.length > 0 && (
			      <ParticipantList
				  participants = {participants}
				  activethread = {activeTab}
				  reload = {getThreadParticipants}
				  removeThread = {closeTab}
				  user = {reqUser}
				  caseInfo = {caseInfo}
			      />
			  )
			  }
		      </>
		     }
		     <CaseActivityApp
			 caseInfo = {caseInfo}
			 user = {reqUser}
			 reload = {reloadActivity}
		     />
		     <DeleteConfirmation
			 showModal={displayConfirmationModal}
			 confirmModal={submitRemoveThread}
			 hideModal={hideConfirmationModal}
			 id={removeID}
			 message={deleteMessage}
			 buttonText="Confirm"
		     />
		 </Col>
		    </Row>
		</>
	    )
	     :
	     ""
	     
	    }
	</>
    )
    
};

export default CaseThreadApp;
