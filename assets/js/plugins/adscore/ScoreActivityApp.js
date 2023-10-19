import React, { useState, useEffect } from 'react';
import { format, formatDistance } from 'date-fns';
import DisplayLogo from 'Components/DisplayLogo';
import {Table} from "react-bootstrap";

const ScoreActivityApp = (props) => {

    let created = new Date(props.activity.created);
    let timeago = formatDistance(created, new Date(), {addSuffix: true});

    return (
	<>
	<div className="d-flex align-items-center justify-content-between activity-item">
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
		 if (change.field == "decision_tree") {
		     /* this is JSON so be smarter about how to format this */
		     var ol = change.old_value.replace(/'/g, '"');
		     var ne = change.new_value.replace(/'/g, '"');
		     const old_json = JSON.parse(ol);
		     const new_json = JSON.parse(ne);
		     return (
			 <Table className="table">
				<thead>
				    <tr>
					<th>Decision</th>
					<th>Old</th>
					<th>New</th>
				    </tr>
				</thead>
				<tbody>
				    {old_json.map((o, index) => {
					return (
					    <tr key={`dec-act${index}`} className={o.value != new_json[index].value && `table-info`}>
						<td>{o.label}</td>
						<td>{o.value}</td>
						<td>{new_json[index].value}</td>
					    </tr>
					)
				    })}
				</tbody>
			 </Table>
		     )
		 } else if (change.field == "justifications") {
                     var ol = change.old_value.replace(/'/g, '"');
                     var ne = change.new_value.replace(/'/g, '"');
		     const old_json = JSON.parse(ol);
		     console.log(old_json);
                     const new_json = JSON.parse(ne);
		     console.log(new_json);
		     if (Object.keys(old_json).length != 0) {
			 return (
			     <>
				 {Object.keys(new_json).map((key, index) => {
				     
				     if (key in old_json && new_json[key]) {
					 return (
					     <p key={`dec-act${index}`} className="small font-detail">
						 Changed justification for {key} from <span className="warningtext"><b>{old_json[key]}</b></span> to <span className="goodtext"><b>{new_json[key]}</b></span>.
					     </p>
					 )
				     } else if (!(key in old_json)) {
					 /* this just added */
					 return (
					     <p className="small font-detail" key={`just-${index}`}>Added justification for <span className="goodtext">{key}: {new_json[key]}</span></p>
					 )
				     } else if (new_json[key] != old_json[key]) {
					 return (
					     <p key={`dec-act${index}`} className="small font-detail">
						 Removed justification for <span className="warningtext">{key}: {old_json[key]}</span>
					     </p>
					 )
				     }
				 })}
			     </>
			 )
		     } else {
			 return (
			     <>
				 {Object.keys(new_json).map((key, index) => (
				     <p className="small font-detail" key={`just-${index}`}>Added justification for <span className="goodtext">{key}: {new_json[key]}</span></p>
				 ))}
			     </>
			 )
		     }



		 } else if (change.old_value && change.new_value) {
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

export default ScoreActivityApp;
