import React from 'react';
import { Alert, ListGroup, Modal, Dropdown, Row, Col, Table, Tab, Button, Tabs, Form } from "react-bootstrap";
import { useState, useEffect } from 'react';
import ActivityApp from './ActivityApp.js';
import '../css/casethread.css';
import ComponentAPI from './ComponentAPI';
import DisplayVulStatus from './DisplayVulStatus';

const componentapi = new ComponentAPI();

const ComponentDetailModal = ({showModal, hideModal, id}) => {

    const [loading, setLoading] = useState(true);
    const [cases, setCases] = useState([]);
    const [activeTab, setActiveTab] = useState("detail");
    const [casesError, setCasesError] = useState(null);
    const [activityError, setActivityError] = useState(null);
    const [activity, setActivity] = useState([]);
    const [selectFormat, setSelectFormat] = useState(false);
    const [format, setFormat] = useState("json");
    const [sbomError, setSbomError] = useState(null);

    // Async Fetch
    const fetchCases = async () => {
	await componentapi.getComponentCases(id).then((response) => {
            console.log(response);
	    setCases(response);
            setLoading(false);
        }).catch (err => {
	    setLoading(false);
	    setCasesError(err.response.data.detail);
	    console.log(err);
	});
    }

    useEffect(() => {
	setSbomError(null);
    }, [hideModal]);

    useEffect(() => {
	setActiveTab("detail");
	setCases([]);
	setActivity([]);
    }, [id]);

    //Async fetch activity
    const fetchActivity = async () => {
	await componentapi.getComponentActivity(id).then((response) => {
	    setActivity(response.results);
	    setLoading(false);
	}).catch(err=> {
	    setLoading(false);
	    setActivityError(err.response.data.detail);
	});
    }



    
    const downloadSBOM = async (e) => {
	try {
	    let response = await componentapi.getSPDX(id, e);
	    let data = await response.data;
	    const url = window.URL.createObjectURL(new Blob([data],
							    { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download',
			      response.headers["content-disposition"].split("filename=")[1]);
            document.body.appendChild(link);
            link.click();
	} catch (err) {
	    let statusCode = err.response.status
	    let responseObj = await err.response.data.text();
	    let json = JSON.parse(responseObj);
	    setSbomError(json['error']);

	}
    }


    const setActiveTabNow = (props) => {
	setLoading(true);
        if (props == "cases") {
	    fetchCases();
	} else if (props == "activity") {
	    fetchActivity();
	}
	
	setActiveTab(props);
    }

    if (id) {
	return (
	    <Modal show={showModal} onHide={hideModal} size="lg" centered backdrop="static">
		<Modal.Header closeButton className="border-bottom">
                    <Modal.Title>Component Detail {id.name}</Modal.Title>
		</Modal.Header>
		<Modal.Body id="component-modal">
		    <Tabs
                        defaultActiveKey={"detail"}
			activeKey = {activeTab}
			id="component-detail-tabs"
			onSelect={setActiveTabNow}
                    >
			<Tab eventKey="detail" title="Detail">
			    <div>
				{
			    Object.entries(id)
				.map( ([key, value]) => {
				    if (value) {
				    return (
					<div className="mt-2" key={`${key}-comp}`}><label className="form-label">{key}:</label>
					    { Array.isArray(value) ?
					      <><br/><ul>
						  {value.map((v, index) => {
						      if (typeof v === "object") {
							  return (
							      <li key={`${v.name}-${index}`}>{v.name}</li>
							  )
						      } else {
							  return (
							      <li key={`${v}-${index}`}>{v}</li>
							  )
						      }
						  })
						  }
					      </ul></>
					      :
					      <>
						  {typeof value === "object" ?
						   <span className="m-2"><b>{value.name}</b></span>
						   :
						   <span className="m-2"><b>{value}</b></span>
						  }
					      </>
					    }
					</div>
				    )}})

			}
			    </div>
			</Tab>
			<Tab eventKey="cases" title="Cases">
			    {loading ?
			     <div className="text-center"><div className="lds-spinner"><div></div><div></div><div></div></div></div>
			     :
			     <>{casesError ?
				<Alert variant="danger">{casesError}</Alert>
				:
				 
			     <Table>
                                 <thead>
                                     <tr>
					 <th>
					     Case
					 </th>
                                         <th>
                                             Vul
                                         </th>
                                         <th>
                                             Status
                                         </th>
				     </tr>
				 </thead>
				 <tbody>
				     {cases.length == 0 &&
				      <tr><td colSpan="3" className="text-center"><b>No cases</b></td></tr>
				     }
				     {cases.map((c, index) => {
					 return (
					     <tr key={`case-component-${c.id}`}>
						 <td><a href={`${c.vul.url}`}>{c.vul.case}</a></td>
                                                 <td>{c.vul.vul}</td>
                                                 <td><DisplayVulStatus
                                                         status={c.status}
                                                     />
                                                 </td>
					     </tr>
					 )
				     })
				     }
				 </tbody>
			     </Table>
			       }
			     </>
			    }
			</Tab>
			<Tab eventKey="activity" title="Activity">
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
			</Tab>
			<Tab eventKey="sbom" title="SBOM">
			    {id.version && id.source && id.source !== "NOASSERTION" ?
			    <Dropdown onSelect={(e)=>downloadSBOM(e)}>
				<Dropdown.Toggle className="button-toggle-dropdown">
				    Download
				</Dropdown.Toggle>
				<Dropdown.Menu>
				    <Dropdown.Item eventKey="json">
					JSON
				    </Dropdown.Item>
				    <Dropdown.Item eventKey="xml">XML</Dropdown.Item>
				    <Dropdown.Item eventKey="yaml">YAML</Dropdown.Item>
				    <Dropdown.Item eventKey="rdf">RDF</Dropdown.Item>
				</Dropdown.Menu>
			    </Dropdown>
			     :
			     <Alert variant="info">Component must have version and source (download location) before SBOM can be generated.</Alert>
			    }
			    {sbomError &&
			     <Alert variant="danger">{sbomError}</Alert>
			    }
			    <Table>
				<thead>
				    <tr>
					<td>File</td>
					<td>Date</td>
					<td>Generated by</td>
					<td>Action</td>
				    </tr>
				</thead>
				<tbody>
				</tbody>
			    </Table>
			</Tab>

		    </Tabs>
		</Modal.Body>
	    </Modal>
	)
    }


};

export default ComponentDetailModal;
