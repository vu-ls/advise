#Changelog

All notable changes to AdVISE will be documented in this file.

## [Unreleased]

### Added

- Prompt user to notify case participants when case status changes to "Active"
- Allow case owners to update case report and view original report
- Improved error reporting
- Add case transfer API to allow instances to transfer cases
- Populate vulnerability information and status from CVE Entry
- Publish CVE ADP Container if ADP Role is available
- Add date scored to SSVC information
- New unit tests for testing case transfers

### Changed

- Participant role from "vendor" to "supplier"
- Update case modified time on case related object additions, changes
- Removed CVE services option for group usage
- Vulnerability UI Form - consolidate options into one dropdown button
- Upgrade dependencies: semver, django, cryptography

### Fixed

- Changing role through CVE Services API
- Changing username through CVE Services API
- Updating CVE Entry through CVE Services API
- Date Public format when submitting CVE Entry

## [1.2.0] - 2023-06-06

### Added

- OpenVEX export
- Dependency upgrades (requests, django-ses, sqlparse, cryptography)
- Ability to remove component dependencies
- Import spdx file to load components
- SPDX export of components
- Adding images to posts/messages
- Allow case owners to un-archive a thread.
- Allow case participants to share status
- Component changelog/activity
- Add popover to case participant list to show included users
- Add justification option when case participant selects "Not Affected" as status
- Add view to see cases per group

### Changed

- Make archived threads read-only
- Component table searching and viewing improvements

### Fixed

- Scroll issues
- Only allow users to be tagged in post if they belong to case thread
- Fix loading threads when sending a message to the group
- Fix pagination on global search
- Allow MFA setup through admin login
- Case Participants should only have access to a case once notified
- Other bug fixes

### Removed

- Remove unnecessary group type

## [1.1.0] - 2023-05-11

### Added

- Activity logging
- CSAF export
- Configurable storage
- Allow anonymous reporting
- Add group, shared inbox
- Add calendar reminders for cases
- Email preferences
- Dependency upgrades
- Add Google ReCAPTCHA on sign up forms and vul reporting form

### Fixed

- Improve email notifications
- Improve pagination and infinite scroll
- Improve PDF rendering of case advisory
- Login/registration improvements depending on configuration
- Bug Fixes

### Removed

- Remove old jquery views and tables

## [1.0.0] - 2023-03-31

### Initial Public release
