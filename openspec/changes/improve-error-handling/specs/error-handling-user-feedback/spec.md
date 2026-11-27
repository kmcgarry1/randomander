# Spec Delta

## Purpose

Delivers clear, actionable error messages and UI indicators to users when operations fail, explaining what went wrong and suggesting recovery steps without technical jargon.

## ADDED Requirements

### Requirement: Error messages are user-friendly and actionable
When an error occurs, the system SHALL display a message that (1) describes what happened in plain language, (2) suggests recovery action(s), and (3) omits internal code/stack traces. Each error type has predefined message templates with context-specific details filled in.

#### Scenario: Network timeout is explained to user
- **WHEN** an HTTP request times out
- **THEN** the UI displays: "The server isn't responding. This might be a temporary hiccup. [Retry] or [Try Later]"

#### Scenario: Validation error explains data issue
- **WHEN** the API returns unexpected data structure
- **THEN** the UI displays: "We couldn't understand the server's response. [Clear Cache and Retry]"

#### Scenario: Storage full error prompts action
- **WHEN** storage quota is exceeded
- **THEN** the UI displays: "Your browser's storage is full. [Clear Cache] to free up space and continue"

#### Scenario: Cache corruption suggests refresh
- **WHEN** cached data is detected as corrupted
- **THEN** the UI displays: "Cached data is damaged. [Refresh] to get fresh data"

### Requirement: Error UI includes recovery buttons or links
When an error occurs, the UI SHALL present only applicable and working recovery actions as buttons or interactive elements matching the error's recovery hints (e.g., [Retry], [Clear Cache], [Reset State]). Each button/link SHALL trigger the corresponding recovery action. Retry SHALL NOT be offered when the failed operation cannot be restored and replayed.

#### Scenario: Retry button appears for network error
- **WHEN** a network error occurs with recovery hint `retry`
- **THEN** a [Retry] button is displayed; clicking it reattempts the operation

#### Scenario: Multiple recovery options for cache error
- **WHEN** a cache-related error has several supported recovery options
- **THEN** the applicable options are displayed in order of likelihood to help

#### Scenario: Recovery action feedback updates UI
- **WHEN** user clicks [Retry] or [Clear Cache and Retry]
- **THEN** the UI shows a loading state; on success, the previous operation resumes; on failure, a new error message appears

#### Scenario: Storage recovery cannot safely replay
- **WHEN** storage targets changed or cannot be verified or coordinated safely
- **THEN** the UI explains that the old operation was not applied, does not offer a misleading retry, and directs the user to review current data and initiate a fresh action if desired

### Requirement: Recovery and stale-data warnings are visible
The system SHALL clearly warn users when it displays stale cached data or cannot persist or clear recovery state.

#### Scenario: Stale data is displayed
- **WHEN** validation of fresh data fails and the system falls back to cached data
- **THEN** the UI displays a "Showing cached data" warning alongside the result

#### Scenario: Recovery cannot be saved
- **WHEN** both recovery persistence backends fail
- **THEN** the UI warns that the error and recovery action cannot be restored after reload

#### Scenario: Persisted recovery state cannot be cleared
- **WHEN** clearing a persisted recovery record fails
- **THEN** the UI reports that the old recovery state may reappear after reload

### Requirement: Error state does not hide previous data
When an error occurs, the system SHALL retain previously displayed data (e.g., last successful card suggestion, History list) while prominently displaying the error. If no previous data exists, an empty or placeholder state is shown with the error overlay.

#### Scenario: Error banner appears above last result
- **WHEN** a draw operation fails after a previous successful draw
- **THEN** the last drawn card/choice is still visible with an error banner above it, explaining what went wrong

#### Scenario: Empty state when no previous data
- **WHEN** an error occurs on the first operation of a session
- **THEN** an error message is displayed with recovery options; no previous card is shown

### Requirement: Error indicators are consistent across app
The system SHALL use consistent visual indicators (color, icon, layout) for errors across all pages (HeroStage, HistoryView, SettingsView). An error SHALL not silently fail without user notification.

#### Scenario: Error banner style is consistent
- **WHEN** errors occur in different views
- **THEN** all error messages use the same visual styling: red/warning color, warning icon, and action buttons in a consistent layout
