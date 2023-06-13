import React, { useState, useEffect } from 'react';
import { format, formatDistance } from 'date-fns';
import DisplayLogo from './DisplayLogo';

const ActivityApp = (props) => {

    let created = new Date(props.activity.created);
    let timeago = formatDistance(created, new Date(), {addSuffix: true});

    return (
	<>
	<div className="d-flex align-items-center justify-content-between">
	    <div className="d-flex align-items-center gap-2">
		<DisplayLogo
		    photo = {props.activity.user.photo}
		    color = {props.activity.user.logocolor}
		    name= {props.activity.user.name}
		/>
		<p><b>{props.activity.user.name}</b> {props.activity.title}</p>
	    </div>
        </div>
	{props.activity.change &&
         <div className="bold mx-2">
             {props.activity.change.map((change, index) => {
                 if (change.old_value && change.new_value) {

		     return (
                         <p key={`change-${index}`} className="small font-detail">Changed {change.field} from <b>{change.old_value}</b> to <b>{change.new_value}</b></p>)
                 } else if (change.old_value) {
                     return (
                         <p key={`change-${index}`} className="small font-detail">Removed {change.field}: <b>{change.old_value}</b></p>)
                 } else {
                     return (
                         <p key={`change-${index}`} className="small font-detail">Added {change.field}: <b>{change.new_value}</b></p>)
                 }
             })}
         </div>
	}                                                              
            <div className="small  mt-1"><i className="fas fa-clock" />	{' '}{format(created, 'yyyy-MM-dd H:mm:ss ')} ({timeago})</div>
	</>
    )
}

export default ActivityApp;
