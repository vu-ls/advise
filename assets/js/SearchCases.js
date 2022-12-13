import React, { useState, useEffect, useMemo } from 'react';
import CaseThreadAPI from './ThreadAPI';
import {Row, Card, Col} from 'react-bootstrap';
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
    const OWNER_CHOICES = JSON.parse(document.getElementById('owner_option').textContent);
    const STATUS_CHOICES = JSON.parse(document.getElementById('case_status_options').textContent);
    
    // Searchbar functionality
    const onSearchbarChange = (e, field) => {
        const value = e.target.value
	if (field == "search") {
	    setSearchVal(e.target.value);
	}else if (field == "owner") {
	    if (e.target.checked) {
		setSearchOwners(searchOwners => [...searchOwners, value])
	    } else {
		let newowners = searchOwners.filter((item) => item !== value);
		setSearchOwners(newowners);
	    }
	}else if (field == "status") {
	    if (e.target.checked) {
                setSearchStatus(searchStatus => [...searchStatus, value])
	    } else {
                let newowners = searchStatus.filter((item) => item !== value);
		setSearchStatus(newowners);
            }
	}
    }

    useEffect(()=> {
	let urlstr = "";
	if (searchVal) {
	    urlstr = `search=${searchVal}`
	}
	searchOwners.map((item) => urlstr = `${urlstr}&owner=${item}`)
	searchStatus.map((item) => urlstr = `${urlstr}&status=${item}`)

	caseapi.searchCases(urlstr).then((response)=> {
	    setCases(response.results);
	    setItemsCount(response.count);
	    setIsLoading(false);
	});
	
    }, [searchVal, searchOwners, searchStatus])
    
    useEffect(()=> {
	console.log("currentPage in use", currentPage);
	paginationHandler(currentPage);
    }, [currentPage])


    const paginationHandler = (page) => {
	console.log("IN PAGINATION HANDLER");
        caseapi.getCasesByPage(page).then((response) => {
	    console.log(response.results)
	    setCases(response.results);
	    setItemsCount(response.count);
        })
    }

    // Async Fetch
    const fetchInitialData = async () => {
        console.log("fetching data");
        try {
            await caseapi.getCases().then((response) => {
		console.log(response);
		setItemsCount(response.count);
                setCases(response.results);
		setIsLoading(false);

            })
        } catch (err) {
            console.log('Error:', err)
        }
    }

    useEffect(() => {
        fetchInitialData();
    }, []);


    return (
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
			{ isLoading ?
			  <div className="text-center">Loading...</div>
			  :
			  <CaseList
			      cases={cases}
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
        </Row>
    )
}

export default SearchCases;
