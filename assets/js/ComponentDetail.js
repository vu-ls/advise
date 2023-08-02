import React, { useState, useEffect } from 'react'
import {Row, Card, Col, ListGroup} from 'react-bootstrap';
import {useParams, useNavigate, Link, useLocation} from "react-router-dom"
import ComponentDetailInternal from "./ComponentDetailInternal"
import ComponentAPI from './ComponentAPI';
import ActivityApp from './ActivityApp.js';
import {Alert} from "react-bootstrap";



const ComponentDetail = () => {
    const { id } = useParams();
    const location = useLocation();
    const [component, setComponent] = useState(location.state?.component);
    const [error, setError] = useState(null);
    const [activityError, setActivityError] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchParams, setSearchParms] = useState(location.state?.search);
    const navigate = useNavigate();

    const permDenied = () => {
	navigate('err');
    }

    
    const fetchComponent = async () => {
	
	const componentapi = new ComponentAPI(true, permDenied);    
	await componentapi.getComponent(id).then((response) => {
	    setComponent(response.data);
	    setLoading(false);
        }).catch(err => {
	    setError(err);
	    console.log(err);
        });
	/* this just resets state on update*/
	navigate();

    }

    //Async fetch activity
    const fetchActivity = async () => {
	
	const componentapi = new ComponentAPI(true, permDenied);    

        await componentapi.getComponentActivity(component).then((response) => {
            setActivity(response.results);
            setLoading(false);
        }).catch(err=> {
            setLoading(false);
            setActivityError(err.response.data.detail);
        });
    }

    useEffect(() => {
	console.log(id);
	console.log(location);
	if (!component){
	    fetchComponent();
	}

    }, [])

    useEffect(() => {
	if (component) {
	    setLoading(true);
	    fetchActivity();
	}
    }, [component]);

    return (
	component ?
	 <>
             <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light">Components /</span> <Link to="/advise/components/" state={{search: searchParams}}>Component List</Link> / Component Detail</h4>
	     <Row>
		 <Col lg={9}>
		     <ComponentDetailInternal
			 component={component}
			 loadactivity = {false}
			 updateComponent={fetchComponent}
		     />
		 </Col>
		 <Col lg={3}>
		     <Card>
			 <Card.Header className="mb-0 pb-0">
                             <Card.Title>Recent Activity</Card.Title>
			 </Card.Header>
			 <Card.Body className="p-1">
			     {loading ?
			      <div className="text-center"><div className="lds-spinner"><div></div><div></div><div></div></div></div>
			      :
			      <>
				  {activityError ?
				   <Alert variant="danger">{activityError}</Alert>
				   :
				   <ListGroup variant="flush">
                                       {activity.length == 0 &&
					<ListGroup.Item>No activity</ListGroup.Item>
				       }
				       {activity.map((a, index) => {
					   return (
					       <ListGroup.Item className="p-2 border-bottom" key={`activity-${index}`}>
						   <ActivityApp
						       activity = {a}
						   />
					       </ListGroup.Item>
					   )
				       })}
				   </ListGroup>
				  }
			      </>
			     }
			 </Card.Body>
		     </Card>
		 </Col>
	     </Row>
	 </>
	 :
	 <>
	     {error ?
	      <Alert variant="danger">{error}</Alert>
	      :
	      <div className="text-center">
		  <div className="lds-spinner"><div></div><div></div><div></div></div>
	      </div>
	     }
	 </>
    )

}

export default ComponentDetail;
