import React from 'react';
import { Alert, Modal, Badge, FloatingLabel, Button, InputGroup, Form, Row, Col } from "react-bootstrap";
import {Typeahead} from 'react-bootstrap-typeahead';
import { useState, useEffect } from 'react';
import CVEAPI from './CVEAPI';
import AdminAPI from './AdminAPI';
import '../css/casethread.css';

const adminapi = new AdminAPI();

const PublishVulModal = (props) => {
    const [error, setError] = useState("");
    const [cvePublishError, setCvePublishError] = useState(null);
    const [vulJSON, setVulJSON] = useState("");
    const [vul, setVul] = useState("")
    const [cveAccount, setCveAccount] = useState("");
    const [accounts, setAccounts] = useState([]);
    const [btnDisabled, setBtnDisabled] = useState(true);
    const [successMsg, setSuccessMsg] = useState(null);
    
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
		setBtnDisabled(false);
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
	fetchCVEAccount();

	if (props.vul) {
	    setVul(props.vul);

	    let json = {};
	    let cnacontainer = {};
	    json['descriptions'] = [{"lang": "en", "value": props.vul.description}];
	    json["affected"] = []
	    props.vul.affected_products.forEach((vul) => {
		if (vul.vendor) {
		    json["affected"].push({"vendor": vul.vendor, "product": vul.product,
					   "versions": [{"version": vul.version,
							 "status": "affected"}]});
		}
	    });
	    json["problemTypes"] = [];
	    props.vul.problem_types.forEach((vul) => {
		let cwetype = vul.replace(/ .*/,'');
		let descriptions = [];
		descriptions.push({"description": vul,
				   "lang": "en",
				   "type": cwetype})
		json["problemTypes"].push({"descriptions": descriptions});
	    });
	    json["references"] = [];
	    props.vul.references.forEach((vul) => {
		json["references"].push({"name":"url", "url":vul});
	    });
	    json["datePublic"] = vul.date_public;
	    cnacontainer['cnaContainer'] = json
	    console.log(json);
	    setVulJSON(cnacontainer);
	    
	}
    }, [props]);

    const pickCVEAccount = (acc) => {
	setCveAccount(acc);
	console.log("setting CVE account ", acc);
	setBtnDisabled(false);
    };
    
    const submitVul = async() => {

	let json = vulJSON;
	console.log(cveAccount);
	/*try account before attempting to publish */
	let cveAPI = new CVEAPI(cveAccount.org_name, cveAccount.email, cveAccount.api_key, cveAccount.server);
        try {
            let account = await cveAPI.getUser(cveAccount.email);
            let rj = await account.data;
            if (rj) {
		console.log(rj);
		/* plus we need the org UUID anyway */
		json['cnaContainer']['providerMetadata'] = {"orgId": rj.org_UUID, "shortName": cveAccount.org_name}
		cveAPI.publishCVE(vul.vul, json).then(response => {
		    console.log(response);
		    setSuccessMsg(response.data.message);
		    setBtnDisabled(true);
		    
		})
		    .catch(error => {
			console.log(error);
			setCvePublishError(`Error: ${error.response.data.error}: ${error.response.data.message}`);
			console.log(`Error: ${error.response.data.error}: ${error.response.data.message}`);
			setBtnDisabled(true);
		    })
		
	    }
        } catch (err) {
            setError(`Errors using the selected CVE account: ${err.message}`);

        }


	
	
    }

    return (
	vul ?
        <Modal show={props.showModal} onHide={props.hideModal} size="lg" centered>
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
			 
			 <b>The following JSON will be published. Double check for errors.</b>
			 <br/>
			 <br/>
			 
			 <pre>
			     {JSON.stringify(vulJSON, null, 2)}
			 </pre>
		     </>
		    }
		<div className="d-flex justify-content-between align-items-center">
		    <Button variant="outline-primary" href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(vulJSON, null, 2)
            )}`}
			    download={`${vul.vul}.json`}><i className="fas fa-download"></i> Download</Button>
		    <div className="d-flex justify-content-end gap-3">
			<Button variant="outline-secondary" type="cancel" onClick={(e)=>(e.preventDefault(), props.hideModal())}>Cancel</Button>
			<Button onClick={(e)=>submitVul()} variant="primary" disabled={btnDisabled ? true : false}> Publish </Button>
		    </div>
		</div>
		</Modal.Body>
	    
	</Modal>
	: <></>

    )
}

export default PublishVulModal;
