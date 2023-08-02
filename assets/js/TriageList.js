import React, { useState, useEffect, useMemo } from 'react';
import CaseThreadAPI from './ThreadAPI';
import AdminAPI from './AdminAPI';
import {Row, Alert, Button, Card, Col} from 'react-bootstrap';
import Searchbar from './Searchbar.js';
import DisplayLogo from './DisplayLogo';
const caseapi = new CaseThreadAPI();
const adminapi = new AdminAPI();

import CaseList from './CaseList.js';


const TriageList = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [cases, setCases] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsCount, setItemsCount] = useState(0);
    const [error, setError] = useState(null);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [newUsers, setNewUsers] = useState([]);
    const [approvedUsers, setApprovedUsers] = useState([]);

    // Searchbar functionality
    const onSearchbarChange = e => {
        const value = e.target.value
        filterData(value);
    }


    useEffect(()=> {
	console.log("currentPage in use", currentPage);
	paginationHandler(currentPage);
    }, [currentPage])


    const paginationHandler = (page) => {
	console.log("IN PAGINATION HANDLER");
        caseapi.getUnassignedCasesByPage(page).then((response) => {
	    setCases(response.results);
	    setItemsCount(response.count);
        })
    }


    const filterData = (value) => {
        let urlstr = "";
        if (value) {
	    value = encodeURIComponent(value);
            urlstr = `search=${value}`
        }

	caseapi.getUnassignedCases(urlstr).then((response) => {
	    setCases(response.results);
	    setItemsCount(response.count);
	});
    }

    const getPendingUsers = async () => {
	try {
	    await adminapi.getPendingUsers().then((response) => {
		setPendingUsers(response)
	    });
	    await adminapi.getNewUsers().then((response) => {
		setNewUsers(response)
	    });

	} catch (err) {
	    setError(err.response.data.message);
	    console.log('Error:', err);
	}
    }




    // Async Fetch
    const fetchInitialData = async () => {
        console.log("fetching data");
        await caseapi.getUnassignedCases().then((response) => {
	    setItemsCount(response.count);
            setCases(response.results);
	    setIsLoading(false);
	    
        }).catch(err => {
	    console.log('Error:', err);
	    setError(err.response.data.message);
	});
	    
    }

    const approveUser = async (user) => {
	console.log("approving user", user);
	await adminapi.approvePendingUser(user).then((response) => {
	    getPendingUsers();
	}).catch(err => {
	    console.log(err);
	    setError(err.repsonse.data.message);
	});
    }



    useEffect(() => {

	fetchInitialData();
	getPendingUsers();
    }, []);


    return (
	<>
	    <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light">Triage /</span> Unassigned Cases</h4>
	    {error &&
	     <Alert variant="danger"> {error}</Alert>
	    }
            <Row>
            <Col lg={8}>
                <Card>
                    <Card.Header>
                        <div className="d-flex align-items-start justify-content-between mt-2 gap-5">
                            <Searchbar onChange={onSearchbarChange} />
                        </div>
                    </Card.Header>
                    <Card.Body>
			{ isLoading ?
                          <div className="text-center">
                              <div className="lds-spinner"><div></div><div></div><div></div></div>
                          </div>
			  :
			  <CaseList
			      cases={cases}
			      count={itemsCount}
			      onSearchBarChange={onSearchbarChange}
			      page={currentPage}
			      setCurrentPage={setCurrentPage}
			      emptymessage="You have no unassigned cases"
			      crumbs={["Triage", "Unassigned Cases"]}
			      crumb_link="/advise/triage/"
			  />
			}
		    </Card.Body>
                </Card>
            </Col>
	    <Col lg={4}>
		<Card>
		    <Card.Header>
			<Card.Title>Pending Users</Card.Title>
		    </Card.Header>
		    <Card.Body className="border-bottom">
			{pendingUsers.length > 0 ?
			 <>
			     {pendingUsers.map((user) => {
				 return (
				     <div className="d-flex justify-content-between mt-2 mb-2" key={`user-${user.id}`}>

					 <a href={`/advise/contact/${user.contact}/`}>
					 <div className="d-flex align-items-center gap-2">
    					     <DisplayLogo
						 name={user.name}
						 color={user.logocolor}
						 photo={user.photo}
					     />
					     <span className="participant">
						 {user.name}
					     </span>
					 </div>
					 </a>
					 <Button variant="outline-primary" onClick={(e)=>approveUser(user)}>
					     Approve
					 </Button>
				     </div>
				 )
			     })}
			 </>
			 :
			 <b>No Pending Users</b>
			}
		    </Card.Body>
		    <Card.Header>
                        <Card.Title>New Users</Card.Title>
                    </Card.Header>
                    <Card.Body>
			{newUsers.length > 0 ?
                         <>
                             {newUsers.map((user) => {
                                 return (
				     <a href={`/advise/contact/${user.contact}/`}>
					 <div className="d-flex align-items-center gap-2 mb-3">
                                             <DisplayLogo
						 name={user.name}
						 color={user.logocolor}
						 photo={user.photo}
                                             />
                                             <span className="participant">
						 {user.name ?
						  <>{user.name}</>
						  :
						  <>{user.email}</>
						 }
                                             </span>
					 </div>
				     </a>
                                 )
                             })}
                         </>
                         :
                         <b>No New Users</b>
                        }
		    </Card.Body>
		</Card>
	    </Col>

            </Row>
	</>
    )
}

export default TriageList;
