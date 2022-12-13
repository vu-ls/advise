import React, { useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import FormControl from "react-bootstrap/FormControl";

export const CustomToggle = (props) => (
    <div className="form-group">
	<strong>{props.username}</strong>
	<select
	    className="form-control"
	    name="{props.username}"
	    onChange={props.onChange}
	>
	    <option defaultValue>Select {props.name}</option>
	    {props.options.map((item, index) => (
		<option key={index} value={item.id}>
		    {item.username}
		</option>
	    ))}
	</select>
    </div>
)
