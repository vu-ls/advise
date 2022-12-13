import React from 'react';
import { Modal, Alert, Badge, FloatingLabel, Button, InputGroup, Form, Row, Col } from "react-bootstrap";
import { useCallback, useState, useEffect } from 'react';
import ContactAPI from './ContactAPI.js';
import ComponentAPI from './ComponentAPI';
import {AsyncTypeahead} from 'react-bootstrap-typeahead';
import DisplayLogo from "./DisplayLogo";
import 'react-bootstrap-typeahead/css/Typeahead.bs5.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import '../css/casethread.css'

const contactapi = new ContactAPI();
const componentapi = new ComponentAPI();

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

const SelectGroupModal = ({showModal, hideModal, selected}) => {

    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [query, setQuery] = useState("");
    const [options, setOptions] = useState([]);
    const [invalidOwner, setInvalidOwner] = useState(false);
    const [owner, setOwner] = useState("");

    useEffect(() => {
	setError("");
    }, [showModal]);

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

    const handleSubmit = async() => {
	let formdata = new FormData();
	if (owner.length == 0) {
	    setInvalidOwner(true);
	    return;
	}
	console.log(owner);
	console.log(selected);
	selected.forEach((item) => (
	    formdata.append('components[]', item.original.id)
	));
	formdata.append('group', owner[0]["uuid"]);
	
	console.log(formdata);
	try {
	    let res = await componentapi.updateComponentOwner(formdata);
	    let data = await res.data;
	    hideModal();
	} catch (err) {
	    console.log(err);
	    setError(`Error adding group: ${err.response.data.message}`);

	}
    }


    return (

	<Modal show={showModal} onHide={hideModal} size="lg" centered backdrop="static">
            <Modal.Header closeButton className="border-bottom">
                <Modal.Title>Select Product Owner</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {selected.length == 0 ?
                 <div className="alert alert-danger">Please select rows before adding a supplier.</div>
                 :

		 <Form>
		     {error &&
		      <Alert variant="danger">{error}</Alert>
		     }
                    <Form.Group className="mb-3" controlId="_type">
                        <Form.Label>Select Owner:</Form.Label>
                        <AsyncTypeahead
                            id="owner"
                            options = {options}
                            isLoading={isLoading}
                            onPaginate={handlePagination}
                            onSearch={handleSearch}
                            paginate
                            onChange={setOwner}
                            onInputChange={handleInputChange}
                            labelKey="name"
                            isInvalid={invalidOwner}
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
                    </Form.Group>

		     {invalidOwner &&
		      <Form.Text className="error">
                          This field is required.
                      </Form.Text>
                     }
		     {selected.some(comp => !comp.original.owner) &&
		      <p>Adding ownership to the following components:</p>
		     }
		     <ul>
			 {selected.filter(comp => !comp.original.owner).map( fcomp => (
			     <li key={`comp-${fcomp.original.id}`}>{fcomp.original.name}</li>
			 ))}
		     </ul>
		     {selected.some(comp=>comp.original.owner) &&
		      <p>Changing ownership of the following components:</p>
		     }
                     <ul>
                         {selected.filter(comp => comp.original.owner).map( fcomp => (
                             <li key={`comp-${fcomp.original.id}`}>{fcomp.original.name}</li>
                         ))}
                     </ul>
		 </Form>
		 
		}

	    </Modal.Body>
            <Modal.Footer>
                <Button variant="outline-secondary" type="cancel" onClick={(e)=>(e.preventDefault(), hideModal())}>Cancel</Button>
		{selected.length > 0 &&
                 <Button
		     type="submit"
		     onClick={(e)=>handleSubmit()}
		     variant="primary"
		     disabled={owner ? false: true}>
		 Submit </Button>
		}
            </Modal.Footer>

	</Modal>
    )

};

export default SelectGroupModal;
