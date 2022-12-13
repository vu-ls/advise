import {Button, Dropdown, DropdownButton} from 'react-bootstrap';
import React, { useState } from "react";

const DropDownCustomEditor = ({ title, options, selectedValue, onItemClick }) => {

    return (
	<div className="relative inline-block text-left">
	    <DropdownButton
		variant="btn p-0"
		title= {<span>
			    {selectedValue} <i className="fas fa-chevron-down"></i> 
			</span>
		       }
		id="options-menu"
		aria-haspopup="true"
		aria-expanded="true"
	    >
		{ options.map((item, index) => {
		    return (
			<Dropdown.Item
			    eventKey={item}
			    key = {index}
			    onClick={() => onItemClick(item)}
			>
			    {item}
			</Dropdown.Item>
		    );
		}) }
	    </DropdownButton>
	    
	</div>
    );
};

export default DropDownCustomEditor;
