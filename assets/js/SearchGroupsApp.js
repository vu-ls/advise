import React, { useState, useEffect } from 'react';
import {Card, DropdownButton, Dropdown, ListGroup, InputGroup, Form, Row, Col, Table, Accordion, Alert, Button} from 'react-bootstrap';
import CaseThreadAPI from './ThreadAPI';
import ReactQuill, { Quill,editor } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { format, formatDistance } from 'date-fns'
import ContactAPI from './ContactAPI';
import '../css/casethread.css';
import {Link, useLocation} from "react-router-dom"
import AddGroupModal from './AddGroupModal';
import InfiniteScroll from 'react-infinite-scroll-component'
import ActivityApp from './ActivityApp.js';
import StandardPagination from './StandardPagination';

const contactapi = new ContactAPI();

const SearchGroupsApp = () => {

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [results, setResults] = useState([]);
    const [initial, setInitial] = useState([]);
    const [searchVal, setSearchVal] = useState("");
    const [searchType, setSearchType] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsCount, setItemsCount] = useState(0);
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
		setResults(response.results);
		setItemsCount(response.count);
		setInitial(response);
            });

	}catch (err) {
            console.log('Error: ', err)
	    if (err.response?.data) {
		setError(err.response.data.message);
	    } else{
		setError("Error fetching groups data.");
	    }
        }

	try {
	    let results = await contactapi.getActivity();
	    let data = await results.data;
	    if (data?.results) {
		setActivity(data.results);
	    }
	    setActivityNext(data.next);
	    if (data.next) {
		setActivityHasMore(true);
	    }
	    setActivityLoading(false);
	} catch(err) {
	    if (err.response?.data) {
		setError(err.response.data.message);
	    } else {
		setError("Error fetching group activity data.");
	    }
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


    useEffect(() => {
        console.log("currentPage in use", currentPage);
        paginationHandler(currentPage);
    }, [currentPage]);


    const paginationHandler = (page) => {

	let urlstr = "";
	if (searchType) {
	    urlstr = `type=${searchType}`;
	}
        if (searchVal) {
            let sval = encodeURIComponent(searchVal);
	    if (urlstr) {
		urlstr = `${urlstr}&name=${sval}`;
	    } else {
		urlstr = `name=${sval}`;
	    }
        }
	
        contactapi
            .getGroupsByPage(urlstr, page)
            .then((response) => {
                console.log(response);
                setResults(response.results);
                setItemsCount(response.count);
                setIsLoading(false);
            })
            .catch((err) => {
                setError(`Error is ${err.response}`);
                setIsLoading(false);
            });
    };
    
    const onFilter = (e) => {
	setSearchVal(e.target.value);
	setIsLoading(true);
    }

    const hideGroupModal = () => {
        setAddGroupModal(false);
        fetchInitialData();
    };

    const addNewGroup = (response) => {
	setAddGroupModal(false);
	console.log(response);
	window.location.href=response['new'];
    };
	
    
    const goToContact = (url) => {
        window.location.href=url;
    };
    
    useEffect(() => {
	setCurrentPage(1);
	let urlstr = `type=${searchType}`;
	if (searchVal) {
	    let sval = encodeURIComponent(searchVal);
	    urlstr = `${urlstr}&name=${sval}`;
	}

	if (searchType === "All" && !searchVal) {
	    setResults(initial.results);
	} else {
	    contactapi.searchGroups(urlstr).then((response) => {
		setResults(response.results);
		setItemsCount(response.count);
		setIsLoading(false);
	    });
	}

    }, [searchType, searchVal]);

    useEffect(() => {
        fetchInitialData();
    }, []);


    return (
	<>
	    <Row>
		<Col lg={12}>
		    <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light">Groups /</span> Group Search</h4>
		    
                    {error &&
                     <Alert variant="danger">{error}</Alert>
                    }
                    {success &&
                     <Alert variant="success"> {success}</Alert>
                    }
		</Col>
	    </Row>
	    <Row className="card-wrapper">
		<Col lg={8} md={6} sm={12}>
		    <Card className="group-app">
			<Card.Header className="pb-0">
			    <div className="d-flex justify-content-between">
				<nav className="navbar navbar-expand-lg">
				    <div className="collapse navbar-collapse">
					<div className="navbar-nav me-auto search-menu">
					    <a href="#" onClick={(e)=>(e.preventDefault(), setSearchType("All"))} className={searchType=='All' ? "active nav-item nav-link" : "nav-item nav-link"}>All</a>
					    <a href="#" onClick={(e)=>(e.preventDefault(), setSearchType("Contacts"))} className={searchType=='Contacts' ? "active nav-item nav-link" : "nav-item nav-link"}>Contacts</a>
					    <a href="#" onClick={(e)=>(e.preventDefault(), setSearchType("Groups"))} className={searchType=='Groups'? "active nav-item nav-link" : "nav-item nav-link"}>Groups</a>
					    <a href="#" onClick={(e)=>(e.preventDefault(), setSearchType("Users"))} className={searchType=='Users' ? "active nav-item nav-link" : "nav-item nav-link"}>Users</a>
					</div>
				    </div>
				</nav>
				
				<DropdownButton variant="btn p-0 groupactions"
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
		    
		    <Card className="mt-4 group-app">
			<Card.Body>
			    {results ?
			     <>
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
							 <td>{group.id ? 
							     <Link to={`${group.id}`}>{group.name ?
										       `${group.name}` :
										       `${group.email}`
										      }</Link>
							      :
							      <a href={`${group.url}`}>{group.name ?
											`${group.name}` :
											`${group.email}`
										       }</a>
							     }
							      </td>
							 <td>{group.user_name}</td>
							 <td>{group.type}</td>
						     </tr>
						 )
					     })}
					 </tbody>
				     </table>
				 </div>
				 
				 <div className="justify-content-center">
				     {itemsCount > 0 &&
				      <StandardPagination
					  itemsCount={itemsCount}
					  itemsPerPage="20"
					  currentPage={currentPage}
					  setCurrentPage={setCurrentPage}
				      />
				     }
				 </div>
			     </>
			     :
			     <p>Loading...</p>
			    }
			</Card.Body>
		    </Card>
		    <AddGroupModal
			showModal = {addGroupModal}
			hideModal = {hideGroupModal}
			addNewGroup = {addNewGroup}
		    />
		</Col>
		<Col lg={4} md={6} className="d-none d-md-block">
		    <Card>
			<Card.Header className="pb-1">
                            <Card.Title>Recent Activity</Card.Title>
			</Card.Header>
			<Card.Body className="p-2">
                            {activityLoading ?
                             <div className="text-center">
				 <div className="lds-spinner"><div></div><div></div><div></div></div>
                             </div>
                             :
			     <div id="scrollableDiv">
				 <InfiniteScroll
                                     dataLength={activity ? activity.length : 0}
                                     next={fetchMoreActivity}
                                     hasMore={activityHasMore}
                                     loader={<div className="text-center"><div className="lds-spinner"><div></div><div></div><div></div></div></div>}
                                     endMessage={<div className="text-center mt-3">No more activity updates</div>}
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
		</Col>
	    </Row>
	</>
    )
}

export default SearchGroupsApp;
