import React, { useState, useEffect, useMemo } from 'react';
import {Row, Table, Alert, Card, Col, ListGroup, Button, Form, Dropdown, Tab, Nav, InputGroup, DropdownButton} from 'react-bootstrap';
import ContactAPI from './ContactAPI';
import CaseList from './CaseList.js'
import '../css/casethread.css';
import ActivityApp from './ActivityApp.js';
import InfiniteScroll from 'react-infinite-scroll-component'

const contactapi = new ContactAPI();

const ContactApp = (props) => {

    const [error, setError] = useState();
    const [loading, setLoading] = useState(true);
    const [cases, setCases] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsCount, setItemsCount] = useState(0);
    const [activity, setActivity] = useState([]);
    const [activityHasMore, setActivityHasMore] = useState(false);
    const [activityNext, setActivityNext] = useState(null);


    const fetchCases = async() => {
        try {
            await contactapi.getContactCases(props.contact).then((response) => {
                setCases(response.results);
                setItemsCount(response.count);
                setLoading(false);
            })

	    await contactapi.getContactCaseActivity(props.contact).then((response) => {
                setActivity(response.results);
		if (response.next) {
		    setActivityHasMore(true);
		    setActivityNext(response.next);
		} else {
		    setActivityHasMore(false);
		}
            })
        } catch(err) {
            console.log('Error: ', err);
            setError(err.response.data.message);
        }
    }


    const fetchMoreActivity = async (page) => {
        try {
            await contactapi.getContactCaseActivity(props.contact, activityNext).then((response) => {
		setActivity(activity.concat(response.results));
		setActivityNext(response.next);
		if (response.next) {
                    setActivityHasMore(true);
		} else {
                    setActivityHasMore(false);
		}
	    })
        } catch(err) {
            console.log(err);
            setError("Error fetching more activity");
        }
    }

    const goToCase = (url) => {
        window.location.href=url;
    };
    
    useEffect(() => {
	fetchCases();
    }, [])


    return (
	<Row>
	    <Col lg={8}>
		<Card>
		    <Card.Header>
			<Card.Title>Cases</Card.Title>
		    </Card.Header>
		    <Card.Body>
			{loading ?
			 <div className="text-center">
			     <div className="lds-spinner"><div></div><div></div><div></div></div>
			 </div>
			 :
			 <CaseList
			     cases={cases}
			     count={itemsCount}
			     page = {currentPage}
			     setCurrentPage={setCurrentPage}
			     emptymessage="This group is not participating in any cases."
			 />
			}
		    </Card.Body>
		</Card>
	    </Col>
	    <Col lg={4}>
		<Card>
		    <Card.Header>
			<Card.Title>Activity</Card.Title>
		    </Card.Header>
		    <Card.Body>
			<div id="scrollableDiv">
                            <InfiniteScroll
                                dataLength={activity.length}
                                next={fetchMoreActivity}
                                hasMore={activityHasMore}
                                loader={<div className="text-center"><div className="lds-spinner"><div></div><div></div><div></div></div></div>}
                                endMessage={<div className="text-center">No more activity updates</div>}
                                scrollableTarget="scrollableDiv"
                            >
				
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
                            </InfiniteScroll>
                        </div>
		    </Card.Body>
		</Card>
	    </Col>
	</Row>


    )
}

export default ContactApp;
