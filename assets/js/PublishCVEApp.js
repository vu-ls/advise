import React from 'react'
import { useState, useEffect} from 'react';
import { Row, Col, Modal,Tab, Tabs, Alert, Form, Button, Card } from "react-bootstrap";
import '../css/casethread.css'
import EditVulModal from "./EditVulModal";
import CaseThreadAPI from './ThreadAPI';
import PublishVulModal from './PublishVulModal';
import { format } from 'date-fns'
const threadapi = new CaseThreadAPI();

const PublishCVEApp = (props) => {
    const [vuls, setVuls] = useState([]);
    const [showEditVulModal, setShowEditVulModal] = useState(false);
    const [editVul, setEditVul] = useState(null);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [publishVul, setPublishVul] = useState(null);
    
    const hideVulModal = () => {
        setShowEditVulModal(false);
    }

    const hidePublishModal = () => {
	setShowPublishModal(false);
    }
    
    useEffect(() => {

	if (props.vuls) {
	    let cve_vuls = props.vuls.filter((item)=> item.cve);
	    console.log("CVE VULS ", cve_vuls);
	    setVuls(cve_vuls);
	}

    }, [props.vuls]);


    const doneEdit = async () => {
        try {
	    await threadapi.getVul(editVul).then((response) => {
		let newvuls = vuls.map(v => {
		    if (v.id == response.id) {
			return response
		    } else {
			return v
		    }
		});
		setVuls(newvuls);
	    });
	    
	} catch (err) {
	    console.log('Error:', err)
        }
    }
    
    const ShowPublishButton = ({vul}) => {

	let disabled = true;
	if (vul.references && vul.references.length > 0 && vul.affected_products && vul.affected_products.length > 0 && vul.problem_types && vul.problem_types.length > 0 && vul.date_public) {
	    disabled=false;
	}

	return (
	    <Button
		variant="outline-primary"
		onClick={(e)=>(setPublishVul(vul), setShowPublishModal(true))}
		disabled={disabled ? true : false}
	    >
		Publish
	    </Button>
	)
    }


    return (
	<><Alert variant="info">Viewing vulnerabilities with a CVE. A CVE can not be published until all missing fields are filled. <a href="#" onClick={(e)=>props.cancel()}>View all vulnerabilities.</a></Alert>
	    <EditVulModal
                showModal={showEditVulModal}
                hideModal={hideVulModal}
                vul={editVul}
                updateVul={doneEdit}
	    />
	    <PublishVulModal
		showModal={showPublishModal}
		hideModal={hidePublishModal}
		vul={publishVul}
		updateVul={doneEdit}
	    />
		    
	    {vuls.length > 0 ? (
		<Row xs={1} md={2} className="g-4">
		    {vuls.map((item, index) => {
			let date = new Date(item.date_public);
			return (
			    <Col>
				<Card>
				    <Card.Header as="h5" className="border-bottom">{item.vul}</Card.Header>
				    <Card.Body className="pt-3">
					<div>
					    <Form.Label>Description:</Form.Label><br/>
					    {item.description}
					</div>
					{item.references && item.references.length > 0 ?
					 <div>
					    <Form.Label>References:</Form.Label><br/>
					     <ul className="list-unstyled">
						 {item.references.map((t, index) => {
						     return (
							 <li key={index}>{t}</li>
						     )
						 })}
					     </ul>
					 </div>
					 :
					 <div className="border border-danger p-1"><Form.Label>References:</Form.Label><br/>
					     <b>MISSING REFERENCES!</b>
					 </div>
					}

					{item.affected_products && item.affected_products.length > 0 ?
					<div>
					    <Form.Label>Affected Products:</Form.Label><br/>

					     <ul>
						 {item.affected_products.map((t, index) => {
						     return (
							 <li key={index}>{t.product}{" "}{t.version}
							     {t.version_affected &&
							      <>{t.version_affected} {t.end_version_range}</>
							     }
							 </li>
						     )
						 })}
					     </ul>
					</div>

					 :
					 <div className="border border-danger p-1">
					     <Form.Label>Affected Products:</Form.Label><br/>

					     <b>MISSING AFFECTED PRODUCTS!</b>
					 </div>
					}

					{item.date_public ?
					 <div>
					     <Form.Label>Date Public:</Form.Label><br/>
					     
					     <b>{format(date, 'yyyy-MM-dd')}</b>
					 </div>
					 :
					 <div className="border border-danger p-1">
					     <Form.Label>Date Public:</Form.Label><br/>
					     <b>MISSING DATE PUBLIC!</b>
					 </div>
					}

					{item.problem_types && item.problem_types.length > 0 ?
					<div>
					    <Form.Label>Problem Types:</Form.Label><br/>

					     <ul className="list-unstyled">
						 {item.problem_types.map((t, index) => {
						     return (
							 <li key={index}>{t}</li>
						     )
						 })}
					     </ul>
					</div>

					 :
					 <div className="border border-danger p-1">
					     <Form.Label>Problem Types:</Form.Label><br/>
					     <b>MISSING PROBLEM TYPES!</b>

					 </div>
					}
				    </Card.Body>
				    <Card.Footer>
					<div className="d-flex justify-content-between">
					    <Button variant="outline-primary" onClick={(e)=>(setEditVul(item), setShowEditVulModal(true))}>
						Edit Details
					    </Button>
					    <ShowPublishButton
						vul={item}
					    />
					</div>
				    </Card.Footer>
				</Card>
			    </Col>
			)
		})}
		</Row>
	    ) :
	     <p>No vuls here</p>
	    }
	</>
    )

}

export default PublishCVEApp;
