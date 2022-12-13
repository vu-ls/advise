# AdVISE Documentation

## AdVISE Objects

### CASE

An AdVISE Case is the core object for tracking vulnerabilities.  A Case
typically starts with a vulnerability [Report](#Report) either reported
to your organization by an internal or external party. A Case can also be
created manually using the New Case button on your cases page.  Each case
is given a unique six digit random identifier which will be used when
referring to the case in the subject of email notifications as well as in the
URL and API end points for accessing the case information.  The Case identifier
is prepended with the CASE_IDENTIFIER variable which can be customized in
the advise/settings.py.

A Case can be assigned to one or more coordinators and can be used to communicate
vulnerability information with the reporter(s), vendors, stakeholders, internal
departments, and anyone else that may need to access the information. A Case can be manually
assigned to a particular coordinator, or it can be auto-assigned if auto assignment
has been configured within settings/User Admin.  A system staff member should add 1 or more
"Assignment roles" in the AdVISE admin panel.  Once roles have been added, staff members
or superusers can add coordinator users to each role with a weight.  The algorithm uses
a weighted round robin for assigning users to each case.

The purpose of a Case is to track the vulnerability from discovery or first
notification through the patch creation to eventual disclosure.

A Case can be in one of following states: Pending, Active, or Inactive.  A Case
starts in the Pending state and can be moved to the Active state once it is populated
with basic information and assigned to a Case Owner. A Case in Pending state can only
be viewed by system coordinators. A Case can be assigned to any user
on the system that is marked as a "Coordinator."  Coordinators are assigned by system
staff members or superusers in the AdVISE admin panel.  Any coordinator within the system
will be able to view restricted information about a case, but only the Case Owner (the person
assigned to the case) can modify the Case.

Once a Case is no longer Active, it should be moved to an Inactive state.
Users will still be able to access the Case as read-only.  Coordinators can continue
to make changes to the Case, but participants will no longer be notified as to
any new changes that are made.

### Case Roles:

#### Owner
   The coordinator(s) assigned to the case. Case owners can edit case details
   (status, title, summary), add [vulnerabilities](#vulnerability), create the [advisory](#advisory),
   create new [case threads](#case-thread), and invite [case participants](#case-participants).

#### Reporter
   This is the reporter or finder of the vulnerability.  If the reporter is an authenticated
   user on your AdVISE system, they will automatically be added to the case and will be notified
   once the Case is made "Active"
   
#### Vendor
   This is a special role in a case because Vendors have the ability to add [status](#Status).
   Vendors can add affected components and any related information about the vulnerability
   and how it relates to their components/products.

#### Participant
   Case participants are special because they can take an active role in the case discussion,
   but they are not prompted to provide component status.

#### Observer
   Case observers are users/groups that have read-only access to a case.  They are not permitted
   to post in a Case Thread, but can read any posts for threads they are invited to participate in.


### Report

An AdVISE Report is information about a vulnerability that is provided in a
a structured format.  With AdVISE, you can customize the format of your vulnerability
reporting form through the Form Manager in your AdVISE settings. AdVISE allows you
to create forms with as many as questions as you wish and decide which format best
solicits answers that will help you in assessing the severity and priority for which
you should triage the vulnerability.  Once a Report is submitted, a Case is immediately
created in order to track that report through the CVD process.

A Vulnerability Report should typically solicit the following information

  * what component/product a vulnerability affects (name and version)
  * how the vulnerability was discovered
  * how the vulnerability is exploited
  * what are the impacts of the vulnerability
  * the steps to reproduce the vulnerability
  * the disclosure plans of the reporter, if any
  * the expected disclosure date
  * the reporter's information (optional for additional questions, or crediting discovery)
  
The report is available in the Case for all participants to view. Coordinators can
redact information from the report, if necessary. 

### Vulnerability

An AdVISE Vulnerability is the object that maintains information about
a particular vulnerability.  A Case typically has one or more vulnerabilities
associated with it.  A vulnerability usually gets a CVE ID at some point during
the CVD process, but until then can be referred to using the Case identifier
(CASE_IDENTIFIER + six digit unique identifier) + .n (e.g. CASE#123456.1 for the
first vulnerability, CASE#123456.2 for the second vulnerability, etc.)  The only
required information for a vulnerability is a description.  Additionally, if you plan to
publish the vulnerability through the CVE, there are a number of additional fields
that are required such as references, problem type, and date public.


### Case Thread

An AdVISE Case Thread is essentially the message board to contain
the official case discussion for each case.  All notified participants will have
access to the "Official" Case thread that is automatically generated with
each new AdVISE case. A Case Thread is comprised of a series of Posts made by
Case Participants.  

Each Case can have 1 or more Case Threads and Case owners can add as many Case threads
as they need during the CVD process. Each individual Case Thread is given a subject and
the owner can invite a subset of the Case Participants to collaborate on each thread.
Once the discussion has occurred, a Case owner can archive the thread. Only superusers can
remove a thread completely.

### Case Participant

An AdVISE Case Participant is a [Contact](#contact) or [Group](#Group) that is invited to participate
in the CVD process.  Each Case Participant has been assigned 1 of 5 [Case Roles](#case-roles).

### Thread Participant

An AdVISE Thread Participant is a subset of the Case Participant List for each Case.
Typically, these are intended for smaller audience conversations around a particular
case topic.


### Status

Case Status can be added when a Case owner has defined 1 or more vulnerabilties.
Status can be entered by a Vendor or the Case owner. If a vendor is adding status and
has already populated their [components](#components), a list of components will be
suggested to them or they can add a new component. 1 Status entry should be added
for each affected component.  Each component status should include the current
status (Not Affected, Affect, Fixed, or Under Investigation), and the component's
affected version.  The vendor can optionally include a statement or comment
about the component status.

Eventually, the vendor will be able to upload a VEX statement with this information
instead of manually typing the status for each component.

### User

An AdVISE User is an individual that has signed up for an AdVISE account and has
a valid, verified email address. When signing up for an AdVISE account, a user
is only required to enter an email address and screen name.  Once a user has signed
up and their account has been approved, they can add a profile image, generate an API key,
modify email preferences, or add additional email addresses to their account.

### Contact

An AdVISE Contact is a [User](#User) or a potential User (an email address). When a User
is registered, a Contact object is created with the email address they used when
creating their account.  A Contact can belong to 0 or more Groups and Group membership
usually requires a verification process if not added by the [Group Admin](#group-admin).

### Group

An AdVISE Group has a unique name and can contain 0 or more AdVISE Contacts. Once a Group
has been established, one or more Group Admins will be identified and verified.


### Group Admin

Once a Group Admin has been designated for a Group, the Group Admin can add
additional verified Contacts to the Group. They can also create service
accounts for API access, add group contact information, add a Group logo, and
modify case permissions for each Contact within their group.

### Message

An AdVISE Message is essentially a private message thread outside a Case. Non-coordinators
can message the coordination team about a topic unrelated to a case or request a new
Case Thread be added to discuss a Case-related issue.  Coordinator users can
message any AdVISE user or Group by searching for their screen name, name, or email address.


### Component

An AdVISE component is a named application, container, device, library, file, framework, Operating
System, or service.  You can optionally provide the following information about a component:

* Version
* Type
* Supplier Name
* Source (Download Location)
* Comment

A component can contain 0 or more dependencies which are themselves components within AdVISE.
When adding a dependency, first add the dependency component, and select the component with
which you want to add dependencies for, then use the "+" button in the
Component Table to select the desired dependencies.  If successful, you'll see a button
listed in the table that will allow you to view all dependencies for the component.

Eventually, AdVISE will allow you to upload a SBOM in order to populate your components.  Each
[Group](#Group) within AdVISE can manage their own components.  AdVISE coordinators can
view all components defined within the system.


### Advisory

An AdVISE Advisory is a document that can be generated that describes the vulnerability.
This can be a machine-readable advisory, such as [CSAF](https://oasis-open.github.io/csaf-documentation/)
or a simple text advisory which can be downloaded in different formats (JSON, PDF) and
distributed as necessary. The Case owner can optionally share a draft of the Advisory
with Case Participants. Eventually, AdVISE will allow different methods of sharing the
Advisory.






