from allauth.socialaccount.forms import SignupForm
from django import forms
from django.conf import settings
from django.utils.translation import gettext, gettext_lazy as _

class CustomSocialSignupForm(SignupForm):

    organization = forms.CharField(
        max_length=200,
        label="Company/Affiliation",
        required=False)
    
    title = forms.CharField(
        max_length=200,
        required=False,
	label="Job Title")

    screen_name = forms.RegexField(
	label=_("Screen Name"),
        max_length=100,
        help_text=_('The name visible to other users. It may only contain 1 space and may not contain certain special characters. (You can modify this later)'),
        regex=r'^[-\w\+]+(\s[-\w\+]+)*$',
        required=True,
        error_messages={'invalid':_("Invalid username. Your name may only contain 1 space and may not contain certain special characters.")})
    
    agree_to_terms = forms.BooleanField(
        required=True,
        label="I agree to the terms of service")

    class Meta:
        fields = ('screen_name', 'organization', 'title', 'agree_to_terms')
        
    
    def save(self, request):

        organization = self.cleaned_data.pop('organization')
        title = self.cleaned_data.pop('title')
        print(self.cleaned_data)

        user = super(CustomSocialSignupForm, self).save(request)

        user.refresh_from_db()

        user.screen_name = self.cleaned_data['screen_name']
        user.save()
        
        if not(settings.REQUIRE_ACCOUNT_APPROVAL):
            user.userprofile.pending=False
        
        user.userprofile.org = organization
        user.userprofile.title = title
        user.userprofile.preferred_username = user.screen_name
        user.userprofile.save()
                                                                
        return user
