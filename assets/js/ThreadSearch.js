import React from 'react';
import {Col, Button, Row, Form, InputGroup, OverlayTrigger, Tooltip} from 'react-bootstrap';
import { useState, useEffect } from 'react';

export function PostToggleButton(props) {
    // false == lifo, true=fifo
    const [toggleState, setToggleState] = useState(false);
    const [toggleClass, setToggleClass] = useState("bx bx-sort-up");
    const [isLoading, setIsLoading] = useState(true);
    const [tooltipText, setTooltipText] = useState("Show newest posts at top");
    useEffect(() => {
	if (isLoading) {
	    setIsLoading(false);
	} else {
	    if (toggleState) {
		setToggleClass("bx bx-sort-down");
		setTooltipText("Show newest posts at the bottom");
		props.onChange("fifo");

	    } else{
		setToggleClass("bx bx-sort-up");
		setTooltipText("Show newest posts at the top");
		props.onChange("lifo");
	    }
	}
    }, [toggleState]);
    
    
    return (
	<OverlayTrigger overlay={<Tooltip>{tooltipText}</Tooltip>}>
	    <Button
		variant="btn btn-icon btn-outline-primary"
		onClick={()=>{setToggleState(!toggleState)}}> 
		<i className={toggleClass}></i>             
            </Button>
	</OverlayTrigger>
    
    )
}

class ThreadSearchForm extends React.Component {


    constructor(props) {
	super(props);
	this.state = {
	    value: '',
	    toggle: "lifo"
	};
	this.handleChange = this.handleChange.bind(this);
	this.handleSubmit = this.handleSubmit.bind(this);
	this.togglePosts = this.togglePosts.bind(this);

    }

    handleChange(event) {
	this.setState({value: event.target.value});
    }

    handleSubmit(event) {
	console.log("search submitted" + this.state.value);
	event.preventDefault();
	this.props.onSubmit(this.state);

    }

    togglePosts(toggle) {
	this.setState({toggle: toggle});
	this.props.onSubmit(this.state);
    }
    

    render () {
	return (
	    <form onSubmit={this.handleSubmit}>
		<Row className="mb-3">
		    <Col lg={8} md={10}>
			<InputGroup className="w-100">
			    <Form.Control
				placeholder="Search Posts"
				aria-label="Filter Posts and Threads"
				aria-describedby="searchposts"
				value={this.state.value}
				onChange={this.handleChange}
			    />
			    <Button variant="btn btn-outline-secondary" id="button-addon2" type="submit">
				<i className="fas fa-search"></i>
			    </Button>
		    </InputGroup>
		    </Col>
		    <Col lg={4} md={2} className="text-end">
			<PostToggleButton
			    onChange = {this.togglePosts}
			/>
		    </Col>
		</Row>
	    </form>
	)

    }

}

export default ThreadSearchForm;
