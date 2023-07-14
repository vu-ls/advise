import React, { useState, useCallback, useEffect, useRef } from 'react';
import CaseThreadAPI from './ThreadAPI';
import ComponentAPI from './ComponentAPI';
import DeleteConfirmation from "./DeleteConfirmation";
import StatusModal from "./StatusModal";
import {Card, ButtonGroup, ToggleButton, DropdownButton, Dropdown, Table, Accordion, Row, Col, Button, Form} from 'react-bootstrap';
import DisplayVulStatus from './DisplayVulStatus';
import {AsyncTypeahead} from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.bs5.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import '../css/casethread.css';

const componentapi = new ComponentAPI();

const threadapi = new CaseThreadAPI();

const CACHE = {};

const PER_PAGE = 50;


const VERSION_RANGE_CHOICES = [
    {val:null, desc:'None'},
    {val: '<', desc: '< (affects X versions prior to n)'},
    {val: '<=', desc: '<= (affects X versions up to n)'},
    {val: '=', desc: '= (affects n)'},
    {val: '>', desc: '> (affects X versions above n)'},
    {val: '>=', desc: '>= (affects X versions n and above)'}
];

const STATUS_CHOICES = [
    {val: 0, desc: 'Not Affected'},
    {val: 1, desc: 'Affected'},
    {val: 2, desc: 'Fixed'},
    {val: 3, desc: 'Under Investigation'},
]


const JUSTIFICATION_CHOICES = [
    {val: "component_not_present", desc: "Component Not Present"},
    {val: "vulnerable_code_not_present", desc: "Vulnerable Code Not Present"},
    {val: "vulnerable_code_not_in_execute_path", desc: "Vulnerable Code not in Execute Path"},
    {val: "vulnerable_code_cannot_be_controlled_by_adversary", desc: "Vulnerable Code cannot be controlled by adversary"},
    {val: "inline_mitigations_already_exist", desc: "Inline mitigations already exist"},
]

function makeAndHandleRequest(query, page = 1) {
    let q = `search=${query}`;
    return componentapi.getComponents(q).then((response) => {
        let items = response.results;
        let total_count = response.count;
        const options = items.map((i) => ({
            name: i.name,
            id: i.id,
            owner: i.owner,
            version: i.version
        }));
        console.log(options);
        return {options, total_count};
    });
}


const DisplayVulStatusSummary = (props) => {

    const {status} = props;

    return (
	<>
	    {status.map((b, index) => {

		return (
		    <DisplayVulStatus
			key={`${b.status}-${index}`}
			status={b.status}
			count = {b.count}
		    />
		)})
	    }
	</>
    )

}


