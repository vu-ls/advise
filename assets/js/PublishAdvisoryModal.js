import React from 'react'
import { useState, useEffect} from 'react';
import { Alert, Modal, Button, Form } from "react-bootstrap";
import CaseThreadAPI from './ThreadAPI';

const threadapi = new CaseThreadAPI();

const PublishAdvisoryModal = ({ showModal, hideModal, caseInfo, publish }) => {

    const [advisory, setAdvisory] = useState(null);
    const [error, setError] = useState(null);
    const [checkedOptions, setCheckedOptions] = useState([]);
    const [log, setLog] = useState("");
    
    const fetchInitialData = async () => {
	
	await threadapi.getCurrentAdvisory({'case':caseInfo.case_id }).then((response) => {
            setAdvisory(response);
	}).catch(err => {
            console.log(err);
            if (err.response.status == 403) {
		setError({'variant': 'danger', 'msg': 'Permission Denied'});
            } else if (err.response.status == 404) {
		setError({'varaint': 'info', 'msg': 'Advisory does not exist'});
            }
        });

    }

    const submitForm = async () => {
	const data = {}
	if (log) {
	    data['log'] = log
	}
	threadapi.publishAdvisory(caseInfo.case_id, data).then(response => {
	    publish();
        }).catch(err => {
            console.log(err);
            setError({'variant': 'danger', 'msg': `Error sharing advisory: ${err.message} ${err.response?.data.detail}`});
        });
    }
    
    const handleSelect = (e) => {
    // Destructuring                                                                                              
        const { value, checked } = e.target;

        console.log(`${value} is ${checked}`);

        // Case 1 : The user checks the box                                                                       
        if (checked) {
            setCheckedOptions(checkedOptions => [...checkedOptions, value]);
	}
        // Case 2  : The user unchecks the box                                                                    
        else {
            setCheckedOptions((checked) => checked.filter((select) => select != value))
        }

	
    };
    
    useEffect(() => {
	if (showModal) {
	    fetchInitialData();
	}

    }, [showModal])

     return (
        <Modal show={showModal} onHide={hideModal}>                                                               
        <Modal.Header closeButton>                                                                                
          <Modal.Title>Publish Advisory</Modal.Title>                                                                  
        </Modal.Header>                                                                                           
            <Modal.Body>
		{error &&
		 <Alert variant={error.variant}>{error.msg}</Alert>
		}
		{advisory &&
		 <>
		     <Form.Group className="mb-3">                             
			 <Form.Label className="mt-3">How would you like to publish this advisory?<span className="required">*</span></Form.Label>
			 <Form.Check
                             label="Download"
                             name="publishoptions"
                             type="checkbox"
                             value="download"
                             key="publishoptions-download"
			     checked = {checkedOptions.includes("download") ? true: false}
                             onChange={handleSelect}
			 />
		     </Form.Group>
		     <Form.Group className="mb-3" controlId="Log">                                      
                         <Form.Label>Revision History Message</Form.Label>
			 <Form.Text><b>What changed from last revision? If empty, advisory log message will be used.</b></Form.Text>
                         <Form.Control name="log" value={log} onChange={(e)=>setLog(e.target.value)}/>  
                     </Form.Group>
		 </>
		}
	    </Modal.Body>                                                                                         
            <Modal.Footer>                                                                                            
		<Button variant="secondary" onClick={hideModal}>                                                        
		    Cancel                                                                                                
		</Button>                                                                                               
		{checkedOptions.length > 0 &&
		 <Button variant="primary" onClick={() => submitForm() }>                                             
                     Submit                                                                                           
		 </Button>                                                                                            
		}                                                                                                     
            </Modal.Footer>                                                                                           
	</Modal>
    )
}

export default PublishAdvisoryModal;
