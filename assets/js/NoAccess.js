import React from "react";
import {Card} from "react-bootstrap";


const NoAccess = () => {

    return (
	<Card>
	    <Card.Header>
		<Card.Title>
		    Unauthorized
		</Card.Title>
	    </Card.Header>
	    <Card.Body>
		<h4>You do not have the proper permissions to request this resource</h4>
	    </Card.Body>
	</Card>

    )
}

export default NoAccess;
