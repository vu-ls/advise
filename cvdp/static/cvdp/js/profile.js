

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

$(document).ready(function() {

    var modal = $("#modal").modal();
    
    $(document).on("click", "#gentoken", function(event) {
        event.preventDefault();
        var url = $(this).attr("action");

	$.ajax({
	    url:url, 
	    type: "GET",
	    success: function(data) {
                modal.html(data).modal('show');
	    }
        });
    });

    $(document).on("click", "#apidone", function(event) {
	window.location.reload(true)
    });
    
    
    $(document).on("submit", "#confirmrefresh", function(event) {
	event.preventDefault();
	/*modal.foundation('close');*/
	var url = $(this).attr("action");
        $.ajax({
            url: url,
	    data: $(this).serialize(),
            type: "POST",
            success: function(data) {
                modal.html(data).modal('show');
            }
        });

    });

    $(document).on("click", '#reset', function(event) {
        var formdata = $("#addlogo").serializeArray();
        formdata.push({name:"delete", value:1});
        $.ajax({
            type: 'POST',
            url: $("#addlogo").attr("action"),
            data: formdata,
            success: function(data) {
		console.log(data);
                $("#logo").html(data);
            }
        });
    });

    $(document).on("change", '#upload', function(event) {
        var formdata = new FormData();
        var file = document.getElementById('upload').files[0];
        formdata.append('file', file);
        formdata.append('csrfmiddlewaretoken', getCookie('csrftoken'))
        $.ajax({
            type: 'POST',
            url: $("#addlogo").attr("action"),
            data: formdata,
            processData: false,  // tell jQuery not to process the data  
            contentType: false,
            success: function(data) {
                $("#logo").html(data);
            }

        });

    });

    
    
});
