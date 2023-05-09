import React, { useState, useEffect, useMemo } from 'react';
import {Row, Table, Alert, Card, Col, ListGroup, Button, Form, Dropdown, Tab, Nav, InputGroup, DropdownButton} from 'react-bootstrap';
import InfiniteScroll from 'react-infinite-scroll-component'
import ActivityApp from './ActivityApp.js';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Image from 'react-bootstrap/Image'
import { format, formatDistance } from 'date-fns'
import GroupAdminTable from "./GroupAdminTable";
import ComponentTable from './ComponentTable';
import DisplayLogo from "./DisplayLogo";
import '../css/casethread.css';
import ContactAPI from './ContactAPI';
import DeleteConfirmation from './DeleteConfirmation';
import AddContactModal from './AddContactModal';
import GroupContactApp from './GroupContactApp';

const contactapi = new ContactAPI();

const GroupAdminApp = (props) => {

    const [apiError, setApiError] = useState(false);
    const [apiKey, setApiKey] = useState(null);
    const [keys, setKeys] = useState([]);
    const [activeTab, setActiveTab] = useState("group");
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [unverifiedContacts, setUnverifiedContacts] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [removeAPI, setRemoveAPI] = useState(false);
    const [refreshAPI, setRefreshAPI] = useState(false);
    const [removeID, setRemoveID] = useState([]);
    const [removeGroup, setRemoveGroup] = useState(false);
    const [addContactModal, setAddContactModal] = useState(false);
    const [editContact, setEditContact] = useState(null);
    const [tableLoading, setTableLoading] = useState(false);
    const [update, setUpdate] = useState(false);
    const [unverifiedTableLoading, setUnverifiedTableLoading] = useState(false);
    const [unverifiedUpdate, setUnverifiedUpdate] = useState(false);
    const [activity, setActivity] = useState([]);
    const [activityHasMore, setActivityHasMore] = useState(false);
    const [activityNext, setActivityNext] = useState(null);
    const [activityLoading, setActivityLoading] = useState(true);

    const columns = useMemo(
	() => [
            {
                id: "selection",
                // The header can use the table's getToggleAllRowsSelectedProps method
                // to render a checkbox
                Header: ({ getToggleAllRowsSelectedProps }) => (
                    <div>
                        <input type="checkbox" {...getToggleAllRowsSelectedProps()} />
                    </div>
                ),
                // The cell can use the individual row's getToggleRowSelectedProps method
                // to the render a checkbox
                Cell: ({ row }) => (
                    <div>
                        <input type="checkbox" {...row.getToggleRowSelectedProps()} />
                    </div>
                )
            },
            {
                Header: 'name',
                accessor: 'contact.name',
		Cell: props => (
		    <a href={`/advise/contact/${props.row.original.contact.uuid}/`}>{props.row.original.contact.name}</a>
		)
            },
	    {
		Header: 'email',
		accessor: 'contact.email'
	    },
	    {
		Header: 'phone',
		accessor: 'contact.phone'
	    },
	    {
		Header: 'user',
		accessor: 'contact.user_name'
	    },
	    {
		Header: 'admin',
		accessor: d => {return d.group_admin ? <i className="fas fa-crown"></i> : "" },
	    },
	    {
		Header: 'perms',
		accessor: 'action',
		Cell: props => (
		    <div className="text-nowrap">
			{props.row.original.group_admin ?
			 <Button variant="btn-icon px-1" title="Remove admin permissions" onClick={() => changePerms(props, )}>
			     <i className="fas fa-ban"></i>
			 </Button>
			 :
			 <Button variant="btn-icon px-1" title="Make group admin" onClick={() => changePerms(props)}>
                             <i className="fas fa-crown"></i>
			 </Button>
			}
		    </div>
		)
	    },

	], []
    );

    const unverified_columns =  useMemo(
        () => [
            {
                Header: 'name',
                accessor: 'contact.name',
		Cell: props => (
                    <a href={`/advise/contact/${props.row.original.contact.uuid}/`}>{props.row.original.contact.name}</a>
                )
            },
            {
                Header: 'email',
                accessor: 'contact.email'
            },
            {
                Header: 'phone',
                accessor: 'contact.phone'
            },
            {
                Header: 'user',
                accessor: 'contact.user_name'
            },
	    {
                Header: 'Action',
                accessor: 'action',
                Cell: props => (
                    <div className="text-nowrap d-flex gap-2">
                        <Button variant="primary" size="sm" title="Verify" onClick={() => verifyUser(props, )}>
			    Verify
                        </Button>
                        <Button variant="danger" size="sm" title="Remove Unverified User" onClick={() => removeUnverifiedUser(props)}>
			    Remove
			</Button>
		    </div>
		)
            },
        ], []
    );


    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
	setRemoveAPI(false);
    };

    const generateNewColor = async () => {
	var randomColor = Math.floor(Math.random()*16777215).toString(16);
	let data = {'logocolor': '#'+randomColor};
	await contactapi.updateMyGroup(selectedGroup.id, data).then(response => {
	    /* todo - just modify group in place */

	    fetchInitialData();
	}). catch(err => {
	    setApiError(`Error generating new color: ${err.message}`);
	});
    };

    const verifyUser = async (contact) => {
	let data = {'verified': true};
	await contactapi.updateGroupContact(contact.row.original.id, data).then(response=> {
            setUnverifiedUpdate(true);
	    setUpdate(true);
        }).catch(err => {
            setApiError(`Error verifying user: ${err.response.data.detail}`);
        });
    };

    const removeUnverifiedUser = async (contact) => {
	const rmnames = [contact.row.original.contact.name];
	setRemoveID([contact.row.original.id]);
        setDeleteMessage(`Are you sure you want to remove the following contacts: ${rmnames}?`);
        setDisplayConfirmationModal(true);
    };



    const changePerms = async (contact) => {
	setApiError(null);
	let data = {};
	if (contact.row.original.group_admin) {
	    data = {'group_admin': false}
	} else {
	    data = {'group_admin': true}
	}
	await contactapi.updateGroupContact(contact.row.original.id, data).then(response=> {
	    setUpdate(true);
	}).catch(err => {
	    setApiError(`Error changing user permissions: ${err.response.data.message}`);
	});
    };

    const resetImage = async () => {
        let data = {'logo': 'reset'};
        await contactapi.updateMyGroup(selectedGroup.id, data).then(response => {
            /* todo - just modify group in place */

            fetchInitialData();
        }). catch(err => {
            setApiError(`Error removing logo: ${err.message}`);
        });
    };

    const addLogo = async(e) => {
	let formData = new FormData();
	formData.append('logo', e.target.files[0]);
        await contactapi.updateMyGroup(selectedGroup.id, formData).then(response => {
            /* todo - just modify group in place */
            fetchInitialData();
        }). catch(err => {
            setApiError(`Error adding logo: ${err.message}`);
        });
    };


    const showDeleteGroupModal = () => {
	setDeleteMessage("Are you sure you want to delete this group? This cannot be undone.");
	setRemoveGroup(true);
        setDisplayConfirmationModal(true);
    }


    const showDeleteModal = () => {
        /*get selected rows and add them to removeid */
        let rmids = [];
        let rmnames = [];
	console.log(selectedRows);
        selectedRows.map(item => {
            rmids.push(item.original.id)
	    if (item.original.contact.name) {
		rmnames.push(item.original.contact.name)
	    } else {
		rmnames.push(item.original.contact.email)
	    }
        });
        if (rmnames.length > 0) {
            setRemoveID(rmids);
            setDeleteMessage(`Are you sure you want to remove the following contacts: ${rmnames}?`);
        } else {
            setDeleteMessage("Please select a contact to remove.");
        }
        setDisplayConfirmationModal(true);
    };


    const confirmRemoveAPI = (api) => {
	setRemoveID(api.last_four);
	setRemoveAPI(true);
	setDeleteMessage(`Are you sure you want to remove API key ***${api.last_four}?`);
        setDisplayConfirmationModal(true);
    }

    const confirmRefresh = (api) => {
	setRemoveID(api.last_four);
        setRefreshAPI(true);
	setDeleteMessage(`Are you sure you want to replace API key ***${api.last_four}? A new API key will be generated.`);
        setDisplayConfirmationModal(true);
    }



    const submitRemoveContact = () => {
	if (removeAPI) {
	    contactapi.removeAPIKey(selectedGroup.id, removeID).then((reponse) => {
		fetchAPIKeys();
	    })
		.catch(err=> {
		    setApiError(`Error removing API Key: ${err.message}`);
		})
	} else if (refreshAPI) {
	    contactapi.refreshAPIKey(selectedGroup.id, removeID).then((response) => {

		setApiKey(response.data.key);
		fetchAPIKeys();
	    })
	        .catch(err=> {
		    setApiError(`Error refreshing API Key: ${err.message}`);
		})
	} else if (removeGroup) {
	    setRemoveGroup(false);
	    contactapi.removeGroup(props.group).then((response) => {
		window.location.href='/advise/groups/search/';
	    })
		.catch(err=>{
		    setApiError(`Error deleting group: ${err.message}`);
		});

	} else {
            contactapi.removeGroupContact(removeID).then((response) => {
		fetchInitialData();
            })
		.catch(err => {
		    setApiError(`Error removing contact: ${err.message}`);
		});
	}
	setRemoveAPI(false);
	setRefreshAPI(false);
	setDisplayConfirmationModal(false);
    }

    const createAPIKey = async () => {
	await contactapi.createAPIKey(selectedGroup.id).then((response) => {
	    setApiKey(response.data.key)
	    fetchAPIKeys();
	})
	    .catch(err=> {
		setApiError(`Error creating API key: ${err.message}`);
	    });
    };

    const fetchAPIKeys = async () => {
	await contactapi.getAPIKeys(selectedGroup.id).then((response) => {
            setKeys(response.data)
        })
            .catch(err=> {
                setApiError(`Error fetching API key: ${err.message}`);
            });
    };


    useEffect(() => {

	if (selectedGroup) {
	    fetchAPIKeys();
	    fetchActivity();
	}

    }, [selectedGroup]);

    const fetchContacts = React.useCallback(({group, api}) => {
	setTableLoading(true);
	setUpdate(false);
	api.getGroupContacts(group.id).then((response) => {
	    setContacts(response.data);
	    setTableLoading(false);
	})
	    .catch(err => {
		console.log(err);
		setApiError(`Error retrieving group contacts: ${err.message}`);
	    });

    }, []);

    const fetchUnverifiedContacts = React.useCallback(({group, api}) => {
        setUnverifiedTableLoading(true);
        setUnverifiedUpdate(false);
        api.getUnverifiedContacts(group.id).then((response) => {
	    setUnverifiedContacts(response.data);
	    setUnverifiedTableLoading(false);
        })
	    .catch(err => {
                console.log(err);
                setApiError(`Error retrieving unverified users: ${err.message}`);
	    });

    }, []);

    const renderCopyTooltip = (props) => (
	<Tooltip id="copy-tooltip" {...props}>
	    Click to copy to clipboard
	</Tooltip>
    );

    const fetchGroupData = async () => {
	setApiError(null);
	try {
            contactapi.getGroup(props.group).then((response) => {
		console.log("GETTING GROUP!")
		console.log(response);
                setGroups([response.data]);
                setIsLoading(false);
                setSelectedGroup(response.data.group);
            });
        } catch (err) {
            setApiError(err);
        }
    };

    const fetchInitialData = async () => {
	if (props.group) {
	    fetchGroupData();
	    return;
	}
	setApiError(null);
        try {
            contactapi.getMyGroups().then((response) => {
                setGroups(response);
		setIsLoading(false);
		if (selectedGroup) {
		    let newgroup = response.filter(g => g.id==selectedGroup.id);
		    if (newgroup.length > 0) {
			setSelectedGroup(newgroup[0])
		    }
		} else if (response.length > 0 ) {
                    setSelectedGroup(response[0]);
                }
            });
        } catch (err) {
            setApiError(err);
        }
    };

    function handleManage(evt, evtKey) {
        switch(evt) {
        case 'add' :
	    setAddContactModal(true);
            return;
	case 'edit':
	    if (selectedRows.length > 0) {
		setEditContact(selectedRows[0].original);
		setAddContactModal(true);
	    }
	    return;
        case 'remove':
	    showDeleteModal();
            return;
	case 'message':
	    window.location.href=`/advise/inbox/${selectedGroup.uuid}/`;
	    return;
	case 'activate':
	    contactapi.activateGroup(props.group).then((response) => {
		fetchGroupData(props.group);
	    });
	    return;
	case 'deactivate':
	    contactapi.deactivateGroup(props.group).then((response) => {
		fetchGroupData(props.group);
	    });
	    return;
	case 'delete':
	    showDeleteGroupModal();
	    return;

	}
    };

    const fetchActivity = async () => {
	try {
	    let results = await contactapi.getGroupActivity(selectedGroup.uuid);
            let data = await results.data;
	    console.log("IN ACTIVITY");
	    console.log(data);
            setActivity(data.results);
            setActivityNext(data.next);
            if (data.next) {
                setActivityHasMore(true);
            }
            setActivityLoading(false);
        } catch(err) {
            setApiError(err.response.data.message);
        }
    };

    const fetchMoreActivity = async (page) => {
        try {
            let results = await contactapi.getGroupActivity(selectedGroup.uuid, activityNext);
            let data = await results.data;
            console.log(data);
            setActivity(activity.concat(data.results));
            setActivityNext(data.next);
            if (data.next) {
                setActivityHasMore(true);
            } else {
                setActivityHasMore(false);
            }
        } catch(err) {
            console.log(err);
            setApiError("Error fetching more activity");
        }
    }

    const hideContactModal = () => {
	setAddContactModal(false);
	setEditContact(null);
	if (props.group) {
	    fetchGroupData();
	} else {
	    fetchInitialData();
	}
    }



    useEffect(() => {
	if (props.group) {
	    fetchGroupData();
	} else {
            fetchInitialData();
	}
    }, []);

    function noSelect(rows) {
    }

    function handleSelectedRows(rows) {
        setSelectedRows(rows);
    }

    function makeSelect(e) {
	setApiError(null);
	let newgroup = groups.filter((acc) => acc.id == e.target.value);
        if (newgroup.length > 0) {
            setSelectedGroup(newgroup[0]);
        }
    }

    return (

	isLoading ?
            <div className="lead text-center">Loading accounts...</div>
            :
            <>
		{groups.length > 1 ?
		 <Card className="mb-3">
                     <Card.Header>
                         <Row>
                             <Col lg={4}>
                                 <Form.Group>
                                     <Form.Label>Choose your group</Form.Label>
				      <Form.Select value={selectedGroup.id} onChange={(e)=>makeSelect(e)}>
                                         {groups.map((a, index) => {
                                             return (
                                                 <option key={index} value={a.id}>{a.name}</option>
                                             )
                                         })
                                         }
                                      </Form.Select>
                                 </Form.Group>
                             </Col>
			 </Row>
		     </Card.Header>
		 </Card>
		 :
		 ""
		}

		{apiError &&
		 <Alert variant="danger">{apiError}</Alert>
		}

		<Tab.Container
		    defaultActiveKey="group"
		    activeKey = {activeTab}
		    className="mb-3"
		    onSelect={setActiveTab}
		>
		    <Nav variant="pills" className="mb-3">
			<Nav.Item key="group">
			    <Nav.Link eventKey="group"><i className="bx bx-user me-1"></i>{" "}{props.group ? "Group Details" : "My Contacts"}</Nav.Link>
			</Nav.Item>

                        <Nav.Item key="contactinfo">
                            <Nav.Link eventKey="contactinfo"><i className="fas fa-mobile-alt"></i>{" "} Contact Information {selectedGroup.support_email ? "" : <i className="fas fa-exclamation-triangle text-danger"></i> }</Nav.Link>
                        </Nav.Item>

			<Nav.Item key="permissions">
                            <Nav.Link eventKey="permissions"><i className="fas fa-user-lock"></i>{" "} Permissions</Nav.Link>
                        </Nav.Item>

			<Nav.Item key="verifications">
                            <Nav.Link eventKey="verifications"><i className="bx bx-bell"></i>{" "}Unverified users {unverifiedContacts.length > 0 ? <i className="fas fa-exclamation-triangle text-danger"></i> : "" }</Nav.Link>
                        </Nav.Item>

			<Nav.Item key="api">
                            <Nav.Link eventKey="api"><i className="fas fa-key"></i>{" "} API</Nav.Link>
                        </Nav.Item>
			{props.group &&
			 <Nav.Item key="components">
			     <Nav.Link eventKey="components"><i className="fas fa-microchip"></i>{" "}Components</Nav.Link>
			 </Nav.Item>
			}


		    </Nav>
		    <Tab.Content id="admin-fns" className="p-0">
			<Tab.Pane eventKey="group" key="group">
			    {selectedGroup &&
			    <Card className="mb-4">

				<Card.Header>
				    <div className="d-flex justify-content-between">
					<div className="d-flex align-items-center gap-1">
					    {selectedGroup.photo ?
					     <Image className="large-profile rounded-circle" src={selectedGroup.photo} rounded />
					     :
					     <>
						 <div className="d-block rounded large-profile rounded-circle text-center flex-shrink-0" style={{backgroundColor: selectedGroup.logocolor}}>
						 <span className="logo-initial">{selectedGroup.name[0]}</span></div>
					     </>
					    }

					    <h3 className="px-3">
						{selectedGroup.name}
						{props.group && groups[0].active ?
						 " (Active)"
						 :
						 " (Inactive)"
						}
					    </h3>

					    <div className="button-wrapper">
						<div className="mb-2 d-flex align-items-center  gap-2">
						    <Button
							onClick={(e)=>generateNewColor()}
							variant="outline-secondary"><i className="fas fa-palette"></i> New icon color</Button>
						<label htmlFor="upload" className="btn btn-primary">
						    <span className="d-none d-sm-block">Upload logo</span>
						    <input
							type="file"
							id="upload"
							className="account-file-input"
							hidden
							accept="image/png, image/jpeg"
							onChange={(e)=>addLogo(e)}
						    />
						</label>
						    {selectedGroup.photo &&
						     <Button variant="outline-secondary" onClick={(e)=>resetImage()}>
							 <span className="d-none d-sm-block">Reset</span>
						     </Button>
						    }
						</div>
						<p className="text-muted mb-0">Allowed JPG, GIF or PNG. Max size of 800K</p>
					    </div>

					</div>
					<DropdownButton
					    variant="primary"
					    title={
						<span>Manage <i className="fas fa-chevron-down"></i></span>
					    }
					    onSelect={handleManage}
					>
					    <Dropdown.Item eventKey="add">Add Contact</Dropdown.Item>
					    <Dropdown.Item eventKey="edit">Edit Contact</Dropdown.Item>
					    <Dropdown.Item eventKey="remove">Remove Contact</Dropdown.Item>
					    {props.group &&
					     <>
						 {groups[0].active ?
						  <Dropdown.Item eventKey="deactivate">Deativate Group</Dropdown.Item>
						  :
						  <Dropdown.Item eventKey="activate">Activate Group</Dropdown.Item>
						 }
						 <Dropdown.Item eventKey="message">Message Group</Dropdown.Item>
						 <Dropdown.Item eventKey="delete">Remove Group</Dropdown.Item>
					     </>
					    }

					</DropdownButton>
				    </div>
				</Card.Header>
				<Card.Body>
				    <div className="flex justify-center mt-8">
					<GroupAdminTable
					    columns={columns}
					    data = {contacts}
					    setSelectedRows = {handleSelectedRows}
					    fetchData = {fetchContacts}
					    group = {selectedGroup}
					    api = {contactapi}
					    loading= {tableLoading}
					    update={update}
					/>

				    </div>

				</Card.Body>
				<AddContactModal
				    showModal = {addContactModal}
				    hideModal = {hideContactModal}
				    title = {editContact? "Edit Contact" : `Add Contact to ${selectedGroup.name}`}
				    edit = {editContact}
				    group = {selectedGroup}
				/>

				<DeleteConfirmation
				    showModal={displayConfirmationModal}
				    confirmModal={submitRemoveContact}
				    hideModal={hideConfirmationModal}
				    id={removeID}
				    message={deleteMessage} />
			    </Card>


			    }
			</Tab.Pane>
			<Tab.Pane eventKey="contactinfo" key="contactinfo">
			    <Card>
				<Card.Header>
				    <Card.Title>Organization Contact Information
				    </Card.Title>
				</Card.Header>
				<Card.Body>
				    <GroupContactApp
					group={selectedGroup}
					update = {fetchInitialData}
				    />
				</Card.Body>
			    </Card>
			</Tab.Pane>

                        <Tab.Pane eventKey="permissions" key="permissions">
                            <Card>
                                <Card.Header>
				    Group Case Permissions
                                </Card.Header>
                            </Card>

                        </Tab.Pane>

			<Tab.Pane eventKey="verifications" key="verifications">
                            <Card>
                                <Card.Header>
				    <Card.Title>Unverified Users</Card.Title>
                                </Card.Header>
				<Card.Body>
                                    <div className="flex justify-center mt-8">
                                        <GroupAdminTable
                                            columns={unverified_columns}
                                            data = {unverifiedContacts}
                                            setSelectedRows = {noSelect}
                                            fetchData = {fetchUnverifiedContacts}
                                            group = {selectedGroup}
                                            api = {contactapi}
                                            loading= {unverifiedTableLoading}
                                            update={unverifiedUpdate}
                                        />
                                    </div>
                                </Card.Body>
                            </Card>

                        </Tab.Pane>

			<Tab.Pane eventKey="api" key="api">
                            <Card>
                                <Card.Header>
				    <div className="d-flex justify-content-between align-items-start">
					<Card.Title>Group API Keys</Card.Title>
					<Button
					    variant="primary"
					    disabled={selectedGroup.support_email ? false : true}
					    onClick={()=>createAPIKey()}
					>Add API Key</Button>
				    </div>
                                </Card.Header>
				<Card.Body>
				    <>
					{apiKey &&
					 <Alert variant="success">Your API Key is: <b><OverlayTrigger
											  placement="right"
											  delay={{ show: 250, hide: 400 }}
											  overlay={renderCopyTooltip}
										      >
											  <span className="api_token" onClick={() => navigator.clipboard.writeText(apiKey)}>
											  {apiKey}</span>
										      </OverlayTrigger>
										   </b>
					     <br/>
					     Copy this key to safe place. Should you lose access to this key, you will have to generate a new one.
					 </Alert>
					}
				    </>

				    {selectedGroup.support_email ?

				     <>
					 {keys.length > 0 ?
					  <Table striped bordered hover>
					      <thead>
						  <tr>
						      <th>Key</th>
						      <th>Created</th>
						      <th>Last Used</th>
						      <th>Action</th>
						  </tr>
					      </thead>
					      <tbody>
					      {keys.map((k, index) => {

						  let created = new Date(k.created);
						  let last_used = k.last_used ? formatDistance(new Date(k.last_used), new Date(), {addSuffix: true}) : "Not used";

						  return (
						      <tr key={k.last_four}>
							  <td>
							      ******{k.last_four}
							  </td>
							  <td>
							      {format(created, 'yyyy-MM-dd H:mm:ss')}
							  </td>
							  <td>
							      {last_used}
							  </td>
							  <td>
							      <Button variant="btn-icon p-1" onClick={()=>confirmRemoveAPI(k)}><i className="fas fa-trash"></i></Button>
							      <Button variant="btn-icon p-1" onClick={()=>confirmRefresh(k)}><i className="fas fa-sync-alt"></i></Button>
							  </td>
						      </tr>
						  )
					      })}
					      </tbody>
					  </Table>
					  :
					  <p>No API accounts have been created.</p>

					 }
				     </>
				     :
				     <Alert variant="danger">Please add an email address for your organization before adding an API key.</Alert>
				    }
				</Card.Body>
                            </Card>

                        </Tab.Pane>
			{props.group &&
			 <Tab.Pane eventKey="components" key="components">
			     <ComponentTable
				 group={props.group}
			     />
			 </Tab.Pane>
			}

		    </Tab.Content>
		</Tab.Container>
	    <Card>
		<Card.Header>
		    <Card.Title>Recent Activity</Card.Title>
		</Card.Header>
		<Card.Body>
		    {activityLoading ?
                     <div className="text-center">
                         <div className="lds-spinner"><div></div><div></div><div></div></div>
                     </div>
                     :
		     <div id="scrollableDiv">
                         <InfiniteScroll
                             dataLength={activity.length}
                             next={fetchMoreActivity}
                             hasMore={activityHasMore}
                             loader={<div className="text-center"><div className="lds-spinner"><div></div><div></div><div></div></div></div>}
                             endMessage={<div className="text-center">No more activity updates</div>}
                             scrollableTarget="scrollableDiv"
                         >
			     <ListGroup variant="flush">
                                 {activity.map((a, index) => {
                                     return (
                                         <ListGroup.Item action className="p-2 border-bottom" key={`activity-${index}`}>           
                                             <ActivityApp
                                                 activity = {a}
					     />
                                         </ListGroup.Item>
                                     )
                                 })}
                             </ListGroup>
                         </InfiniteScroll>
                     </div>
		    }
		</Card.Body>
	    </Card>

	    </>
    )

}


export default GroupAdminApp;
