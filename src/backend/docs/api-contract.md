# PsyFlow API Contract

English-only API contract. No backward compatibility aliases are accepted in request payloads, and responses emit only English keys.

## Conventions

- Base path: `/api`
- Content type: `application/json`
- Auth: bearer token required for all endpoints
- Write role required (`admin` or `therapist`) for POST/PATCH endpoints
- Admin Control endpoints require `super_admin`
- Error shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "human readable message"
  }
}
```

## Enums

- Task and exercise type: `exercise | audio | journal | habit`
- Session type: `inPerson | remote`
- Mood source: `professional | patient`
- Transcription status (patch): `none | processing | done`

## Endpoints

### GET /patients

Returns all patients for the caller organization.

Response 200:

```json
[
  {
    "id": "string",
### GET /api/admin/organizations
    "email": "string",
    "age": 0,
Response 200: organization object shape from GET /api/admin/organizations.
    "status": "active",
    "lastSession": "YYYY-MM-DD",
    "nextSession": "YYYY-MM-DD",
    "nextSessionHour": "14:00",
    "averageMood": 0,
    "journalCount": 0,
    "avatarUrl": "string"
  }
]
```
### POST /api/admin/organizations
### GET /patients/{patientId}

Response 201: organization object shape from GET /api/admin/organizations.

Path params:
- `patientId` (string, required)


Response 404:
Response 200: organization object shape from GET /api/admin/organizations.

### GET /patients/{patientId}/tasks

Path params:
- `patientId` (string, required)

Query params:
- `status` (string, optional)

Response 200:

```json
[
Response 200: organization object shape from GET /api/admin/organizations.
    "id": "string",
    "patientId": "string",
    "title": "string",
    "description": "string",
    "type": "exercise",
    "status": "pending",
Response 200: organization object shape from GET /api/admin/organizations.
    "completedAt": "YYYY-MM-DD"
  }
]
```

### POST /patients/{patientId}/tasks

Path params:
- `patientId` (string, required)

Body:

```json
{
  "title": "string",
  "description": "string",
  "type": "exercise"
}
```

Response 201: task object shape from GET /patients/{patientId}/tasks.

Error codes:
- `PATIENT_NOT_FOUND`
- `ROLE_FORBIDDEN`
- `BAD_REQUEST`

### GET /exercises

Query params:
- `type` (string, optional)

Response 200:

```json
[
  {
    "id": "string",
    "title": "string",
    "description": "string",
    "type": "exercise"
  }
]
```

### POST /exercises

Body:

```json
{
  "title": "string",
  "description": "string",
  "type": "exercise"
}
```

Response 201: exercise object shape from GET /exercises.

Error codes:
- `ROLE_FORBIDDEN`
- `BAD_REQUEST`

### GET /patients/{patientId}/mood

Path params:
- `patientId` (string, required)

Response 200:

```json
[
  {
    "date": "YYYY-MM-DD",
    "value": 0,
    "source": "professional"
  }
]
```

### POST /patients/{patientId}/mood

Path params:
- `patientId` (string, required)

Body:

```json
{
  "value": 0,
  "date": "YYYY-MM-DD",
  "source": "professional"
}
```

Response 201: mood object shape from GET /patients/{patientId}/mood.

Error codes:
- `PATIENT_NOT_FOUND`
- `ROLE_FORBIDDEN`
- `BAD_REQUEST`

### GET /patients/{patientId}/sessions

Path params:
- `patientId` (string, required)

Response 200:

```json
[
  {
    "id": "string",
    "patientId": "string",
    "date": "YYYY-MM-DD",
    "type": "remote",
    "duration": 50,
    "summary": "string",
    "insights": ["string"],
    "moodStart": 0,
    "moodEnd": 0,
    "hasTranscription": false,
    "transcription": "string",
    "audioS3Key": "string",
    "transcriptionS3Key": "string"
  }
]
```

### POST /patients/{patientId}/sessions

Path params:
- `patientId` (string, required)

Body:

```json
{
  "date": "YYYY-MM-DD",
  "type": "remote",
  "duration": 50,
  "moodStart": 0,
  "moodEnd": 0,
  "summary": "string",
  "insights": ["string"],
  "tasks": ["string"]
}
```

Response 201: session object shape from GET /patients/{patientId}/sessions.

Error codes:
- `PATIENT_NOT_FOUND`
- `ROLE_FORBIDDEN`
- `BAD_REQUEST`

### GET /patients/{patientId}/transcription

Path params:
- `patientId` (string, required)

Response 200:

```json
{
  "summary": "string",
  "insights": ["string"],
  "tasks": ["string"],
  "transcription": "string"
}
```

Response 404:
- `TRANSCRIPTION_NOT_FOUND`

### POST /sessions/{sessionId}/transcription

Path params:
- `sessionId` (string, required)

Body:

```json
{
  "patientId": "string",
  "transcription": "string",
  "audioS3Key": "string",
  "storeInS3": false,
  "transcriptionS3Key": "string",
  "summary": "string",
  "insights": ["string"],
  "tasks": ["string"]
}
```

Response 200:

```json
{
  "ok": true,
  "sessionId": "string"
}
```

Error codes:
- `SESSION_NOT_FOUND`
- `ROLE_FORBIDDEN`
- `RATE_LIMITED`
- `BAD_REQUEST`

### GET /admin/organizations

Returns all organizations.

Response 200:

```json
[
  {
    "id": "string",
    "name": "string",
    "slug": "string",
    "status": "active",
    "createdAt": "string",
    "updatedAt": "string",
    "deletedAt": null,
    "deletedBy": null
  }
]
```

### POST /admin/organizations

Body:

```json
{
  "name": "string",
  "slug": "string"
}
```

Response 201: organization object shape from GET /admin/organizations.

Error codes:
- `ROLE_FORBIDDEN`
- `BAD_REQUEST`
- `ORGANIZATION_CONFLICT`

### GET /admin/organizations/{organizationId}

Path params:
- `organizationId` (string, required)

Response 200: organization object shape from GET /admin/organizations.

Response 404:
- `ORGANIZATION_NOT_FOUND`

### PATCH /admin/organizations/{organizationId}

Body:

```json
{
  "name": "string",
  "slug": "string"
}
```

At least one field is required.

Response 200: organization object shape from GET /admin/organizations.

### DELETE /admin/organizations/{organizationId}

Soft-deletes the organization by marking it archived.

Response 200: organization object shape from GET /admin/organizations.

### PATCH /sessions/{sessionId}

Path params:
- `sessionId` (string, required)

Body:

```json
{
  "patientId": "string",
  "audioS3Key": "string",
  "transcriptionS3Key": "string",
  "transcriptionStatus": "processing"
}
```

Response 200: session object shape from GET /patients/{patientId}/sessions.

Error codes:
- `SESSION_NOT_FOUND`
- `ROLE_FORBIDDEN`
- `RATE_LIMITED`
- `BAD_REQUEST`

### GET /patients/{patientId}/chat

Path params:
- `patientId` (string, required)

Query params:
- `limit` (integer, optional, default `50`)

Response 200:

```json
[
  {
    "id": "string",
    "role": "string",
    "content": "string",
    "createdAt": "ISO-8601"
  }
]
```

Note: actual chat message fields are passthrough from persisted chat items.

### GET /patients/{patientId}/record

Path params:
- `patientId` (string, required)

Response 200:

```json
{
  "patient": {
    "id": "string",
    "name": "string",
    "email": "string",
    "age": 0,
    "treatmentStartDate": "YYYY-MM-DD",
    "status": "active",
    "lastSession": "YYYY-MM-DD",
    "nextSession": "YYYY-MM-DD",
    "nextSessionHour": "14:00",
    "averageMood": 0,
    "journalCount": 0,
    "avatarUrl": "string"
  },
  "sessions": [],
  "moodRecords": [],
  "diagnoses": [],
  "notes": "string",
  "generalSummary": "string"
}
```

Response 404:
- `PATIENT_NOT_FOUND`

## Agenda Events (New)

Agenda events are a scheduling domain separate from clinical sessions.

### GET /agenda/events

Query params:
- `from` (ISO-8601 datetime, required)
- `to` (ISO-8601 datetime, required)
- `includeCancelled` (boolean, optional, default `false`)

Response 200:

```json
[
  {
    "id": "string",
    "title": "string",
    "description": "string",
    "startAt": "2026-05-30T14:00:00Z",
    "endAt": "2026-05-30T14:50:00Z",
    "durationMinutes": 50,
    "eventType": "session",
    "locationType": "remote",
    "patientId": "string",
    "meetingUrl": "https://...",
    "status": "scheduled",
    "timezone": "America/Sao_Paulo",
    "recurrenceRuleId": "string",
    "occurrenceStartAt": "2026-06-10T14:00:00Z",
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601",
    "createdBy": "string"
  }
]
```

Error codes:
- `BAD_REQUEST`

### GET /agenda/events/{eventId}

Path params:
- `eventId` (string, required)

Response 200: event object shape from GET /agenda/events.

Response 404:
- `AGENDA_EVENT_NOT_FOUND`

### POST /agenda/events

Body:

```json
{
  "title": "string",
  "description": "string",
  "startAt": "2026-05-30T14:00:00Z",
  "endAt": "2026-05-30T14:50:00Z",
  "eventType": "session",
  "locationType": "remote",
  "patientId": "string",
  "meetingUrl": "https://...",
  "timezone": "America/Sao_Paulo",
  "recurrenceRule": "FREQ=WEEKLY;INTERVAL=1",
  "recurrenceUntil": "2026-12-31T23:59:59Z"
}
```

Response 201: event object shape from GET /agenda/events plus optional `warnings` array.

Notes:
- For recurring events, API stores recurrence metadata and generates occurrences per query window.
- Generated recurring occurrences use a virtual id format: `R#<recurrenceRuleId>#<occurrenceStartAtIso>`.

