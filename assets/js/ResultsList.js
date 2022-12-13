import React, { useState, useEffect, useMemo } from 'react';

import {format, formatDistance} from 'date-fns';
import StandardPagination from './StandardPagination';


const DisplayResultType = ({type}) => {

    if (type.includes('Component')) {
	return (
	    <i className="menu-icon tf-icons fas fa-microchip"></i>
	)

    } else if (type.includes('Contact') | type.includes('Group')) {
	return (
	    <i className="menu-icon tf-icons fas fa-user"></i> 
	)
    } else if (type.includes('Advisory')) {
	return (
	    <i className="menu-icon tf-icons fas fa-exclamation-triangle"></i>
	)
    } else if (type.includes('Case')) {
	return (
	    <i className="menu-icon tf-icons fas fa-briefcase"></i> 
	)
    } else if (type.includes('Vulnerability')) {
	return (
	    <i className="menu-icon tf-icons fas fa-bug"></i>
	)
    } else {
	return (
	    <></>
	)
    }
}



export default function ResultsList(props) {

    const {results, count, page, setCurrentPage, emptymessage} = props;
    
    return (
	<>
	    {count > 0 ?
	     results.map((c, index) => {
		 let last_modified = new Date(c.modified);
		 let timeago = formatDistance(last_modified, new Date(), {addSuffix: true});
		 
		 return (
		     <div key={index}>
			 <DisplayResultType
			     type={c.type}
			 />
			 <a className="search-result-link" href={`${c.url}`}>
			 {c.title} </a>
			 <h6 className="mt-2 text-light fw-semibold">
			     Last modified {format(last_modified, 'yyyy-MM-dd')}  ({timeago})
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


