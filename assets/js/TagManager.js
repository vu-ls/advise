import React from 'react';
import { Modal, Row, Col, Table, Tabs, Alert, Badge, Button, Form, Tab, Card } from "react-bootstrap";
import { useState, useEffect } from 'react';
import AdminAPI from './AdminAPI';
import DeleteConfirmation from './DeleteConfirmation';

const adminapi = new AdminAPI();

const TagManager = () => {

    const [tags, setTags] = useState([]);
    const [tag, setTag] = useState("");
    const [description, setDescription] = useState("");
    const [invalidTag, setInvalidTag] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [showForm, setShowForm] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [removeId, setRemoveId] = useState(null);

    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
    }
    
    const fetchInitialData = async () => {

        adminapi.getTags().then((response) => {
            console.log(response);
	    if (response.length > 0) {
		setTags(response[0]);
	    } else {
		console.log("JSODFJIOSDJF");
		adminapi.getTagOptions().then((response) => {
		    if (response?.actions?.POST?.category) {
			let categories = {};
			response.actions.POST.category?.choices.map(item => categories[item.display_name] = []);
			/* fake it with the options post */
			setTags({'category': categories});
		    }
		});
	    }

        }).catch(err => {
	    setApiError(err);
	});
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    

    const submitTag = async () => {
	const formData = {'category': showForm}
	
	if (tag == "") {
	    setInvalidTag(true);
	    return;
	}

	formData['tag'] = tag;
	formData['description'] = description;

	adminapi.addTag(formData).then((response) => {
	    fetchInitialData();
	    setSuccessMsg(response['detail'])
	    setInvalidTag(false);
	    setTag("");
	    setDescription("");
	    setShowForm(null);
	}).catch(err => {
	    setApiError("Error adding tag.");
	});
    };

    const removeTag = async () => {

	hideConfirmationModal();
	
	adminapi.removeTag(removeId).then((response) => {
	    setRemoveId(null);
	    fetchInitialData();
	}).catch(err => {
	    setaApiError("Error removing tag.");
	});
    }
    
    return (
	<>
	<Card className="mb-4">
	    <Card.Header>
		<Card.Title>Manage Tags
		</Card.Title>
	    </Card.Header>
            <Card.Body>
		{successMsg &&
		 <Alert variant="success">{successMsg}</Alert>
		}

		<Row xs={1} md={2} className="g-4">
		{tags?.category ?
		 <>
		     {Object.entries(tags.category)
		      .map(([key, value]) => {
			 return (
			     <Col key={`cat-${key}`}>
			     <Card>
				 <Card.Header className="d-flex justify-content-between">
				     <Card.Title>{key}</Card.Title>
				     <Button size="sm" variant="primary" onClick={() => setShowForm(key)}>Add Tag</Button>
				 </Card.Header>
				 {showForm == key &&
				  <Card.Body className="border border-success">
				      <div className="mb-2 mt-2">
				      <Form.Label>Tag</Form.Label>
					  <Form.Control type="text" isInvalid={invalidTag} onChange={(e)=>setTag(e.target.value)} value={tag} />
				      {invalidTag &&
				       <Form.Text className="text-danger">
					   This field is required.
				       </Form.Text>
				      }
					  <Form.Label>Description</Form.Label>

					  <Form.Control type="text" onChange={(e)=>setDescription(e.target.value)} value={description} />
				      </div>
				      <div className="d-flex gap-2 justify-content-end mt-2">
					  <Button variant="btn btn-outline-success" onClick={(e)=>submitTag()}>
                                              <i className="fas fa-check"></i>
					  </Button>
					  <Button variant="secondary" onClick={(e)=>{setTag(""), setDescription(""), setInvalidTag(false), setShowForm(false)}}>
					      <i className="fas fa-times"></i>
					  </Button>
				      </div>
				  </Card.Body>
				 }



				 <Card.Body>
				     <Table>
					 <thead>
					     <tr>
						 <th>Tag</th>
						 <th>Description</th>
						 <th>Created by</th>
						 <th>Remove</th>
					     </tr>
					 </thead>
					 <tbody>

					     {value.map((t, index) => {
						 return (
						     <tr key={`${key}-${index}`}>
							 <td>{t.tag}</td>
							 <td>{t.description}</td>
							 <td>{t.user?.name}</td>
							 <td><Button variant="btn btn-icon" onClick={(e)=>{setRemoveId(t.id), setDisplayConfirmationModal(true)}}><i className="fas fa-trash"></i></Button></td>
						     </tr>
						 )})}
				     </tbody>
				     </Table>
				 </Card.Body>
			     </Card>
			     </Col>
			 )})}
		 </>
		 :
                 <Alert variant="warning">No tag categories defined</Alert>
		}
	    </Row>
		<DeleteConfirmation
                    showModal={displayConfirmationModal}
                    confirmModal={removeTag}
                    hideModal={hideConfirmationModal}
                    id={removeId}
                    message="Are you sure you want to remove this tag?" />   
	    </Card.Body>
	</Card>

	</>
    )

}

export default TagManager;
