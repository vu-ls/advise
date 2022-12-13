

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

function modalError(modal, error) {
    modal.html("<div class=\"modal-dialog\"><div class=\"modal-content\"><div class=\"modal-header\"><h5 class=\"modal-title\">Error</h5> <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"modal\" aria-label=\"Close\"></button></div><div class=\"modal-body\"><p>"+error+"</p></div> <div class=\"modal-footer text-right\"><a href=\"#\" class=\"btn btn-outline-secondary\" data-bs-dismiss=\"modal\" type=\"cancel\">Ok</a></div></div></div>").modal('show');
}



$(document).ready(function() {

    var $modal = $("#modal").modal();

    if (document.getElementById('contact_taggle')) {
        var tags = JSON.parse(document.getElementById('contact_tags').textContent);
        var availtags = JSON.parse(document.getElementById('other_tags').textContent);
        var contact_taggle = new Taggle('contact_taggle', {
            tags: tags,
            duplicateTagClass: 'bounce',
            allowedTags: availtags,
            placeholder: ["Tag this Contact..."],
            tagFormatter: function(li) {
                var node = li.querySelector('.taggle_text');
                var text = node.textContent;
                var link = '<a href="/contacts/search/?q='+text+'"/>';
                $(node).wrapInner(link);
                return li;
            },

	     onTagAdd: function (event, tag) {
                if (event) {
                    add_tag($modal, contact_taggle, tag)
                }
            },
            onBeforeTagRemove: function (event, tag) {
                if (event) {
                    del_tag($modal, contact_taggle, tag)
                }
                return true;
            },
        });
        auto($modal, availtags, contact_taggle);
    }


    
    $(document).on("click", "#adduser", function(event) {
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

    $(document).on("click", ".rmemail", function(event) {
        event.preventDefault();
	var url = "/advise/api/group/contacts/"+$(this).attr("id");
	modalConfirm($modal, "Are you sure you want to remove this contact from the group?", "confirmrm", url);
	
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

    $(document).on("click", "#addemail", function(event) {
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


    $(document).on("submit", "#addemailform", function(event) {
        event.preventDefault();
        var url = $("#addemailform").attr("action");
        $.ajax({
            url: url,
            type: "POST",
            data: $("#addemailform").serialize(),
            success: function(data) {
                console.log(data);
                if (data['refresh']) {
                    window.location.reload(true);
                } else if (data['msg_body']){
                    $("#vendor-results").html("<p><b>" + data['text'] + " Or <a href=\""+ data['email_link'] + "\">Request Authorization via Email</a></b></p>")
                    $("#id_msg").val(data['msg_body']);
                    $("#msgvendor").removeClass("hidden");
                } else {
		    $modal.html(data).modal('show');
                }
            },
	    error: function(xhr, status) {
		modalError($modal, "An error occurred");
	    }
        });
    });


    
    var csrftoken = getCookie('csrftoken');
    
    $(document).on("click", ".activate", function(event) {
	event.preventDefault();
	var act = $(this).html();
	if (act.includes('Deactivate')) {
	    var data = {
		"active": false
	    }
	} else {
	    var data = {
		'active': true
	    }
	}
	var url = $(this).attr("href");

	$.ajax({
	    type: 'PATCH',
	    url: url,
	    headers: {
		'X-CSRFTOKEN': csrftoken
	    },
	    data: JSON.stringify(data),
	    processData: false,
	    contentType: "application/json; charset=utf-8",
	    success: function(data) {
		location.reload();
	    },
	    error: function(xhr, status){
		permissionDenied($modal);
	    }
	});
    });

    function contactClickFunction(cell, formatterParams, onRendered) {
        var url_mask = cell.getRow().getData().url;
	console.log(url_mask);
        return "<a href=\""+url_mask+"\">"+ cell.getRow().getData().contact.email + "</a>";
    }


    var taskbuttonFormatter = function(cell,  formatterParams, onRendered) {
	var button = "<a href=\"#\" class=\"rmemail\" id="+cell.getValue()+"><i class=\"fas fa-trash-alt\"></i></a>";
	return button;
    };

    var userTypeFormatter = function(cell, formatterParams, onRendered) {
	var group_admin = cell.getValue();
	if (group_admin) {
	    return "<i class=\"fas fa-crown\"></i>"
	} else if (cell.getRow().getData().contact.user_name) {
	    return "<i class=\"fas fa-user\"></i>"
	} else {
	    return "<i class=\"fas fa-envelope\"></i>";
	}
    }
    
    var vendors_url = $("#contact-table").attr("url");
    var vendors_table = new Tabulator("#contact-table", {
        data:[],
	layout:"fitColumns",
        selectable:true,
        ajaxURL: vendors_url,
	/*ajaxProgressiveLoad:"scroll",
          ajaxFiltering:true,*/
        ajaxLoaderLoading: "<div style='display:inline-block; border:4px solid #333; border-radius:10px; background:#fff; font-weight:bold; font-size:16px; color:#000; padding:10px 20px;'>Loading data</div>",
	tooltipsHeader:true,
        placeholder: "No contacts.",
	columns:[
            {title:"Email", field:"contact.email", formatter:contactClickFunction},
	    {title:"Name", field:"contact.name"},
	    {title:"Phone", field:"contact.phone"},
	    {title:"Verified", field:"verified"},
	    {title:"Type", field: "group_admin", formatter: userTypeFormatter},
	    {formatter:taskbuttonFormatter, align:"center", field:"id"}
	]
    });

    $(document).on("click", ".verify", function(event) {
        event.preventDefault();
	var selectedRows = vendors_table.getSelectedRows();
	var url = $(this).attr("href");
	var formdata = {'verified': true};
	if (selectedRows.length > 0) {
            for (i=0; i < selectedRows.length; i++) {
		var new_url = url.replace(1, selectedRows[i].getData().id);
		$.ajax({
		    type: 'PATCH',
		    url: new_url,
		    headers: {
			'X-CSRFTOKEN': csrftoken
		    },
		    data: JSON.stringify(formdata),
		    processData: false,
		    contentType: "application/json; charset=utf-8",
		    success: function(data) {
			vendors_table.replaceData()
			console.log("success")
                    },
		    error: function(xhr, status) {
			console.log(xhr);
		    }
		});
	    }
	}
    });

    $(document).on("click", ".promote", function(event) {
	event.preventDefault();
        var selectedRows = vendors_table.getSelectedRows();
	var url = $(this).attr("href");
        var formdata = {'group_admin': true};
        if (selectedRows.length > 0) {
            for (i=0; i < selectedRows.length; i++) {
                var new_url = url.replace(1, selectedRows[i].getData().id);
		$.ajax({
                    type: 'PATCH',
                    url: new_url,
                    headers: {
                        'X-CSRFTOKEN': csrftoken
                    },
                    data: JSON.stringify(formdata),
                    processData: false,
                    contentType: "application/json; charset=utf-8",
                    success: function(data) {
                        vendors_table.replaceData()
			console.log("success")
                    },
                    error: function(xhr, status) {
			var data = JSON.parse(xhr.responseText);
			if ('group_admin' in data) {
			    modalError($modal, `Error: ${data['group_admin']}`);
			}
                        console.log(xhr);
			
                    }
                });
            }
        }
    });

    $(document).on("click", ".demote", function(event) {
        event.preventDefault();
        var selectedRows = vendors_table.getSelectedRows();
        var url = $(this).attr("href");
        var formdata = {'group_admin': false};
        if (selectedRows.length > 0) {
            for (i=0; i < selectedRows.length; i++) {
                var new_url = url.replace(1, selectedRows[i].getData().id);
                $.ajax({
                    type: 'PATCH',
                    url: new_url,
                    headers: {
                        'X-CSRFTOKEN': csrftoken
                    },
                    data: JSON.stringify(formdata),
                    processData: false,
                    contentType: "application/json; charset=utf-8",
                    success: function(data) {
                        vendors_table.replaceData()
                        console.log("success")
                    },
                    error: function(xhr, status) {
                        console.log(xhr);
                    }
                });
            }
        }
    });
    
   
    
});

	
	
