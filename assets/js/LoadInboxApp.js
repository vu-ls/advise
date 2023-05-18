import React, { useState, useRef, useEffect, useMemo } from 'react';
import InboxApp from './InboxApp.js'
import {Alert, Badge, Tab, Tabs} from 'react-bootstrap';
import MessageAPI from './MessageAPI';
import ContactAPI from './ContactAPI';

const contactapi = new ContactAPI();
const messageapi = new MessageAPI();

const LoadInboxApp = (props) => {

    const [groupThreads, setGroupThreads] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(null);
    
    const fetchInitialData = async () => {


	try {
	    contactapi.getMyGroups().then((response) => {
		console.log(response);
		setGroupThreads(response);
	    });
	    
	    messageapi.getUnreadMessageCount().then(response => {
		console.log(response);
		setUnreadCounts(response);
		setLoading(false);
		
	    });

	} catch(err) {
	    console.log(err);
	    setError(err);
	}
    }

    useEffect(()=> {
	fetchInitialData();
    }, [])

    useEffect(() => {
	if (props.message) {
	    if (groupThreads.length > 0) {
		if (document.getElementById('activetab')) {
		    setActiveTab(document.getElementById('activetab').getAttribute('val'));
		    
		} 
	    }
	}
    }, [groupThreads]);
    
    return (
	<>
	    {loading ?
	     <div>
		 <p>Loading ....</p>
		 <>
		     {error &&
		      <Alert variant="danger">{error}</Alert>
		     }
		 </>
	     </div>
	     :
	     
	     <>
		 {groupThreads.length > 0 ?
		  <Tabs
		      id="inboxapp"
		      defaultActiveKey="user"
		      activeKey = {activeTab ? activeTab : "user" }
		      onSelect = {(e)=>setActiveTab(e)}
		  >
		      <Tab eventKey="user" title={unreadCounts['user'] ? <>My Inbox <Badge pill bg="success">{unreadCounts['user']}</Badge></> : "My Inbox"}>
			  <InboxApp
			  coord={props.coord}
			  contactmsg={props.contactmsg}
			  message = {props.message}
                      />
		  </Tab>
		      {groupThreads.map((gt, index) => {
			  let unread = unreadCounts[gt.uuid];
			  return (
			      <Tab eventKey={gt.id} key={`${gt.name}-${index}`} title={unread ? <>{gt.name} <Badge pill bg="success">{unread}</Badge></> : gt.name}>
				  <InboxApp
				      coord={props.coord}
				      contactmsg={props.contactmsg}
				      group = {gt.uuid}
				      message = {props.message}
				  />
			      </Tab>
			  )
		      })}
		  </Tabs>
		  :
		  <InboxApp
		      coord={props.coord}
		      contactmsg={props.contactmsg}
		      message={props.message}
		  />
		 }
	     </>
	    }
	</>
    )
}
export default LoadInboxApp;
