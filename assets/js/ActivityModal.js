import React from 'react';
import { Modal, Alert, Badge, FloatingLabel, Button, InputGroup, Form, Row, Col } from "react-bootstrap";
import { useState, useEffect } from 'react';
import ThreadAPI from './ThreadAPI';
import ActivityApp from './ActivityApp';
import DisplayLogo from './DisplayLogo.js';
import InfiniteScroll from 'react-infinite-scroll-component'

const threadapi = new ThreadAPI();

const ActivityModal = (props) => {
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [caseInfo, setCaseInfo] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activityHasMore, setActivityHasMore] = useState(false);
    const [activityNext, setActivityNext] = useState(null);
    const [endMessage, setEndMessage] = useState(null);
    
    const handleSearch = async (event) => {
	if (event) {
	    event.preventDefault();
	}
	setEndMessage(<div className="text-center">No results found</div>);
	setLoading(true);
	await threadapi.searchCaseActivity(props.caseInfo, search).then((response) => {
            setActivity(response.results);
	    
            setActivityNext(response.next_page);
            if (response.next_page) {
                setActivityHasMore(true);
            } else {
		setActivityHasMore(false);
	    }

            setLoading(false);
	}).catch(err => {
	    setError(err.response.data.message);
	});
	
    }

    const fetchMoreActivity = async (page) => {
	setEndMessage(<div className="text-center">No more activity updates</div>);
        try {
            let results = await threadapi.getMyActivity(activityNext, search);
            let data = await results.data;
            setActivity(activity.concat(data.results));
            setActivityNext(data.next_page);
            if (data.next_page) {
                setActivityHasMore(true);
            } else {
                setActivityHasMore(false);
            }
        } catch(err) {
            console.log(err);
            setError("Error fetching more activity");
        }
    }
    

    const fetchInitialData = async () => {
        console.log("get case activity");
        await threadapi.getCaseActivity(props.caseInfo).then((response) => {
            setActivity(response.results);
	    setActivityNext(response.next_page);
            if (response.next_page) {
                setActivityHasMore(true);
            }
	    setLoading(false);

        }).catch(err => {
            setError(err.response.data.message);
        });
    }

    useEffect(() => {
	
	setEndMessage(<div className="text-center">No more activity updates</div>);
	if (props.showModal) {
	    setCaseInfo(props.caseInfo);
	    fetchInitialData();
	}

    }, [props.showModal]);


    const checkKeyPress = (e) => {
	/* handle enter to submit */
	const { key, keyCode } = e;
	if (keyCode === 13) {
	    handleSearch();
	}
    };

    
    return (
        <Modal show={props.showModal} onHide={props.hideModal} size="lg" centered backdrop="static">
            <Modal.Header closeButton className="border-bottom">
		<Modal.Title>Search Case Activity</Modal.Title>
            </Modal.Header>
            <Modal.Body>
		{error &&
		 <Alert variant="danger">{error}</Alert>
		}
		<InputGroup className="w-100">
		    <InputGroup.Text id="basic-addon1"><i className="fas fa-search"></i></InputGroup.Text>
		    <Form.Control
			placeholder="Search for Activity by Keyword or Name"
			aria-label="search"
			aria-describedby="basic-addon1"
			onChange={(e)=>setSearch(e.target.value)}
			onKeyDown={checkKeyPress}
		    />
		    <Button variant="outline-secondary" onClick={(e)=>handleSearch(e)} id="button-addon2">
			Search
		    </Button>

		</InputGroup>
                {loading ?
                 <div className="text-center">
                     <div className="lds-spinner"><div></div><div></div><div></div></div>
                 </div>
                 :
		 <div id="scrollableDiv">
                     <InfiniteScroll
                         dataLength={activity.length}
                         next={fetchMoreActivity}
                         hasMore={activityHasMore}
                         loader={<div className="text-center"><div className="lds-spinner"><div></div><div></div><div></div></div></div>}
                         endMessage={endMessage}
                         scrollableTarget="scrollableDiv"
                     >
			 <ul className="list-unstyled mb-0 mt-4">
			     {activity.map((a, index) => {
				 return (
				     <li className="p-2 border-bottom" key={`activity-${index}`}>
					 <ActivityApp
					     activity = {a}
					 />
				     </li>
				 )
			     })}
			 </ul>
		     </InfiniteScroll>
                 </div>
                }
	    </Modal.Body>
        <Modal.Footer className="border-top">
          <Button variant="secondary" onClick={props.hideModal}>
              Return to Case
          </Button>
        </Modal.Footer>
      </Modal>
    )
}

export default ActivityModal;
