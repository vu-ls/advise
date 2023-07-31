# AdVISE Federation

AdVISE can now be configured to allow systems to receive and/or transfer
case information. This guide will assist an admin through the necessary
steps to support this feature.

AdVISE supports two types of connections. You can choose to allow one or both
depending on the level of communication desired.  In either case, both parties
must agree on the desired communication and configure the systems appropriately
to support it.

In order to support transferring
cases to an external AdVISE system, you must have generated an API key on the external
system. If you already have an account on the external system and are admin of a Group,
you can easily create one by selecting "My Group" on the left navigation panel, and
selecting the API Tab. Create an API key by clicking the "Add API key" button and
copying the key in a safe location.

If you do not have an account and/or are not the group admin on the external system,
you can ask the coordination team of that system to provide you with an API key to
allow case transfers.

## Requirements

1. A running AdVISE system. Follow the [README-quickstart](./README-quickstart.md) to setup your AdVISE environment(s).
2. A privileged user account (staff or superuser).
3. A reporting form. Follow the [reporting form guide](./reporting.md) before attempting to transfer a case.

### Configuration for accepting case transfers from another AdVISE system

1. If not already available, create a Group for the AdVISE system you intend
to receive cases from.  Navigate to the Groups page found on the left navigation panel.
Click the vertical three dots, and select "Add group."  Provide a name for the Group
and click Submit. Once the group is created, add an email address for the group under
the "Contact Information" Tab. Next, select the "API" tab and click the "Add API Key"
button.  You will need to provide this key to the admin of the other AdVISE instance.
Alternatively, if this Group already exists and a group admin user has been chosen,
the group admin can generate the key themselves. Either way, **note the last four
digits of the key that will be used to make the transfer.**

2. As the privileged user, navigate to the "System Settings" page found
under Settings on the left side navigation panel.

3. Under the "Federation" tab, click the "Add Connection" button. Begin typing
the name of the group identified in step 1. Select the desired group.

4. Add the URL for the other AdVISE system.  This is important in both incoming and
outgoing connections, as AdVISE only allows access to the transfer API endpoints for
URLs configured through the federation connections.

5. Skip the external key for now. See below for configuring external case transfers.

6. Add the last 4 digits of the API key generated in step 1, to the last form field "INTERNAL key" and click Save.

7. If successful, your system is now configured to receive case transfers from
the connection you just added!

8. Cases transferred to your AdVISE instance can be viewed under "Triage." You can
view any threads transferred in your "Archived Threads." 

### Configuration for transferring cases to an external AdVISE instance (OUTGOING)

1. Similar to the previous instructions, create a Group for the system you intend
to share cases with.

2. If you have an existing account on the **other** AdVISE instance and are a
group admin, you can create an API key for that system through the "API" tab on the
"My Groups" page. You will need to provide the last 4 digits of the API key you intend
to use for transfers to the admin team of the **other** AdVISE instance before proceeding.
They will need to follow the [above instructions](#configuration-for-transferring-cases-to-an-external-advise-instance).

3. As the privileged user, navigave to the "System Settings" page found under Settings
on the left side navigation panel.

4. Under the "Federation" tab, either find an existing connection with the desired
group in step 1, or click the "Add Connection" button.

5. Begin typing the name of the group identifed in step 1. Select the desired group.

6. Add the URL for the other AdVISE system.

7. Add the key generated in step 2 for the "Share Key (External)".

8. If successful, your system is now configured to send cases to the connection you
just added.

## Case Transfers

The following steps will guide you to transfer your case to an external
AdVISE system.

### Requirements

1. A running AdVISE system
2. A coordinator-level account
3. A reporting form has been created for your AdVISE system
4. A case with a report that is assigned to you
5. An external connection as configured above

### Transferring a case

To transfer a case, navigate to the case view, and click the three vertical dots
under the "Case Details" section of the case. Select "Transfer Case" from the dropdown
menu. Choose the group you would like to transfer the case to. Decide which aspects
of the case you would like to transfer.  The report is currently required. If you
do not wish to send the report in it's entirety, you can choose to edit the report
before transferring the case. (To edit a report, click the three vertical dots on the
"Original Report" tab and choose "Edit Report").

Provide a transfer reason or any other details you wish to add to the case within
the "transfer reason" form field.  This will be transferred with the case
and used as the case description on the receiving system. After clicking submit,
you will see the progress of the transfer and if successful, you'll receive the new
case ID for the receiving system. Your case will now have an INACTIVE status, and the
resolution will indicate that the case has been transferred. Your AdVISE system retains
information on transferred cases and it can be found by navigating on the "Transfer Case"
dropdown menu. Transfer information retained includes transfer reason, time, external
case id, and case items transferred.

You can choose to transfer additional case items at a later time if needed. The report will
not be resent, but AdVISE will attempt to transfer all items for each category you choose. The
receiving system will not accept duplicate CVE IDs, duplicate artifact names, and redundant
component status.




