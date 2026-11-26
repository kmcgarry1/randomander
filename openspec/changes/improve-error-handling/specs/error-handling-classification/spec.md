# Spec Delta

## Purpose

Provides a unified classification system for errors that occur across network requests, data validation, storage operations, and caching, enabling consistent error handling and recovery strategies.

## ADDED Requirements

### Requirement: Errors are classified by source and type
The system SHALL classify all errors into predefined categories: `network` (connectivity/HTTP), `validation` (malformed data), `storage` (persistence failures), and `cache` (cache read/write failures). Each error SHALL include metadata: source identifier, error message, and recovery hint.

#### Scenario: Network timeout is classified as network error
- **WHEN** an HTTP request exceeds its timeout threshold
- **THEN** the system throws an error with type `network`, code `timeout`, and a recovery hint `retry`

#### Scenario: Malformed JSON is classified as validation error
- **WHEN** the system attempts to decode JSON and it fails validation
- **THEN** the error is classified with type `validation`, source (e.g., `scryfall`), and recovery hint `retry` or `clear-cache`

#### Scenario: Storage quota exceeded is classified as storage error
- **WHEN** localStorage.setItem throws a QuotaExceededError
- **THEN** the system catches it, classifies it as type `storage`, code `quota-exceeded`, and suggests recovery action `clear-cache` or `export-and-clear`

#### Scenario: Cache corruption is detected and classified
- **WHEN** cache decode returns an invalid or corrupted state
- **THEN** the error is classified as type `cache`, code `corrupted`, with recovery hint `clear-cache`

### Requirement: Error types define recovery capabilities
Each error type SHALL define which recovery strategies are applicable: `network` errors may retry; `validation` errors may retry or clear cache; `storage` errors may clear cache; `cache` errors may clear or repair.

#### Scenario: Network error permits retry
- **WHEN** an error is classified as type `network`
- **THEN** calling code MAY retry the operation with backoff logic

#### Scenario: Validation error may clear cache and retry
- **WHEN** data validation fails and the data came from cache
- **THEN** the error hints `clear-cache-retry`, signaling that clearing cache and retrying the fetch is an appropriate recovery

#### Scenario: Storage error suggests space management
- **WHEN** a storage error occurs with code `quota-exceeded`
- **THEN** the error hints `export-then-clear`, indicating the user should export data before clearing storage

### Requirement: Error context is structured and loggable
Errors SHALL include structured context: timestamp, error source, type, code, message, metadata (e.g., failed URL, field name), and stack trace. The error context SHALL be serializable to JSON for logging and diagnostics.

#### Scenario: HTTP error includes request metadata
- **WHEN** an HTTP request fails with status 404 or 500
- **THEN** the error context includes URL, method, status code, response body (if available), and request headers

#### Scenario: Validation error includes field context
- **WHEN** JSON validation fails at a specific field
- **THEN** the error context includes field name, expected type, actual value, and path in the JSON structure

#### Scenario: Storage error includes quota metadata
- **WHEN** storage quota is exceeded
- **THEN** the error context includes current usage, quota limit, and suggestion to free space
