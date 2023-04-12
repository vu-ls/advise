import React from 'react';
import ReactDOM from "react-dom";
//import 'react-quill/dist/quill.snow.css';
import { createRoot } from 'react-dom/client';
import CaseThreadApp from './CaseThreadApp'
import CaseThreadAPI from './ThreadAPI';
const container = document.getElementById("quilljs");
const caseid = container.getAttribute("caseid");
const root = createRoot(container);
root.render(
    <CaseThreadApp
	case = {caseid}
    />

);


$(function () {

    const threadapi = new CaseThreadAPI();
    
    $(document).on("click", ".reassigncase", function(event) {
        event.preventDefault();
	var url = $("#case_assign_div").attr("href");
	var name = $(this).find('.uname').text();
        var html_fill = $(this).html();
	
	threadapi.reassignCase(caseid, name).then((response) => {
	    $("#assignblock").html(html_fill);
	});
	/*
	$.post(url,
               {'state': 1, 'csrfmiddlewaretoken': csrftoken, 'tag': name }, function(data) {
	    
               })
	    .fail(function(data) {
                permissionDenied(largemodal);
		});
		*/
    });

    $(document).on("click", '#changestatus', function(event) {
        $("#changestatus").hide();
        $("#statuschanger").show();
    });


    $(document).on("click", '#status_cancel', function(event) {
        $("#changestatus").show();
	$("#statuschanger").hide();
    });


    $(document).on("click", "#status_submit", function(event) {
        event.preventDefault();
        var current_status = $("#changestatus").attr("val");
        console.log(current_status);

        var new_status = $("#status_drop").val();
        console.log(new_status);
        var url = $(this).attr('href');
        if (current_status == new_status) {
            $("#changestatus").show();
            $("#statuschanger").hide();
            return;
	}
        /* changing case status */
        $.ajax({
            url: url,
            type: "GET",
            success: function(data) {
		largemodal.html(data).modal('show');
            },
	    error: function(xhr, status) {
                permissionDenied(largemodal);
            }
        });
    });

    
});
