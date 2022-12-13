
import {Button} from 'react-bootstrap';
import React, { useState } from "react";
import { format} from 'date-fns'
const DisplayFilePreview = ({file, remove, share, removeFile, shareFile}) => {
    
    const can_remove = file.removable && remove;
    const extension = file.filename.split('.').pop();
    let display_name = file.filename;
    if (display_name.length > 25) {
	display_name = display_name.substring(0, 25) + "..."
    }
    const date = new Date(file.uploaded_date);
    const sharecolor = file.shared ? "logo-initial-shared" : "logo-initial";
    
    const DisplayIcon = () => {
	
	if (["doc", "docx"].includes(extension)) {
            return  (
		<i className="far fa-file-word"></i>
	    )
	}
	else if (["xls", "xlst"].includes(extension)) {
	    return
	    (
		<i className="far fa-file-excel"></i>
	    );
	} else if (["ppt", "pptx"].includes(extension)) {
	    return (<i className="far fa-file-powerpoint"></i>);
	} else if (["pdf"].includes(extension)) {
	    return (<i className="far fa-file-pdf"></i>);
	} else if (["zip", "tar", "tarz", "bzip", "7z"].includes(extension)) {
	    return (
		<i className="far fa-file-archive"></i>
	    );
	} else if (["png", "jpeg", "jpg", "bmp", "tiff", "gif", "svg"].includes(extension)) {
	    return (
		<i className="far fa-file-image"></i>
	    );
	}
	else {
	    return (
		<i className="far fa-file"></i>
	    )
	}
    }
    
    return (
	<>
	    <div className="d-flex justify-content-between">   
		<div className="d-flex align-items-center gap-2">
		    {can_remove &&
		     <Button onClick={(e)=>{removeFile(file)}}variant="btn-icon px-1"><i className="fas fa-trash"></i></Button>
		    }
		    <div className="profile-pic text-center imgpreview">
			<span className={`${sharecolor}`}>
			    <DisplayIcon
			    />
			</span>
		    </div>
		    <span className="participant-name">
			<a href={`${file.url}`}>{display_name}</a>
		    </span>
		</div>
		{share &&
		 <Button size="sm" variant="primary" onClick={(e)=>{shareFile(file)}}>
		     {file.shared ?
		      "Unshare"
		      :
		      "Share"
		     }
		 </Button>
		}
	    </div>
	    <div className="text-end">
		<small className="text-muted">Uploaded by { file.user } on {format(date, 'yyyy-MM-dd H:mm:ss')}</small>
            </div>
	</>
	
    )

}

export default DisplayFilePreview
