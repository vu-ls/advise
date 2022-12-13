import React from 'react'
import { Modal, Button } from "react-bootstrap";
import { useState, useEffect } from 'react';
import CaseThreadAPI from './ThreadAPI';
import Table from 'react-bootstrap/Table';

const threadapi = new CaseThreadAPI();

function createMarkup(modalhtml) {
    return {__html: modalhtml};
}

const DiffModal = ({ showModal, hideModal, id }) => {

    const [posts, setPosts] = useState("");
    const [prevRevision, setPrevRevision] = useState("");
    const [nextRevision, setNextRevision] = useState("");
    const [error, setError] = useState("");
    const [ret, setRet] = useState("");

    const getPostDiff = async (diffId) => {
	console.log("IN GET POST IDFF");
	console.log(id);
	try {
	    await threadapi.getPostDiff(diffId).then((response) => {
		console.log(response);
		setPosts(response.diff);
		setRet(response);
		setPrevRevision(response.previous_revision);
		setNextRevision(response.next_revision);

	    })
	} catch (err) {
	    setError(err);
	}
    }

    useEffect(() => {
	console.log("IN DIFFMODAL");
	console.log(id);
	if (id) {
	    getPostDiff(id);
	}
    }, [id])
    
    const displayModal = () => {

	return (
	
            <Modal show={showModal} onHide={hideModal}>
		<Modal.Header closeButton>                                                             
		    <Modal.Title>Post Edits History</Modal.Title>                                       
		</Modal.Header>                                                                        
		<Modal.Body>
		    <div className="d-flex justify-content-between">
			<small>
			    {prevRevision && (
				<a href="#" onClick={(e)=>(e.preventDefault(), getPostDiff(prevRevision))}>
				<i className="fas fa-arrow-left"></i> Last Revision</a>
			    )
			    }
			</small>
			<small>
			    {nextRevision && (
				<a href="#" onClick={(e)=>(e.preventDefault(), getPostDiff(nextRevision))}>
				    <i className="fas fa-arrow-right"></i>
				Next Revision</a>
			    )}
			</small>
		    </div>
		    <p className="text-center">
			<small className="text-muted fw-semibold">
			    Revision {  ret.revision_number }, Last modified {ret.last_modified}
			</small>
		    </p>
		    {posts && (
			<Table>
			    <tbody>
			    {
				posts.map((post, index) => {
				    let firstchar = post.charAt();
				    let cn = "equal";
				    switch(firstchar) {
				    case "-":
					cn = "delete";
					break;
				    case "+":
					cn="insert";
					break;
				    case "?":
					cn="skip";
				    default:
					break;
					
				    }
				    if (cn != "skip") {
					return (
					    <tr className={cn} key={index}>
						<td><div dangerouslySetInnerHTML={{__html: post}} /></td>
					    </tr>
					)
				    }
				})
			    }
			    </tbody>
			</Table>
		    )
		    }	      
		</Modal.Body>
		<Modal.Footer>                                                                         
		    <Button variant="secondary" onClick={hideModal}>                                     
			Ok
		    </Button>                                                                            
		</Modal.Footer>     
		
	    </Modal>
	)
    }

    return (
	<>
	    {displayModal()}
	    </>
    )
}
 
export default DiffModal;
