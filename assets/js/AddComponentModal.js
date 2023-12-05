import React from 'react';
import { Modal, Tabs, Alert, Badge, Button, Form, Tab } from "react-bootstrap";
import { useState, useEffect } from 'react';
import ComponentAPI from './ComponentAPI.js'
import ContactAPI from './ContactAPI';
import axios from 'axios';

const componentapi = new ComponentAPI();
const contactapi = new ContactAPI();

const AddComponentModal = ({showModal, hideModal, title, edit, group, clone}) => {

    const [error, setError] = useState(null);
    const [formContent, setFormContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [groupName, setGroupName] = useState("");
    const [activeTab, setActiveTab] = useState("detail");
    const [dependencies, setDependencies] = useState([]);
    const [removeList, setRemoveList] = useState([]);
    const [modalTitle, setModalTitle] = useState("");
    
    // Async Fetch
    const fetchInitialData = async () => {
	if (group) {
	    console.log("IN FETCH!!!");
	    let res = await contactapi.getMyGroup(group).then(response => {
		let data = response.data;
		console.log(data);
		setGroupName(data.name);
	    }).catch(err => {
		console.log(err);
		setError(`Error getting group information: ${err.response.data.message}`);
	    });
	}
        try {
	    if (edit) {
		await componentapi.getEditComponentForm(edit).then((response) => {
		    setFormContent(response);
		})
		
	    } else if (clone) {
		await componentapi.getEditComponentForm(clone).then((response) => {
                    setFormContent(response);
                })
		
	    } else {
		await componentapi.getComponentForm().then((response) => {
                    setFormContent(response);
                    setLoading(false);
		})
	    }
        } catch (err) {
            console.log('Error:', err)
        }
    }

    useEffect(() => {
	if (showModal) {
	    setError(null);
	    setActiveTab("detail");
            fetchInitialData();
	    if (clone) {
		setModalTitle("Clone Component");
	    } else {
		setModalTitle(title);
	    }
	}
    }, [showModal]);

    /*useEffect(() => {
	if (showModal) {
	    fetchInitialData();
	}
    }, [edit]);

    useEffect(() => {
	setError(null);
    }, [hideModal]);
    */
    
    const handleSubmit = async (event) => {
	console.log("IN SUBMIT!!!");
	
	event.preventDefault();
	const formData = new FormData(event.target),
              formDataObj = Object.fromEntries(formData.entries());
	console.log(formDataObj);
	if (clone) {
	    /* add the object being so we can copy dependencies */
	    formDataObj['clone'] = clone
	}
	if (edit) {
	    await componentapi.updateComponent(edit, formDataObj).then((response) => {
		hideModal();
	    }).catch(err => {
		setError(`Error adding component: ${err.response.data.detail}`);
	    });
	} else if (group) {
	    await componentapi.addGroupComponent(group, formDataObj).then((response) => {
		hideModal();
	    }).catch(err => {
		setError(`Error adding component: ${err.response.data.detail}`);
	    });
	} else {
	    await componentapi.addComponent(formDataObj).then((response) => {
		hideModal();
	    }).catch(err => {
		console.log(err);
		if (err.response?.data) {
		    setError(`Error adding component: ${err.response.data.detail}`);
		} else {
		    setError("Unknown error adding component.");
		}
	    });
	}

    }

    const removeDeps = async() => {
	const axiosArray = []
	
	setError(null);
	
	removeList.map(item => {
            let data = {'dependency': item.id, 'remove': 1}
            axiosArray.push(componentapi.addOneDependency(edit, data));
	});

	setLoading(true);
	setDependencies([]);
        let responses = await axios.all(axiosArray).then((response) => {
	    setRemoveList([]);
	    fetchDependencies();
	}).catch(err => {
	    setError(`Error removing dependency: ${err.response.data.detail}`);
	});

    }

    
    const fetchDependencies = async() => {

	let component = edit ? edit : clone;
	
	await componentapi.getDependencies(component).then((response) => {
	    setDependencies(response['dependencies']);
            setLoading(false);
        }).catch (err => {
            setLoading(false);
	    if (err.response?.data?.detail) {
		setError(err.response?.data.detail);
	    } else if (err.response?.status == 404) {
		setError("No dependencies found.");
	    } else {
		setError("Unable to retrieve dependencies");
	    }
            console.log(err);
        });
    }


    const setActiveTabNow = (props) => {
	if (activeTab != props && props == "deps") {
	    fetchDependencies();
	}
        setActiveTab(props);
    }

    const updateRemoveList = (elem) => {
	if (removeList.some(item => elem === item)) {
	    setRemoveList(removeList.filter(item => elem !== item));
	} else {
	    setRemoveList([...removeList, elem]);
	}
    }
    
    return (

	<Modal show={showModal} onHide={hideModal} size="lg" centered backdrop="static">
            <Modal.Header closeButton className="border-bottom">
                <Modal.Title>{modalTitle}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
		{groupName &&
		 <Alert variant="info">Adding component to {groupName}</Alert>
		}

		{error ?
                 <div className="alert alert-danger">{error}</div>
                 : ""}

		{clone &&
		 <div className="alert alert-info">You are cloning a component. Make sure to change <b>version</b> or <b>name</b> before submitting.</div>
		}

		{edit || clone ?
		 <Tabs
                     defaultActiveKey={"detail"}
                     activeKey = {activeTab}
		     id="component-detail-tabs"
                     onSelect={setActiveTabNow}
                 >
                     <Tab eventKey="detail" title="Detail">
			 {formContent ?
			  <form className="checkform" onSubmit={(e)=>handleSubmit(e)}>
			      <div dangerouslySetInnerHTML={{__html: formContent}} />

			      <div className="d-flex justify-content-end gap-2">
				  <Button variant="outline-secondary" type="button" onClick={(e)=> hideModal()}>Cancel</Button>

				  <Button variant="primary" type="submit">
				  Submit</Button>
			      </div>
			  </form>
			  : <p>Loading...</p>
			 }
		     </Tab>
		     <Tab eventKey="deps" title="Dependencies">
			 {loading ?
			  <div className="text-center">
			      <div className="lds-spinner"><div></div><div></div><div></div></div>
			  </div>
			  :
			  <>
			      {dependencies.length == 0 &&
			       <b>This component has 0 dependencies.</b>
			      }
			      <ul className="list-unstyled">
			      {dependencies.map((d, index) => {
				  return(
				      <li key={`dep-${d.id}`}><Button variant="btn-icon" className={removeList.some(elem=>elem==d) ? `warningtext`: `goodtext`} onClick={(e)=>updateRemoveList(d)}><i className="fas fa-minus-square"></i></Button>{d.name}</li>
				  )
			      })}
			      </ul>

			      {removeList.length > 0 &&
			       <Alert variant="danger">Are you sure you want to remove these {removeList.length} dependencies? <Button onClick={(e)=>removeDeps()} variant="danger">Remove Dependencies</Button></Alert>
			      }
				  
			  </>
			 }
		     </Tab>
		 </Tabs>
		 :
		 <>
		     {formContent ?
                      <form onSubmit={(e) => handleSubmit(e)}>
                          <div dangerouslySetInnerHTML={{__html: formContent}} />

                          <div className="d-flex justify-content-end gap-2">
                              <Button variant="outline-secondary" type="button" onClick={(e)=>(hideModal())}>Cancel</Button>

                              <Button variant="primary" type="submit">
                              Submit</Button>
                          </div>
		      </form>
                      : <p>Loading...</p>

                     }
		 </>
		}
	    </Modal.Body>
	</Modal>
    )

};

export default AddComponentModal;
