import {Badge} from 'react-bootstrap';
import React, { useState } from "react";

const DisplayVulStatus = ({status, count=null}) => {

    if (status == "Not Affected") {
	return (
	    <Badge pill bg="success">
		Not Affected {count && <Badge bg="light" text="dark">{count}</Badge>}
	    </Badge>
	)
    } else if (["Under Investigation", "Unknown"].includes(status)) {
	return (
            <Badge pill bg="warning">
		{status}{" "}
                {count && <Badge bg="light" text="dark">{count}</Badge>}
            </Badge>
        )
    } else if (status == "Fixed") {
	return (
            <Badge pill bg="info">
		Fixed {count && <Badge bg="light" text="dark">{count}</Badge>}
            </Badge>
	)
    } else {
	return (
            <Badge pill bg="danger">
		Affected {count && <Badge bg="light" text="dark">{count}</Badge>}
            </Badge>
	)
    }
}

export default DisplayVulStatus;
