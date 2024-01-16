import React, { useState, useEffect, useMemo } from 'react';
import {Nav, Dropdown, DropdownButton, InputGroup, CardGroup, Alert, Button, Tab, Tabs, Row, Form, Card, Col} from 'react-bootstrap';
import {Typeahead} from 'react-bootstrap-typeahead';
import AdminAPI from './AdminAPI';
import CVEAPI from './CVEAPI';
import GenericTable from './GenericTable';
import CVETable from "./CVETable";
//import PaginatedTable from "./PaginatedTable";
import UserDetailModal from './UserDetailModal';
import DeleteConfirmation from "./DeleteConfirmation";
import SearchFilter from "./SearchFilter";
import AddCVEUserModal from "./AddCVEUserModal";
import ReserveCVEModal from './ReserveCVEModal';
import CVEAccountPicker from './CVEAccountPicker';

import '../css/casethread.css';
import 'react-bootstrap-typeahead/css/Typeahead.bs5.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';

const adminapi = new AdminAPI();

const ManageCVEApp = () => {
    const [activeTab, setActiveTab] = useState("manage_cve");
    const [accounts, setAccounts] = useState([]);
    const [accountEmail, setAccountEmail] = useState("");
    const [testServer, setTestServer] = useState("");
    const [orgName, setOrgName] = useState("");
    const [status, setStatus] = useState("");
    const [apiError, setApiError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [accountUsers, setAccountUsers] = useState([]);
    const [activeAccount, setActiveAccount] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [cveAPI, setCVEAPI] = useState(null);
    const [cveData, setCVEData] = useState([]);
    const [cveResponse, setCVEResponse] = useState([]);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [removeID, setRemoveID] = useState(null);
    const [tableLoading, setTableLoading] = useState(false);
    const [nextPage, setNextPage] = useState(null);
    const [searchVal, setSearchVal] = useState("");
    const [searchState, setSearchState] = useState("");
    const [searchYear, setSearchYear] = useState("Year");
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [addUser, setAddUser] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [userDetail, setUserDetail] = useState(null);
    const [feedback, setFeedback] = useState("");
    const [formAlert, setFormAlert] = useState(null);
    const [reserveModal, setReserveModal] = useState(false);
    const [cveServerTypes, setCVEServerTypes] = useState([]);
    
    const fetchIdRef = React.useRef(0)

    const hideReserveModal=()=> {
	setReserveModal(false);
	cveAPI.listCVEs().then((response) => {
            console.log(response)
            setCVEResponse(response)
            setCVEData(response.cve_ids)
	});
    }
    
    const hideUser=()=> {
	setAddUser(false);
    }

    const hideDetailModal = () => {
        setShowDetailModal(false);
	fetchAccountInfo();
	
    };

    const updateAdviseCVE = (event) => {
	setFormAlert(null);
	setApiError(null);
	event.preventDefault();
        let error = false;
        const formData = new FormData(event.target),
              formDataObj = Object.fromEntries(formData.entries());
	formDataObj['active'] = status;
        console.log(formDataObj);
	if (formDataObj.email == "" || formDataObj.org_name == "" || formDataObj.server_type == "") {
	    setFormAlert(<Alert variant="danger">All fields are required</Alert>);
	} else {
	    setFormAlert(null);
	}
	try {
            adminapi.updateCVEAccount(selectedAccount.id, formDataObj).then((response) => {
		let updatedaccounts = accounts.filter((item) => item.id != response.id)
		updatedaccounts.push(response);
		setAccounts(updatedaccounts);
		setFormAlert(<Alert variant="success">Got it! Changes have been saved!</Alert>);
	    });
	} catch (err) {
	    console.log("ERR OCCURR");
	    setFormAlert(<Alert variant="danger">Error: {err.message}</Alert>);
	}
    };

    
    function submitAddUser(email, first, last, role) {
	if (editUser) {
	    console.log(editUser);
	    let formField = {};
	    if (editUser.username != email) {
		formField['new_username'] = email;
	    }
	    formField['name.first']= first;
	    formField['name.last']= last;
	    if (role === "Administrator" && (editUser.authority.active_roles.length == 0)) {
		formField["active_roles.add"] = "ADMIN";
	    } else if (editUser.authority.active_roles.length > 0) {
		formField["active_roles.remove"] = "ADMIN";
	    }
	    console.log("EDITING USER");
	    try {
		cveAPI.editUser(editUser.username, formField).then((response) => {
		    console.log(response);
		    setFeedback(response.message);
		    hideUser();
		    fetchAccountInfo();
		});
	    } catch (err) {
		console.log(err);
		setFeedback("Errr " + err.message);
	    }
	} else {
	    /* slightly different format for add vs updates */
            let formField = {'username': email, 'name': {'first':first,'last': last},
			     'active': true, 'authority': {'active_roles': []}}
	    if (role == "Administrator") {
		formField['authority']["active_roles"] = ["ADMIN"];
	    }
	    console.log(formField)

	    try {
		cveAPI.addUser(formField).then((response) => {
		    console.log(response);
		    setFeedback(`Got it! ${response.message}. Secret is ${response.created.secret}`);
		    hideUser();
		    fetchAccountInfo();
		});
	    } catch (err) {
		setFeedback("Error " + err.message);
	    }
	}
    }

    const viewDetails = (props) => {
        setUserDetail(props.row.original);
        setShowDetailModal(true);
        console.log("view details of component");
    };
    
    function confirmRemoveAccount() {
        setRemoveID(selectedAccount.id);
        setDisplayConfirmationModal(true);
        setDeleteMessage(`Are you sure you want to remove this account with organization name \"${selectedAccount.org_name}\" with email \"${selectedAccount.email}\"?  This will not remove the account from the CVE Services API.`);
    }

    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
    }

    const submitRemoveAccount = (id) => {
        console.log("HEREEEE");
        adminapi.deleteCVEAccount(id).then((response) => {
	    setAccounts(accounts=> accounts.filter((item) => item.id != id))
        })
        setDisplayConfirmationModal(false);
    }

    const editUserNow = (props) => {
	setEditUser(props.row.original);
        setAddUser(true);
        console.log("view details of component");
    };

    const cveColumns = useMemo(
	() => [
	    {
		Header: 'CVE',
		accessor: 'cve_id'
	    },
	    {
		Header: 'State',
		accessor: 'state'
	    },
	    {
		Header: 'Date',
		id: 'reserved',
		accessor: 'reserved'
	    },
	    {
                Header: 'Details',
                id: 'expander',
                Cell: ({ row }) => (
                    // Use Cell to render an expander for each row.
                    // We can use the getToggleRowExpandedProps prop-getter
                    // to build the expander.
		    <span  {...row.getToggleRowExpandedProps()}>
                        {row.isExpanded ?
                         <button className="btn btn-secondary btn-xs"><i className="fas fa-angle-down"></i>  Hide Details</button> : <button className='btn m-1 btn-xs btn-secondary'><i className="fas fa-angle-right"></i>  Show Details  </button>}
		    </span>
                ),
		SubCell: () => null
            }
	], []
    );



    const columns = useMemo(
	() => [
	    {
                Header: 'name',
                accessor: d => d.name.first + " " + d.name.last,
            },
            {
                Header: 'username',
                accessor: 'username',
            },
            {
                Header: 'active',
                accessor: d => d.active.toString(),
            },
	     {
                Header: 'Action',
                accessor: 'action',
                 Cell: props => (<div className="text-nowrap"><Button variant="btn-icon px-1" onClick={() => editUserNow(props)}><i className="fas fa-edit"></i></Button> <Button variant="btn-icon px-1" onClick={() => viewDetails(props)}><i className="fas fa-search-plus"></i></Button></div>),
		 
	    }

	], []
    );

    const fetchInitialData = async () => {
        adminapi.getCVEAccounts().then((response) => {
            console.log(response);
            setAccounts(response);
	    if (response.length > 0 ) {
		setSelectedAccount(response[0]);
	    }
        }).catch(err => {
            setApiError(err);
        });
	try {
	    await adminapi.getCVEAPIOptions().then((response) => {
		console.log(`RESPONSE:`);
		console.log(response);
		setCVEServerTypes(response['actions']['POST']["server_type"]["choices"]);
	    }).catch(err => {
		console.log(err);
		setApiError(err);
	    });
	} catch (error) {
	    console.log(error);
	    setApiError(error);
	}

	
    };


    const fetchCVEAccount = async () => {
	setActiveTab("manage_cve");
	try {
            let account = await cveAPI.getUser(selectedAccount.email);
	    console.log(account);
	    setActiveAccount(account.data);

	    /*let org = await cveAPI.getORG();*/
	    
	    
        } catch (err) {
            setApiError(err.message);
	    setActiveTab("account");
	    
	}

    };


    const fetchNextData = async () => {

	await cveAPI.listCVEs(nextPage).then((response) => {
	    if ('nextPage' in response) {
		if (response['currentPage'] < response['pageCount']) {
		    setNextPage(response['nextPage'])
		} else {
		    setNextPage(null);
		}
	    } else {
		setNextPage(null);
	    }
            console.log(response)
	    setCVEResponse(response)
	    setCVEData(response.cve_ids);
	}).catch(err => {
	    console.log(err);
	    console.log("data doesn't span multiple pages");
	})

    }

    const fetchData = () => {
	console.log("loading more...");
	if (nextPage) {
            fetchNextData();
	}
        setTimeout(() => {

        }, 1500);

    };

    const fetchAccountInfo = async () => {
	if (activeAccount) {
	    try {
		cveAPI.listUsers().then((response) => {
		    console.log(response);
		    setAccountUsers(response.users);
		});
	    } catch (err) {
		setApiError("Fail on fetch users: " + err.message);
	    }
	}
    }

    useEffect(() => {
	fetchAccountInfo();
	if (cveAPI) {
	    fetchNextData();
	}
    }, [activeAccount]);

    useEffect(() => {
        fetchInitialData();
    }, []);


    function handleSelectedRows(rows) {
	console.log("do nothing");
    }

    function makeSelect(e) {
	setFormAlert(null);
        console.log(e.target.value);
	let newaccount = accounts.filter((acc) => acc.id == e.target.value);
	if (newaccount.length > 0) {
            setSelectedAccount(newaccount[0]);
	}

    }

    useEffect(() => {
	setIsLoading(false);
	setApiError(null);
	setActiveAccount(null);

	if (selectedAccount) {
	    setAccountEmail(selectedAccount.email);
	    setTestServer(selectedAccount.server_type);
	    setOrgName(selectedAccount.org_name);
	    setStatus(selectedAccount.active);
	    console.log("STATUS is ", selectedAccount.active);
	    setCVEAPI(new CVEAPI(selectedAccount.org_name, selectedAccount.email, selectedAccount.api_key, selectedAccount.server))
	}
    }, [selectedAccount]);

    useEffect(() => {
	if (cveAPI) {
	    fetchCVEAccount();
	    
	}
    }, [cveAPI]);


    const onSearch = (e, field) => {
	if (field == "cve") {
	    let search = e.target.value;
	    setSearchVal(search);
	    if (search === "") {
		setCVEData(cveResponse.cve_ids);
	    } else {
		const result = cveResponse.cve_ids.filter((item) =>
		    item.cve_id.toString().toLowerCase().indexOf(search.toLowerCase()) > -1);
		setCVEData(result);
	    }
	} else if (field == "state") {
	    if (e.target.checked) {
		setSearchState(searchState => [...searchState, e.target.value])
            } else {
                let newstate = searchState.filter((item) => item !== e.target.value);
                setSearchState(newstate);
            }
	} else if (field == "year") {
	    setSearchYear(e);
	    cveAPI.getCVEsByYear(e).then((response) => {
		setCVEData(response.cve_ids);
	    });
	}

    }


    function SubRows({ row, rowProps, visibleColumns, data, loading }) {
	if (loading) {
            return (
                <tr>
                    <td colSpan={visibleColumns.length}>
                        <b>Loading...</b>
                    </td>
                </tr>

            );
        } else {
	    return (
		<tr>
		    <td colSpan={visibleColumns.length}>
		    <pre className="cvejson">
			<code>{JSON.stringify({ values: data }, null, 2)}</code>
		    </pre>
		    </td>
		</tr>
	    )
	}

    }

    function SubRowAsync({ row, rowProps, visibleColumns, api}) {
        const [loading, setLoading] = React.useState(true);
        const [data, setData] = React.useState([]);
	console.log(row.original.cve_id)
        useEffect(() => {
            const timer = setTimeout(() => {
		if (row.original.state == "RESERVED") {
		    api.getCVEMeta(row.original.cve_id).then((response) => {
			console.log(response);
			setData(response);
			setLoading(false);
		    });
		} else {
                    api.getCVE(row.original.cve_id).then((response) => {
			console.log(response);
			setData(response);
			setLoading(false);
                    });
		}
            }, 500);

            return () => {
                clearTimeout(timer);
            };
        }, []);

        return (
            <SubRows
                row={row}
                rowProps={rowProps}
                visibleColumns={visibleColumns}
                data={data}
                loading={loading}
            />
        );
    }



     // Create a function that will render our row sub components
    const showDetails = React.useCallback(
        ({ row, rowProps, visibleColumns, cveAPI }) => (
            <SubRowAsync
                row={row}
                rowProps={rowProps}
                visibleColumns={visibleColumns}
		api = {cveAPI}
            />
        ),
        []
    );


    useEffect(()=> {
	if (searchState) {
	    const result = cveResponse.cve_ids.filter((item) =>
                searchState.includes(item.state));
            setCVEData(result);
	}

    }, [searchState])

    return (
        isLoading ?
	    <div className="text-center">Loading accounts...</div>
            :
	    <>
		{accounts.length > 0 ?
		 <Card className="mb-3">
		     <Card.Header>
			 <Row>
			     <Col lg={4}>
				 <CVEAccountPicker
				     accounts = {accounts}
				     selectedAccount = {selectedAccount}
				     onSelect = {makeSelect}
				 />
			     </Col>
			     <Col lg={2}>
				 <Button size="sm" onClick={(e)=>confirmRemoveAccount()} id="rmcve" variant="danger">Remove this account</Button>
			     </Col>
			     <DeleteConfirmation
				 showModal={displayConfirmationModal}
				 confirmModal={submitRemoveAccount}
				 hideModal={hideConfirmationModal}
				 id={removeID}
				 message={deleteMessage} />
			 </Row>
		     </Card.Header>
		 </Card>
		 :
		 <Alert variant="info">No accounts here. Add an account to continue.</Alert>
		}
		 <Tab.Container
		     defaultActiveKey={apiError?"account":"manage_cve"}
		     activeKey = {activeTab}
		     className="mb-3 mt-3"
		     onSelect={setActiveTab}
		 >
		     <Nav variant="pills" className="mb-3">
			 {activeAccount &&
			  <>
			 <Nav.Item key="manage_cve">
			     <Nav.Link eventKey="manage_cve">CVE Management</Nav.Link>
			 </Nav.Item>
			 <Nav.Item key="manage_user">
			     <Nav.Link eventKey="manage_user">CVE User Accounts</Nav.Link>
			 </Nav.Item>
			  </>
			 }
			 <Nav.Item key="account">
			     <Nav.Link eventKey="account">Account Info</Nav.Link>
			 </Nav.Item>
		     </Nav>
		     <Tab.Content id="admin-fns" className="p-0">
			 {activeAccount &&
			  <>
			 <Tab.Pane eventKey="manage_cve" key="manage_cve">
			     <Card className="mb-4">
				 <Card.Header>
				     <Row>

					 <Col lg={8}>
					     <div className="d-flex align-items-center gap-4">
						 <Card.Title className="text-nowrap">
						     Manage CVEs
						 </Card.Title>
						 <Button onClick={(e)=> setReserveModal(true)} variant="outline-primary">
						     Reserve
						 </Button>
					     </div>
					 </Col>
					 <Col lg={4}>
				     <InputGroup>
					 <Form.Control
					     placeholder="Search CVEs"
					     aria-label="Search CVEs"
					     aria-describedby="searchcves"
					     onChange={(e)=>onSearch(e, "cve")}
					 />
					 <DropdownButton
					     variant="outline-secondary"
					     title="State"
					     id="input-group-dropdown-3"
					 >
					     <Form.Label className="px-3">State</Form.Label>
					     {['RESERVED', 'PUBLISHED', 'REJECTED'].map((o, index) => {
						 return (
						     <Dropdown.ItemText key={index}>
							 <Form.Check
							     onChange={(e)=>onSearch(e, "state")}
							     label={o}
							     value={o}
							     title={o}
							     type="checkbox"
							 />
						     </Dropdown.ItemText>
						 )
					     })}
					 </DropdownButton>
					 <DropdownButton
                                             variant="outline-secondary"
                                             title={searchYear}
                                             id="input-group-dropdown-2"

                                         >
                                             {['2024', '2023', '2022', '2021', '2020'].map((o, index) => {
                                                 return (
                                                     <Dropdown.Item
							 key={o}
							 eventKey={o}
							 value={o}
							 onClick={(e)=>onSearch(o, 'year')}>{o}
						     </Dropdown.Item>
                                                 )
                                             })}
                                         </DropdownButton>
				     </InputGroup>
					 </Col>
				     </Row>
				 </Card.Header>
				 <Card.Body>
				     <CVETable
					 columns = {cveColumns}
					 data = {cveData}
					 update = {fetchData}
					 hasMore = {nextPage ? true : false}
					 showRowExpansion={showDetails}
					 cveAPI = {cveAPI}
				     />

				 </Card.Body>
				 <ReserveCVEModal
				     showModal ={reserveModal}
				     hideModal={hideReserveModal}
				     api = {cveAPI}
				 />
			     </Card>
			 </Tab.Pane>
			 <Tab.Pane eventKey="manage_user" key="manage_user">
			     <Card>
				 <Card.Header>
				     <div className="d-flex justify-content-between">
					 <Card.Title>Users</Card.Title>
					 <Button variant="primary" onClick={(e)=>(setEditUser(null), setAddUser(true))}>Add User</Button>
				     </div>
				 </Card.Header>
				 <Card.Body>
				     {feedback &&
				      <Alert variant="success">{feedback}</Alert>
				     }
				     {accountUsers ?
				      <div className="flex justify-center mt-8">
					  <GenericTable
					      columns = {columns}
					      data={accountUsers}
					      setSelectedRows={handleSelectedRows}
					  />
				      </div>
				      :
				      <Alert variant="info">Fetching Users...</Alert>
				     }

				     <AddCVEUserModal
					 showModal = {addUser}
					 hideModal = {hideUser}
					 confirmModal = {submitAddUser}
					 editUser = {editUser}
				     />
				     <UserDetailModal
					 showModal = {showDetailModal}
					 hideModal = {hideDetailModal}
					 id = {userDetail}
					 api = {cveAPI}
				     />    
				 </Card.Body>
			     </Card>
			 </Tab.Pane>
			      </>
			 }
			 <Tab.Pane eventKey="account" key="account">
			     <Card className="mb-4">
                                 <Card.Header>CVE API Account Information</Card.Header>

                                 <Card.Body>
				     {apiError &&
				      <Alert variant="danger">CVE API Connection Error for this account: {apiError}. Confirm credentials.</Alert>
				     }

				     {formAlert &&
				      <>
					  {formAlert}
				      </>
				     }
				     <Form onSubmit={(e)=>updateAdviseCVE(e)} id="updateCveaccount">
					 {selectedAccount &&
					  <Row>
					      <Col lg={6}>
						  <Form.Label>Active</Form.Label>
						  <Form.Check
						      type="checkbox"
						      name="status"
						      onChange={(e)=>setStatus(e.target.checked?true:false)}
						      checked={status?true:false}
						      label="Active"/>
					      </Col>
					      <Col lg={6}>
						  <Form.Label>Server</Form.Label>
						  <Form.Select name="server_type" value={testServer} onChange={(e)=>setTestServer(e.target.value)}>
						      {cveServerTypes.map((item, index) => {
							  return (
							      <option key={`st-${index}`} value={item.display_name}>{item.display_name}</option>
							  )
						      })}
						  </Form.Select>
					      </Col>
					      <Col lg={6} >
						  <Form.Label>Email</Form.Label>
						  <Form.Control name="email" value={accountEmail} onChange={(e)=>setAccountEmail(e.target.value)} />
					      </Col>
					      <Col lg={6} className="mt-3">
						  <Form.Label>Organization</Form.Label>
						  <Form.Control name="org_name" value={orgName} onChange={setOrgName} />
					      </Col>
					      <Col lg={12}>
						  <Button className="m-2" type="Cancel" variant="secondary" onClick={(e)=>fetchInitialData()}>
						      Cancel
						  </Button>
						  <Button variant="primary" type="submit">
						      Submit
						  </Button>
					      </Col>
					  </Row>

					 }
				     </Form>
				     </Card.Body>
			     </Card>
			 </Tab.Pane>
		     </Tab.Content>
		 </Tab.Container>
	    </>
    )
}

export default ManageCVEApp;
