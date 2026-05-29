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

### GET /sessions/agenda

Response 200:

```json
[
  {
    "dayOffset": 0,
    "hour": 14,
    "patientId": "string",
    "type": "remote"
  }
]
```

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
