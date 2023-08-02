import React from 'react';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Nav from 'react-bootstrap/Nav';
import PostList from './PostList';
import Editor from "./Editor";
import '../css/casethread.css';

export default function ThreadDisplay(props) {
    
//	<Tab key={thread.id} eventKey={thread.id} title={thread.subject}>    
    const displayThreads = (props) => {
	const {threads, user} = props;
	if (threads.length > 0) {
	    return (
		<Tab.Container
		    defaultActiveKey={threads[0].id}
		    id="thread-list"
		    className="mb-3"
		>
		    <Nav variant="pills">
		    {
			threads.map((thread, index) => {
			    console.log(thread);
			    return (
				<Nav.Item>
				    <Nav.Link eventKey={thread.id}>{thread.subject}</Nav.Link>
				</Nav.Item>
			    )
			
			})
		    }
			<Nav.Item>
			    <Nav.Link eventKey="addTab">Add a Thread</Nav.Link>
			</Nav.Item>
		    </Nav>
		    <Tab.Content>
			{
			    threads.map((thread, index) => {
				console.log(thread);
				return (
                        	    <Tab.Pane eventKey={thread.id}>
					<PostList
                                            thread = {thread}
                                            user = {user}
					/>       
				    </Tab.Pane>
				)
			
                            })
			}                   
			<Tab.Pane eventKey="addTab">ADD A TAB</Tab.Pane>
		    </Tab.Content>
		</Tab.Container>
	    );
	    
	} else {
	    return (<h3>Loading</h3>)
	}
    }
    return (
	<>
	    {displayThreads(props)}
	</>
    )
}
	    
    
