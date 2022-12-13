$(function () {

    $( "form" ).each(function() {
	var form = this;
	
	// Suppress the default bubbles
	form.addEventListener( "invalid", function( event ) {
            event.preventDefault();
	}, true );
	
	// Support Safari, iOS Safari, and the Android browser—each of which do not prevent
	// form submissions by default
	$( form ).on( "submit", function( event ) {
            if ( !this.checkValidity() ) {
		event.preventDefault();
            }
	});
	$( "input, select, textarea", form )
        // Destroy the tooltip on blur if the field contains valid data
            .on( "blur", function() {
		var field = $( this );
		var tooltip = bootstrap.Tooltip.getInstance(field);
                if (tooltip) {
		    if (this.validity.valid) {
			$(this).removeClass("requirederror");

			tooltip.dispose();
		    } else {
			tooltip.toggle();
		    }
                }
	    })
        // Show the tooltip on focus
            .on( "focus", function() {
		var field = $( this );
		var tooltip = bootstrap.Tooltip.getInstance(field);
                if (tooltip) {
		    tooltip.toggle();
                }
            });
	
	$( "button:not([type=button]), input[type=submit]", form ).on( "click", function( event ) {
            // Destroy any tooltips from previous runs
            $( "input, select, textarea", form ).each( function() {
		var field = $( this );
		var tooltip = bootstrap.Tooltip.getInstance(field);
		if (tooltip) {
		    tooltip.toggle();
		}
            });
	    
	    // Add a tooltip to each invalid field
            var invalidFields = $( ":invalid", form ).each(function() {
		$(this).addClass("requirederror");
		var field = new bootstrap.Tooltip($(this), {
		    title: "This field is required" });
            });
	    
            // If there are errors, give focus to the first invalid field
            invalidFields.first().trigger( "focus" ).eq( 0 ).focus();
	});
    });

});

function prettytext(btnpadding) {
    
    var lines = 12; //Choose how many lines you would like to initially show
    var buttonspacing = btnpadding; //Choose Button Spacing
    var buttonside = 'left'; //Choose the Side the Button will display on: 'right' or 'left'
    var animationspeed = 1000; //Choose Animation Speed (Milliseconds)
    //Do not edit below
    var lineheight = 0;
    if ($('.text_content').css("line-height")) {
        lineheight = $('.text_content').css("line-height").replace("px", "");
    }
    startheight = lineheight * lines;
    var shortheight = $('.textheightshort').css('max-height');
    // Instead take the max-height set on the textheightshort/textheightlong attributes
    //$('.text_container').css({'max-height' : startheight });

    var buttonheight =  $('.showfull').height();
    $('div.long_text_container').css({'padding-bottom' : (buttonheight + buttonspacing ) });

    if(buttonside == 'right'){
        $('.showfull').css({'bottom' : (buttonspacing / 2), 'right' : buttonspacing });
    } else{
       $('.showfull').css({'bottom' : (buttonspacing / 2), 'left' : buttonspacing });
    }

     $('.moretext').on('click', function(){
        var newheight = $(this).parent('div.long_text_container').find('div.text_content').height();
        $(this).parent('div.long_text_container').find('div.text_container').animate({'max-height' : newheight }, animationspeed );
        $(this).hide().siblings('.lesstext').show();
        $(this).next().next('.scrollnext').fadeIn();

    });

    $('.lesstext').on('click', function(){
        var shortelem = $(this).parent('div.long_text_container').find('div.text_container').hasClass('textheightshort');
        var newheight = startheight;
        if (shortelem) {
            newheight = shortheight;
	}
        var h = $(this).parent('div.long_text_container').find('div.text_content').height();
        $(this).parent('div.long_text_container').find('div.text_container').animate({'max-height' : newheight }, animationspeed );
        $(this).hide().siblings('.moretext').show();
        $(this).next('.scrollnext').fadeOut();
    });

    $('div.long_text_container').each(function(){
        if( $(this).find('div.text_content').height() > $(this).find('div.text_container').height() ){
            $(this).find('.showfull.moretext').show();

        }
    });

    $('.scrollnext').click(function () {
        var scrollnext = $(this).parent().parent().parent().next().offset();
	console.log(scrollnext);
        if (scrollnext) {
	    
            $("html, body").animate({
                scrollTop: $(this).parent().parent().parent().next().offset().top
            }, 600);
        } else {
            $("html, body").animate({
                scrollTop: $(this).parent().offset().top
            }, 600);
        }
        return false;
    });

}
