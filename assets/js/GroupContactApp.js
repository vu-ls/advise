import React, { useState, useEffect, useMemo } from 'react';
import {Row, Alert, Card, Col, Button, Form, Dropdown, Tab, Nav, InputGroup, DropdownButton} from 'react-bootstrap';
import '../css/casethread.css';
import ContactAPI from './ContactAPI';
import DeleteConfirmation from './DeleteConfirmation';
import validator from "validator";
const contactapi = new ContactAPI();

const GroupContactApp = (props) => {

    const [apiError, setApiError] = useState(false);
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [webUrl, setWebUrl] = useState("");
    const [address, setAddress] = useState("");
    const [invalidEmail, setInvalidEmail] = useState(false);
    const [invalidPhone, setInvalidPhone] = useState(false);
    const [invalidWebsite, setInvalidWebsite] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const updateGroupInfo = async() => {
	if (invalidEmail || invalidPhone || invalidWebsite) {
	    setApiError("Please add valid information");
	    return;
	}
        let formData = new FormData();
        formData.append('support_email', email);
	formData.append('support_phone', phone);
	formData.append('website', webUrl);
	formData.append('mailing_address', address);
        console.log(formData);
	await contactapi.updateMyGroup(props.group.id, formData).then(response => {
            /* todo - just modify group in place */
	    setShowSuccess(true);
	    setApiError(false);
	    props.update();
        }). catch(err => {
	    console.log(err);
            setApiError(`Error: ${err.message}`);
        });
    }

    useEffect(() => {

        if (email) {
            if (validator.isEmail(email)) {
                setInvalidEmail(false);
            } else {
                setInvalidEmail(true);
            }
        }

    }, [email]);


    useEffect(() => {

        if (phone) {
            if (validator.isMobilePhone(phone)) {
                setInvalidPhone(false);
            } else {
                setInvalidPhone(true);
            }
        }

    }, [phone]);

    useEffect(() => {

        if (webUrl) {
            if (validator.isURL(webUrl)) {
                setInvalidWebsite(false);
            } else {
                setInvalidWebsite(true);
            }
        }

    }, [webUrl]);

    useEffect(() => {
	if (props.group) {
	    if (props.group.support_email) {
		setEmail(props.group.support_email);
	    } else {
		setEmail("");
	    }
	    if (props.group.support_phone) {
		setPhone(props.group.support_phone);
	    } else {
		setPhone("");
	    }
	    if (props.group.website) {
		setWebUrl(props.group.website);
	    } else {
		setWebUrl("");
	    }
	    if (props.group.mailing_address) {
		setAddress(props.group.mailing_address);
	    } else {
		setAddress("");
	    }
	}
    }, [props]);

    function reset() {

	console.log(props.group.support_email);
        if (props.group.support_email) {
            setEmail(props.group.support_email);
        } else {
            setEmail("");
        }
        if (props.group.support_phone) {
            setPhone(props.group.support_phone);
        } else {
                setPhone("");
        }
        if (props.group.website) {
            setWebUrl(props.group.website);
        } else {
                setWebUrl("");
        }
        if (props.group.mailing_address) {
            setAddress(props.group.mailing_address);
        } else {
            setAddress("");
        }
        setInvalidEmail(false);
        setInvalidPhone(false);
	setInvalidWebsite(false);
    }

    return (
	<>
	 {apiError &&
          <Alert variant="danger">Error: {apiError}</Alert>
         }
	    <>
	    {showSuccess &&
	     <Alert variant="success">Got it! Your changes have been saved!</Alert>
	    }
	    </>
	    <Row>
		{email ? ""
		 :
		 <>
		     <Col lg={6} className="mb-3">
			 <Alert variant="danger">Please add a contact email address for this organization.</Alert>
		     </Col>
		     <Col lg={6}>
		     </Col>
		 </>
		}

		<Col lg={6} className="mb-3">
		    <Form.Label>Support Email Address</Form.Label>
		    <Form.Control name="email" value={email} onChange={(e)=>setEmail(e.target.value)} isInvalid={invalidEmail} />
		    {invalidEmail &&
                     <Form.Text className="error">
                             Please enter a valid email.
                     </Form.Text>
                    }
		</Col>
		<Col lg={6} className="mb-3">
		    <Form.Label>Support Phone Number</Form.Label>
		    <Form.Control name="phone" value={phone} onChange={(e)=>setPhone(e.target.value)} isInvalid={invalidPhone} />
		    {invalidPhone &&
                     <Form.Text className="error">
                         Please enter a valid phone number.
                     </Form.Text>
		    }
		</Col>
		<Col lg={6} className="mb-3">
		    <Form.Label>Website</Form.Label>
		    <Form.Control name="weburl" value={webUrl} onChange={(e)=>setWebUrl(e.target.value)} isInvalid={invalidWebsite}/>
		    {invalidWebsite &&
                         <Form.Text className="error">
                             Please enter a valid URL.
                         </Form.Text>
		    }
		</Col>
		<Col lg={6} className="mb-3">
		    <Form.Label>Mailing Address/Location</Form.Label>
		    <Form.Control name="address" as="textarea" rows={3} value={address} onChange={(e)=>setAddress(e.target.value)}/>
		</Col>

		<Col lg={12} className="mt-3">
		    <div className="d-flex align-items-start gap-3">
			<Button type="Cancel" variant="secondary" onClick={()=>reset()}>
                            Cancel
			</Button>
			
			<Button variant="primary" type="submit" onClick={()=>updateGroupInfo()}>
                            Submit
			</Button>
		    </div>
		</Col>
	    </Row>		

	</>
    )

}


export default GroupContactApp;
