import React, { useState, useEffect } from 'react'
import {Card, Alert, Row, Col, Badge, Button} from 'react-bootstrap';
import { format, formatDistance } from 'date-fns'
import FormAPI from './FormAPI';
import DisplayStatus from './DisplayStatus';

const formapi = new FormAPI();


const MyReportsApp = (props) => {

    const [reports, setReports] = useState([]);
    const [error, setError] = useState(null);

    const fetchInitialData = async () => {
        await formapi.getSubmissions().then((response) => {
	    let data = response.data;
            setReports(data);
        })
	    .catch (err => {
		setError(`Error loading reports: ${err.message}`);
		console.log('Error:', err)
	    })
	
    }
    
    useEffect(() => {
        fetchInitialData();
    }, [])

    
    return (
	error ?
	    <Alert variant="danger">{error}</Alert>
	:
	<>
	{reports && reports.length > 0 ?
	 <Row xs={1} md={2} className="g-4">
	     {reports.map((item, idx) => {
		 let date = new Date(item.received);
		 let today = new Date();
		 let timeago = formatDistance(date, today, {addSuffix: true});
		 var diffMins = Math.floor(((Math.abs(today-date)/1000)/60));
		 
		 let newreport = (diffMins < 10) ? "unseen" : "";
		 return (
		 <Col key={`report-${idx}`}>
		     <Card className={newreport}>
			 <Card.Header className='d-flex align-items-center justify-content-between pb-0'>
			     <h4>{item.case_url ?
				  <a href={`${item.case_url}`}>
				     {item.title}</a>
				   :
				   <>{item.title}</>
				  }
				   </h4>
			     <DisplayStatus
				     status={item.status}
			     />
			 </Card.Header>
			 
			 <Card.Body className='mb-0 pb-0'>
			 <div className="fs-6 text-uppercase">received {format(date, 'yyyy-MM-dd H:mm:ss ')} ({timeago})</div>
			 </Card.Body>
			 <hr/>
			 <Card.Body>
			     {item.report.map((q, index) => (
				 <>
				     <div className="fs-6 text-uppercase"><b>Q{index+1}</b>: {q.question}</div>
				     <div><b>Q{index+1} Response:</b>{"  "}
					 {Array.isArray(q.answer) ?
					  <>
					      {q.answer.join(" ")}
					  </>

					  :
					  <>
					      {q.answer}
					  </>
					 }
				     </div>
				 </>
			     ))}
			 </Card.Body>
		     </Card>
		 </Col>
		 )})
	     }
	 </Row>
	 :
	 <Row>
	     <Col lg={8}>
	 <Card>
	     <Card.Header className="d-flex justify-content-between">
		 <Card.Title>
		     No vulnerability reports available.
		 </Card.Title>
		 <Button variant="primary" href="/advise/report/">Submit a Report</Button>
	     </Card.Header>
	 </Card>
	     </Col>
	 </Row>
	     
	}
	</>
    )

}

export default MyReportsApp;
