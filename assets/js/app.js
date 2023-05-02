import MessageAPI from './MessageAPI';
import CaseThreadAPI from './ThreadAPI';

const messageapi = new MessageAPI();
const caseapi = new CaseThreadAPI();

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function modalConfirm(modal, question, confirmclass, url) {
    modal.html("<div class=\"modal-dialog\"><div class=\"modal-content\"><div class=\"modal-header\"><h5 class=\"modal-title\">Confirm Action</h5> <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"modal\" aria-label=\"Close\"></button></div><div class=\"modal-body\"><\
p>"+question+"</p></div> <div class=\"modal-footer text-right\"><a href=\"#\" class=\"btn btn-outline-secondary\" data-bs-dismiss=\"modal\" type=\"cancel\">Cancel</a><button class=\""+confirmclass+" btn btn-primary\" action=\""+url+"\" />Confirm</button></div></div></div>").modal('show');
}


function permissionDenied(modal) {

    modal.html("<div class=\"modal-dialog\" role=\"document\"><div class=\"modal-content\">\
      <div class=\"modal-header\">\
        <h5 class=\"modal-title\">Permission Denied</h5>\
        <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"modal\" aria-label=\"Close\"></button></div>\
<div class=\"modal-body\"><p>Error: You are not permitted to perform this action</p></div> <div class=\"modal-footer text-right\"><a href=\"#\" class=\"btn btn-outl\
ine-secondary cancel_confirm\" data-bs-dismiss=\"modal\" type=\"cancel\">Ok</a></div></div></div>").modal('show');

}


function modalError(modal, error) {
    modal.html("<div class=\"modal-dialog\"><div class=\"modal-content\"><div class=\"modal-header\"><h5 class=\"modal-title\">Error</h5> <button type=\"button\" cl\
ass=\"btn-close\" data-bs-dismiss=\"modal\" aria-label=\"Close\"></button></div><div class=\"modal-body\"><p>"+error+"</p></div> <div class=\"modal-footer text-righ\
t\"><a href=\"#\" class=\"btn btn-outline-secondary\" data-bs-dismiss=\"modal\" type=\"cancel\">Ok</a></div></div></div>").modal('show');
}


$(function () {

    var $modal = $("#modal").modal();
    var csrftoken = getCookie('csrftoken');

    $(document).on("click", ".rmconfirm", function(event) {
	event.preventDefault();
	console.log("IN HERE");
	modalConfirm($modal, $(this).attr("title"), "confirmrm", $(this).attr("href"));

    });

    /*get new, unread messages */
    messageapi.getUnreadMessageCount().then(response => {
	if (response.unread > 0) {
	    $("#unread_msg_badge").html(`<span class=\"badge badge-center rounded-pill bg-success\">${response.unread}</span>`);
	}
    });

    caseapi.getCaseNotifications().then(response => {
	if (response.length) {
	    $("#notify_count").html(`<span class=\"badge rounded-pill bg-danger\">${response.length}</span>`);
	    var notifications = "";
	    response.map((r, index) => {
		notifications = notifications + `<li>
			<a class="dropdown-item" href="${r.url}">${r.text}</a></li>`;
		if (index != response.length) {
		    notifications + '<li><div class="dropdown-divider"></div></li>';
		}
	    });
	    $("#notify_list").html(notifications);
	}
    });
    
    $(document).on("click", ".confirmrm", function(event) {
        event.preventDefault();
        $modal.modal('hide');
        var url = $(this).attr("action");
        $.ajax({
            url: url,
            type: "DELETE",
            headers: {
                'X-CSRFTOKEN': csrftoken
            },
            success: function(data) {
                window.location.reload(true);
            }
        });
    });

    /* scroll side button */
    $(window).scroll(function () {
         if ($(this).scrollTop() > 100) {
             $('.scrollup').fadeIn();
         } else {
             $('.scrollup').fadeOut();
         }
     });
     $('.scrollup').click(function () {
         $("html, body").animate({
             scrollTop: 0
         }, 600);
         return false;
     });


    
});
