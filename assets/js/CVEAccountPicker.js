import React, { useState, useEffect } from 'react';
import {Form, Alert} from "react-bootstrap";


const CVEAccountPicker = (props) => {

    return (
	props.accounts.length > 0 ?
	    <Form.Group>                                                            
		<Form.Label>Choose CVE Account</Form.Label>                         
		<Form.Select value={props.selectedAccount.id} onChange={(e)=>props.onSelect(e)}>
                    {props.accounts.map((a, index) => {
			return (
                            <option key={index} value={a.id}>{a.org_name}</option>
			)
                    })
                    }                                                               
		</Form.Select>                                                      
            </Form.Group>
	:
	<Alert variant="info">No accounts configured. <a href="/advise/manage/cve/">Add an account</a> to continue.</Alert>
	
    )
}

export default CVEAccountPicker;
    
