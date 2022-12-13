import React, { useState, useEffect, useMemo } from 'react';

import {format, formatDistance} from 'date-fns';
import DisplayStatus from './DisplayStatus';
import StandardPagination from './StandardPagination';



export default function CaseList(props) {

    const {cases, count, page, setCurrentPage, emptymessage} = props;
    
    return (
	<>
	    {count > 0 ?
	     cases.map((c, index) => {
		 let date = new Date(c.created);
		 let last_modified = new Date(c.modified);
		 let timeago = formatDistance(last_modified, new Date(), {addSuffix: true});
		 
		 return (
		     <div key={index}>
			 <a className="search-result-link" href={`/advise/case/${c.case_id}`}>
			 {c.case_identifier}: {c.title} </a>
			 <DisplayStatus
			     status= {c.status}
			 />
			 <h6 className="mt-2 text-light fw-semibold">
			     Submitted by: {c.report ?
					    c.report.submitter
					    : c.created_by} on {format(date, 'yyyy-MM-dd')}. Last modified {format(last_modified, 'yyyy-MM-dd')}  ({timeago})
			 </h6>
		     </div>
		 )
	     }
		      )
	     :
	     <div>{emptymessage}</div>
	    }
	    
	    <div className="justify-content-center">
		{count > 0 &&
		 <StandardPagination
		     itemsCount={count}
		     itemsPerPage="10"
		     currentPage={page}
		     setCurrentPage={setCurrentPage}
		 />
		}
	    </div>
	</>
    )

}


