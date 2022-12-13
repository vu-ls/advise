import React, { useState, useEffect } from 'react';
import {Card, DropdownButton, Dropdown, InputGroup, Form, Row, Col, Table, Accordion, Alert, Button} from 'react-bootstrap';
import CaseThreadAPI from './ThreadAPI';
import ReactQuill, { Quill,editor } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { format, formatDistance } from 'date-fns'
import ContactAPI from './ContactAPI';
import '../css/casethread.css';
import AddGroupModal from './AddGroupModal';


const contactapi = new ContactAPI();

const GroupApp = () => {

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [results, setResults] = useState([]);
    const [initial, setInitial] = useState([]);
    const [searchVal, setSearchVal] = useState("");
    const [searchType, setSearchType] = useState("All");
    const [isLoading, setIsLoading] = useState(false);
    const [addGroupModal, setAddGroupModal] = useState(false);


    const fetchInitialData = async () => {
        try {
            await contactapi.getGroups().then((response) => {
                console.log(response);
		setResults(response);
		setInitial(response);
            });

	}catch (err) {
            console.log('Error: ', err)
        }
    };

    const onFilter = (e) => {
	setSearchVal(e.target.value);
	setIsLoading(true);
    }

    const hideGroupModal = () => {
        setAddGroupModal(false);
        fetchInitialData();
    };
    
    useEffect(() => {
	let urlstr = `type=${searchType}`;
	if (searchVal) {
	    urlstr = `${urlstr}&name=${searchVal}`;
	}

	if (searchType === "All" && !searchVal) {
	    setResults(initial);
	} else {
	    contactapi.searchGroups(urlstr).then((response) => {
		setResults(response);
		setIsLoading(false);
	    });
	}

    }, [searchType, searchVal]);

    useEffect(() => {
        fetchInitialData();
    }, []);


       return (
        <Row>
            <Col lg={8} md={8}>
                {error &&
                 <Alert variant="danger">{error}</Alert>
                }
                {success &&
                 <Alert variant="success"> {success}</Alert>
                }

		<Card>
		    <Card.Header className="pb-0">
			<div className="d-flex justify-content-between">
			    <nav className="navbar navbar-expand-lg">
				<div className="collapse navbar-collapse">
				    <div className="navbar-nav me-auto search-menu">
					<a href="#" onClick={(e)=>(e.preventDefault(), setSearchType("All"))} className="nav-item nav-link active">All</a>
					<a href="#" onClick={(e)=>(e.preventDefault(), setSearchType("Contacts"))} className="nav-item nav-link">Contacts</a>
					<a href="#" onClick={(e)=>(e.preventDefault(), setSearchType("Groups"))} className="nav-item nav-link">Groups</a>
					<a href="#" onClick={(e)=>(e.preventDefault(), setSearchType("Users"))} className="nav-item nav-link">Users</a>
				    </div>
				</div>
			    </nav>
			    
			    <DropdownButton variant="btn p-0"
					    title={<i className="bx bx-dots-vertical-rounded"></i>}
			>
				<Dropdown.Item eventKey='group' onClick={(e)=>setAddGroupModal(true)}>Add Group</Dropdown.Item>
				{/*<Dropdown.Item eventKey='contact'>Add Contact</Dropdown.Item>*/}
			    </DropdownButton>
			</div>
		    </Card.Header>
		    <Card.Body>

			<InputGroup className="w-100">
			    <Form.Control
				placeholder="Search Contacts"
				aria-label="Search Contacts"
				aria-describedby="searchcontacts"
				onChange={(e)=>onFilter(e)}
			    />
			    <Button variant="btn btn-outline-secondary" id="button-addon2" type="submit">
				<i className="fas fa-search"></i>
			    </Button>
			</InputGroup>

		    </Card.Body>
		</Card>

		<Card className="mt-4">
		    <Card.Body>
			{results ?
			 <div className="table-responsive text-nowrap mb-4">
			     <table className="table table-striped">
				 <thead>
				     <tr>
					 <th> Name </th>
					 <th> Tags/Username</th>
					 <th> Type </th>
				     </tr>
				 </thead>
				 <tbody className="table-border-bottom-1">
				     {results.map((group, index) => {
					 return(
					     <tr key={`result-${group.type}-${index}`}>
						 <td><a href={`${group.url}`}>{group.name ?
									       `${group.name}` :
									       `${group.email}`
									      }</a></td>
						 <td>{group.user_name}</td>
						 <td>{group.type}</td>
					     </tr>
					 )
				     })}
				 </tbody>
			     </table>
			 </div>
			 :
			 <p>Loading...</p>
			}
		    </Card.Body>
		</Card>
		<AddGroupModal
                    showModal = {addGroupModal}
                    hideModal = {hideGroupModal}
		/> 
	    </Col>
	   </Row>
       )
}

export default GroupApp;
