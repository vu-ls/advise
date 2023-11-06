AA#Changelog

All notable changes to AdVISE will be documented in this file.

## [1.4.0] - 2023-11-06

### Added

- Option to add component owner from component detail view
- Use the production CVE API by default if no CVE accounts exist
- Prompt user with case resolution when changing case status from active to inactive
- Allow users to configure case resolutions
- Allow file input as question type for forms
- Add react testing suite for testing react front-end components,
- Add worker framework to perform certain tasks asynchronously
- Add ability to add scheduled tasks through admin app
- Add ability to provide justifications for SSVC decisions
- Add pagination to groups view
- Auto generate logging config based on installed apps

### Changed

- Use React Router for front-end navigation to replace unnecessary django views
- Move CVE API settings into settings.py
- Use HTTP options request to populate certain drop-down forms.
- Upgrade dependencies: cryptography, certifi, quill-mention, urllib3, postcss, traverse
- Improvements to UI

### Fixed

- Bug in CVE publishing modal
- Issue with status badges when components have long names
- Issue in component edit modal
- Remove unused cvelib
- Fix SBOM download error due to download location
- Fix inbox app scrolling issue

## [1.3.0] - 2023-08-01

### Added

- Prompt user to notify case participants when case status changes to "Active"
- Allow case owners to update case report and view original report
- Improved error reporting
- Add case transfer API to allow instances to transfer cases
- Populate vulnerability information and status from CVE Entry
- Publish CVE ADP Container if ADP Role is available
- Add date scored to SSVC information
- New unit tests for testing case transfers
- Documentation for designing the reporting form
- Documentation for configuring federation and case transfers

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
