
$(document).ready(function() {


    $(document).on("submit", "#login-form", function(event) {
	$("#content-main").html("<div class=\"text-center\"><div class=\"spinner-border spinner-border-lg text-primary\" role=\"status\"><span class=\"visually-hidden\">Loading...</span></div></div>");
	event.preventDefault();
	var url = $(this).attr("action");
	$.ajax({
	    url: url,
	    type:"POST",
	    data: $(this).serializeArray(),
	    success: function(data) {
		$("#content-main").html(data);
		console.log("here");
	    }
	});
	
    });


    $(document).on("click", ".socialaccount_provider", function(event) {
	event.preventDefault();
	var url = $(this).attr("href");
	$.ajax({
            url: url,
            type:"GET",
            success: function(data) {
                $("#content-main").html(data);
                console.log("here2");
            }
        });
    });
    

});
