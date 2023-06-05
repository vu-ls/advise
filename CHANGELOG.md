#Changelog

All notable changes to AdVISE will be documented in this file.

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

### Changed

- Make archived threads read-only
- Component table searching and viewing improvements

### Fixed

- Scroll issues
- Only allow users to be tagged in post if they belong to case thread
- Fix loading threads when sending a message to the group
- Fix pagination on global search
- Allow MFA setup through admin login
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
