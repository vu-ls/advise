import React from 'react'
import { Alert, Form } from "react-bootstrap";
import '../css/casethread.css'
import { format } from 'date-fns'

const PublishCVEApp = (props) => {

    let date = new Date(props.vul.date_public);
    let item = props.vul;
    
    return (
	<div>
	    <div className="mb-2">
		<Form.Label>Description:</Form.Label><br/>
		{item.description}
	    </div>
	    {item.references && item.references.length > 0 ?
	     <div className="mb-2">
		 <Form.Label>References:</Form.Label><br/>
		 <ul className="list-unstyled">
		     {item.references.map((t, index) => {
			 return (
			     <li key={index}>{t}</li>
			 )
		     })}
		 </ul>
	     </div>
	     :
	     <div className="border border-danger p-1"><Form.Label>References:</Form.Label><br/>
		 <b>MISSING REFERENCES!</b>
	     </div>
	    }
	    
	    {item.affected_products && item.affected_products.length > 0 ?
	     <div className="mb-2">
		 <Form.Label>Affected Products:</Form.Label><br/>
		 
		     <ul>
			 {item.affected_products.map((t, index) => {
			     return (
				 <li key={index}>{t.product}{" "}{t.version}
				     {t.version_affected &&
				      <>{t.version_affected} {t.end_version_range}</>
				     }
				 </li>
			     )
			 })}
		     </ul>
		 </div>
		 
		 :
		 <div className="border border-danger p-1 mb-2">
		     <Form.Label>Affected Products:</Form.Label><br/>
		     
		     <b>MISSING AFFECTED PRODUCTS!</b>
		 </div>
		}
		
		{item.date_public ?
		 <div className="mb-2">
		     <Form.Label>Date Public:</Form.Label><br/>
		     
		     <b>{format(date, 'yyyy-MM-dd')}</b>
		 </div>
		 :
		 <div className="border border-danger p-1 mb-2">
		     <Form.Label>Date Public:</Form.Label><br/>
		     <b>MISSING DATE PUBLIC!</b>
		 </div>
		}
		
		{item.problem_types && item.problem_types.length > 0 ?
		 <div className="mb-2">
		     <Form.Label>Problem Types:</Form.Label><br/>
		     
		     <ul className="list-unstyled">
			 {item.problem_types.map((t, index) => {
			     return (
				 <li key={index}>{t}</li>
			     )
			 })}
		     </ul>
		 </div>
		 
		 :
		 <div className="border border-danger p-1 mb-2">
		     <Form.Label>Problem Types:</Form.Label><br/>
		     <b>MISSING PROBLEM TYPES!</b>
		     
		 </div>
		}
	    </div>
    )
    
}

export default PublishCVEApp;
