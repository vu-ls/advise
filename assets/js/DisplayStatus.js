import {Badge} from 'react-bootstrap';
import React, { useState } from "react";

const DisplayStatus = ({status}) => {

    if (status == "Active") {
	return (
	    <Badge pill bg="success">
		Active
	    </Badge>
	)
    } else if (status == "Pending") {
	return (
            <Badge pill bg="warning">
                Pending
            </Badge>
        )
    } else {
	return (
            <Badge pill bg="info">
		Inactive
            </Badge>
	)
    }
}

export default DisplayStatus;
