import React, { useState, useEffect } from "react";
import { Row, Col, Alert, ListGroup, Card } from "react-bootstrap";
import CaseThreadAPI from "./ThreadAPI";
import CaseList from "./CaseList.js";
import Searchbar from "./Searchbar.js";
import ActivityApp from "./ActivityApp.js";
import InfiniteScroll from "react-infinite-scroll-component";

import "../css/casethread.css";

const caseapi = new CaseThreadAPI();

const DashboardList = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [activityLoading, setActivityLoading] = useState(true);
    const [cases, setCases] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsCount, setItemsCount] = useState(0);
    const [error, setError] = useState(null);
    const [activity, setActivity] = useState([]);
    const [activityHasMore, setActivityHasMore] = useState(false);
    const [activityNext, setActivityNext] = useState(null);

    // Searchbar functionality›
    const onSearchbarChange = (e) => {
        const value = e.target.value;
        filterData(value);
    };

    useEffect(() => {
        console.log("currentPage in use", currentPage);
        paginationHandler(currentPage);
    }, [currentPage]);

    const paginationHandler = (page) => {
        caseapi
            .getMyCasesByPage(page)
            .then((response) => {
                console.log(response);
                setCases(response.results);
                setItemsCount(response.count);
                setIsLoading(false);
            })
            .catch((err) => {
                //console.log(err.response);
                setError(`Error is ${err.response}`);
                setIsLoading(false);
            });
    };

    const filterData = (value) => {
        setIsLoading(true);
        let urlstr = "";
        if (value) {
            value = encodeURIComponent(value);
            urlstr = `search=${value}`;
        }
        console.log(`IN GEt mY CASES ${value}`);
        caseapi.getMyCases(urlstr).then((response) => {
            setCases(response.results);
            setItemsCount(response.count);
            setIsLoading(false);
        });
    };

    // Async Fetch
    const fetchInitialData = async () => {
        /*try {
      await caseapi.getMyCases().then((response) => {
        console.log(response);
        setItemsCount(response.count);
        setCases(response.results);
        setIsLoading(false);
      });
    } catch (err) {
      console.log("Error:", err);
    }*/

        await caseapi
            .getMyActivity()
            .then((response) => {
                let data = response.data;
                setActivity(data.results);
                console.log(data.results);
                setActivityNext(data.next_page);
                if (data.next_page) {
                    setActivityHasMore(true);
                }
                setActivityLoading(false);
            })
            .catch((err) => {
		console.log(err);
                setError(`Error is ${err.response.data.message}`);
                setActivityLoading(false);
            });
    };

    const fetchMoreActivity = async (page) => {
        try {
            let results = await caseapi.getMyActivity(activityNext);
            let data = await results.data;
            setActivity(activity.concat(data.results));
            setActivityNext(data.next_page);
            if (data.next_page) {
                setActivityHasMore(true);
            } else {
                setActivityHasMore(false);
            }
        } catch (err) {
            console.log(err);
            setError("Error fetching more activity");
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const goToCase = (url) => {
        console.log("GO TO CASE!!!");
        window.location.href = url;
    };

    return (
        <>
            {error && <Alert variant="danger">{error}</Alert>}
            <Row className="card-wrapper">
		<Col lg={8} md={6} sm={12}>
		    <Card>
			<Card.Header>
                            <div className="d-flex align-items-start justify-content-between mt-2 gap-5">
				<Searchbar onChange={onSearchbarChange} />
                            </div>
			</Card.Header>
			<Card.Body>
                            {isLoading ? (
				<div className="text-center">
                                    <div className="lds-spinner">
					<div></div>
					<div></div>
					<div></div>
                                    </div>
				</div>
                            ) : (
				<CaseList
                                    cases={cases}
                                    count={itemsCount}
                                    page={currentPage}
                                    setCurrentPage={setCurrentPage}
                                    emptymessage="You have no active cases"
                                    crumbs={["Dashboard", "My Cases"]}
                                    crumb_link="/advise/dashboard"
				/>
                            )}
			</Card.Body>
                    </Card>
		</Col>
		<Col lg={4} md={6} className="d-none d-md-block"> 
                    <Card>
			<Card.Header className="pb-1">
                            <Card.Title>Recent Activity</Card.Title>
			</Card.Header>
			<Card.Body className="p-2">
                            {activityLoading ? (
				<div className="text-center">
                                <div className="lds-spinner">
                                    <div></div>
                                    <div></div>
                                    <div></div>
                                </div>
                            </div>
                        ) : (
                            <div id="scrollableDiv">
                                <InfiniteScroll
                                    dataLength={activity.length}
                                    next={fetchMoreActivity}
                                    hasMore={activityHasMore}
                                    loader={
                                        <div className="text-center">
                                            <div className="lds-spinner">
                                                <div></div>
                                                <div></div>
                                                <div></div>
                                            </div>
                                        </div>
                                    }
                                    endMessage={
                                        <div className="text-center">
                                            No more activity updates
                                        </div>
                                    }
                                    scrollableTarget="scrollableDiv"
                                >
                                    <ListGroup variant="flush">
                                        {activity.map((a, index) => {
                                            return (
                                                <ListGroup.Item
                                                    action
                                                    onClick={(e) =>
                                                        goToCase(a.url)
                                                    }
                                                    className="p-2 border-bottom"
                                                    key={`activity-${index}`}
                                                >
                                                    <ActivityApp activity={a} />
                                                </ListGroup.Item>
                                            );
                                        })}
                                    </ListGroup>
                                </InfiniteScroll>
                            </div>
                        )}
                    </Card.Body>
                    </Card>
		</Col>
	    </Row>
        </>
    );
};

export default DashboardList;