Error codes:
- `ROLE_FORBIDDEN`
- `BAD_REQUEST`

### PATCH /agenda/events/{eventId}

Path params:
- `eventId` (string, required)

Body (all fields optional):

```json
{
  "title": "string",
  "description": "string",
  "startAt": "2026-05-30T15:00:00Z",
  "endAt": "2026-05-30T15:50:00Z",
  "eventType": "followup",
  "locationType": "inPerson",
  "patientId": "string",
  "meetingUrl": "https://...",
  "status": "scheduled",
  "timezone": "America/Sao_Paulo",
  "recurrenceRule": "FREQ=WEEKLY;INTERVAL=1",
  "recurrenceUntil": "2026-12-31T23:59:59Z",
  "recurrenceExceptionDates": ["2026-06-10T14:00:00Z"],
  "applyScope": "single"
}
```

`applyScope` accepted values:
- `single`
- `following`
- `series`

Metadata-first behavior notes:
- `single` on a recurring virtual occurrence creates a detached override (PATCH) or exception date (DELETE).
- `following` on recurring virtual occurrences splits/truncates recurrence from the selected pivot occurrence forward.
- `series` updates/deletes the recurrence rule as source-of-truth.

Response 200: updated event object with `applyScope` and `affectedCount`.

Response 404:
- `AGENDA_EVENT_NOT_FOUND`

Error codes:
- `ROLE_FORBIDDEN`
- `BAD_REQUEST`

### DELETE /agenda/events/{eventId}

Path params:
- `eventId` (string, required)

Query params:
- `applyScope` (string, optional, default `single`)

Response 200:

```json
{
  "ok": true,
  "eventId": "string",
  "applyScope": "single",
  "deletedCount": 1
}
```

Response 404:
- `AGENDA_EVENT_NOT_FOUND`

Error codes:
- `ROLE_FORBIDDEN`
- `BAD_REQUEST`
