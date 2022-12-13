
function nextPage(page) {
    var url = $("#searchform").attr("action");
    var facet = $(".search-menu a.active").text();
    $("#searchresults").load(url+"?page=" + page + "&facet=" + facet);
}

function nextResults(page) {
    var url = $("#searchform").attr("action");
    var facet = $(".search-menu a.active").text();
    $("#id_page").val(page);
    var data = $('#searchform').serialize() + "&facet=" + facet;
    $.ajax({
        url: url,
        type: "GET",
        data: data,
        success: function(data) {
            $("#searchresults").html(data);
        }
    });

}

var priorSearchReq = null;

function searchContacts(modal) {
    var url = $("#searchform").attr("action");
    $("#loader").replaceWith("<div class='loading_gif'></div>");
    $("#id_page").val("1");
    var facet = $(".search-menu a.active").text();
    if (history.pushState) {
        var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?q=' + $("#search_vector").val() + "&facet=" + facet;
        window.history.pushState({path:newurl},'',newurl);
    }
    
    var data = $('#searchform').serialize() + "&facet=" + facet;
    if(priorSearchReq) {
        priorSearchReq.abort();
    }
    priorSearchReq = $.ajax({
	url: url,
	type: "GET",
	data: data,
	success: function(data) {
	    console.log(data);
	    $("#searchresults").html(data);
	    priorSearchReq = null;
	}
	});

}


$(document).ready(function() {

    var $modal = $("#modal").modal();
    

    $(document).on("click", '.search_page', function(event) {
        var page = $(this).attr('next');
        nextPage(page);
    });

    $(document).on("click", '.search_notes', function(event) {
        var page = $(this).attr('next');
        nextResults(page);
    });

    searchContacts($modal);

    $(".search-menu").on("click", "a", function(event) {
        $( ".search-menu a" ).each(function( index ) {
            $(this).removeClass("active");
        });
        $(this).toggleClass("active");
	event.preventDefault();
        searchContacts($modal);

    });
    
    $(document).on("click", '#reassign', function(event) {
        $("#assign_block").show();
        $(".assigned_to").hide();

    });

    $(document).on("click", "#assign_submit", function(event) {
        var val = $("#uassign option:selected").val()
        window.location.href="?assign="+val;
        $("#assign_block").hide();
        $(".assigned_to").show();
	location.reload(true);
    });

    $(document).on("click", "#assign_cancel", function(event) {
        $("#assign_block").hide();
        $(".assigned_to").show();
    });

    $(document).on("change", 'input[type=radio][name=sort]', function(event) {
	searchContacts($modal);

    });
    

    var input = document.getElementById("search_vector");
    if (input) {
	input.addEventListener("keyup", function(event) {
            searchContacts($modal);
	});
    }

    $(document).on("submit", "#searchform", function(event) {
	event.preventDefault();
	searchContacts($modal);
    });

    $(document).on("submit", "#cmgrform", function(event) {
	event.preventDefault();
	/*lookup vendor name first */
	var url = $(this).attr("action");
        $.ajax({
            url: url,
            type: "POST",
            data: $(this).serialize(),
            success: function(data) {
		location.href=data['new'];
	    },
	    error: function(xhr, status) {
		var data = JSON.parse(xhr.responseText);
		$("#error").html("<p>"+ data["error"] + "</p>");
		$("#error").show();
	    }
	});
    });



    
    $(document).on("click", "#creategroup", function(event) {
	event.preventDefault();
        var url = $(this).attr("href");
        $.ajax({
            url: url,
            type: "GET",
            success: function(data) {
                $modal.html(data).modal('show');
            }
        });
    });
    

});
