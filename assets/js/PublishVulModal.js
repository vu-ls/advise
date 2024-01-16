import React from 'react';
import { Alert, Tab, Nav, Modal, Badge, FloatingLabel, Button, InputGroup, Form, Row, Col } from "react-bootstrap";
import {Typeahead} from 'react-bootstrap-typeahead';
import { useState, useEffect } from 'react';
import CVEAPI from './CVEAPI';
import AdminAPI from './AdminAPI';
import '../css/casethread.css';
import PublishCVEApp from './PublishCVEApp';

const adminapi = new AdminAPI();
const cveapi = new CVEAPI();

const PublishVulModal = (props) => {

    const [activeTab, setActiveTab] = useState("publish");
    const [error, setError] = useState("");
    const [notCNA, setNotCNA] = useState(false);
    const [publishWarning, setPublishWarning] = useState(null);
    const [cvePublishError, setCvePublishError] = useState(null);
    const [vulJSON, setVulJSON] = useState("");
    const [vul, setVul] = useState("")
    const [cveAccount, setCveAccount] = useState("");
    const [accounts, setAccounts] = useState([]);
    const [btnDisabled, setBtnDisabled] = useState(true);
    const [successMsg, setSuccessMsg] = useState(null);
    const [adpRole, setAdpRole] = useState(false);
    const [adpContainer, setAdpContainer] = useState(null);
    const [adpError, setAdpError] = useState(null);
    const [orgAdp, setOrgAdp] = useState(null);
    const [ssvcExists, setSSVCExists] = useState(false);
    const [question, setQuestion] = useState(true);
    const [previouslyPublished, setPreviouslyPublished] = useState(null);
    const [infoMissing, setInfoMissing] = useState(false);
    
    useEffect(() => {
	if (activeTab == "publish" && (notCNA || infoMissing)) {
	    setBtnDisabled(true);
	} else if (activeTab == "adp") {
	    setBtnDisabled(true);
	} else {
	    setBtnDisabled(false);
	}
    }, [activeTab, notCNA, infoMissing]);


    useEffect(() => {
	/* check for SSVC info */
	if (adpContainer) {
	    try {
		for (let i=0; i < adpContainer.length; i++) {
		    let adp = adpContainer[i];
		    if (adp.providerMetadata.shortName == cveAccount.org_name) {
			/* this is our adp container */
			setOrgAdp(adp);
			if ("metrics" in adp) {
			    for (let k=0; k < adp.metrics.length; k++) {
				if ("other" in adp.metrics[k]) {
				    if (adp.metrics[k].other.type == "ssvc") {
				    setSSVCExists(true);
					break;
				    }
				}
			    }
			}
			break;
		    } else {
			continue;
		    }
		}
	    } catch (err) {
		console.log(err);
	    }
	}
    }, [adpContainer]);


    useEffect(() => {

	if (cveAccount) {
	    /* check for ADP Role */
	    let api = new CVEAPI(cveAccount.org_name, cveAccount.email, cveAccount.api_key, cveAccount.server);
	    const fetchCVERole = async () => {
		await api.getORG().then((response) => {
		    let data = response.data;
		    if (data.authority && data.authority.active_roles.includes('ADP')) {
			setAdpRole(true);
		    }
		});
	    };

	    fetchCVERole();
	}
    }, [cveAccount]);



    const fetchADPContainer = async () => {
	let cveAPI = new CVEAPI(cveAccount.org_name, cveAccount.email, cveAccount.api_key, cveAccount.server);
	
        await cveAPI.getCVE(vul.vul).then((response) => {
	    console.log(response);
	    try {
		if (response.cveMetadata.assignerShortName != cveAccount.org_name) {
		    setPublishWarning("You are not the CNA for this CVE and cannot publish CVE data.")
		    setNotCNA(true);
		    setVulJSON(response)
		    setBtnDisabled(true);
		} else {
		    setPublishWarning(`This CVE was first published on ${response.cveMetadata.datePublished} and last updated on ${response.cveMetadata.dateUpdated}. Confirm changes before hitting publish.`);
		    setPreviouslyPublished(response);
		}
		if (response.containers.adp){
		    setAdpContainer(response.containers.adp);
		}
	    } catch (err) {
		console.log(err);
		console.log("no cve, no adp");
	    }
	}).catch(err => {
	    if (err.response && err.response.status == 404) {
		setAdpError("CVE ADP container does not exist.  Did you publish it yet?");
	    } else {
		setAdpError(err.message);
	    }
	    console.log(err);
	});
    }
    
    const updateSSVC = (e) => {
	let cveAPI = new CVEAPI(cveAccount.org_name, cveAccount.email, cveAccount.api_key, cveAccount.server);

	let new_array = {};
	vul.ssvc_decision_tree.forEach(item => {
	    new_array[item.label] = item.value
	})
	console.log(new_array);

	let new_content = {
	    "timestamp": new_array['date_scored'],
	    "id": vul.vul,
	    "options": [
		{
		    "Exploitation": new_array['Exploitation']
		},
		{
		    "Automatable": new_array["Automatable"]
		},
		{
		    "Technical Impact": new_array["Technical Impact"]
		}
	    ],
	    "role": "TEST ROLE",
	    "version": "2.0.3",
	    "generator": "AdVISE"
	}
	console.log(new_content);
	setQuestion(false);

	if (orgAdp && ssvcExists) {
	    /* we need to update the ssvc */
	    let adpUpdate = orgAdp;
            for (let k=0; k < adpUpdate.metrics.length; k++) {
                if ("other" in adpUpdate.metrics[k]) {
                    if (adpUpdate.metrics[k].other.type == "ssvc") {
			adpUpdate.metrics[k].other.content = new_content;
                    }
                }
            }
	    setBtnDisabled(false);
	    adpUpdate = {"adpContainer": adpUpdate}
	    setAdpContainer(adpUpdate);

	} else if (orgAdp) {
	    /* we need to add the ssvc container */
	    let adpUpdate = orgAdp;
	    if ("metrics" in adpUpdate) {
		adpUpdate.metrics.push({"other": {"type": "ssvc", "content": new_content}})
	    } else {
		adpUpdate['metrics'] = [{"other": {"type": "ssvc", "content": new_content}}]
	    }
	    adpUpdate = {"adpContainer": adpUpdate}
	    setAdpContainer(adpUpdate);
	    setBtnDisabled(false);
	} else {
	    /* we need to add the entire adp container */
	    let adp = {"adpContainer": {"metrics": [{"other": {"type": "ssvc", "content": new_content}}]}}
	    setAdpContainer(adp);
	    setBtnDisabled(false);
	}

    }


    const fetchCVEAccount = async () => {
        try {
            const response = await adminapi.getActiveCVEAccounts();
	    let rj = await response.data;
	    console.log(rj);
	    if (rj.length > 1) {
		setAccounts(rj);
		setBtnDisabled(true);
	    } else if (rj.length == 1) {
		setCveAccount(rj[0]);
	    } else {
		setError("No active CVE account available.  Add a CVE account before attempting to publish");
		setBtnDisabled(true);
	    }
        } catch (err) {
            console.log(err);
            setError(err);
        }
    };

    useEffect(() => {
	console.log("IN PROPS EFFECT");
	if (props.showModal) {

	    fetchCVEAccount();
	    setSuccessMsg(null);
	    setQuestion(true);
	    setActiveTab("publish");
	    setCvePublishError(null);
	    setAdpError(null);
	    setPublishWarning(null);
	    setVul(props.vul);
	} else {
	    setVul(null);
	}
	    

    }, [props.showModal]);

    useEffect(() => {

	if (props.showModal && vul) {
	    fetchADPContainer();
	}
    }, [adpRole]);
    
    useEffect(() => {

	if (vul) {
	    if (props.showModal && adpRole) {
		fetchADPContainer();
	    }
	    
	    let json = {};
	    let cnacontainer = {};
	    json['descriptions'] = [{"lang": "en", "value": props.vul.description}];
	    json["affected"] = []

            if (!(vul.references && vul.references.length > 0 && vul.affected_products && vul.affected_products.length > 0 && vul.problem_types && vul.problem_types.length > 0 && vul.date_public)) {
		setPublishWarning("Information is missing.  Please populate all fields before publishing");
		setBtnDisabled(true);
		setInfoMissing(true);
		return;
	    }

	    console.log(vul.affected_products);
	    vul.affected_products.forEach((v) => {
		json["affected"].push({"vendor": v.vendor, "product": v.product,
				       "versions": [{"version": v.version,
						     "status": "affected"}]});
	    });
	    json["problemTypes"] = [];
	    vul.problem_types.forEach((vul) => {
		let cwetype = vul.replace(/ .*/,'');
		let descriptions = [];
		descriptions.push({"description": vul,
				   "lang": "en",
				   "type": cwetype})
		json["problemTypes"].push({"descriptions": descriptions});
	    });
	    json["references"] = [];
	    vul.references.forEach((vul) => {
		json["references"].push({"name":"url", "url":vul});
	    });
	    let dateObj = new Date(vul.date_public);
	    json["datePublic"] = dateObj.toISOString();
	    cnacontainer['cnaContainer'] = json
	    console.log(json);
	    setVulJSON(cnacontainer);
	}
    }, [vul])

    const pickCVEAccount = (acc) => {
	setCveAccount(acc);
	console.log("setting CVE account ", acc);
    };

    const submitVul = async() => {

	let json = vulJSON;
	let cveAPI = new CVEAPI(cveAccount.org_name, cveAccount.email, cveAccount.api_key, cveAccount.server);
	if (activeTab == "publish") {
	    if (previouslyPublished) {
		cveAPI.putCVE(vul.vul, json).then(response => {
		    console.log(response);
		    setSuccessMsg(response.data.message);
		    setBtnDisabled(true);
		}).catch(error => {
		    setCvePublishError(`Error: ${error.response.data.error}: ${error.response.data.message}`);
                    console.log(`Error: ${error.response.data.error}: ${error.response.data.message}`);
                    setBtnDisabled(true);
		});
	    } else {
		cveAPI.publishCVE(vul.vul, json).then(response => {
		    console.log(response);
		    setSuccessMsg(response.data.message);
		    setBtnDisabled(true);
		    
		}).catch(error => {
		    console.log(error);
		    setCvePublishError(`Error: ${error.response.data.error}: ${error.response.data.message}`);
		    console.log(`Error: ${error.response.data.error}: ${error.response.data.message}`);
		    setBtnDisabled(true);
		})
	    }
	} else {
	    /* this is the ADP tab */
	    if (adpRole) {
		if (adpContainer) {
		    cveAPI.putADP(vul.vul, adpContainer).then(response => {
			console.log(response);
			setSuccessMsg(response.data.message);
			setBtnDisabled(true);
		    }).catch(error => {
			console.log(error);
			setCvePublishError(`Error: ${error.response.data.error}: ${error.response.data.message}`);
			setBtnDisabled(true);
		    });
		    console.log("DO ADP STUFF");
		}
	    } else {
		setCvePublishError(`Error: You do not have the "ADP" role set on this account.`);
	    }
	}
    }

    return (
	vul ?
        <Modal show={props.showModal} onHide={props.hideModal} size="xl" centered backdrop="static">
            <Modal.Header closeButton className="border-bottom">
                <Modal.Title>Publish {vul.vul}</Modal.Title>
            </Modal.Header>
		<Modal.Body>
                    {error &&
                     <div className="alert alert-danger">{error}</div>
                    }

		    <>
			{successMsg &&
			 <Alert variant="success">{successMsg}</Alert>
			}
		    </>

		    {cvePublishError ?
		     <Alert variant="danger"> {cvePublishError}</Alert>

		     :
		     <>
			 {accounts.length > 0 &&
			  <div className="border-bottom pb-2 mb-2">
			      <div className="alert alert-danger">There are multiple active CVE accounts to choose from. Choose one to use.</div>
                              {accounts.map((acc, index) => {
				  return (
                                      <Form.Check
					  type="radio"
					  key={`account-${acc.id}`}
					  onChange={(e)=>pickCVEAccount(acc)}
					  name="account"
					  label={`${acc.org_name}: ${acc.email}`}
                                      />
				  )
                              })
                              }
			  </div>
			 }

			 <Tab.Container
			     defaultActiveKey='publish'
			     activeKey={activeTab}
			     className="mb-3"
			     onSelect={setActiveTab}
			 >
			     <Nav variant="pills" className="mb-3">
				 <Nav.Item key="publish">
				     <Nav.Link eventKey="publish">Publish CVE Record</Nav.Link>
				 </Nav.Item>
				 <Nav.Item key="adp">
				     <Nav.Link eventKey="adp">Publish ADP Record</Nav.Link>
				 </Nav.Item>
			     </Nav>
			     <Tab.Content id="publishrec" className="p-0">
				 <Tab.Pane eventKey="publish" key="publish">
				     {publishWarning ?
				      <>
					  <Alert variant="warning">{publishWarning}</Alert>
					  {infoMissing &&
					   <PublishCVEApp
					       vul={vul}
					   />
					  }
				      </>
				      :
				      <>
					  <b>The following JSON will be published. Double check for errors.</b>
					  <br/>
					  <br/>
				      </>
				     }
				     {previouslyPublished ?
				      <Row>
					  <Col lg={6}>
					      <p><b>Current CVE Record:</b></p>
					      <pre>
						  {JSON.stringify(previouslyPublished.containers.cna, null, 2)}
                                              </pre>
					  </Col>
					  <Col lg={6}>
					      <p><b>New CVE Record:</b></p>
                                              <pre>
                                                  {JSON.stringify(vulJSON, null, 2)}
                                              </pre>
                                          </Col>
				      </Row>
				      :
				      <>
					  {vulJSON &&
					   <>
					       <pre>
						   {JSON.stringify(vulJSON, null, 2)}
					       </pre>
					       <div>
						   <Button variant="outline-primary" href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(vulJSON, null, 2))}`} download={`${vul.vul}.json`}><i className="fas fa-download"></i> Download</Button>
					       </div>
					   </>
					  }
				      </>
				     }
				 </Tab.Pane>
				 {adpRole &&
				  <Tab.Pane eventKey="adp" key="adp">
				      {adpError ?
				       <Alert variant="danger">{adpError}</Alert>
				       :
				       <>
					   {vul.ssvc_decision_tree ?
					    <>
						{question &&
						 <>
						     {ssvcExists ?
						      <Alert variant="info">Do you want to update the SSVC score in your ADP container? <Button onClick={(e)=>updateSSVC(e)}>Yes</Button></Alert>
						      :
						      <Alert variant="info">Do you want to add a SSVC score to your ADP container? <Button onClick={(e)=>updateSSVC(e)}>Yes</Button></Alert>
						     }
						 </>
						}
					    </>
					    :
					    <Alert variant="info">
						Score this vulnerability before publishing your ADP container.
					    </Alert>
					   }
					   {adpContainer ?
					    <>
						{btnDisabled ?
						 <p className="lead">Current ADP container:</p>
						 :
						 <Alert variant="warning">Approve the following contents and hit publish.</Alert>
						}
						<pre>
						    {JSON.stringify(adpContainer, null, 2)}
						</pre>
					    </>
					    :
					    <b>No Current ADP Container</b>
					   }
				       </>

				      }
				  </Tab.Pane>
				 }

			     </Tab.Content>

			 </Tab.Container>
		     </>
		    }
		</Modal.Body>
	    <Modal.Footer>
		<div className="d-flex gap-2">
		    <Button variant="outline-secondary" type="cancel" onClick={(e)=>(e.preventDefault(), props.hideModal())}>Cancel</Button>
		    <Button onClick={(e)=>submitVul()} variant="primary" disabled={btnDisabled ? true : false}> Publish </Button>
		</div>
	    </Modal.Footer>
	</Modal>
	: <></>

    )
}

export default PublishVulModal;
