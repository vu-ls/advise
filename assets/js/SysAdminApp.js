import React, { useState, useEffect, useCallback } from 'react';
import {Nav, Dropdown, DropdownButton, InputGroup, CardGroup, Alert, Button, Tab, Tabs, Row, Form, Card, Col} from 'react-bootstrap';
import AdminAPI from './AdminAPI';
import ContactAPI from './ContactAPI.js';
import CaseSettings from './CaseSettings.js';
import ThreadAPI from './ThreadAPI';
import DisplayLogo from "./DisplayLogo";
import { format, formatDistance } from 'date-fns'
import DeleteConfirmation from "./DeleteConfirmation";
import {AsyncTypeahead} from 'react-bootstrap-typeahead';
import '../css/casethread.css';
import 'react-bootstrap-typeahead/css/Typeahead.bs5.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';

const adminapi = new AdminAPI();
const contactapi = new ContactAPI();
const threadapi = new ThreadAPI();

const CACHE = {};
const PER_PAGE = 50;

function makeAndHandleRequest(query, page = 1) {
    let urlstr = "type=group";
    if (query) {
        urlstr = `${urlstr}&name=${query}`;
    }
    return contactapi.searchGroups(urlstr).then((response) => {
        let items = response;
        let total_count = items.length;
        const options = items.map((i) => ({
            name: i.name,
            uuid: i.uuid,
            color: i.logocolor,
            logo: i.photo
        }));
        console.log(options);
        return {options, total_count};
    });
}

