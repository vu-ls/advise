import React, { useState, useEffect, useMemo } from 'react';
import {Nav, Dropdown, DropdownButton, InputGroup, CardGroup, Alert, Button, Tab, Tabs, Row, Form, Card, Col} from 'react-bootstrap';
import {Typeahead} from 'react-bootstrap-typeahead';
import AdminAPI from './AdminAPI';
import ThreadAPI from './ThreadAPI';

import '../css/casethread.css';
import 'react-bootstrap-typeahead/css/Typeahead.bs5.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';

const adminapi = new AdminAPI();
const threadapi = new ThreadAPI();

const AdminApp = () => {
    const [activeTab, setActiveTab] = useState(null);
    const [roles, setRoles] = useState([]);
    const [apiError, setApiError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [users, setUsers] = useState([]);

    const fetchInitialData = async () => {
	try {
	    adminapi.getAssignments().then((response) => {
		console.log(response);
		setRoles(response);
            });
	    threadapi.getUserAssignments().then((response) => {
		console.log(response);
		setUsers(response['users']);
	    });

	} catch (err) {
	    console.log(err);
	    setApiError(err);
	}
    };

    useEffect(() => {
	setActiveTab("roles")
	fetchInitialData();
    }, []);


    const RoleCard = (props) => {
	const {role} = props;
	const [showForm, setShowForm] = useState(false);
	const [addUser, setAddUser] = useState("");
	const [error, setError] = useState("");
	const [showError, setShowError] = useState(false);
	const [showRemove, setShowRemove] = useState(false);
	const [weight, setWeight] = useState(1);
	const [badUser, setBadUser] = useState(false);

	function submitUser() {
	    console.log(addUser);
	    if (addUser) {
		const data = {'user': addUser[0].id, 'weight': weight}
		try {
		    adminapi.addAssignment(role.id, data).then((response) => {
			fetchInitialData();
		    });
		} catch (err) {
		    setError("Error adding user");
		}
	    } else {
		setBadUser(true);
	    }
	}

	function removeAssignment(user) {
            const data = {'user': user.userid, 'delete': 1}
            try {
                adminapi.removeAssignment(role.id, data).then((response) => {
                    fetchInitialData();
                });
            } catch (err) {
                setError("Error adding user");
            }
        }

	useEffect(()=> {
	    if (error) {
		setShowError(true);
	    }
	}, [error]);


	return (
            <Col>
                <Card key={role.id} bg="light">
                    <Card.Header className="d-flex justify-content-between">
                        <Card.Title>Role: {role.role}
                        </Card.Title>
			<DropdownButton variant="btn p-0"
					title={<i className="bx bx-dots-vertical-rounded"></i>}>
                            <Dropdown.Item eventKey="add" onClick={(e)=>setShowForm(true)}>Add User to Role</Dropdown.Item>
			    <Dropdown.Item eventKey="rm" onClick={(e)=>setShowRemove(true)}>Remove Users</Dropdown.Item>
			</DropdownButton>
                    </Card.Header>
                    <Card.Body>
			{showError &&
			 <Alert variant="danger">{error}</Alert>
			}

                        {role.users.length > 0 ?
			 <table className="table">
			     <tbody>
			     <tr>
				 <td>
				     <b>User</b>
				 </td>
				 <td><b>Weight</b></td>
				 <td><b>Probability</b></td>
				 <td></td>
			     </tr>

                             {role.users.map((u, index) =>
                                 <tr key={index}><td>{ u.name }</td>
				     <td>{u.weight}</td>
				     <td>{u.probability}</td>
				     <td>{showRemove &&
					  <Button variant="btn p-0" onClick={(e)=>removeAssignment(u)}>
					      <i className="fas fa-times"></i>
					  </Button>
					 }</td>
				 </tr>
                             )}
			     </tbody>
                         </table>
                         :
                         <b>No users assigned.</b>
                        }

                    </Card.Body>
			{showForm &&
			 <>
			     <hr/>
			     <Card.Body>

				 <Row>
				     <Col lg={8}>
					 <Form.Label>User</Form.Label>
					 <Typeahead
					     options={users}
					     labelKey="name"
					     id="addusers"
					     onChange={setAddUser}
					     placeholder="Start typing user"
					 />
					 {badUser &&
					 <Form.Text className="error">
                                             This field is required.
                                         </Form.Text>
					 }
				     </Col>
				     <Col lg={4}>
					 <Form.Label>Weight</Form.Label>
					 <Form.Control type="number" min={1} max={5} step={1} onChange={(e)=>setWeight(e.target.value)} value={weight} />
				     </Col>
				 </Row>
				 <Row className="mt-2">
				     <Col lg={12} className="text-end">
				     <Button variant="btn btn-outline-secondary" onClick={(e)=>submitUser()}>
					 <i className="fas fa-check"></i>
				     </Button>
				     <Button variant="secondary" onClick={(e)=>setShowForm(false)}>
					 <i className="fas fa-times"></i>
				     </Button>
				     </Col>
				 </Row>
			     </Card.Body>

			 </>
			}
                </Card>
            </Col>
	)
    }


    return (
	apiError ?
	    <Alert variant="danger">Error fetching data.</Alert>
	    :


	<Tab.Container
            defaultActiveKey="roles"
            activeKey = {activeTab}
            className="mb-3"
            onSelect={setActiveTab}
        >
	    <Nav variant="pills" className="mb-3">
		<Nav.Item key="roles">
                    <Nav.Link eventKey="roles">Auto Assignment</Nav.Link>
		</Nav.Item>
	    </Nav>
	    <Tab.Content id="admin-fns" className="p-0">
		<Tab.Pane eventKey="roles" key="roles">
		    <Card className="mb-4">
			<Card.Header>Manage Auto Assignment of Cases</Card.Header>
			<Card.Body>
			    <p>Add users to each role.  Roles can be added in <a href="/admin/">Admin</a>. Weight determines probability of user being assigned a case.</p>
			    {roles ?
			     <Row xs={1} md={2} className="g-4">
				{roles.map((r, index) => {
				    return (
					<RoleCard
					    key={r.id}
					    role = {r}
					/>
				    )

				})
				}
			     </Row>
			     :
			     <Alert variant="warning">No roles defined</Alert>
			    }
			</Card.Body>
		    </Card>
		</Tab.Pane>
	    </Tab.Content>
	</Tab.Container>

    )
}

export default AdminApp;
