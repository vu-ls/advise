# AdVISE Reporting Form

This page will assist a staff level user in creating an AdVISE
reporting form.  The reporting form will be accessible to authenticated
and non-authenticated (anonymous) users. AdVISE allows a coordination
team to customize the vulnerability reporting form though the Form Manager
in the AdVISE settings.  The application allows
complete customization of questions and answer formats. A
report should ideally guide a team in assessing the severity and priority
when triaging a vulnerability.

A vulnerability report should typically solicit the following information:

  * what component/product a vulnerability affects (name and version)
  * how the vulnerability was discovered
  * how the vulnerability is exploited
  * what are the impacts of the vulnerability
  * the steps to reproduce the vulnerability
  * the disclosure plans of the reporter, if any
  * the expected disclosure date
  * the reporter's information (optional for additional questions, or crediting discovery)

## Requirements

1. A running AdVISE system. Follow the [README-quickstart](./README-quickstart).
2. A staff-level user account. (Create an AdVISE user and
have the admin (superuser) check the "Staff" option in the AdVISE admin dashboard.)

### Configuration

1. As the staff-level user, navigate to the "Reporting Form" page
found under Settings on the left side navigation panel.
2. Click the "Add Form" button on the top right side of the page.
3. Fill out the basic form information. The only required field is the title,
but it's recommended to add a "Form Intro" to let users know
what they can expect after submitting the form.  You might include information
like typical response times, how you plan to follow-up, encourage account creation,
etc. 
4. After submitting step 3, you are now ready to customize your form. Use the
"Add Question" button to create form questions. You can adjust the question type
so that the system knows what kind of answers to present (text, numerical,
choices, etc.).  You have the option to require questions to be answered
for form submission. If you choose to check the "Keep answers private"
checkbox, the coordination team will be able to view the answers, but any
additional case participants will not see the question or the response
in the vulnerability report.
5. Once your happy with the questions, you can view the vulnerability reporting
form by clicking the "Report a Vulnerability" link on the left side navigation
panel.
6. You can edit your form at any time through the Reporting Form page under Settings.
Click the three vertical dots to edit the form or question settings.
