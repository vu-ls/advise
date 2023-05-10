import React from 'react';
import { Alert, Modal, Card, Badge, FloatingLabel, Button, InputGroup, Form, Row, Col } from "react-bootstrap";
import {AsyncTypeahead} from 'react-bootstrap-typeahead';
import { useCallback, useState, useEffect } from 'react';
import MessageAPI from './MessageAPI';
import 'react-bootstrap-typeahead/css/Typeahead.bs5.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import '../css/casethread.css'
import DisplayLogo from "./DisplayLogo";
import ReactQuill, { Quill,editor } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ContactAPI from './ContactAPI';
import DeleteConfirmation from './DeleteConfirmation';
import ReCAPTCHA from "react-google-recaptcha";

const recaptchaRef = React.createRef();
const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY || null;

const contactapi = new ContactAPI();

const messageapi = new MessageAPI();

const CACHE = {};
const PER_PAGE = 50;

function makeAndHandleRequest(query, page = 1) {
    return contactapi.searchAllContacts(query).then((response) => {
	let items = response;
	let total_count = items.length;
	const options = items.map((i) => ({
	    name: i.name,
	    email: i.email,
	    uuid: i.uuid,
	    color: i.logocolor,
	    logo: i.photo
	}));
	return {options, total_count};
    });
}


const NewMessage = (props) => {

    const [messageTo, setMessageTo] = useState([]);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState("");
    const [suggested, setSuggested] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [query, setQuery] = useState("");
    const [options, setOptions] = useState([]);
    const [invalidMessage, setInvalidMessage] = useState(false);
    const [invalidMessageTo, setInvalidMessageTo] = useState(false);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [allowSelectUser, setAllowSelectUser] = useState(false);


    const closeMessage = (e) => {
	console.log("close message");
	setDeleteMessage("Your message is unsent.  Do you really want to cancel?")
	setDisplayConfirmationModal(true);
    }

    const modules = React.useMemo(
        () => ({
            toolbar: [
            [{ header: '1' }, { header: '2' }],
		[('bold', 'italic', 'indent', 'underline', 'strike', 'blockquote')],
		[{ list: 'ordered' }, { list: 'bullet' }],
		['link', 'image', 'formula'],
		['code-block']
            ],
	}), []
    );

    const handleInputChange = (q) => {
	setQuery(q);
    };

    const clearText = () => {
        setMessage('');
    }

    const lookupContact = async(contact) => {
	console.log("IN LOOKUP CONTACT!")

	await contactapi.getContact(contact).then((response) => {
	    console.log(response.data);
	    if (response.data.user_name) {
		setMessageTo([{'uuid':response.data.uuid, 'name':response.data.user_name, 'color': response.data.logocolor}]);
	    } else {
		setMessageTo([{'uuid':response.data.uuid, 'name':response.data.name, 'color': response.data.logocolor}]);
	    }
	    setIsLoading(false);

	}).catch(err => {
	    setError("Can't find user.");
	    console.log(err);
	});
    }

    useEffect(() => {
	if (props.coordinator) {
	    setAllowSelectUser(true);
	}
	if (props.sendContact) {
	    setIsLoading(true)
	    lookupContact(props.sendContact)
	}
    }, [props]);

    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
    }

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

    const submitPost = async (e) => {
	e.preventDefault();

        let formField = new FormData();
	if (RECAPTCHA_SITE_KEY) {
	    const token = await recaptchaRef.current.executeAsync();
	    formField.append('token', token);
	}

	if (message == "") {
	    setInvalidMessage(true);
	    return;
	} else {
	    setInvalidMessage(false);
	}
	if (messageTo == "" && allowSelectUser) {
	    setInvalidMessageTo(true);
	    return;
	} else {
	    setInvalidMessageTo(false);
	}
	formField.append('content', message);
	console.log(messageTo);
	if (allowSelectUser) {
	    for (var i = 0; i < messageTo.length; i++) {
		formField.append('users[]', messageTo[i].uuid);
            }
	}
	console.log(formField);
	if (props.group) {
	    formField.append('from', props.group);
	}
	await messageapi.createThread(formField).then((response) => {
	    if (props.sendContact) {
		window.location.href="/advise/inbox";
	    }
	    setMessage('');
	    props.reload("Got it! Your message has been sent!");

	}).catch(err => {
	    console.log(err);
	    setError(`Error sending message: ${err.response.data.message}`);
	});

    };

    return (
	<Card>
            <Card.Header>
		<div className="d-flex justify-content-between">
		    <Card.Title>
			New Message
		    </Card.Title>
		    <Button variant="btn-icon" onClick={(e)=>closeMessage(e)}>Cancel</Button>
		</div>
            </Card.Header>

	    <Card.Body className="pb-5">
		{error &&
		 <Alert variant="danger"> {error}</Alert>
		}

		<Form>
		    {allowSelectUser ?
		     <>
			 <Form.Group className="mb-3" controlId="_type">
			     <Form.Label>To:</Form.Label>
			     <AsyncTypeahead
				 id="messageto"
				 multiple
				 options = {options}
				 isLoading={isLoading}
				 onPaginate={handlePagination}
				 onSearch={handleSearch}
				 paginate
				 onChange={setMessageTo}
				 onInputChange={handleInputChange}
				 labelKey={(option) => (option.email ? `${option.name} (${option.email})` :
							`${option.name}`)}

				 filterBy={["name", "email"]}
				 selected = {messageTo}
				 isInvalid={invalidMessageTo}
				 placeholder="Search for a user"
				 renderMenuItemChildren={(option) => (
				<div className="d-flex align-items-center gap-2">
				    <DisplayLogo
					name={option.name}
					photo={option.logo}
					color={option.color}
				    />
				    <span className="participant">{option.name} {option.email && `(${option.email})`}</span>
				</div>

				 )}
				 useCache={false}
			     />
			 </Form.Group>
			 {invalidMessageTo &&
			  <Form.Text className="error">
                              This field is required.
			  </Form.Text>
			 }
		     </>
		     :
		     <Alert variant="warning">Send a message to the coordination team.</Alert>
		    }
		    <Form.Group className="mb-3">
			<Form.Label>Message:</Form.Label>
			<ReactQuill
                            style={{
				height: '25vh',
				fontSize: '18px',
				marginBottom: '50px',
                            }}
                            value={message}
			    isInvalid={invalidMessage}
                            modules={{...modules}}
                            placeholder="Write your message"
                            onChange={setMessage}
			/>
		    </Form.Group>
		    {invalidMessage &&
                     <Form.Text className="error">
                         This field is required.
                     </Form.Text>
                    }
		    {RECAPTCHA_SITE_KEY &&
                     <ReCAPTCHA
                         ref={recaptchaRef}
                         size="invisible"
                         sitekey={RECAPTCHA_SITE_KEY}
                     />
                    }   
		    <div className="text-end pt-3">
			<button onClick={clearText} className="mx-1 btn btn-outline-secondary">Cancel</button>
			<button onClick={(e) => submitPost(e)} className="btn btn-primary">Submit</button>
		    </div>
		    
		</Form>
		<DeleteConfirmation
                    showModal={displayConfirmationModal}
                    confirmModal={props.cancelMessage}
                    hideModal={hideConfirmationModal}
                    id="something"
                    message={deleteMessage} />
	    </Card.Body>
        </Card>
    )


}


export default NewMessage;