const SysAdminApp = () => {
    const [activeTab, setActiveTab] = useState(null);
    const [apiError, setApiError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [query, setQuery] = useState("");
    const [options, setOptions] = useState([]);
    const [invalidGroup, setInvalidGroup] = useState(false);
    const [group, setGroup] = useState([]);
    const [outgoingKey, setOutgoingKey] = useState("");
    const [invalidOutgoing, setInvalidOutgoing] = useState(false);
    const [incomingKey, setIncomingKey] = useState("");
    const [invalidIncoming, setInvalidIncoming] = useState(false);
    const [outgoingURL, setOutgoingURL] = useState("");
    const [invalidURL, setInvalidURL] = useState(false);
    const [connections, setConnections] = useState([]);
    const [error, setError] = useState("");
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [removeID, setRemoveID] = useState(null);
    const [editConnection, setEditConnection] = useState("");

    const submitRemoveConnection = (id) => {
        adminapi.deleteConnection(id).then((response) => {
	    fetchInitialData();
        }).catch(err => {
	    setApiError(err.response.data.detail);
	});
        setDisplayConfirmationModal(false);
    }

    const hideConfirmationModal = () => {
	setDisplayConfirmationModal(false);
    }


    const fetchInitialData = async () => {
	try {
	    adminapi.getAllConnections().then((response) => {
		setConnections(response);
	    });
	} catch (err) {
	    console.log(err);
	    setApiError(err);
	}
    };

    useEffect(() => {
	setActiveTab("fed")
	fetchInitialData();
    }, []);


    const handleInputChange = (q) => {
        setQuery(q);
    };

    const handleSearch = useCallback((q) => {
        if (CACHE[q]) {
            setOptions(CACHE[q].options);
            return;
        }

        setIsLoading(true);
        makeAndHandleRequest(q).then((resp) => {
            CACHE[q] = { ...resp, page: 1 };
            console.log("OPTIONS ARE>>>>>>>", resp.options);
            setIsLoading(false);
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

        setIsLoading(true);

        const page = cachedQuery.page + 1;

        makeAndHandleRequest(query, page).then((resp) => {
            const options = cachedQuery.options.concat(resp.options);
            CACHE[query] = { ...cachedQuery, options, page };

            setIsLoading(false);
            console.log("OPTIONS ARE, options");
            setOptions(options);
        });
    };

    const enableConnection = (val) => {
	let formDataObj = new FormData();
	formDataObj.append('disabled', false);
        adminapi.updateConnection(val, formDataObj).then((response) => {
            fetchInitialData();
        }).catch(err=> {
            console.log(err);
            setError(err.response.detail);
        });
    }

    const setEdit = (val) => {
	let c = connections[val];

	setGroup([{'name':c.group.name, 'uuid': c.group.uuid}]);
	setOutgoingURL(c.url);
	setIncomingKey(c.incoming_api_key);
	setOutgoingKey(c.external_key);
	setShowForm(true);
	setEditConnection(c.id);
    };

    const submitConnection = (event) => {
        event.preventDefault();
        const error = false;
	const formData = new FormData(event.target),
              formDataObj = Object.fromEntries(formData.entries());

	if (group == "" || group.length == 0) {
	    setInvalidGroup(true);
	    return
	}

	if (!outgoingURL) {
	    setInvalidURL(true);
	}

	if (!incomingKey && !outgoingKey) {
	    /*both fields must be provided */
	    setInvalidOutgoing(true);
	    setInvalidIncoming(true);
	    return;
	}

	formDataObj['group'] = group[0].uuid;

	if (editConnection) {
	    adminapi.updateConnection(editConnection, formDataObj).then((response) => {
		setShowForm(false);
		setGroup("");
		setOutgoingURL("");
		setOutgoingKey("");
		setIncomingKey("");
		setEditConnection("");
		fetchInitialData();
	    }).catch(err=> {
		console.log(err);
		setError(err.response.detail);
	    });
	} else {
	    adminapi.addConnection(formDataObj).then((response) => {
		setShowForm(false);
		setGroup("");
		setOutgoingURL("");
		setOutgoingKey("");
		setIncomingKey("");
		fetchInitialData();

	    }).catch(err => {
		console.log(err);
		setError(err.response.data.detail);
	    });
	}
    }


    return (
	apiError ?
	    <Alert variant="danger">Error fetching data.</Alert>
	    :


	<Tab.Container
            defaultActiveKey="fed"
            activeKey = {activeTab}
            className="mb-3"
            onSelect={setActiveTab}
        >
	    <Nav variant="pills" className="mb-3">
		<Nav.Item key="fed">
                    <Nav.Link eventKey="fed">Federation</Nav.Link>
		</Nav.Item>
		<Nav.Item key="case">
		    <Nav.Link eventKey="case">Case Settings</Nav.Link>
		</Nav.Item>
	    </Nav>
	    <Tab.Content id="admin-fns" className="p-0">
		<Tab.Pane eventKey="fed" key="fed">
		    <Card className="mb-4">
			<Card.Header className="d-flex justify-content-between">
			    <Card.Title>AdVISE Federation</Card.Title>
			    <Button size="sm" variant="primary" onClick={() =>setShowForm(true)}>Add Connection</Button>
			</Card.Header>
			<Card.Body>
			    {showForm &&
			     <Card className="mb-3">
				 <Card.Header>
				     <Card.Title>New Connection</Card.Title>
				 </Card.Header>
				 <Card.Body>
				     {error &&
				      <Alert variant="danger">{error}</Alert>
				     }
				     <Form  onSubmit={(e)=>submitConnection(e)}>
				     <Form.Group className="mb-3">
					 <Form.Label className="mb-0">Group</Form.Label>
					 <AsyncTypeahead
					     id="group"
					     options = {options}
					     isLoading={isLoading}
					     onPaginate={handlePagination}
					     onSearch={handleSearch}
					     paginate
					     defaultSelected={group}
					     onChange={setGroup}
					     onInputChange={handleInputChange}
					     labelKey="name"
					     isInvalid={invalidGroup}
					     placeholder="Search for a group"
					     renderMenuItemChildren={(option) => (
						 <div className="d-flex align-items-center gap-2">
						     <DisplayLogo
							 name={option.name}
							 photo={option.photo}
							 color={option.color}
						     />
						     <span className="participant">{option.name}</span>
						 </div>
					     )}
					     useCache={false}
					 />
					 {invalidGroup &&
					  <Form.Text className="error">
					      This field is required.
					  </Form.Text>
					 }
				     </Form.Group>
				     <Form.Group className="mb-3">
                                         <Form.Label className="mb-0">URL<span className="required">*</span></Form.Label>
                                         <Form.Text>URL or domain name of system to share with.</Form.Text>
                                         <Form.Control name="url" isInvalid={invalidURL} value={outgoingURL} onChange={(e)=>setOutgoingURL(e.target.value)}/>
					 {invalidURL &&
					  <Form.Text className="error">
					      This field is required.
					  </Form.Text>
					 }
                                     </Form.Group>
				     <Form.Group className="mb-3">
					 <Form.Label className="mb-0">Share Key (external)</Form.Label>
					 <Form.Text>API key generated by system you intend to share with</Form.Text>
					 <Form.Control name="external_key" isInvalid={invalidOutgoing} value={outgoingKey} onChange={(e)=>setOutgoingKey(e.target.value)}/>
					 {invalidOutgoing &&
					  <Form.Text className="error">
					      Either this field OR incoming API key is required.
					  </Form.Text>
					 }
				     </Form.Group>
                                     <Form.Group className="mb-3">
                                         <Form.Label className="mb-0">Allow Transfers from (internal)</Form.Label>
                                         <Form.Text>Last 4 digits of API key to allow case transfer requests (see API tab for Group)</Form.Text>
                                         <Form.Control name="incoming_api_key" isInvalid={invalidIncoming} value={incomingKey} onChange={(e)=>setIncomingKey(e.target.value)}/>
					 {invalidIncoming &&
					  <Form.Text className="error">
					      Either this field OR outgoing API key is required.
					  </Form.Text>
					 }
                                     </Form.Group>
					 <div className="d-flex align-items-center gap-3">
					     <Button variant="outline-secondary" type="cancel" onClick={(e)=>(e.preventDefault(), setShowForm(false))}>Cancel</Button>
					     <Button type="submit" variant="primary">Save</Button>
					 </div>
				     </Form>
				 </Card.Body>
			     </Card>
			    }
			    <Row xs={1} md={2} className="g-4">
				{connections.map((c, index) => {
				    let created = new Date(c.created);
                                    let last_used = c.last_used ? formatDistance(new Date(c.last_used), new Date(), {addSuffix: true}) : "Not used";
				return (
				    <Col>
					<Card bg={c.disabled ? "danger" : "light"} text={c.disabled ? "white" : "dark"} >
					    <Card.Header className="d-flex justify-content-between">
						<Card.Title>
						    <div className="d-flex align-items-center gap-3">
                                                     <DisplayLogo
                                                         name={c.group.name}
                                                         photo={c.group.photo}
                                                         color={c.group.logocolor}
                                                     />
							<div>{c.group.name} Connection</div>
						    </div>
						</Card.Title>
						<DropdownButton variant="btn p-0"
								title={<i className="bx bx-dots-vertical-rounded"></i>}>
						    <Dropdown.Item eventKey="edit" onClick={(e)=>{setEdit(index)}}>Edit Connection</Dropdown.Item>
						    {c.disabled ?
						     <Dropdown.Item eventKey="enable" onClick={(e)=>{enableConnection(c.id)}}>Enable Connection</Dropdown.Item>
						     :
						     <Dropdown.Item eventKey="rm" onClick={(e)=>{setRemoveID(c.id), setDeleteMessage("Are you sure you want to disable this connection?"), setDisplayConfirmationModal(true)}}>Disable Connection</Dropdown.Item>
						    }
						</DropdownButton>
                                            </Card.Header>
					    <Card.Body>
						{c.disabled && <div><b>Connection DISABLED.</b></div>}
						<div><b>URL:</b>{" "}{c.url}</div>
						<div><b>External Key:</b>{" "}{c.external_key}</div>
						{c.incoming_api_key &&
						 <div><b>Internal Key:</b>{" "}******{c.incoming_api_key}</div>
						}
						<div><b>Created:</b>{" "} {format(created, 'yyyy-MM-dd H:mm:ss')} by {c.created_by.name}</div>
						<div><b>Last Used:</b>{" "}{last_used}</div>

					    </Card.Body>
					</Card>
				    </Col>
				)
			    })}
			    </Row>
			</Card.Body>
		    </Card>
		</Tab.Pane>
		<Tab.Pane eventKey="case" key="case">
		    <CaseSettings />
		    
		</Tab.Pane>
			
		<DeleteConfirmation
                    showModal={displayConfirmationModal}
                    confirmModal={submitRemoveConnection}
                    hideModal={hideConfirmationModal}
                    id={removeID}
                    message={deleteMessage} />

	    </Tab.Content>

	</Tab.Container>

    )
}

export default SysAdminApp;
