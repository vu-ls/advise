import React, { useState, useEffect, useMemo } from 'react';
import CaseThreadAPI from './ThreadAPI';
import {Row, Alert, Card, Col, Button} from 'react-bootstrap';
import SearchFilter from './SearchFilter.js';

const caseapi = new CaseThreadAPI();
import CaseList from './CaseList.js';


const SearchCases = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [cases, setCases] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsCount, setItemsCount] = useState(0);
    const [searchVal, setSearchVal] = useState("");
    const [searchOwners, setSearchOwners] = useState([]);
    const [searchStatus, setSearchStatus] = useState([]);
    const [error, setError] = useState(null);
    const OWNER_CHOICES = JSON.parse(document.getElementById('owner_option').textContent);
    const STATUS_CHOICES = JSON.parse(document.getElementById('case_status_options').textContent);

    const searchCaseFn = async(val, owners, status) => {

	setIsLoading(true);
	let urlstr = "";
	if (val) {
	    let sv = encodeURIComponent(val);
	    urlstr = `search=${sv}`
	}
	owners.map((item) => urlstr = `${urlstr}&owner=${item}`)
	status.map((item) => urlstr = `${urlstr}&status=${item}`)

	caseapi.searchCases(urlstr).then((response)=> {
	    setCases(response.results);
	    setItemsCount(response.count);
	    setIsLoading(false);
	}).catch(err => {
	    console.log(err);
            setError(`Error fetching new cases: ${err.response}`);
            setIsLoading(false);
	});
    }
    
    // Searchbar functionality
    const onSearchbarChange = (e, field) => {
        const value = e.target.value
	if (field == "search") {
	    setSearchVal(e.target.value);
	    searchCaseFn(e.target.value, searchOwners, searchStatus);
	}else if (field == "owner") {
	    let newowners;
	    if (e.target.checked) {
		newowners = [...searchOwners, value];
		setSearchOwners(newowners);
		    //setSearchOwners(searchOwners => [...searchOwners, value])
	    } else {
		newowners = searchOwners.filter((item) => item !== value);
		setSearchOwners(newowners);
	    }
	    searchCaseFn(searchVal, newowners, searchStatus);
	}else if (field == "status") {
	    let newstatus;
	    if (e.target.checked) {
                //setSearchStatus(searchStatus => [...searchStatus, value])
		newstatus = [...searchStatus, value];
		setSearchStatus(newstatus);
	    } else {
                newstatus = searchStatus.filter((item) => item !== value);
		setSearchStatus(newowners);
            }
	    searchCaseFn(searchVal, searchOwners, newstatus);
	}
    }

    useEffect(()=> {
	paginationHandler(currentPage);
    }, [currentPage])


    const paginationHandler = async (page) => {
	console.log("IN PAGINATION HANDLER");
        await caseapi.getCasesByPage(page).then((response) => {
	    console.log(response.results)
	    setCases(response.results);
	    setItemsCount(response.count);
	    setIsLoading(false);
        }).catch(err => {
	    console.log(err);
	    setError(`Error fetching new cases: ${err.response}`);
	    setIsLoading(false);
	});
    }

    return (
	<>
	    <Row>
		<Col lg={9}>
		    <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light">Cases /</span> Search</h4>
		</Col>
		<Col lg={3} className="text-end">
		    {OWNER_CHOICES.length > 0 &&
		     <Button variant="primary" href="/advise/case/new/"><i className="fas fa-plus"></i>{" "}New Case</Button>
		    }
		</Col>
	    </Row>
	    
	<Row>
            <Col lg={8}>
                <Card>
                    <Card.Header>
                        <div className="d-flex align-items-start justify-content-between mt-2 gap-5">
                            <SearchFilter
				onChange={onSearchbarChange}
				value=""
				owner={OWNER_CHOICES}
				status={STATUS_CHOICES}
			    />
                        </div>
                    </Card.Header>
                    <Card.Body>
			{error &&
			 <Alert variant="danger">{error}</Alert>
			}
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
			      emptymessage="You have no cases"
			      crumbs = {["Cases", "Search"]}
			      crumb_link="/advise/cases/"
			  />
			}
		    </Card.Body>
                </Card>
            </Col>
        </Row>
	</>
    )
}

export default SearchCases;
