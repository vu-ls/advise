import React, { useState, useEffect, useMemo } from 'react';
import {Row, Card, Col} from 'react-bootstrap';
import CaseThreadAPI from './ThreadAPI';
import CaseList from './CaseList.js';
import Searchbar from './Searchbar.js';

const caseapi = new CaseThreadAPI();


const DashboardList = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [cases, setCases] = useState([]);
    const [filteredCases, setFilteredCases] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsCount, setItemsCount] = useState(0);
    
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
    }

    useEffect(() => {
        fetchInitialData();
    }, []);


    useEffect(() => {
	setIsLoading(false);
	console.log(filteredCases);
    }, [filteredCases]);
    
    useEffect(() => {
	setFilteredCases(cases);
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
			  <div className="text-center">Loading...</div>
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
            </Col>                                                                                
        </Row>
    )
}


export default DashboardList;
