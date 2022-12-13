import React, { useState, useEffect, useMemo } from 'react';
import CaseThreadAPI from './ThreadAPI';
import {Row, Nav, Card, InputGroup, Col, Button, Form} from 'react-bootstrap';
import axios from 'axios';
const caseapi = new CaseThreadAPI();

import ResultsList from './ResultsList.js';

const SearchAll = (search) => {

    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [itemsCount, setItemsCount] = useState(0);
    const [searchVal, setSearchVal] = useState("");
    const [searchType, setSearchType] = useState("All");
    const [results, setResults ] = useState([]);
    let cancelToken;

    const doSearch = async (search) => {

	//Check if there are any previous pending requests
	if (typeof cancelToken != typeof undefined) {
	    cancelToken.cancel("Operation canceled due to new request.")
	}

	cancelToken = axios.CancelToken.source()
	try {
	    const response = await caseapi.searchAll(search, cancelToken);
	    console.log(response.data.data);
	    console.log("Results for " + search + ": " + response.data);
	    setResults(response.data.data);
	    setItemsCount(response.data.count);
	    setIsLoading(false);
	} catch (err) {
	    console.log(err);
	}

    };

    
    useEffect(() => {
	console.log("SEARCH VAL IS ", searchVal);
        let urlstr = `type=${searchType}&page=${page}`;
        if (searchVal) {
            urlstr = `${urlstr}&name=${searchVal}`;
        }
	doSearch(urlstr);

    }, [searchType, searchVal, page]);


    const onFilter = (e) => {
        setSearchVal(e.target.value);
        setIsLoading(true);
    }

    useEffect(() => {
	if (search.search) {
	    setSearchVal(search.search);
	}
    }, [search]);


    return (
        <Row>
            <Col lg={8}>
                <Card>
                    <Card.Header className="pb-0">
                        <div className="d-flex align-items-start justify-content-between mt-2 gap-5">
			    <Nav defaultActiveKey="all">
				<Nav.Item>
                                    <Nav.Link eventKey="all" href="#" onClick={(e)=>(e.preventDefault(), setSearchType("All"))} className="nav-item nav-link">All</Nav.Link>
				</Nav.Item>
				<Nav.Item>
                                    <Nav.Link eventKey="cases"  href="#" onClick={(e)=>(e.preventDefault(), setSearchType("Cases"))} className="nav-item nav-link">Cases</Nav.Link>
				</Nav.Item>
				<Nav.Item>
                                    <Nav.Link eventKey="contacts" href="#" onClick={(e)=>(e.preventDefault(), setSearchType("Contacts"))} className="nav-item nav-link">Contacts</Nav.Link>
				</Nav.Item>
				<Nav.Item>
                                    <Nav.Link eventKey="components" href="#" onClick={(e)=>(e.preventDefault(), setSearchType("Components"))} className="nav-item nav-link">Components</Nav.Link>
                                </Nav.Item>
                            </Nav>
                        </div>
                    </Card.Header>
                    <Card.Body>

			<InputGroup className="w-100">
                            <Form.Control
                                placeholder="Search AdVISE"
                                aria-label="Search AdVISE"
                                aria-describedby="searchadvise"
				value={searchVal}
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
			{ isLoading ?
			  <div className="text-center">Loading...</div>
			  :
			  <ResultsList
			      results = {results}
			      count={itemsCount}
			      page={page}
			      setCurrentPage={setPage}
			      emptymessage="No results"
			  />
			}
		    </Card.Body>
                </Card>
            </Col>
        </Row>
    )
}

export default SearchAll;
