import React, { useState, useEffect, useMemo } from 'react';
import CaseThreadAPI from './ThreadAPI';
import AdminAPI from './AdminAPI';
import {Row, Button, Card, Col} from 'react-bootstrap';
import Searchbar from './Searchbar.js';
import DisplayLogo from './DisplayLogo';
const caseapi = new CaseThreadAPI();
const adminapi = new AdminAPI();

import CaseList from './CaseList.js';


const TriageList = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [cases, setCases] = useState([]);
    const [filteredCases, setFilteredCases] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsCount, setItemsCount] = useState(0);
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
        if (value === "") {
            setFilteredCases(cases)
	} else {
            const result = cases.filter((item) => {
		if (item.report) {
                    return (
			item.title.toString()
                            .toLowerCase()
                            .indexOf(value.toLowerCase()) > -1
			    ||
			    item.report.report.toString()
			    .toLowerCase().
			    indexOf(value.toLowerCase()) > -1

                    );
		} else {
		    return (
                        item.title.toString()
                            .toLowerCase()
                            .indexOf(value.toLowerCase()) > -1
		    );
		}

            });
            setFilteredCases(result)
        }
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
	    console.log('Error:', err);
	}
    }




    // Async Fetch
    const fetchInitialData = async () => {
        console.log("fetching data");
        try {
            await caseapi.getUnassignedCases().then((response) => {
		console.log(response);
		setItemsCount(response.count);
                setCases(response.results);

            })

        } catch (err) {
            console.log('Error:', err)
        }
    }

    const approveUser = async (user) => {
	console.log("approving user", user);
	try {
	    await adminapi.approvePendingUser(user).then((response) => {
		getPendingUsers();
	    })
	} catch(err) {
	    console.log(err);
	}
    }



    useEffect(() => {

	fetchInitialData();
	getPendingUsers();
    }, []);


    useEffect(() => {
	setFilteredCases(cases);
	setIsLoading(false);
    }, [cases]);

    return (
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
			      cases={filteredCases}
			      count={itemsCount}
			      onSearchBarChange={onSearchbarChange}
			      page={currentPage}
			      setCurrentPage={setCurrentPage}
			      emptymessage="You have no unassigned cases"
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
    )
}

export default TriageList;
