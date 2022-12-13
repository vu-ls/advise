$( function() {
    $( "#id_due_date" ).datepicker({dateFormat: 'yy-mm-dd', minDate: 0});

    $("#id_public_date").datepicker({dateFormat:'yy-mm-dd'});
    
    $("#caseform").submit(function() {
	$("#caseform:disabled").removeAttr('disabled');
    });
});
