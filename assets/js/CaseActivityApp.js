import React, { useState, useEffect } from 'react';
import {Card, Alert} from 'react-bootstrap';
import CaseThreadAPI from './ThreadAPI';
import '../css/casethread.css';
import ActivityApp from './ActivityApp';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css'

const threadapi = new CaseThreadAPI();

const CaseActivityApp = (props) => {


    const [caseInfo, setCaseInfo] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activity, setActivity] = useState([]);


    const fetchInitialData = async () => {
	console.log("get case activity");
	await threadapi.getCaseActivity(props.caseInfo).then((response) => {
            console.log(response);
            setActivity(response.results);
        }).catch(err => {
	    setError(err.response.data.message);
	});
    }
    
    useEffect(() => {
	setCaseInfo(props.caseInfo);
    }, []);

    useEffect(() => {
	setLoading(false);
    }, [activity]);

    useEffect(() => {
	fetchInitialData();
    }, [props.reload]);
    
    return (
        caseInfo ?
            <Card className="mt-2">
                <Card.Header>
                    <Card.Title>Case Activity</Card.Title>
		    { error &&
		      <Alert variant="danger">{error}</Alert>
		    }
		</Card.Header>

		
		<Card.Body>
		    <div>
			<PerfectScrollbar className="participant-list">
			    <ul className="list-unstyled mb-0">
				{loading ?
				 <div className="text-center">                                                              
				     <div className="lds-spinner"><div></div><div></div><div></div></div>                   
				 </div>    
				 :
				 (activity.map((a, index) => {
				 return (
				     <li className="p-2 border-bottom" key={`activity-${index}`}>
					 <ActivityApp
					     activity = {a}
					 />
				     </li>
				 )
				 }))
				}
			    </ul>
			</PerfectScrollbar>
		    </div>
		</Card.Body>
	    </Card>
	:
	""
    )

}
export default CaseActivityApp;
