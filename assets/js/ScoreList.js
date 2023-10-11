import React, { useState, useMemo, useEffect } from "react";
import { Alert, Dropdown, Card, Row, Col, DropdownButton, InputGroup, Form, Button } from "react-bootstrap";
import CVEAPI from './CVEAPI';
import AdminAPI from './AdminAPI';
import CVETable from "./CVETable";
import {format} from 'date-fns';
import ScoreCVEModal from './ScoreCVEModal';
import '../css/casethread.css';

const adminapi = new AdminAPI();

const ScoreList = () => {

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [formAlert, setFormAlert] = useState(null);
    const [cveData, setCVEData] = useState([]);
    const [cveAPI, setCVEAPI] = useState(null);
    const [cveResponse, setCVEResponse] = useState(null);
    const [scoreVul, setScoreVul] = useState(null);
    const [viewScoreModal, setViewScoreModal] = useState(false);
    const [searchVal, setSearchVal] = useState("");
    const [searchYear, setSearchYear] = useState("Year");
    const [searchState, setSearchState] = useState("State");
    const [buttonText, setButtonText] = useState("Load More");
    const [score, setScore] = useState([]);
    
    const cveColumns = useMemo(
	() => [
            {
                Header: 'CVE',
                accessor: 'cve',
		minWidth: 200,
            },
            {
                Header: 'Description',
                accessor: 'description',
		maxWidth: 600,
            },
            {
                Header: 'Modified',
                accessor: d => d.last_modified && format(new Date(d.last_modified), 'yyyy-MM-dd HH:mm'),
            },
	    {
		Header: 'Published',
		accessor: d=>d.published && format(new Date(d.published), 'yyyy-MM-dd HH:mm'),
	    },
	    {
		Header: 'Decision',
		accessor: 'ssvcscore.ssvc_decision',
	    },
	    {
		Header: 'Scored Date',
		accessor: d=> { return d.ssvcscore && d.ssvcscore.last_edit ? <span>{format(new Date(d.ssvcscore.last_edit), 'yyyy-MM-dd HH:mm')} by {d.ssvcscore.user} </span> : "" },
	    }

	], []
    );

        // Searchbar functionality
    const onSearchbarChange = (e, field) => {
	if (field == "cve") {
            setSearchVal(e.target.value);
	} else if (field == "state") {
	    setSearchState(e.target.value)
	} else if (field == "year") {
	    setSearchYear(e);
	} else if (field == "score") {
	    let newscore;
            if (e.target.checked) {
                newscore = [...score, e.target.value];
		setScore(newscore);
            } else {
                newscore = score.filter((item) => item !== e.target.value);
                setScore(newscore);
            }
	    if (newscore.length > 0) {
		setSearchState("SCORED")
	    }
	}

    }

    const clearFilters = () => {
	setSearchState("State");
	setSearchVal("");
	setSearchYear("Year");
	setScore([]);
	fetchInitialData();
    }

    const updateSingleVul = async () => {
	console.log("update single vul");
	await adminapi.getVulScore(scoreVul.original.cve).then((response) => {
	    const cves = cveData.slice()
	    cves[scoreVul.index].ssvcscore = response;
	    setCVEData(cves)
	}).catch(err => {
	    console.log(err);
	});
    }

    const hideScoreModal = () => {
        setViewScoreModal(false);
	/* need to unlock this vul */
	if (!scoreVul.original.locked) {
	    adminapi.unlockVul(scoreVul.original.cve).then((response) => {
            }).catch(err => {
		console.log(err);
            })
	}
	updateSingleVul();

	/* update the score */
	/* updateSingleVul(); */
    }

    const fetchNextData = async () => {
	console.log("fetching...");
        await adminapi.getVulsToScore(cveResponse.next).then((response) => {
            console.log(response)
	    setCVEResponse(response);
            setCVEData(cveData.concat(response.results));
        }).catch(err => {
            console.log(err);
            console.log("data doesn't span multiple pages");
        })

    }

    const filterData = async (value) => {
        if (value === "") {
            /* get full data set back */
            fetchInitialData();
        } else {
	    /* do something to filter */
	    await adminapi.queryVuls(value).then((response) => {
		setCVEData(response.results);
		setCVEResponse(response);
	    }).catch(err => {
		console.log(err);
	    });
	}
    }

    useEffect(() => {

	let urlstr = "";

	if (searchVal) {
	    let sv = encodeURIComponent(searchVal);
            urlstr = `search=${sv}`
	}
	if (searchState != "State") {
	    urlstr = urlstr.concat(`&state=${searchState}`);
	}

	if (searchYear != "Year") {
	    urlstr = urlstr.concat(`&year=${searchYear}`);
	}

	console.log(score);
	
	if (score.length > 0) {
	    score.map((item) => urlstr = urlstr.concat(`&score=${item}`));
	}

	console.log(urlstr);
	filterData(urlstr);

    }, [searchVal, searchState, searchYear, score]);



    const fetchData = () => {
        console.log("loading more...");
        if (cveResponse && cveResponse.next) {
            fetchNextData();
        }
        setTimeout(() => {

        }, 1500);

    };


    const fetchInitialData = async () => {

	await adminapi.getVulsToScore().then((response) => {
	    setIsLoading(false);
	    setCVEData(response.results);
	    setCVEResponse(response);
	    console.log(response);
	}).catch(err => {
	    setError(err);
	});

    }

    const clickRow = (row) => {
	console.log(row.index);
	setScoreVul(row);
	setViewScoreModal(true);
    }

    function makeSelect(e) {
        setFormAlert(null);
        console.log(e.target.value);
        let newaccount = accounts.filter((acc) => acc.id == e.target.value);
        if (newaccount.length > 0) {
            setSelectedAccount(newaccount[0]);
        }

    }

    const loadMoreVuls = async () => {
	setButtonText('loading...')
	await adminapi.loadOlderVuls().then((response) => {
	    fetchInitialData();
	    setButtonText('Load More')
	});
    }

    useEffect(() => {
        fetchInitialData();
    }, []);


    return (
        <>
            <Row>
                <Col lg={8}>
                    <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light">Scoring /</span> Vulnerabilities</h4>
                </Col>
		<Col lg={4} className="text-end">
		    <Button variant="primary" onClick={loadMoreVuls}>{buttonText}</Button>
		</Col>
            </Row>
	    {error && <Alert variant="danger">{error}</Alert>}
            <Card>
                <Card.Header>
                    <InputGroup>
                        <Form.Control
                            placeholder="Search CVEs"
                            aria-label="Search CVEs"
                            aria-describedby="searchcves"
			    value={searchVal}
                            onChange={(e)=>onSearchbarChange(e, "cve")}
                        />
                        <DropdownButton
                            variant="outline-primary"
                            title={searchState}
                            id="input-group-dropdown-3"
                        >
			    <Form.Label className="px-3">State</Form.Label>
                            {['SCORED', 'NOT SCORED', 'LOCKED FOR SCORING'].map((o, index) => {
                                return (
                                    <Dropdown.ItemText key={index}>
                                        <Form.Check
                                            onChange={(e)=>onSearchbarChange(e, "state")}
					    type="radio"
                                            label={o}
                                            value={o}
                                            title={o}
					    checked = {searchState === o}
					    name="stateradio"
                                        />
                                    </Dropdown.ItemText>
                                )
                            })}
			    <Form.Label className="px-3 pt-2">Score</Form.Label>
			    {['Act', 'Attend', 'Track*', 'Track'].map((o, index) => {
                                return (
                                    <Dropdown.ItemText key={index}>                                                                                                                                                  <Form.Check
                                            onChange={(e)=>onSearchbarChange(e, "score")}
                                            type="checkbox"
                                            label={o}
                                            value={o}
                                            title={o}
                                        />                                                                                                                                   
                                    </Dropdown.ItemText>
                                )
                            })}  
			    
                        </DropdownButton>
                        <DropdownButton
                            variant="outline-primary"
                            title={searchYear}
                            id="input-group-dropdown-2"

                        >
                            {['2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015'].map((o, index) => {
                                return (
                                    <Dropdown.Item
                                        key={o}
                                        eventKey={o}
                                        value={o}
                                        onClick={(e)=>onSearchbarChange(o, 'year')}>{o}
                                    </Dropdown.Item>
                                )
                            })}
                        </DropdownButton>
			<Button variant="outline-secondary" onClick={clearFilters}>Clear</Button>
                    </InputGroup>
                </Card.Header>
                <Card.Body>
                    {isLoading ?
                     <div className="text-center">
                         <div className="lds-spinner">
                             <div></div>
                             <div></div>
                             <div></div>
                         </div>
                     </div>
                     :
		     <div>
                         <CVETable
                             columns = {cveColumns}
                             data = {cveData}
                             update = {fetchData}
                             hasMore = {cveResponse && cveResponse.next ? true : false}
                             showRowExpansion={null}
                             cveAPI = {cveAPI}
			     onClickFunction = {clickRow}
                         />
			 <ScoreCVEModal
			     showModal = {viewScoreModal}
			     hideModal = {hideScoreModal}
			     vul = {scoreVul ? scoreVul.original : null}
			 />
		     </div>
		    }
		</Card.Body>
            </Card>
        </>
    );
};

export default ScoreList;
