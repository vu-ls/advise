import React, { useState, useEffect } from 'react';
import {Card, DropdownButton, Dropdown, ListGroup, InputGroup, Form, Row, Col, Table, Accordion, Alert, Button} from 'react-bootstrap';
import CaseThreadAPI from './ThreadAPI';
import ReactQuill, { Quill,editor } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { format, formatDistance } from 'date-fns'
import ContactAPI from './ContactAPI';
import '../css/casethread.css';
import AddGroupModal from './AddGroupModal';
import InfiniteScroll from 'react-infinite-scroll-component'
import ActivityApp from './ActivityApp.js';

const contactapi = new ContactAPI();

const GroupApp = () => {

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [results, setResults] = useState([]);
    const [initial, setInitial] = useState([]);
    const [searchVal, setSearchVal] = useState("");
    const [searchType, setSearchType] = useState("All");
    const [isLoading, setIsLoading] = useState(false);
    const [addGroupModal, setAddGroupModal] = useState(false);
    const [activity, setActivity] = useState([]);
    const [activityHasMore, setActivityHasMore] = useState(false);
    const [activityNext, setActivityNext] = useState(null);
    const [activityLoading, setActivityLoading] = useState(true);

    const fetchInitialData = async () => {
        try {
            await contactapi.getGroups().then((response) => {
                console.log(response);
		setResults(response);
		setInitial(response);
            });

	}catch (err) {
            console.log('Error: ', err)
	    setError(err.response.data.message);
        }

	try {
	    let results = await contactapi.getActivity();
	    let data = await results.data;
	    setActivity(data.results);
	    setActivityNext(data.next);
	    if (data.next) {
		setActivityHasMore(true);
	    }
	    setActivityLoading(false);
	} catch(err) {
	    setError(err.response.data.message);
	}
    };

    const fetchMoreActivity = async (page) => {
        try {
            let results = await contactapi.getActivity(activityNext);
            let data = await results.data;
            console.log(data);
            setActivity(activity.concat(data.results));
            setActivityNext(data.next);
            if (data.next) {
                setActivityHasMore(true);
            } else {
                setActivityHasMore(false);
            }
        } catch(err) {
            console.log(err);
            setError("Error fetching more activity");
        }
    }

    const onFilter = (e) => {
	setSearchVal(e.target.value);
	setIsLoading(true);
    }

    const hideGroupModal = () => {
        setAddGroupModal(false);
        fetchInitialData();
    };

    const goToContact = (url) => {
        window.location.href=url;
    };
    
    useEffect(() => {
	let urlstr = `type=${searchType}`;
	if (searchVal) {
	    urlstr = `${urlstr}&name=${searchVal}`;
	}

	if (searchType === "All" && !searchVal) {
	    setResults(initial);
	} else {
	    contactapi.searchGroups(urlstr).then((response) => {
		setResults(response);
		setIsLoading(false);
	    });
	}

    }, [searchType, searchVal]);

    useEffect(() => {
        fetchInitialData();
    }, []);


       return (
	   <Row>
	       <Col lg={12}>
                {error &&
                 <Alert variant="danger">{error}</Alert>
                }
                {success &&
                 <Alert variant="success"> {success}</Alert>
                }
               <div className="card-wrapper d-flex gap-4">
		   <div className="dashboard-card-1">
		       <Card>
			   <Card.Header className="pb-0">
			       <div className="d-flex justify-content-between">
				   <nav className="navbar navbar-expand-lg">
				       <div className="collapse navbar-collapse">
					   <div className="navbar-nav me-auto search-menu">
					       <a href="#" onClick={(e)=>(e.preventDefault(), setSearchType("All"))} className={searchType=='All' ? "active nav-item nav-link" : "nav-item nav-link"}>All</a>
					       <a href="#" onClick={(e)=>(e.preventDefault(), setSearchType("Contacts"))} className="nav-item nav-link">Contacts</a>
					       <a href="#" onClick={(e)=>(e.preventDefault(), setSearchType("Groups"))} className="nav-item nav-link">Groups</a>
					       <a href="#" onClick={(e)=>(e.preventDefault(), setSearchType("Users"))} className="nav-item nav-link">Users</a>
					   </div>
				       </div>
				   </nav>
				   
				   <DropdownButton variant="btn p-0"
						   title={<i className="bx bx-dots-vertical-rounded"></i>}
				   >
				       <Dropdown.Item eventKey='group' onClick={(e)=>setAddGroupModal(true)}>Add Group</Dropdown.Item>
				       {/*<Dropdown.Item eventKey='contact'>Add Contact</Dropdown.Item>*/}
				   </DropdownButton>
			       </div>
			   </Card.Header>
			   <Card.Body>
			       
			       <InputGroup className="w-100">
				   <Form.Control
				       placeholder="Search Contacts"
				       aria-label="Search Contacts"
				       aria-describedby="searchcontacts"
				       onChange={(e)=>onFilter(e)}
				   />
				   <Button variant="btn btn-outline-secondary" id="button-addon2" type="submit">
				       <i className="fas fa-search"></i>
				   </Button>
			</InputGroup>
			       
			   </Card.Body>
		       </Card>
		       
		       <Card className="mt-4">
		    <Card.Body>
			{results ?
			 <div className="table-responsive text-nowrap mb-4">
			     <table className="table table-striped">
				 <thead>
				     <tr>
					 <th> Name </th>
					 <th> Tags/Username</th>
					 <th> Type </th>
				     </tr>
				 </thead>
				 <tbody className="table-border-bottom-1">
				     {results.map((group, index) => {
					 return(
					     <tr key={`result-${group.type}-${index}`}>
						 <td><a href={`${group.url}`}>{group.name ?
									       `${group.name}` :
									       `${group.email}`
									      }</a></td>
						 <td>{group.user_name}</td>
						 <td>{group.type}</td>
					     </tr>
					 )
				     })}
				 </tbody>
			     </table>
			 </div>
			 :
			 <p>Loading...</p>
			}
		    </Card.Body>
		       </Card>
		   </div>
		   <AddGroupModal
                       showModal = {addGroupModal}
                       hideModal = {hideGroupModal}
		   />
		   <Card className="dashboard-card-2">
		       <Card.Header>
                           <Card.Title>Recent Activity</Card.Title>
                       </Card.Header>
                       <Card.Body className="p-0">
                           {activityLoading ?
                            <div className="text-center">
				<div className="lds-spinner"><div></div><div></div><div></div></div>
                            </div>
                            :
			    <div id="scrollableDiv">                                      
				<InfiniteScroll
                                    dataLength={activity.length}
                                    next={fetchMoreActivity}
                                    hasMore={activityHasMore}
                                    loader={<div className="text-center"><div className="lds-spinner"><div></div><div></div><div></div></div></div>}
                                    endMessage={<div className="text-center">No more activity updates</div>}
                                    scrollableTarget="scrollableDiv"
                                >                                                     
                                    
                                    <ListGroup variant="flush">                           
					{activity.map((a, index) => {
                                            return (
						<ListGroup.Item action onClick={(e)=>goToContact(a.url)} className="p-2 border-bottom" key={`activity-${index}`}>                  
                                                    <ActivityApp
							activity = {a}
                                                    />                                    
						</ListGroup.Item>
                                            )
					})}                                               
                                    </ListGroup>                                          
                                </InfiniteScroll>                                     
                            </div>
			    
			   }
		       </Card.Body>
		   </Card>
	       </div>
	       </Col>
	   </Row>
       )
}

export default GroupApp;
