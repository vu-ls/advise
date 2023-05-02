import React, { useState, useEffect, useMemo } from 'react';
import {Row, ListGroup, Card, Col} from 'react-bootstrap';
import CaseThreadAPI from './ThreadAPI';
import CaseList from './CaseList.js';
import Searchbar from './Searchbar.js';
import ActivityApp from './ActivityApp.js';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css'
import '../css/casethread.css';

const caseapi = new CaseThreadAPI();


const DashboardList = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [activityLoading, setActivityLoading] = useState(true);
    const [cases, setCases] = useState([]);
    const [filteredCases, setFilteredCases] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsCount, setItemsCount] = useState(0);
    const [error, setError] = useState(null);
    const [activity, setActivity] = useState([]);

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
        caseapi.getMyCasesByPage(page).then((response) => {
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

    // Async Fetch
    const fetchInitialData = async () => {
        console.log("fetching data");
        try {
            await caseapi.getMyCases().then((response) => {
		console.log(response);
		setItemsCount(response.count);
                setCases(response.results);

            })
        } catch (err) {
            console.log('Error:', err)
        }

	try {
	    let results = await caseapi.getMyActivity();
	    let data = await results.data;
	    console.log(data);
	    setActivity(data.results);
	    setActivityLoading(false);
	} catch(err) {
	    setError(err.response.data.message);
	}
    }

    useEffect(() => {
	console.log("activity done");
	
    }, [activity]);

    useEffect(()=> {
	console.log("activity loading changing");
    }, [activityLoading]);
    
    useEffect(() => {
        fetchInitialData();
    }, []);

    const goToCase = (url) => {
	window.location.href=url;
    };


    useEffect(() => {
	setIsLoading(false);
	console.log(filteredCases);
    }, [filteredCases]);

    useEffect(() => {
	setFilteredCases(cases);
    }, [cases]);

    return (
	<>
	    {error &&
	     <Alert variant="danger">{error}</Alert>
	    }
            <div className="card-wrapper d-flex gap-4">
                <Card className="dashboard-card-1">
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
			      page={currentPage}
			      setCurrentPage={setCurrentPage}
			      emptymessage="You have no active cases"
			  />
			}
		    </Card.Body>
                </Card>
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
			 <PerfectScrollbar className="dashboard-activity-scroll">
			     <ListGroup variant="flush">
                                 {activity.map((a, index) => {
                                     return (
					 <ListGroup.Item action onClick={(e)=>goToCase(a.url)} className="p-2 border-bottom" key={`activity-${index}`}>
                                             <ActivityApp
						 activity = {a}
                                             />
					 </ListGroup.Item>
                                     )
                                 })}
                            </ListGroup>
                         </PerfectScrollbar>
			}
		    </Card.Body>

		</Card>
            </div>
	</>
    )
}


export default DashboardList;
