


$(function () {
    $(document).on("click", "#loginbtn", function(event) {
	event.preventDefault();
	var modal = $("#largemodal").modal();
	var modalbody = $("#modalbody");
	var url = $(this).attr('href');
	$.ajax({
            url: url,
            type: "GET",
            success: function(data) {
		modalbody.html(data.html);
                modal.modal('show');
            },
        });

	
    });
});