const StatusAddForm = (props) => {

    const caseInfo = props.caseInfo;
    const [reqUser, setReqUser] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [vuls, setVuls] = useState([]);
    const [caseComponents, setCaseComponents] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formTitle, setFormTitle] = useState("Add Component Status");
    const [comp, setComp] = useState(null);
    const [selComponent, setSelComponent] = useState([]);
    const [invalidComponent, setInvalidComponent] = useState(false);
    const [version, setVersion] = useState("");
    const [status, setStatus] = useState("");
    const [showJustification, setShowJustification] = useState(false);
    const [justification, setJustification] = useState("");
    const [versionRange, setVersionRange]=useState(null);
    const [endVersion, setEndVersion] = useState("");
    const [checkedVuls, setCheckedVuls] = useState([]);
    const [invalidVersion, setInvalidVersion] = useState(false);
    const [invalidStatus, setInvalidStatus] = useState(false);
    const [invalidVuls, setInvalidVuls] = useState(false);
    const [invalidJustification, setInvalidJustification] = useState(false);
    const [vulStatement, setVulStatement] = useState("");
    const [editStatus, setEditStatus] = useState(null);
    const [shareStatus, setShareStatus] = useState(false);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [removeID, setRemoveID] = useState(null);
    const [allowAddStatus, setAllowAddStatus] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    
    /* typeahead vars */
    const [suggested, setSuggested] = useState([]);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [query, setQuery] = useState("");
    const [options, setOptions] = useState([]);

    const formRef = useRef(null);
    const navRef = useRef(null);

    const radios = [
	{ name: 'Share', value: true },
	{ name: "Don't Share", value: false },
    ];

    const hideStatusModal = () => {
	setShowStatusModal(false);
    }
    
    function removeStatus(id) {
        console.log("remove", id);
        setRemoveID(id);
        setDeleteMessage("Are you sure you want to remove this status?");
        setDisplayConfirmationModal(true);
    };

    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
    }

    const handleSearch = useCallback((q) => {
        if (CACHE[q]) {
            setOptions(CACHE[q].options);
            return;
	}

        setIsSearchLoading(true);
	makeAndHandleRequest(q).then((resp) => {
            CACHE[q] = { ...resp, page: 1 };
            console.log("OPTIONS ARE>>>>>>>", resp.options);
            setIsSearchLoading(false);
            setOptions(resp.options);
        });
    }, []);

    const handlePagination = (e, shownResults) => {
        const cachedQuery = CACHE[query];

        // Don't make another request if:
        // - the cached results exceed the shown results
        // - we've already fetched all possible results
        if (
            cachedQuery.options.length > shownResults ||
		cachedQuery.options.length === cachedQuery.total_count
        ) {
            return;
        }

        setIsSearchLoading(true);

        const page = cachedQuery.page + 1;

        makeAndHandleRequest(query, page).then((resp) => {
            const options = cachedQuery.options.concat(resp.options);
            CACHE[query] = { ...cachedQuery, options, page };

            setIsSearchLoading(false);
            console.log("OPTIONS ARE, options");
            setOptions(options);
        });
    };



    const submitRemoveStatus = (id) => {
        console.log("HEREEEE");
        componentapi.removeStatus(id).then((response) => {
	    getSelectedComponents();
        })
        setDisplayConfirmationModal(false);
    }


    function editStatusNow(c, q) {
        setEditStatus(q);
	setSelComponent([c.component.name]);
	setVersion(q.version);
	setEndVersion(q.version_end_range);
	setVulStatement(q.statement);
	setVersionRange(q.version_range);
	setCheckedVuls([q.vul.id]);
	setStatus(q.status);
	if (q.justification) {
	    let val = JUSTIFICATION_CHOICES.filter(item => item.desc == q.justification);
	    setJustification(val[0].val);
	}
	setShareStatus(q.share);
        setFormTitle(`Edit status for ${c.component.name} ${q.version}`)
        setShowForm(true);
	setInvalidJustification(false);
    }

    useEffect(() => {
	console.log(status);
	if (status && status === "Not Affected") {
	    setShowJustification(true);
	} else if (status) {
	    setShowJustification(false);
	}
    }, [status]);

    function viewStatusDetails(comp, vul) {
	setEditStatus(vul);
	setComp(comp);
	console.log(comp);
	setShowStatusModal(true);
	console.log("open modal to view");
    }


    const submitStatus = (event) => {
        event.preventDefault();
	let error = false;
        const formData = new FormData(event.target),
              formDataObj = Object.fromEntries(formData.entries());
        console.log(formDataObj);
	console.log(selComponent);

	if (selComponent.length == 0) {
	    setInvalidComponent(true);
	    error = true
	} else {
	    formDataObj['component'] = selComponent[0].name
	    setInvalidComponent(false);
	}
	if (version === "") {
            setInvalidVersion(true);
            error = true;
        } else {
            setInvalidVersion(false);
        }
	console.log(checkedVuls);
	console.log(status);
	if (checkedVuls.length == 0) {
	    setInvalidVuls(true);
	    error = true;
	} else {
	    setInvalidVuls(false);
	}
	if (status == "") {
	    setInvalidStatus(true);
	    error = true;
	} else {
	    setInvalidStatus(false);
	}

	formDataObj['vuls'] = checkedVuls;
	formDataObj['share'] = shareStatus;
	if (status === "Not Affected") {
	    if (justification == "") {
		setInvalidJustification(true);
		error=true;
	    } else {
		formDataObj['justification'] = justification;
	    }
	}
	if (error == false) {
	    try {
		if (editStatus) {
		    componentapi.editStatus(editStatus, formDataObj).then((response) => {
			addStatus();
			getSelectedComponents();
			setShowForm(false);
		    })
		} else {
		    componentapi.addStatus(caseInfo, formDataObj).then((response) => {
			addStatus();
			getSelectedComponents();
			setShowForm(false);
		    })
		}
	    } catch (err) {
		console.log(err);
	    }
	}

    }

    const handleVulSelect = (e) => {
    // Destructuring
	const { value, checked } = e.target;

	console.log(`${value} is ${checked}`);

	// Case 1 : The user checks the box
	if (checked) {
	    setCheckedVuls(checkedVuls => [...checkedVuls, value]);
	}
	// Case 2  : The user unchecks the box
	else {
	    setCheckedVuls((checked) => checked.filter((select) => select != value))
	}
    };

    
    const setSelectedComponent = (e) => {
	console.log(e);
	setSelComponent(e);
	if (e[0].version) {
	    setVersion(e[0].version)
	}
    }


    /*
    useEffect(() => {
	console.log("SOMETHING CHANGED");
    }, [shareStatus]);
    */
    useEffect(() => {
	setIsLoading(false);
	console.log(`STATUS VULS ADDED ${reqUser}`);
    }, [vuls]);

    useEffect(() => {
	setIsLoading(true);
	setVuls(props.vuls);

    }, [props.vuls]);

    useEffect(() => {
	setIsLoading(true);
        setVuls(props.vuls)
	getSelectedComponents();
	setReqUser(props.user);
	if (['owner', 'supplier'].includes(props.user.role)) {
	    setAllowAddStatus(true);
	}
    }, [props])


    const getSelectedComponents = async () => {
        console.log("fetching case components");
        try {
            await componentapi.getComponentStatus(caseInfo).then((response) => {

		console.log("COMP STATUS", response);
		setCaseComponents(response);
	    })
	} catch (err) {
	    console.log('Error:', err)
	}
    }

    function addStatus() {
	setEditStatus(null);
        setFormTitle("Add Component Status");
	setSelComponent([]);
	setVersion("");
	setVulStatement("");
	setEndVersion("");
	setStatus("");
	setShareStatus(false);
    }

    useEffect(() => {
        if (showForm) {
            formRef.current.scrollIntoView();
        } else {
            /* scroll up */
            try {
                navRef.current.scrollIntoView();
            } catch (err) {
            }
        }
    }, [showForm]);


    const ActionColumn = (props) => {
	const {component, vul, user} = props;

	return (
	    //user.role === "owner" ?
	     <td>
                 <Button variant="btn-icon px-1" onClick={(e)=>editStatusNow(component, vul)}>
		     <i className="fas fa-edit"></i>
                 </Button>
		 <Button variant="btn-icon px-1" onClick={(e)=>viewStatusDetails(component, vul)}>
		     <i className="fas fa-search-plus"></i>
                 </Button>
                 <Button variant="btn-icon px-1" onClick={(e)=>removeStatus(vul.id)}>
		     <i className="fas fa-trash"></i>
                 </Button>

	     </td>
	     //:
	     //""

	)
    }



    return (
	vuls && reqUser ?
        <>
            <div className="d-flex align-items-center justify-content-between" ref={navRef}>
                <h5>Component Status</h5>
		{allowAddStatus &&
		 <>
		     {vuls.length > 0 &&
		      <>
			  {caseComponents.length > 0 ?
			   <DropdownButton variant="btn p-0"
                                           title={<i className="bx bx-dots-vertical-rounded"></i>}
                           >
			       <Dropdown.Item eventKey='add' onClick={()=>(addStatus(), setShowForm(true))} >Add Status</Dropdown.Item>
			   </DropdownButton>
			   :
			   <Button type="button" className="btn btn-primary" onClick={()=>(addStatus(), setShowForm(true))}>
			       Add Status
			   </Button>
			  }
		      </>
		     }
		 </>
		}
            </div>
	    {vuls.length == 0 &&
	     <>
		 {reqUser.role === "owner" ?
		  <p>Add a vulnerability before adding affected component status.</p>
		  :
		  <p>Status can be added once vulnerabilities are defined.</p>
		 }
	     </>
	    }

	    <Accordion>
		{caseComponents.map((c, index) => {
		    return (
			<Accordion.Item className="card mt-2" eventKey={index} key={index}>
                            <Accordion.Header>
				<div className="d-flex gap-5 justify-content-between">
				    <span>{c.component.name} {c.component.version && c.component.version}</span>
				    <DisplayVulStatusSummary
					status = {c.summary}
				    />
				</div>

                            </Accordion.Header>
                            <Accordion.Body>
				<Table responsive>
				    <thead>
					<tr>
					    <th>
						Vul
					    </th>
					    <th>
						Status
					    </th>
					    <th>
						Version
					    </th>
					    <th>
						Owner
					    </th>
					    <th>
						Statement
					    </th>
					    {allowAddStatus &&
					    <th>
						Action
					    </th>
					    }
					</tr>
				    </thead>
				    <tbody>
					{c.affected_vuls.map((v, index) => {

					    return (
						<tr key={v.id}>
						    <td>{v.vul.vul}</td>
						    <td><DisplayVulStatus
							    status={v.status}
							/>
						    </td>
						    <td>{v.version} {v.version_range ? v.version_range : ""} {v.version_end_range ? v.version_end_range : "" }
						    </td>
						    <td>{c.component.owner &&
							 `${c.component.owner.name}`
							}</td>
						    <td>{v.statement}</td>
						     <ActionColumn
							 component = {c}
							 vul={v}
							 user={reqUser}
						     />
						</tr>
					    )
					})}
                                        {c.unaffected_vuls.map((v, index) => {
                                            return	(
                                                <tr key={v.id}>
                                                    <td>{v.vul.vul}</td>
                                                    <td><DisplayVulStatus
                                                            status={v.status}
                                                        />
                                                    </td>
                                                    <td>{v.version} {v.version_range ? v.version_range : ""} {v.version_end_range ? v.version_end_range : "" }
                                                    </td>
						    <td>{c.component.owner &&
							 `${c.component.owner.name}`
							}</td>
                                                    <td>{v.statement}</td>
						    <ActionColumn
							component = {c}
                                                        vul={v}
                                                        user={reqUser}
                                                    />
                                                </tr>
                                            )
                                        })}
                                        {c.fixed_vuls.map((v, index) => {
					    return (
                                                <tr key={v.id}>
                                                    <td>{v.vul.vul}</td>
                                                    <td><DisplayVulStatus
                                                            status={v.status}
                                                        />
                                                         </td>
                                                    <td>{v.version} {v.version_range ? v.version_range : ""} {v.version_end_range ? v.version_end_range : "" }
                                                    </td>
						    <td>{c.component.owner &&
							 `${c.component.owner.name}`
							}</td>
                                                    <td>{v.statement}</td>
						    <ActionColumn
                                                        component = {c}
                                                        vul={v}
                                                        user={reqUser}
                                                    />
                                                </tr>
                                            )
                                        })}
                                        {c.investigating_vuls.map((v, index) => {
					    return (
						<tr key={v.id}>
                                                    <td>{v.vul.vul}</td>
                                                    <td><DisplayVulStatus
                                                            status={v.status}
                                                        />
                                                    </td>
                                                    <td>{v.version} {v.version_range ? v.version_range : ""} {v.version_end_range ? v.version_end_range : "" }
                                                    </td>
						    <td>{c.component.owner &&
							 `${c.component.owner.name}`
							}
						    </td>
                                                    <td>{v.statement}</td>
						    <ActionColumn
                                                        component = {c}
                                                        vul={v}
                                                        user={reqUser}
                                                    />
                                                </tr>
                                            )
                                        })}
				    </tbody>
				</Table>
				<div className="actions text-end">
                                </div>
			    </Accordion.Body>
			</Accordion.Item>
		    )
		})}
	    </Accordion>
	    <div id="testref" ref={formRef}>&nbsp; </div>
            {showForm &&
             <Card className="mt-3 unseen">
                 <Card.Header>
                     <Card.Title className='mb-0'>{formTitle}</Card.Title>
                 </Card.Header>
                 <Card.Body>
		     <Form onSubmit={(e)=>submitStatus(e)} id="statusform">
                         <Form.Group className="mb-3" controlId="_type">
                             <Form.Label>Component</Form.Label>
			     <AsyncTypeahead
				 disabled={editStatus ? true : false}
				 id="components"
                                 options={options}
                                 allowNew
				 onPagination={handlePagination}
				 onSearch={handleSearch}
				 paginate
				 isLoading={isSearchLoading}
				 labelKey="name"
                                 onChange={setSelectedComponent}
                                 selected={selComponent}
				 useCache={false}
                                 placeholder="Start typing for components"
				 renderMenuItemChildren={(option) => (
				     <div className="d-flex align-items-center gap-2" key={option.id}>
                                         <span>{option.name} {option.version}</span>
					 {option.owner &&
					  <span>({option.owner.name})</span>
					 }
				     </div>

				 )}

			     />
			     {editStatus &&
			      <Form.Text>
				  To change the component, remove this component and add a new one.
			      </Form.Text>
			     }
                             {invalidComponent &&
                              <Form.Text className="error">
                                  This field is required.
                              </Form.Text>
                             }
                             </Form.Group>
			 <Form.Group className="mb-3">
			     <Form.Label>Select Affected Vuls</Form.Label>
			     {vuls.map((vul, index) => (
				 <Form.Check
				     key = {`vul-${vul.id}`}
                                     label={vul.vul}
                                     name="vuls"
				     value = {vul.id}
				     defaultChecked = {checkedVuls.includes(vul.id) ? true: false}
                                     type="checkbox"
				     onChange={handleVulSelect}

                                 />
			     ))}
			     {invalidVuls &&
			      <Form.Text className="error">
                                  This field is required.
                              </Form.Text>
                             }
			 </Form.Group>
			 <Form.Group className="mb-3" controlId="_type">
                             <Form.Label>Status</Form.Label><br/>
			     <div onChange={(e)=>setStatus(e.target.value)}>
				 {STATUS_CHOICES.map((type) => (
				     <Form.Check
					 inline
					 label={type.desc}
					 isInvalid={invalidVuls}
					 key={`status-${type.desc}`}
					 name="status"
					 checked = {status === type.desc ? true : false }
					 value={type.desc}
					 onChange={setStatus}
					 type="radio"
				     />
				 ))}
			     </div>
			     {invalidStatus &&
			      <Form.Text className="error">
                                  This field is required.
                              </Form.Text>
                             }
			 </Form.Group>
			 {showJustification &&
			  <Form.Group className="mb-3">
			      <Form.Label>Justification</Form.Label><br/>
			      <Form.Text>A "Not Affected" status requires a justification.</Form.Text>
			      <div onChange={(e)=>setJustification(e.target.value)}>
			      {JUSTIFICATION_CHOICES.map((type) => (
				  <Form.Check
                                      label={type.desc}
                                      isInvalid={invalidVuls}
                                      key={`status-${type.desc}`}
                                      name="justification"
                                      checked = {justification === type.val ? true : false }
                                      value={type.val}
                                      onChange={setJustification}
                                      type="radio"
                                  />
                              ))}
			      </div>
			      {invalidJustification &&
                              <Form.Text className="error">
                                  This field is required when status is "Not Affected."
                              </Form.Text>
                             }
			  </Form.Group>
			 }
			 <Form.Group className="mb-3">
			     <Row>
				 <Col lg={4} md={6} sm={12}>
				     <Form.Label>Affected Version (or start range) <span className="required">*</span></Form.Label>
				     <Form.Control name="version" isInvalid={invalidVersion} value={version} onChange={(e)=>setVersion(e.target.value)}/>
				     {invalidVersion &&
				      <Form.Text className="error">
					  This field is required.
				      </Form.Text>
				     }

				 </Col>
				 <Col lg={4} md={6} sm={12}>
				     <Form.Label>Version Range</Form.Label>
				     <Form.Select name="version_affected" value={versionRange} onChange={(e)=>setVersionRange(e.target.value)} aria-label="Range Select">
					 {VERSION_RANGE_CHOICES.map((choice) => (
					     <option key={choice.val} value={choice.val}>{choice.desc} </option>
					 ))}
				     </Form.Select>
				 </Col>
				 <Col lg={4} md={6} sm={12}>

				     <Form.Label>End Version Range</Form.Label>
                                     <Form.Control name="version_end_range" value={endVersion}  onChange={(e)=>setEndVersion(e.target.value)}/>
                                 </Col>
			     </Row>
			 </Form.Group>
			 <Form.Group className="mb-3">
			     <Form.Label>Optional Statement/Comment</Form.Label>
			     <Form.Control name="statement" as="textarea" rows={3} value={vulStatement} onChange={(e)=>setVulStatement(e.target.value)}/>
			 </Form.Group>
			 <Form.Group className="mb-3">
			     <Form.Label>Share status with other case participants?</Form.Label><br/>
			     <ButtonGroup>
				 {radios.map((radio, idx) => (
				     <ToggleButton
					 key={idx}
					 id={`radio-${idx}`}
					 type="radio"
					 variant={idx ? 'outline-danger' : 'outline-success'}
					 name="share"

					 value={radio.value}
					 checked={shareStatus === radio.value}
					 onChange={(e) => setShareStatus(e.currentTarget.value)}
				     >
					 {radio.name}
				     </ToggleButton>
				 ))}
			     </ButtonGroup>
			 </Form.Group>
			 <Button className="m-2" type="Cancel" variant="secondary" onClick={(e)=>(e.preventDefault(), setShowForm(false))}>
                             Cancel
                         </Button>
                         <Button variant="primary" type="submit">
                             Submit
                         </Button>
		     </Form>
		 </Card.Body>
	     </Card>
	    }
	    <DeleteConfirmation
                showModal={displayConfirmationModal}
                confirmModal={submitRemoveStatus}
                hideModal={hideConfirmationModal}
                id={removeID}
                message={deleteMessage} />
	    <StatusModal
		showModal = {showStatusModal}
		hideModal = {hideStatusModal}
		component = {comp}
		status = {editStatus}
		
	    />
	</>
    :
	<p className="lead">Once vulnerabilites have been added, we will request that you update your status.</p>
    )

}

export default StatusAddForm;
