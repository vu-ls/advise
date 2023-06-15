import React from 'react';
import { Row, ListGroup, ProgressBar, Col, Modal, Tabs, Alert, Badge, Button, Form, Tab } from "react-bootstrap";
import { useState, useRef, useEffect } from 'react';
import AdminAPI from './AdminAPI';
import DisplayLogo from "./DisplayLogo";
import CaseThreadAPI from './ThreadAPI';
import { format} from 'date-fns'
import StandardPagination from './StandardPagination';

const adminapi = new AdminAPI();
const threadapi = new CaseThreadAPI();

const TransferCaseModal = ({showModal, hideModal, caseInfo, updateCase}) => {

    const isInitialMount = useRef(true);

    const [error, setError] = useState(null);
    const [prevTransfers, setPrevTransfers] = useState([]);
    const [viewTransfers, setViewTransfers] = useState(false);
    const [transfersCount, setTransfersCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shareGroup, setShareGroup] = useState(null);
    const [showShareOptions, setShowShareOptions] = useState(false);
    const [reason, setReason] = useState("");
    const [invalidReason, setInvalidReason] = useState(false);
    const [checkedOptions, setCheckedOptions] = useState([]);
    const [doneOptions, setDoneOptions] = useState([]);
    const [invalidOptions, setInvalidOptions] = useState(false);
    const [buttonDisabled, setButtonDisabled] = useState(false);
    const [transferStatus, setTransferStatus] = useState(0);
    const [transferStep, setTransferStep] = useState(0);
    const [remoteCase, setRemoteCase] = useState(null);
    const [doneButton, setDoneButton] = useState(false);
    const [transferComplete, setTransferComplete] = useState(false);
    const [notes, setNotes] = useState([]);
    const [transferErrors, setTransferErrors] = useState([]);
    // Async Fetch

    const transferSuccess = async () => {

	try {
	    let form = new FormData();
	    form.append('transfer_reason', reason);
	    form.append('case', caseInfo.case_id);
	    form.append('remote_case_id', remoteCase);
	    form.append('connection', shareGroup.id);
	    /* keep track of what we're transferring */
	    let data = {'error': transferErrors};
	    if (transferErrors) {
		let error_fields = checkedOptions.filter((item) => !transferErrors.includes(item));
		data['success'] = error_fields;
	    } else {
		data['success'] = doneOptions;
	    }
	    
	    form.append('data_transferred', JSON.stringify(data));

	    await adminapi.transferCase(form).then((response) => {
		/*setButtonDisabled(false);*/
		setDoneButton(true);
		/*hideModal();*/
	    });
	} catch (err) {
	    console.log(err);
	    setError(`Transfer successful but error occurred when updating case status: ${err.message}`);
	}

    }

    const shareTheCase = async () => {
	if (shareGroup == null) {
	    setError("Please select a group from below");
	    return;
	}

	if (reason === "") {
	    setInvalidReason(true);
	    return;
	}

	setButtonDisabled(true);

	let prevt = prevTransfers.find((item) => item.connection == shareGroup.id);

	if (!prevt) {
	    /* report is either auto-checked or disabled depending on whether cas has already been transferred */
	    setCheckedOptions(checkedOptions => ["report", ...checkedOptions]);
	    setTransferStatus(10);
	    let form = new FormData();
	    form.append('report', JSON.stringify(caseInfo.report['report']));
            form.append('source', caseInfo.report['source']);
	    form.append('transfer_reason', reason);

	    try {
		await adminapi.transferReport(shareGroup.url, shareGroup.external_key, form).then((response) => {
		    console.log(response);
		    setRemoteCase(response['case_id']);
		    setDoneOptions(doneOptions => [...doneOptions, "report"]);
		    //transferSuccess(response);

		});
	    } catch (err) {
		console.log(err);
		setError(`Problem with transfer ${err.message}: ${err.response.data.detail}`);
		setDoneButton(true);
	    }
	} else {
            if (checkedOptions.length == 0) {
		setInvalidOptions(true);
		return;
	    }
	    setTransferStatus(10);
	    setRemoteCase(prevt.remote_case_id);
	}

    };

    const getVulsTransfer = async () => {
	try {
	    await threadapi.getVuls(caseInfo).then((response) => {
		let vul_num = response.length;
		if (response.length) {
		    adminapi.transferVuls(remoteCase, shareGroup.url, shareGroup.external_key, response).then((response) => {
			setNotes(notes => [...notes, `${vul_num} vulnerabilities transferred`]);
			setDoneOptions(doneOptions => [...doneOptions, "vuls"]);
		    }).catch(err => {
			console.log(err);
			setError(`Problem with vuls transfer ${err.message}: ${err.response.data.detail}`);
			setDoneOptions(doneOptions => [...doneOptions, "vuls"]);
			setTransferErrors(transferErrors => [...transferErrors, "vuls"]);
			setDoneButton(true);
		    });
		} else {
		    setNotes(notes => [...notes, "No vuls to transfer."])
		    setDoneOptions(doneOptions => [...doneOptions, "vuls"]);
		}

	    });
	} catch (err) {
	    console.log(err);
	    setError(`Problem with transfer(${err.message}: ${err.response.data.detail}`);
	    setDoneButton(true);
	}
    }

    const getAdvisoryTransfer = async () => {
	try {
            await threadapi.getCurrentAdvisory({'case':caseInfo.case_id}).then((response) => {
		console.log(response);
                adminapi.transferAdvisory(remoteCase, shareGroup.url, shareGroup.external_key, response).then((response) => {
                    setNotes(notes => [...notes, `advisory transferred`]);
                    setDoneOptions(doneOptions => [...doneOptions, "advisory"]);
                }).catch(err => {
                    console.log(err);
                    setError(`Problem with advisory transfer ${err.message}: ${err.response.data.detail}`);
                    setDoneButton(true);
		    setDoneOptions(doneOptions => [...doneOptions, "advisory"]);
		    setTransferErrors(transferErrors => [...transferErrors, "advisory"]);
                });
            })
        } catch (err) {
            console.log(err);
	    if (err.response.status == 404) {
		setNotes(notes => [...notes, "No advisory to transfer"]);
		setDoneOptions(doneOptions => [...doneOptions, "advisory"]);
	    } else {
		setError(`Problem with transferring advisory: (${err.message}: ${err.response.data.detail}`);
	    }

            setDoneButton(true);
        }
    }


    const getThreadTransfer = async () => {
	await threadapi.getOfficialThread({'case': caseInfo.case_id}).then((response) => {
	    console.log(response);
	    if (response.length) {
		threadapi.getPostsMax(response[0]['id']).then((resp) => {
		    console.log(resp);
		    adminapi.transferThread(remoteCase, shareGroup.url, shareGroup.external_key, resp.results).then((res) => {
			console.log(res);
			setNotes(notes=>[...notes, `Transferred thread with ${resp.count} posts`]);
			setDoneOptions(doneOptions=>[...doneOptions, "thread"]);
		    }).catch(err=> {
			console.log(err);
			setError(`Problem with thread transfer ${err.message}`);
			setDoneButton(true);
			setDoneOptions(doneOptions=>[...doneOptions, "thread"]);
			setTransferErrors(transferErrors => [...transferErrors, "thread"]);
		    });
		}).catch(error=> {
		    console.log(error);
		    setError(`Problem with retrieiving posts: ${error.message}: ${error.response.data.detail}`);
		    setDoneOptions(doneOptions=>[...doneOptions, "thread"]);
		    setTransferErrors(transferErrors => [...transferErrors, "thread"]);
		});
	    }
	}).catch(errormsg => {
	    setError(`Problem with retrieving case thread ${errormsg.message}: ${errormsg.response}`);
	    setDoneOptions(doneOptions=>[...doneOptions, "thread"]);
	});
    }
								      
	    

    const getArtifactsTransfer = async () => {
        await threadapi.getArtifacts(caseInfo).then(async function (response) {
	    console.log(response);
            if (response.length) {
		let num_artifacts = response.length;
		const axiosArray = [];
		response.map(item => {
		    axiosArray.push(adminapi.transferArtifact(remoteCase, shareGroup.url, shareGroup.external_key, item['filename'], item['mime_type'], item['file']))});

		return await adminapi.transferAllArtifacts(axiosArray).catch(err => {
		    console.log(err);
		    setError(`Problem transferring artifacts ${err.message}: ${err.response.data.detail}`);
		    setTransferErrors(transferErrors => [...transferErrors, "artifacts"]);
		    setDoneOptions(doneOptions => [...doneOptions, "artifacts"]);
		    
		});
	    } else {
                setNotes(notes => [...notes, "No artifacts to transfer."])
		setDoneOptions(doneOptions => [...doneOptions, "artifacts"]);
            }

	}).then((response) => {
	    console.log(response);
	    if (response) {
		setNotes(notes => [...notes, `${response.length} artifacts transferred`]);
		setDoneOptions(doneOptions => [...doneOptions, "artifacts"]);
	    }
        }).catch(err => {
            console.log(err);
            setError(`Problem with transfer ${err.message}: ${err.response.data.detail}`);
            setDoneButton(true);
	    setDoneOptions(doneOptions => [...doneOptions, "artifacts"]);
        });
    }

    useEffect(() => {
	console.log(`Done options: ${doneOptions}`);
	if (doneOptions.length) {
	    if (doneOptions.length == checkedOptions.length) {
		setTransferStatus(100);
		if (!error) {
		    setTransferComplete(true);
		}
		transferSuccess();
	    } else {
		let diff = doneOptions.length / checkedOptions.length *100;
		setTransferStatus(diff);
	    }
	}
    }, [doneOptions]);

    useEffect(() => {
	if (remoteCase) {

	    /* for each thing in checkedOptions, get the data, do the transfer, update TransferStatus */
	    /* when everything is attempted/done do TransferSuccess */
	    for (let i = 0; i < checkedOptions.length; i++) {
		switch (checkedOptions[i]) {
		case 'vuls':
		    getVulsTransfer();
		    break;
		case 'artifacts':
		    getArtifactsTransfer();
		    break;
		case 'advisory':
		    getAdvisoryTransfer();
		    break;
		case 'thread':
		    /* TODO */
		    getThreadTransfer();
		    break;
		case 'status':
		    /* TODO */
		    setDoneOptions(doneOptions => [...doneOptions, "status"]);
		    break;
		default:
		    continue;
		}
	    }
	}

    }, [remoteCase]);


    const paginationHandler = (page) => {
        adminapi.getTransfers(caseInfo.case_id, page).then((response) => {
            setPrevTransfers(response.results);
            setTransfersCount(response.count);
        }).catch( err => {
            setError(err);
        });
    }


    useEffect(()=> {
	if (isInitialMount.current) {
	    isInitialMount.current = false;
	} else {
	    paginationHandler(currentPage);
	}

    }, [currentPage])

    const fetchInitialData = async () => {

	try {
            adminapi.getConnections().then((response) => {
                setConnections(response);
		setLoading(false);
		console.log(response);
            });

	    adminapi.getTransfers(caseInfo.case_id, currentPage).then((response) => {
		setPrevTransfers(response.results);
		setTransfersCount(response.count);
		console.log(response);
		/*let transfers = caseInfo.transfers.map(c => c.connection);
		console.log(transfers);
		setPrevTransfers(transfers);*/
	    });

        } catch (err) {
            console.log(err);
            setError(err);
        }
    }

    const showTransfers = () => {
	if (viewTransfers) {
	    setViewTransfers(false);
	} else {
	    setViewTransfers(true);
	}
    };

    useEffect(() => {
	if (showModal) {
            fetchInitialData();
	}
    }, [showModal]);


    const clearSettings = () => {
	setShowShareOptions(false);
	setShareGroup(null);
	setTransferStatus(0);
	setDoneOptions([]);
	setButtonDisabled(false);
	setCheckedOptions(['report']);
	setError(null);
	setDoneButton(false);
	hideModal();
    }


    const handleVulSelect = (e) => {
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

    return (
	 <Modal show={showModal} onHide={hideModal} size="lg" centered backdrop="static">
	     <Modal.Header closeButton className="border-bottom">
                 <Modal.Title>Transfer Case</Modal.Title>
	     </Modal.Header>
	     <Modal.Body>
		 {transferStatus ?
		  <>
		      <Row className="mb-3">
			  <Col lg={12} className="text-center">
			      <h3>Transfer to <b>{shareGroup.group.name}</b> Status</h3>
			  </Col>
		      </Row>

		      {error &&
		       <Alert variant="danger">{error}</Alert>
                      }
		      <Row>
			  {checkedOptions.map((c, index) => {
			      if (c === "report") {
				  return (
				      <Col lg={Math.floor(12/checkedOptions.length)} className="text-center" key="report">
					  <h2 className="mb-0"><i className="fas fa-file-alt"></i></h2><br/>
					  <p className="lead">Report</p>
				      </Col>
				  )
			      } else if (c === "vuls") {
				  return (
				      <Col lg={Math.floor(12/checkedOptions.length)} className="text-center" key="vuls">
					  <h2 className="mb-0"><i className="fas fa-bug"></i></h2><br/>
					  <p className="lead">Vuls</p>
                                      </Col>
				  )
				  
			      } else if (c === "artifacts") {
				  return (
				      <Col lg={Math.floor(12/checkedOptions.length)} className="text-center" key="artifacts">
					  <h2 className="mb-0"><i className="fas fa-file-alt"></i></h2><br/>
					  <p className="lead">Artifacts</p>
				      </Col>
			      )
                              } else if (c === "thread") {
				  return (
				      <Col lg={Math.floor(12/checkedOptions.length)} className="text-center" key="thread">
					  <h2 className="mb-0"><i className="far fa-comments"></i></h2><br/>
					  <p className="lead">Thread</p>
				      </Col>
				  )
				  
                              } else if (c === "status") {
				  return (
				      <Col lg={Math.floor(12/checkedOptions.length)} className="text-center" key="status">
					  <h2 className="mb-0"><i className="fas fa-file-alt"></i></h2><br/>
					  <p className="lead">Report</p>
				  </Col>
				  )
			      } else if (c === "advisory") {
				  return (
				      <Col lg={Math.floor(12/checkedOptions.length)} className="text-center" key="advisory">
					  <h2 className="mb-0"><i className="far fa-newspaper"></i></h2><br/>
					  <p className="lead">Advisory</p>
                                      </Col>
				  )
			      }
			  })}
		      </Row>
		      <Row>
			  <Col lg={12}>
			      <ProgressBar animated now={transferStatus} variant={error ? "danger" : "primary"}/>
			  </Col>
		      </Row>
		      {remoteCase &&
		       <Row className="mt-4">
			   <Col lg={12} className="text-center">
			       <p className="lead mb-1">
				   {checkedOptions.includes('report') &&
				    "Report transfer successful. "
				   }
			       Remote Case ID is <b>{remoteCase}</b></p>.
			       {notes && notes.length > 0 &&
				<ul className="list-unstyled">
				    {notes.map((n, index) => {
					return (
					    <li key={`note-${index}`}><b>{n}</b></li>
					)
				    })}
				</ul>
			       }
			       {transferComplete &&
				<Alert variant="success">Transfer is complete!</Alert>
			       }
			   </Col>
		       </Row>
		      }
		  </>
		  :
		  <>
		      {loading ?
		       <div className="text-center"><div className="lds-spinner"><div></div><div></div><div></div></div></div>
                       :
		       <>
			   {caseInfo.report && connections.length > 0 ?
			    <>
				{prevTransfers.length > 0 &&
				 <>
				<Alert variant="warning"><p className="lead mb-2">This case has already been transferred. <Alert.Link href="#" onClick={(e)=>showTransfers()}>View Transfers</Alert.Link></p>
				    {viewTransfers &&
				     <>
					 <ListGroup className="mb-3">
					     {prevTransfers.map((t, index) => {

						 let date = new Date(t.action.created);

						 return (
						     <ListGroup.Item>Transferred to {t.group} on {format(date, 'yyyy-MM-dd H:mm:ss')}<br/>
							 Reason: {t.transfer_reason}<br/>
							 Case ID: {t.remote_case_id}<br/>
							 {t.data_transferred && Array.isArray(t.data_transferred) &&
							  <>Successfully Transferred: {t.data_transferred.join(', ')}</>
							 }
							 {t.data_transferred && 'success' in t.data_transferred &&
							  <>Successfully Transferred: {t.data_transferred['success'].join(', ')}</>
							 }
							 {t.data_transferred && 'error' in t.data_transferred && t.data_transferred['error'].length > 0 &&
							  <><br/><b>Error</b> occurred during transfer of {t.data_transferred['error'].join(', ')}</>
							 }
						     </ListGroup.Item>
						 )
					     })

					     }
					 </ListGroup>
					 <div className="justify-content-center text-center mt-4">
					     {transfersCount > 0 &&
					      <StandardPagination
						  itemsCount={transfersCount}
						  itemsPerPage="10"
						  currentPage={currentPage}
						  setCurrentPage={setCurrentPage}
					      />
					     }
					 </div>
				     </>
				}
				</Alert>
			    </>
			   }

			   <div className="mb-3">Select Group to transfer to.</div>
			   {error &&
			    <Alert variant="danger">{error}</Alert>
			   }
			   <ListGroup>
			       {connections.map((c, index) => {
				   
				   let prevt = prevTransfers.find((item) => item.connection == c.id);
				   return (
				       <ListGroup.Item key={`connection-${c.id}`} action onClick={(e)=>{setError(null), setShareGroup(c), setShowShareOptions(true)}}>
					   <div className="d-flex align-items-center gap-3">
					       <DisplayLogo
						   name={c.group.name}
						   photo={c.group.photo}
						   color={c.group.logocolor}
					       />
					       <div>{c.group.name} Connection</div>
					   </div>
					   {showShareOptions && shareGroup.id == c.id &&
					    <>
						{prevt &&
						 <Row>
						     <Col lg={12}>
							 <Alert variant="info" className="mt-2"><p className="lead">This case has already been transferred to {prevt.group} Case #{prevt.remote_case_id}. Report can not be re-transferred. </p></Alert>
						     </Col>
						 </Row>
						}
						<Row>
						    <Col lg={6}>
							<Form.Group className="mb-3">
							    <Form.Label className="mt-3">Select items to share <span className="required">*</span></Form.Label>
							    <Form.Check
								label="Report"
								name="shareoptions"
								type="checkbox"
								value="report"
								key="shareoptions-report"
								defaultChecked = {prevt ? false : true}
								disabled
							    />
							    <Form.Check
								label="Artifacts"
								name="shareoptions"
								type="checkbox"
								value="artifacts"
								key="shareoptions-artifacts"
								checked = {checkedOptions.includes("artifacts") ? true: false}
								onChange={handleVulSelect}
							    />
							    <Form.Check
								label="Vulnerabilites"
								name="shareoptions"
								type="checkbox"
								value="vuls"
								checked = {checkedOptions.includes("vuls") ? true: false}
								key="shareoptions-vuls"
								onChange={handleVulSelect}
							    />
							    <Form.Check
								label="Status"
								name="shareoptions"
								type="checkbox"
								value="status"
								checked = {checkedOptions.includes("status") ? true: false}
								key="shareoptions-status"
								onChange={handleVulSelect}
							    />
							    <Form.Check
								label="Thread"
								name="shareoptions"
								type="checkbox"
								value="thread"
								checked = {checkedOptions.includes("thread") ? true: false}
								key="shareoptions-thread"
								onChange={handleVulSelect}
							    />
							    <Form.Check
								label="Advisory"
								name="shareoptions"
								checked = {checkedOptions.includes("advisory") ? true: false}
								type="checkbox"
								value="advisory"
								key="shareoptions-advisory"
								onChange={handleVulSelect}
							    />
							    {invalidOptions &&
							     <Form.Text className="error">
								 Please select at least 1 option.
							     </Form.Text>
							    }
							</Form.Group>
						    </Col>
						    <Col lg={6}>
							<Form.Group className="mb-3">
							    <Form.Label>Transfer Reason <span className="required">*</span></Form.Label>
							    <Form.Control name="transfer_reason" as="textarea" rows={6} isInvalid={invalidReason} onChange={(e)=>setReason(e.target.value)}/>
							    {invalidReason &&
							     <Form.Text className="error">
								 Please provide a transfer reason.
							     </Form.Text>
							    }
							</Form.Group>
						    </Col>
						</Row>
					    </>
					   }
				       </ListGroup.Item>
				   )
			       })}
			   </ListGroup>
				
			    </>
			    :
			    <>
				{caseInfo.report ?
				 <Alert variant="danger">Oops! No connections available to transfer to.</Alert>
				 :
				 <Alert variant="danger">Oops! No report to transfer!</Alert>
				}
			    </>
			   }
		       </>
		      }
		  </>
		 }
		      
	     </Modal.Body>

	     <Modal.Footer>
		 <Button variant="secondary" onClick={hideModal}>
		     Cancel
		 </Button>
		 {doneButton ?
		  <Button variant="primary" onClick={()=>clearSettings()}>
		      Done
                  </Button>
		  :
                 <Button variant="primary" onClick={()=>shareTheCase()} disabled={buttonDisabled}>
                     {buttonDisabled ? `Attempting Transfer` : `Share` }
                 </Button>
		 }
             </Modal.Footer>
	 </Modal>

    )
};

export default TransferCaseModal;
