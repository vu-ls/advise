import React, { useState, useRef, useEffect, useMemo } from 'react';
import {Nav, Dropdown, DropdownButton, InputGroup, CardGroup, Alert, Button, Tab, Tabs, Row, Form, Card, Col} from 'react-bootstrap';
import {Typeahead} from 'react-bootstrap-typeahead';
import MessageAPI from './MessageAPI';
import DisplayLogo from './DisplayLogo';
import NewMessage from './NewMessage';
import Messenger from './Messenger';
import { format, formatDistance } from 'date-fns'
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css'
import '../css/casethread.css';
import StandardPagination from './StandardPagination';

import ReCAPTCHA from "react-google-recaptcha";

const recaptchaRef = React.createRef();
const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY || null;

const messageapi = new MessageAPI();

const InboxApp = (props) => {

    const isInitialMount = useRef(true);

    const [threads, setThreads] = useState([]);
    const [messages, setMessages] = useState([]);
    const [curThread, setCurThread] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [search, setSearch] = useState(null);
    const [itemsCount, setItemsCount] = useState(0);
    const [error, setError] = useState(null);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [newMessage, setNewMessage] = useState(false);
    const [expandUsers, setExpandUsers] = useState(false);
    const [message, setMessage] = useState("");
    const [disableButton, setDisableButton] = useState(false);
    const [coordinator, setCoordinator] = useState(false);
    const [sendMsgContact, setSendMsgContact] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [sentMessage, setSentMessage] = useState(false);

    const globalRef = React.createRef(null);

    const uploadFiles = async(formData, filename) => {
        console.log(`Uploading ${filename}: ${formData}`);
        let data = await messageapi.addImage(formData, curThread);
	let results = await data.data;
        console.log(results);
        return results['image_url'];

    };
    
    const fetchInitialData = async (msg) => {
	if (msg) {
	    setFeedback(msg);
	    setSentMessage(true);
	} else {
	    setFeedback(null);
	}

	if (props.group) {
	    messageapi.getGroupThreads(props.group).then((response) => {
		setThreads(response.results);
		setItemsCount(response.count);
	    }).catch(err => {
		console.log(err);
		setError("Error retrieving group threads");
	    });
	} else {
	    messageapi.getThreads().then((response) => {
                setThreads(response.results);
		setItemsCount(response.count);
	    }).catch(err => {
		console.log(err);
		setError("Error retrieving threads");
	    });
	}
    };


    useEffect(()=> {
	if (isInitialMount.current)  {
	    console.log("do nothing");
	} else {
	    paginationHandler(currentPage);
	}

    }, [currentPage])


    const paginationHandler = (page) => {
	if (props.group) {
	    messageapi.getGroupThreadsByPage(props.group, page).then((response) => {
		setThreads(response.results);
		setItemsCount(response.count);
	    }).catch(err => {
		setError(err);
	    })
	} else {
            messageapi.getThreadsByPage(page).then((response) => {
		setThreads(response.results);
		setItemsCount(response.count);
            }).catch( err => {
		setError(err);
	    });
	}
    }

    useEffect(() => {
	if (isInitialMount.current) {
	    /* don't search threads on initial mount */
	    isInitialMount.current = false;
	} else {
            let urlstr = "";
            if (search) {
		urlstr = `search=${search}`
		if (props.group) {
		    urlstr = `${urlstr}&group=${props.group}`
		}
            }
	    messageapi.searchThreads(urlstr).then((response) => {
		setThreads(response.results);
		setItemsCount(response.count);
	    });
	}

    }, [search])

    useEffect(() => {
	if (threads.length > 0) {
	    if (curThread == null && props.message) {
		/* find thread */
		let st = threads.find((t) => (t.id == props.message))
		if (st) {
		    setCurThread(st);
		} else {
		    setCurThread(threads[0]);
		}
		setLoadingMessages(true);
		setNewMessage(false);		
	    } else if ((curThread == null && sendMsgContact == null) || feedback) {
		setCurThread(threads[0])
		setLoadingMessages(true);
		setNewMessage(false);		
	    }

	} else {
	    setCurThread(null)
	    setLoadingMessages(false);
	    setNewMessage(true);
	}
    }, [threads]);

    useEffect(()=> {
	setLoadingMessages(false);
    }, [messages]);

    useEffect(() => {
        fetchInitialData();
	if (props.coord == "coord") {
	    setCoordinator(true);
	}
	if (props.contactmsg) {
	    setNewMessage(true);
	    setSendMsgContact(props.contactmsg);
	    console.log(`SENDING MSG ${props.contactmsg}`);
	}

    }, []);

    useEffect(()=> {
	setExpandUsers(false);
	setLoadingMessages(true);
	if (sentMessage) {
	    setSentMessage(false);
	} else {
	    setFeedback(null);
	}
	if (curThread) {
	    /* user must have changed their mind about sending a msg */
	    setSendMsgContact(null);
	    setNewMessage(false);
	    messageapi.getMessages(curThread).then((response) => {
		setMessages(response);
	    }).catch(err => {
		setError("Error retrieving messages for this thread.");
		console.log(err);
	    });
	    const newList = threads.map((item) => {
		if (item.id == curThread.id) {
		    let newitem = item;
		    newitem.unread = false;
		    return newitem;
		}
		return item
	    });
	    setThreads(newList);
	}
    }, [curThread]);

    const submitMessage = async (e) => {
	e.preventDefault();


	setDisableButton(true);
	let formField = new FormData();
	if (RECAPTCHA_SITE_KEY) {
	    const token = await recaptchaRef.current.executeAsync();
	    formField.append('token', token);
	}

        formField.append('content', message);
	await messageapi.createMessage(curThread, formField).then((response) => {
	    console.log("NEW RESPONSE", response);
	    setMessages(messages => [...messages, response])
	    setDisableButton(false);
	    recaptchaRef.current.reset();
	    setMessage("");
        }).catch(err => {
	    console.log(err);
            setError(`Error sending message: ${err.response.data.message}`);
	});


    };

    const toggleExpandUsers = () => {
	if (expandUsers == true) {
	    setExpandUsers(false);
	} else {
	    setExpandUsers(true);
	}
    }

    const closeMessage = () => {
	if (sendMsgContact) {
	    setCurThread(threads[0]);
	    setSendMsgContact(null);
	}
	setNewMessage(false);
    };

    return (
	<Row>
	    <Col md={6} lg={5} className="messages-scroll">
		<h5 className="font-weight-bold mb-3 text-center text-lg-start">
		</h5>
		<Card>
		    <Card.Body>
			<div className="d-flex justify-content-between mb-3">
			    <Card.Title>

			    Your messages</Card.Title>
			    <Button className="btn btn-icon" onClick={(e)=>setNewMessage(true)}>
				<i className="far fa-edit"></i>
			    </Button>
			</div>
			<InputGroup className="rounded mb-3">
			    <Form.Control
				className="form-control rounded"
				placeholder="Search"
				type="search"
				onChange={(e)=>setSearch(e.target.value)}
			    />
			    <Button
                                type="submit"
                                variant="outline-primary"
                            ><i className="fas fa-search"></i></Button>
			</InputGroup>
			<PerfectScrollbar>
			    <ul className="list-unstyled mb-0 thread-preview-list">
				{threads.length > 0 ?
				 <>
				     {threads.map((thread, inbox) => {
					 let date = new Date(thread.last_message.created);
					 let timeago = formatDistance(date, new Date(), {addSuffix: true});
					 
					 return (
					     <li className="p-2 border-bottom" id={`inbox-${thread.id}`} key={`inbox-${thread.id}`} style={{ backgroundColor: (curThread && curThread.id == thread.id) ? "#eee" : 'inherit'}}>
					<a href="#" onClick={(e)=>setCurThread(thread)} className="d-flex justify-content-between">
					    <div className="d-flex flex-row gap-2">
						<DisplayLogo
						    name={thread.last_message.sender.name}
						    photo={thread.last_message.sender.photo}
						    color={thread.last_message.sender.logocolor}
						/>
						<div className="pt-1">
						    <p className="fw-bold mb-0">{thread.last_message.sender.name}</p>
						    <div className="small text-muted text-break" dangerouslySetInnerHTML={{__html: thread.last_message.content}} />

						</div>
					    </div>
					    <div className="pt-1 text-end">
						<p className="small text-muted mb-1">{timeago}</p>
						{thread.unread && <span className="badge bg-danger float-end">1</span>}
					    </div>
					</a>
				    </li>
				)

			    })}
				     <div className="justify-content-center text-center mt-4">
					 {itemsCount > 0 &&
					  <StandardPagination
					      itemsCount={itemsCount}
					      itemsPerPage="10"
					      currentPage={currentPage}
					      setCurrentPage={setCurrentPage}
					  />
					 }
				     </div>
				 </>
				 :
				 <li className="p-2 border-bottom text-center lead">No threads available</li>

				}
			</ul>
			</PerfectScrollbar>
		    </Card.Body>
		</Card>
	    </Col>

	    <Col lg={7} md={6} className="messages-scroll">
		{feedback &&
		 <Alert variant="success">{feedback}</Alert>
		}
		<PerfectScrollbar
		    style={{ position: "relative" }}
		>
		    {newMessage ?
		     <NewMessage
			 cancelMessage={closeMessage}
			 coordinator={coordinator}
			 reload = {fetchInitialData}
			 sendContact = {sendMsgContact}
			 group={props.group}
		     />
		     :
		     <>
			 {error &&
			  <Alert variant="danger"> {error}</Alert>
			 }
			 {loadingMessages ?
			  <div className="d-flex justify-content-center pt-5"><h5>Loading Messages...</h5></div>
			  :
			  (
			      <>
			      {curThread ?
			       <>
				   <div className="d-flex justify-content-center gap-1">
				   {curThread.users.map((user, index) => {
				       return (
					   <DisplayLogo
					       name={user.name}
					       photo={user.photo}
					       color={user.logocolor}
					       key={`logo-${index}`}
					   />
				       )
				   })}
				       <>
					   {curThread.groups.map((group, index) => {
					       return (
						   <DisplayLogo
						       name={group.name}
						       photo={group.photo}
						       color={group.logocolor}
						       key={`glogo-${index}`}
						   />
					       )
					   })}
				       </>
			       </div>
			       <div className="d-flex justify-content-center mb-3">

				   {curThread.users.length + curThread.groups.length > 1?
				    <a href="#" onClick={(e)=>toggleExpandUsers()}>{curThread.users.length+curThread.groups.length} people <i className="fas fa-greater-than"></i> </a>
				    :
				    <>1 person</>
				   }
			       </div>
			       {expandUsers &&
				<div className="d-flex justify-content-center">
				    <div>
					{curThread.users.map((user, index) => {
					    return (
						<div key={`threadusers-${index}`} className="d-flex flex-row gap-2 mb-2">
						    <DisplayLogo
							name={user.name}
							photo={user.photo}
							color={user.logocolor}
						    />
						    <p className="pt-1">{user.name}</p>
						</div>
					    )
					})}
					<>
					    {curThread.groups.map((group, index)	=> {
                                     		return (
						    <div key={`threadgroups-${index}`} className="d-flex flex-row gap-2 mb-2">
							<DisplayLogo
							    name={group.name}
							    photo={group.photo}
							    color={group.logocolor}
							/>
							<p className="pt-1">{group.name}</p>
                                                    </div>
						)
                                            })}                                                                                                                      </>
				    </div>
				</div>
			       }

			       <ul className="list-unstyled">
				   {messages.map((message, index) => {
				       let msgdate = new Date(message.created);
				       let timeago = formatDistance(msgdate, new Date(), {addSuffix: true});

				       return (
					   <li className="d-flex align-items-start gap-2 mb-4" key={`msg-${message.id}`}>
					       <div className="align-self-start">
						   <DisplayLogo
						       name = {message.sender.name}
						       photo = {message.sender.photo}
						       color = {message.sender.logocolor}
						   />
					       </div>
					       <Card className="w-100 mx-3">
						   <Card.Header className="d-flex justify-content-between p-3 border-bottom">
						       <p className="fw-bold mb-0">{message.sender.name}</p>

						       <p className="text-muted small mb-0">
							   <i className="fas fa-clock" />{' '}{timeago}
						       </p>
						   </Card.Header>
						   <Card.Body className="pt-3">
						       <div className="mb-0" dangerouslySetInnerHTML={{__html: message.content}} />
						   </Card.Body>
					       </Card>
					   </li>
				       )})
				   }

				   <li className="bg-white">
				       <form>

				       <Card className="w-100">
					   {error &&
					     <Alert variant="danger"> {error}</Alert>
					    }

					   <Card.Body>
					       <Messenger
						   placeholder="Write a new message to continue the thread"
						   setValue={setMessage}
						   value={message}
						   ref={globalRef}
						   uploadFiles={uploadFiles}
					       />   
					       {RECAPTCHA_SITE_KEY &&
						<ReCAPTCHA
						    ref={recaptchaRef}
						    size="invisible"
						    sitekey={RECAPTCHA_SITE_KEY}
						/>
					       }

					   </Card.Body>
					   <Card.Footer>
					       <Button
						   variant="outline-primary"
						   className="float-end"
						   disabled={disableButton ? true : false}
						   onClick={(e)=>submitMessage(e)}>
						   {disableButton ? <>Sending...</>:<>Send</>}
					       </Button>
					   </Card.Footer>
				       </Card>
				       </form>

				   </li>

			       </ul>
			       </>

			       :
			       <p>No messages here...</p>
			      }
			      </>
			  )}
		     </>
		    }
		</PerfectScrollbar>
	    </Col>
	</Row>
    )
}

export default InboxApp;
