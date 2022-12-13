import React from 'react';
import ReactDOM from "react-dom";
//import 'react-quill/dist/quill.snow.css';
import { createRoot } from 'react-dom/client';
import CaseThreadAPI from './ThreadAPI';
import AdminAPI from './AdminAPI';
import ManageCVEApp from './ManageCVEApp';

const container = document.getElementById("app");
const root = createRoot(container);

root.render(
    <React.StrictMode>                                                                                        
        <ManageCVEApp
        />                                                                                                    
    </React.StrictMode>

);

function modalConfirm(modal, question, confirmclass, url) {
        modal.html("<div class=\"modal-dialog\"><div class=\"modal-content\"><div class=\"modal-header\"><h5 class=\"modal-title\">Confirm Action</h5> <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"modal\" aria-label=\"Close\"></button></div><div class=\"modal-body\"><p>"+question+"</p></div> <div class=\"modal-footer text-right\"><a href=\"#\" class=\"btn btn-outline-secondary\" data-bs-dismiss=\"modal\" type=\"cancel\">Cancel</a><button class=\""+confirmclass+" btn btn-primary\" action=\""+url+"\" />Confirm</button></div></div></div>").modal('show');
}


$(function () {

    console.log("KLDJLFJSDFJ");

    const threadapi = new CaseThreadAPI();
    const adminapi = new AdminAPI();
    
    var largemodal = $("#largemodal");

    $(document).on("click", "#addcve", function(event) {
	event.preventDefault();
	console.log("HERLJELKREJLEKJRLJKER");
	/* changing case status */
        $.ajax({
            url: $(this).attr("href"),
            type: "GET",
            success: function(data) {
		largemodal.html(data).modal('show');
            },
	    error: function(xhr, status) {
                permissionDenied(largemodal);
            }
        });
    });

    $(document).on("click", "#delete-cve-account", function(event) {
        event.preventDefault();
	const account_id = $(this).attr("action");
	console.log(account_id);
	modalConfirm(largemodal, "Are you sure you want to remove this CVE account?", "confirm_cve_rm", account_id);
	
    });

    $(document).on("click", ".confirm_cve_rm", function(event) {
	event.preventDefault();
	const account_id = $(this).attr("action");
	largemodal.modal('hide');
	adminapi.deleteCVEAccount(account_id).then((response) => {
	    location.reload();
	});
    });

    $(document).on("change", "#cve-select", function(event) {
        const url = $(this).find(":selected").val();
	console.log(url);
	window.location.href = url;
    });


});
