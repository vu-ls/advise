import React from 'react'
import { useState, useEffect} from 'react';
import axios from 'axios';
import { Modal, Tabs, Tab, Alert, Form, Button } from "react-bootstrap";
import CVEAPI from './CVEAPI';
import {format, formatDistance} from 'date-fns';
import ThreadAPI from './ThreadAPI';
import ComponentAPI from './ComponentAPI';

const componentapi = new ComponentAPI();

const threadapi = new ThreadAPI();

const PopulateCVEModal = ({ showModal, hideModal, cveAccount, vul, caseInfo, edit, updateVuls }) => {

    const [apiError, setApiError] = useState(false);
    const [cveInfo, setCveInfo] = useState(null);
    const [description, setDescription] = useState(null);
    const [problemTypes, setProblemTypes] = useState([]);
    const [affected, setAffected] = useState([]);
    const [references, setReferences] = useState([]);
    const [datePublic, setDatePublic] = useState("");

    const addStatus = async (vul) => {
	let axiosArray = [];

	affected.map(item => {
	    if (item.versions) {
		item.versions.map(v => {
		    let data = {'vuls': [vul],
				'component': item.product,
				'supplier': item.vendor,
				'status': v.status,
				'version': v.version}
		    axiosArray.push(componentapi.addStatus(caseInfo, data));
		});
	    } else {
		let data = {'vuls': [vul],
                            'component': item.product,
                            'supplier': item.vendor,
                            'status': item.defaultStatus,
                            'version': item.packageName ? item.packageName: "default"}
		axiosArray.push(componentapi.addStatus(caseInfo, data));
	    }
	});

	try {
	    await axios.all(axiosArray);
	    updateVuls();
	    hideModal();
	} catch(err) {
	    setApiError(`Error adding component and status: ${err.message}`);
	}
    }

    const testSubmit = async () => {

	const formData = {'description': description,
			  'cve': vul,
			  'problem_types': problemTypes,
			  'references': references,
			  'date_public': format(new Date(datePublic), 'yyyy-MM-dd')}
	if (edit) {
	    threadapi.updateVul(edit, formData).then((response) => {
		if (affected) {
		    addStatus(response.data.id);
		} else {
		    updateVuls();
		    hideModal();
		}
	    }).catch(err => {
		setApiError(`Error updating vulnerability information: ${err.message}`);
	    });

	} else {
	    await threadapi.addVul(caseInfo, formData).then((response) => {
		if (affected) {
                    addStatus(response.data.id);
                } else {
		    updateVuls();
		    hideModal();
		}
	    }).catch(err => {
		setApiError(`Error adding new vulnerability: ${err.message}: ${err.response.data.detail}`);
		console.log(err);
	    });
	}
    }


    const fetchCVEInfo = async () => {

	let cveAPI = new CVEAPI();
	if (cveAccount) {
	    cveAPI = new CVEAPI(cveAccount.org_name, cveAccount.email, cveAccount.api_key, cveAccount.server);
	}
        await cveAPI.getCVE(vul).then((response) => {
	    setCveInfo(response);
	    console.log(response);
	}).catch(err => {
            console.log(err);
	    if (err.response.status == 400) {
		setApiError(`Error retrieving CVE: ${err.response.data.error}: ${err.response.data.message}`)
	    } else if (err.response.status == 404) {
		setApiError(`Error retrieving CVE: ${err.response.data.message}`);
	    }

        });

    }

    useEffect(() => {
	if (cveInfo) {
	    /* parse data */
	    try {
		setDatePublic(cveInfo.cveMetadata.datePublished);
		setDescription(cveInfo.containers.cna.descriptions[0].value);
		setAffected(cveInfo.containers.cna.affected);
		if ('problemTypes' in cveInfo.containers.cna) {
		    let pt = cveInfo.containers.cna.problemTypes.map(item => item.descriptions[0].description)
		    setProblemTypes(pt);
		}
		if ('references' in cveInfo.containers.cna) {
		    let ref = cveInfo.containers.cna.references.map(item => item.url);
		    setReferences(ref);
		}
	    } catch (err){
		console.log(err);
	    }
	}

    }, [cveInfo])

    useEffect(() => {
	if (showModal && vul) {
	    setCveInfo(null);
	    setApiError(null);
	    fetchCVEInfo()
	}

    }, [showModal, cveAccount, vul]);


    return (
        <Modal show={showModal} onHide={hideModal} size="lg" centered backdrop="static">
            <Modal.Header closeButton>
		<Modal.Title>Confirm CVE Additions</Modal.Title>
            </Modal.Header>
            <Modal.Body>
		{apiError &&
		 <Alert variant="danger">{apiError}</Alert>
		}
		{cveInfo &&
		 <Tabs
                     defaultActiveKey='addData'
                     className="mb-3"
                     fill
                 >
		     <Tab eventKey='addData' title='Confirm Additions'>
			 <p className="lead">This record was <b>{cveInfo.cveMetadata.state}</b> by <b>{cveInfo.cveMetadata.assignerShortName}</b> on {format(new Date(cveInfo.cveMetadata.datePublished), 'yyyy-MM-dd')}
			     {cveInfo.cveMetadata.dateUpdated &&
			      <span> and last updated on {format(new Date(cveInfo.cveMetadata.dateUpdated), 'yyyy-MM-dd')}
			      </span>
			     }
			 </p>
			 <Alert variant="warning">Confirm adding the following information to your case. <b>This may overwrite any information you have already added to this vulnerability</b>:</Alert>
			 <div className="mb-3"><b>Description:</b><br/>
			     {description}
			 </div>
			 {datePublic &&
			  <div className="mb-3"><b>Date Public:</b> {format(new Date(datePublic), 'yyyy-MM-dd')}</div>
			 }
			 <div><b>Problem Types:</b>
			     <ul className="list-unstyled">
				 {problemTypes.map((t, index) => {
				     return (
					 <li key={`pt-${index}`}>{t}</li>
				     )
				 })}
			     </ul>
			 </div>
			 <div  className="mb-3"><b>References:</b>
			     <ul className="list-unstyled">
                                 {references.map((t, index) => {
                                     return (
                                         <li key={`ref-${index}`}>{t}</li>
                                     )
                                 })}
                             </ul>
                         </div>
			 <div className="mb-3"><b>Affected Products:</b>
			     <table className="table">
				 <thead>
				     <tr>
					 <th>Product</th>
					 <th>Vendor</th>
					 <th>Version</th>
					 <th>Status</th>
				     </tr>
				 </thead>
				 <tbody>

                                     {affected.map((t, index) => {
					 return (
					     t.versions ?
					     <React.Fragment key={`affected-${index}`}>
						 {t.versions.map((v, ind) => {
						     return (
							 <tr key={`affectedprod-${index}-${ind}`}>
							     <td>{t.product}</td>
							     <td>{t.vendor}</td>
							     <td>{v.version}</td>
							     <td>{v.status}</td>
							 </tr>
						     )
						 })}
					     </React.Fragment>
					     :
					     <React.Fragment key={`affected=${index}`}>
                                                 <tr>
                                                     <td>{t.product}</td>
                                                     <td>{t.vendor}</td>
                                                     <td></td>
                                                     <td>{t.defaultStatus}</td>
                                                 </tr>
                                             </React.Fragment>
					 )
				     })}
				 </tbody>
			     </table>

                         </div>
		     </Tab>
		     <Tab eventKey="json" title="Full JSON record">
			 <pre>
			     {JSON.stringify(cveInfo, null, 2)}
			 </pre>
		     </Tab>
		 </Tabs>
		}

	    </Modal.Body>
            <Modal.Footer>
		<Button variant="secondary" onClick={hideModal}>
		    Cancel
		</Button>
		{cveInfo &&
		 <Button variant="primary" onClick={() => testSubmit()}>
		     Submit
		 </Button>
		}
            </Modal.Footer>
	</Modal>
    )
}

export default PopulateCVEModal;
