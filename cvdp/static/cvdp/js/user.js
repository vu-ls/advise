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
    modal.html("<div class=\"modal-dialog\"><div class=\"modal-content\"><div class=\"modal-header\"><h5 class=\"modal-title\">Confirm Action</h5> <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"modal\" aria-label=\"Close\"></button></div><div class=\"modal-body\"><\p>"+question+"</p></div> <div class=\"modal-footer text-right\"><a href=\"#\" class=\"btn btn-outline\-secondary\" data-bs-dismiss=\"modal\" type=\"cancel\">Cancel</a><button class=\""+confirmclass+" btn btn-primary\" action=\""+url+"\" />Confirm</button></div></div></div>").modal('show');
}


$(document).ready(function() {

    var $modal = $("#modal").modal();

    $(document).on("click", "#rmcontact", function(event) {
        event.preventDefault();
        var url = $(this).attr("href");
        modalConfirm($modal, "Are you sure you want to delete this contact?", "confirmrm", url);

    });

    $(document).on("click", ".confirmrm", function(event) {
        event.preventDefault();
        $modal.modal('hide');
        var url = $(this).attr("action");
	var after = $("#rmcontact").attr("confirm_action");
	var csrftoken = getCookie('csrftoken');
        $.ajax({
            url: url,
            type: "DELETE",
            headers: {
                'X-CSRFTOKEN': csrftoken
            },
            success: function(data) {
		location.href=after;
            }
        });
    });

    $(document).on("click", "#resetmfa", function(event) {
        event.preventDefault();
        var url = $(this).attr("href");
        modalConfirm($modal, "Are you sure you want to reset this user's MFA? This cannot be undone.", "confirmrmmfa", url);

    });

    
    $(document).on("click", ".confirmrmmfa", function(event) {
        event.preventDefault();
        $modal.modal('hide');
        var url = $(this).attr("action");
        var csrftoken = getCookie('csrftoken');
        $.ajax({
            url: url,
            type: "POST",
            headers: {
                'X-CSRFTOKEN': csrftoken
            },
            success: function(data) {
                location.reload();
            }
        });
    });

    $(document).on("click", "#revokekey", function(event) {
        event.preventDefault();
        var url = $(this).attr("href");
        var csrftoken = getCookie('csrftoken');

        $.ajax({
            url: url,
            data: {'email': $("#id_email").val(),
                   "csrfmiddlewaretoken":csrftoken,
                   'noconfirm':1},
            type: "POST",
            success: function(data) {
                modal.html(data).modal('show');
            }
        });

    });
    
    
});
