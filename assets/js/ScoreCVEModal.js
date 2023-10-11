import React from 'react'
import { useState, useEffect} from 'react';
import { Modal,Tab, Tabs, Alert, Form, Button } from "react-bootstrap";
import AdminAPI from './AdminAPI';
import {format, formatDistance} from 'date-fns';
import SSVCScore from './SSVCScore';
import CVEAPI from './CVEAPI';
import DeleteConfirmation from './DeleteConfirmation';

import '../css/casethread.css';

const adminapi = new AdminAPI();

const ScoreCVEModal = (props) => {

    const [vul, setVul] = useState(null);
    const [activeTab, setActiveTab] = useState("cve");
    const [showDeleteButton, setShowDeleteButton] = useState(true);
    const [accountID, setAccountID] = useState("");
    const [apiError, setApiError] = useState(false);
    const [message, setMessage ] = useState([]);
    const [formContent, setFormContent] = useState(null);
    const [disabledButton, setDisabledButton] = useState(false);
    const [loading, setLoading] = useState(true);
    const [edit, setEdit] = useState(null);
    const [cveInfo, setCveInfo] = useState(null);
    const [description, setDescription] = useState(null);
    const [problemTypes, setProblemTypes] = useState([]);
    const [affected, setAffected] = useState([]);
    const [references, setReferences] = useState([]);
    const [datePublic, setDatePublic] = useState("");
    const [lock, setLock] = useState(false);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);


    const hideConfirmationModal = () => {
	setDisplayConfirmationModal(false);
    }
    
    const saveSSVCScore = async (formData) => {
	console.log(formData);
	/* need to change names */
	const data = {};
	data['tree_type'] = formData['tree_type']
	data['ssvc_decision_tree'] = formData['decision_tree']
	data['ssvc_vector'] = formData['vector']
	data['ssvc_decision'] = formData['final_decision']
	data['ssvc_justifications'] = formData['justifications']
	await adminapi.scoreVul(vul.cve, data).then((response) => {
	    props.hideModal();
	}).catch(err => {
	    console.log(err);
	    setApiError(`Error updating score: ${err.message} ${err.response.data}`);
	});
    }

    const createCase = async () => {
	setDisabledButton(true);
	hideConfirmationModal();
	console.log("CREATE THE CASE")
	await adminapi.createCaseFromVul(vul.cve).then((response) => {
	    setDisabledButton(false);
	    console.log(response);
	    const case_url = response['case'];
	    window.location.replace(case_url);
	}).catch(err => {
	    if (err.response.status == 400) {
		setApiError(`Error creating new case. <a href="${err.response.data['case']}">A case already exists with this vulnerability</a>`);
	    } else {
		console.log(err);
		setApiError(`An error occurred while creating this case.`);
	    }
	    setDisabledButton(false);
	});
	

    }

    
    const removeScore = async () => {
	await adminapi.removeScore(vul.cve).then((response) => {
	}).catch(err => {
	    console.log(err);
	    setApiError(`Error removing score: ${err.response.data.error}`);
	});
    }

    // Async Fetch
    const fetchInitialData = async () => {
	let cveAPI = new CVEAPI();
	await cveAPI.getCVE(vul.cve).then((response) => {
            setCveInfo(response);
            console.log(response);
	    setLoading(false);
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


    const setTabActive = (tab) => {
	setActiveTab(tab)

	if (tab == "ssvc") {
	    setLock(true);
	    adminapi.lockVulToScore(vul.cve).then((response) => {
	    }).catch(err => {
		console.log("lock vul to score failed");
		setLock(false);
		setVul(null);
		console.log(err);
		adminapi.getVul(vul.cve).then((response) => {
		    console.log(response);
		    setVul(response);
		}).catch(err => {
		    setApiError(`Error retrieving CVE from AdVISE ${err.response}`);
		});

	    })
	} else if (tab == "cve" && lock) {
	    setLock(false)
	    adminapi.unlockVul(vul.cve).then((response) => {
	    }).catch(err => {
		console.log(err);
	    })
	}
    }

    useEffect(() => {
	if (vul) {
	    fetchInitialData();
	}
    }, [vul]);

    useEffect(() => {
	setActiveTab("cve");
	setVul(props.vul);
    }, [props.vul]);

    return (
	vul ?
            <Modal show={props.showModal} onHide={props.hideModal} size="lg" centered backdrop="static">
		<Modal.Header closeButton>
		    <Modal.Title>Score vulnerability {vul && <b>{vul.cve}</b>}</Modal.Title>
		</Modal.Header>
		<Modal.Body>
		    {apiError &&
		     <div className="alert alert-danger" dangerouslySetInnerHTML={{__html: apiError}}></div>
		    }

		    <Tabs
			defaultActiveKey="cve"
		    id="scoringtabs"
			className="mb-3"
			activeKey={activeTab}
			onSelect={setTabActive}
			fill
		>
			<Tab eventKey="cve" title="CVE">
			    {cveInfo ?
			     <>
				 <p className="lead">This record was <b>{cveInfo.cveMetadata.state}</b> by <b>{cveInfo.cveMetadata.assignerShortName}</b> on {format(new Date(cveInfo.cveMetadata.datePublished), 'yyyy-MM-dd')}
				     {cveInfo.cveMetadata.dateUpdated &&
				      <span> and last updated on {format(new Date(cveInfo.cveMetadata.dateUpdated), 'yyyy-MM-dd')}</span>}
				 </p>
			     <div className="mb-3"><b>CVE:</b>{" "}{vul.cve}</div>
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
				 <div><b>References:</b>
				     <ul className="list-unstyled">
					 {references.map((t, index) => {
                                             return (
						 <li key={`ref-${index}`}><a href={`${t}`} target="_blank">{t}</a></li>
                                             )
					 })}
                                     </ul>
				 </div>
				 <div><b>Affected Products:</b></div>
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

				 <div>
				     <div className="d-flex justify-content-end gap-2">
					 <Button variant="secondary" onClick={props.hideModal}>
					     Cancel
					 </Button>
					 <Button variant="primary"
						 disabled={disabledButton ? true: false}
						 onClick={(e)=>setDisplayConfirmationModal(true)}>
					 {disabledButton ? <>Creating...</>:<>Create Case</>}</Button>
				     </div>
				     <DeleteConfirmation
					 showModal={displayConfirmationModal}
					 confirmModal={createCase}
					 hideModal={hideConfirmationModal}
					 id={vul.cve}
					 message={`Are you sure you want to create case for ${vul.cve}`}
					 buttonText={"Create Case"}
				     />
				 </div>
				 
			     </>
			     :
			     <>
				 {loading &&
				  <div className="text-center">
				      <div className="lds-spinner"><div></div><div></div><div></div></div>
				  </div>
				 }
			     </>
			    }
			</Tab>
			<Tab eventKey="ssvc" title="SSVC">
			    {!vul.locked ?
			     <SSVCScore
				 vul={vul.ssvcscore}
				 hideModal = {props.hideModal}
				 save = {saveSSVCScore}
				 remove = {removeScore}
			     />
			     :
			     <Alert variant="danger">Someone is already scoring this vulnerability. Check back later</Alert>
			    }
			</Tab>
		    </Tabs>
		</Modal.Body>
	    </Modal>
	:
	<div className="text-center">
            <div className="lds-spinner"><div></div><div></div><div></div></div>
        </div>
    )
}

export default ScoreCVEModal;
