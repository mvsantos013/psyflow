# DynamoDB + Lambda API (API Gateway) Plan for Psyflow

## Decision

Use **DynamoDB** as the primary database and **S3** for audio and raw transcript artifacts.

DynamoDB works well here if you design the tables around the actual access patterns the UI needs rather than the entity relationships. That is the key mental shift: instead of asking "what are my entities?", ask "what does each screen read and write?".

Your instinct of having dedicated tables per domain (patients, sessions, session details, tasks, chat) is the right direction for DynamoDB. The multi-table approach is more readable and maintainable than a pure single-table design for an application at this stage.

The backend runtime model is **AWS Lambda + API Gateway** (not a long-running Flask server). Keep handlers small, stateless, and scoped by route/domain.

---

## Storage Strategy

- **DynamoDB** for structured clinical and operational data
- **S3** for audio recordings and raw transcript payloads
- **Optional Redis later** for session caching, rate limiting, or background job state

### Multi-tenant strategy

- Use **shared tables** across all organizations (do not create one table per org)
- Keep tenant isolation in key design by including `ORG#<orgId>` in tenant-sensitive keys
- Enforce authorization with JWT claims (`custom:org_id`) on every read/write

This scales better operationally than table-per-org while preserving strong isolation when combined with key design + handler checks.

---

## Repository Layout (target)

- `src/ui/web` — React/TanStack UI (components, hooks, routes, styles, client-side API adapters)
- `src/backend` — Lambda handlers, auth utilities, domain/application services, data adapters
- `src/infra` — IaC (CDK) for API Gateway, Lambda, DynamoDB, S3, KMS, Cognito, IAM

Migration principle: move folders in small steps and keep behavior stable at each step. Do not move route files and backend runtime in the same PR.

---

## Access Patterns (the source of truth for DynamoDB design)

Before tables and keys, list every read and write the UI needs. These drive all key decisions.

| # | Operation | Screen | Type |
|---|-----------|--------|------|
| 1 | List all patients in an org | Patient list | Read |
| 2 | Get one patient's full profile | Prontuário header | Read |
| 3 | Filter patients by status | Patient list | Read |
| 4 | List sessions for a patient, newest first | Prontuário sessions tab | Read |
| 5 | Get a single session's details | Session picker | Read |
| 6 | Get transcription and insights for a session | Session card | Read |
| 7 | List mood entries for a patient, by date | Mood chart | Read |
| 8 | Get mood entries split by source (patient vs therapist) | Mood chart | Read |
| 9 | List prescribed tasks for a patient | Tarefas tab | Read |
| 10 | Filter tasks by status or type | Tarefas tab | Read |
| 11 | List exercise templates for an org | Exercícios screen + prescription sheet | Read |
| 12 | Filter exercise templates by type | Exercícios screen | Read |
| 13 | Get chat messages for a patient, newest first | Chat tab | Read |
| 14 | Create patient | Admin | Write |
| 15 | Create session | Session sheet | Write |
| 16 | Save transcription for a session | Session card upload | Write |
| 17 | Create mood entry | Patient app or therapist | Write |
| 18 | Prescribe task for a patient | Nova tarefa sheet | Write |
| 19 | Create exercise template | Exercícios screen | Write |
| 20 | Send chat message | Chat tab | Write |

---

## Tables

Your suggestion (patients, sessions, patientSessionDetails, patientTasks, patientChat) maps well to these patterns. I am keeping that structure and adding two tables you were missing: `mood` for the chart and `exercises` for the library.

The final table list is:

1. `psyflow_orgs_users`
2. `psyflow_patients`
3. `psyflow_patient_sessions`
4. `psyflow_patient_session_content`
5. `psyflow_patient_mood`
6. `psyflow_patient_tasks`
7. `psyflow_exercises`
8. `psyflow_patient_chat`

---

### Table 1: `psyflow_orgs_users`

Handles multi-tenancy and authentication context. Small table, rarely queried at scale.

**Key schema**

| Key | Pattern | Example |
|-----|---------|---------|
| PK | `ORG#<orgId>` | `ORG#clinic-abc` |
| SK | `ORG` for org record, `USER#<userId>` for users | `USER#user-123` |

**Item types**

Org record:
```
PK: ORG#clinic-abc
SK: ORG
name: "Clínica Saúde Mental"
slug: "clinica-saude-mental"
status: "active"
createdAt: "2025-01-01T00:00:00Z"
```

User record:
```
PK: ORG#clinic-abc
SK: USER#user-123
name: "Dra. Ana Lima"
email: "ana@clinica.com"
role: "therapist"          // therapist | admin | assistant
status: "active"
createdAt: "2025-01-15T00:00:00Z"
```

**Access patterns**

| Operation | Query |
|-----------|-------|
| Get org details | `GetItem PK=ORG#orgId, SK=ORG` |
| List all users in org | `Query PK=ORG#orgId, SK begins_with USER#` |
| Get specific user | `GetItem PK=ORG#orgId, SK=USER#userId` |

**No GSIs needed** for this table given its small size.

---

### Table 2: `psyflow_patients`

One item per patient. This is the anchor for everything else.

**Key schema**

| Key | Pattern | Example |
|-----|---------|---------|
| PK | `ORG#<orgId>` | `ORG#clinic-abc` |
| SK | `PATIENT#<patientId>` | `PATIENT#p-001` |

**Item example**
```
PK: ORG#clinic-abc
SK: PATIENT#p-001
patientId: "p-001"
orgId: "clinic-abc"
fullName: "Ana Carolina Ferreira"
email: "ana@email.com"
birthDate: "1990-03-15"
status: "ativo"              // ativo | inativo | alta
startDate: "2024-01-10"
avatarUrl: "https://..."
diagnoses: ["TAG", "Depressão Moderada"]   // StringSet
notes: "..."
createdAt: "2024-01-10T00:00:00Z"
updatedAt: "2025-05-01T00:00:00Z"
```

Access patterns:

| Operation | Query |
|-----------|-------|
| List all patients in org | `Query PK=ORG#orgId` |
| Get specific patient | `GetItem PK=ORG#orgId, SK=PATIENT#patientId` |
| Filter by status | `Query PK=ORG#orgId` + FilterExpression `status = :status` — sufficient given small per-org patient count |

---

### Table 3: `psyflow_patient_sessions`

One item per therapy session. Sortable by date for the session history list.

**Key schema**

| Key | Pattern | Example |
|-----|---------|---------|
| PK | `ORG#<orgId>#PATIENT#<patientId>` | `ORG#clinic-abc#PATIENT#p-001` |
| SK | `SESSION#<YYYY-MM-DD>#<sessionId>` | `SESSION#2025-05-20#s-010` |

Using an ISO date in the sort key means DynamoDB sorts sessions chronologically for free. You get the newest first by querying with `ScanIndexForward=false`.

**Item example**
```
PK: ORG#clinic-abc#PATIENT#p-001
SK: SESSION#2025-05-20#s-010
gsi1pk: "ORG#clinic-abc"              // required for org-sessions-by-date GSI
gsi1sk: "SESSION#2025-05-20#s-010"   // required for org-sessions-by-date GSI
sessionId: "s-010"
patientId: "p-001"
orgId: "clinic-abc"
therapistId: "user-123"
sessionDate: "2025-05-20"
duration: 50
sessionType: "individual"
modality: "online"
summary: "Sessão remota de 50 min..."
moodStart: 5
moodEnd: 7
hasTranscription: true
audioS3Key: "audio/clinic-abc/p-001/s-010.mp3"
transcriptionStatus: "done"   // none | processing | done
createdAt: "2025-05-20T14:00:00Z"
```

**GSI 1: `org-sessions-by-date`**

For the therapist's agenda view — all sessions across all patients for an org, sorted by date.

| Key | Pattern |
|-----|---------|
| PK | `ORG#<orgId>` |
| SK | `SESSION#<YYYY-MM-DD>#<sessionId>` |

Access patterns:

| Operation | Query |
|-----------|-------|
| List sessions for patient, newest first | `Query PK=ORG#orgId#PATIENT#id, ScanIndexForward=false` |
| List sessions for patient in date range | `Query PK=ORG#orgId#PATIENT#id, SK between SESSION#2025-05-01 and SESSION#2025-05-31` |
| Get single session | `GetItem PK=ORG#orgId#PATIENT#id, SK=SESSION#date#sessionId` |
| Therapist agenda (all org sessions) | `Query GSI1 PK=ORG#orgId, ScanIndexForward=false` |

---

### Table 4: `psyflow_patient_session_content`

Your `patientSessionDetails` table, renamed and keyed by org + session rather than patient. This is important: transcription is looked up by `sessionId` within the authenticated org scope.

**Key schema**

| Key | Pattern | Example |
|-----|---------|---------|
| PK | `ORG#<orgId>` | `ORG#clinic-abc` |
| SK | `SESSION#<sessionId>#TRANSCRIPTION` | `SESSION#s-010#TRANSCRIPTION` |

If you later add multiple content types per session (e.g. AI summaries per therapeutic approach), you can add more SK values like `SUMMARY#tcc`, `SUMMARY#psicanalise`.

**Item example**
```
PK: ORG#clinic-abc
SK: SESSION#s-010#TRANSCRIPTION
sessionId: "s-010"
patientId: "p-001"
orgId: "clinic-abc"
audioS3Key: "audio/clinic-abc/p-001/s-010.mp3"
transcriptS3Key: "transcripts/clinic-abc/p-001/s-010.txt"  // full text always in S3
insights:
  - "Gatilho principal: emails após 18h"
  - "Pensamento automático: Sou incompetente"
speakerBlocks:                  // stored here only if < 30 items; otherwise reference transcriptS3Key
  - { time: "00:01", speaker: "terapeuta", text: "..." }
aiConclusions:
  tcc: "..."
  psicanalise: "..."
createdAt: "2025-05-20T15:00:00Z"
updatedAt: "2025-05-20T15:30:00Z"
```

Access patterns:

| Operation | Query |
|-----------|-------|
| Get transcription for a session | `GetItem PK=ORG#orgId, SK=SESSION#sessionId#TRANSCRIPTION` |
| Get all content for a session | `Query PK=ORG#orgId, SK begins_with SESSION#sessionId#` |
| Check if transcription exists | `GetItem` — check `hasTranscription` on session item instead |

---

### Table 5: `psyflow_patient_mood`

Mood entries from both patient and therapist. These power the two-curve chart. Dates do not need to align between sources.

**Key schema**

| Key | Pattern | Example |
|-----|---------|---------|
| PK | `ORG#<orgId>#PATIENT#<patientId>` | `ORG#clinic-abc#PATIENT#p-001` |
| SK | `MOOD#<YYYY-MM-DD>#<recordedBy>#<entryId>` | `MOOD#2025-05-07#therapist#m-001` |

The `recordedBy` value in the SK makes it easy to filter by source with `begins_with`.

**Item example**
```
PK: ORG#clinic-abc#PATIENT#p-001
SK: MOOD#2025-05-07#therapist#m-001
entryId: "m-001"
patientId: "p-001"
orgId: "clinic-abc"
recordedBy: "therapist"      // patient | therapist
recordedAt: "2025-05-07T10:00:00Z"
value: 7
sessionId: "s-009"           // optional, if linked to a session
note: ""
```

Access patterns:

| Operation | Query |
|-----------|-------|
| All mood entries for patient | `Query PK=ORG#orgId#PATIENT#id, SK begins_with MOOD#` |
| Mood entries in date range | `Query PK=ORG#orgId#PATIENT#id, SK between MOOD#2025-05-01 and MOOD#2025-05-31` |
| Patient vs therapist split for chart | Single `Query PK=ORG#orgId#PATIENT#id, SK begins_with MOOD#`, then split by `recordedBy` attribute in app code |

The cleanest approach for the mood chart is to fetch all entries in one query and split by `recordedBy` in the backend service layer. Avoids a GSI.

---

### Table 6: `psyflow_patient_tasks`

Your `patientTasks` table. Prescribed tasks per patient.

**Key schema**

| Key | Pattern | Example |
|-----|---------|---------|
| PK | `ORG#<orgId>#PATIENT#<patientId>` | `ORG#clinic-abc#PATIENT#p-001` |
| SK | `TASK#<prescribedAt>#<taskId>` | `TASK#2025-05-10T09:00:00Z#t-001` |

**Item example**
```
PK: ORG#clinic-abc#PATIENT#p-001
SK: TASK#2025-05-10T09:00:00Z#t-001
taskId: "t-001"
patientId: "p-001"
orgId: "clinic-abc"
prescribedBy: "user-123"
templateId: "e-003"          // nullable, source exercise template
title: "Diário de gratidão"
description: "Escrever 3 coisas boas..."
type: "diario"               // exercicio | audio | diario | habito
status: "aprovada"           // pendente | aprovada | concluida | cancelada
prescribedAt: "2025-05-10T09:00:00Z"
dueAt: "2025-05-17"          // nullable
completedAt: null
sourceSnapshot:              // copy of template at prescription time
  titulo: "Diário de Gratidão"
  descricao: "..."
  tipo: "diario"
```

Access patterns:

| Operation | Query |
|-----------|-------|
| List tasks for patient | `Query PK=ORG#orgId#PATIENT#id, SK begins_with TASK#, ScanIndexForward=false` |
| Filter by status | `Query PK=ORG#orgId#PATIENT#id, SK begins_with TASK#` + FilterExpression `status = :status` |
| Get single task | `GetItem PK=ORG#orgId#PATIENT#id, SK=TASK#prescribedAt#taskId` |

Filtering by status with a FilterExpression is fine here because any single patient will have a small number of tasks. No GSI needed.

---

### Table 7: `psyflow_exercises`

The exercise template library. Org-scoped.

**Key schema**

| Key | Pattern | Example |
|-----|---------|---------|
| PK | `ORG#<orgId>` | `ORG#clinic-abc` |
| SK | `EXERCISE#<exerciseId>` | `EXERCISE#e-001` |

**Item example**
```
PK: ORG#clinic-abc
SK: EXERCISE#e-001
gsi1pk: "ORG#clinic-abc"                      // required for type-index GSI
gsi1sk: "TYPE#exercicio#EXERCISE#e-001"       // required for type-index GSI
exerciseId: "e-001"
orgId: "clinic-abc"
title: "Respiração Diafragmática"
description: "Inspire lentamente pelo nariz..."
type: "exercicio"            // exercicio | audio | diario | habito
active: true
createdBy: "user-123"
createdAt: "2025-01-15T00:00:00Z"
updatedAt: "2025-03-01T00:00:00Z"
```

**GSI 1: `type-index`**

For the exercises screen filtering by type and for the prescription sheet's library tab.

| Key | Pattern |
|-----|---------|
| PK | `ORG#<orgId>` |
| SK | `TYPE#<type>#EXERCISE#<exerciseId>` |

Access patterns:

| Operation | Query |
|-----------|-------|
| List all exercises for org | `Query PK=ORG#orgId, SK begins_with EXERCISE#` |
| Filter by type | `Query GSI1 PK=ORG#orgId, SK begins_with TYPE#exercicio` |
| Get single exercise | `GetItem PK=ORG#orgId, SK=EXERCISE#exerciseId` |
| Deactivate exercise | `UpdateItem` — set `active = false` |

---

### Table 8: `psyflow_patient_chat`

Your `patientChat` table. Chat messages between therapist and patient, sorted by time.

**Key schema**

| Key | Pattern | Example |
|-----|---------|---------|
| PK | `ORG#<orgId>#PATIENT#<patientId>` | `ORG#clinic-abc#PATIENT#p-001` |
| SK | `MSG#<timestamp>#<messageId>` | `MSG#2025-05-20T09:12:00Z#msg-001` |

ISO timestamp in the sort key keeps messages chronologically sortable.

**Item example**
```
PK: ORG#clinic-abc#PATIENT#p-001
SK: MSG#2025-05-20T09:12:00Z#msg-001
messageId: "msg-001"
patientId: "p-001"
orgId: "clinic-abc"
fromType: "therapist"        // therapist | patient
fromId: "user-123"
text: "Oi! Confirmando nossa sessão..."
status: "read"               // sent | delivered | read
sentAt: "2025-05-20T09:12:00Z"
```

Access patterns:

| Operation | Query |
|-----------|-------|
| Load last 50 messages | `Query PK=ORG#orgId#PATIENT#id, SK begins_with MSG#, ScanIndexForward=false, Limit=50` |
| Load older messages (pagination) | Same query with `ExclusiveStartKey` from previous page |
| Send message | `PutItem` |
| Mark messages as read | `UpdateItem` per message, or batch update |

---

## Evaluating Your Original Suggestion

Your five-table structure was sound. Here is how it maps:

| Your name | Final name | Change |
|-----------|------------|--------|
| `patients` | `psyflow_patients` | Same structure, status filter via FilterExpression |
| `sessions` | `psyflow_patient_sessions` | Added ISO date in SK for free sort, added org GSI for agenda |
| `patientSessionDetails` | `psyflow_patient_session_content` | Renamed, keyed by session not patient (needed for direct session lookup) |
| `patientTasks` | `psyflow_patient_tasks` | Same, added ISO timestamp in SK for sort |
| `patientChat` | `psyflow_patient_chat` | Same, added ISO timestamp in SK for sort |
| *(missing)* | `psyflow_patient_mood` | New — needed for the two-curve mood chart |
| *(missing)* | `psyflow_exercises` | New — needed for the exercise library screen |
| *(missing)* | `psyflow_orgs_users` | New — needed for multi-tenant scoping |

The biggest structural change is `patientSessionDetails` → `psyflow_patient_session_content` keyed by org + session. The reason: the transcription card loads by session ID but must remain tenant-scoped. If you key that table by patient, you would need to scan or add a GSI just to get a session's content.

---

## GSI Summary

| Table | GSI Name | PK | SK | Purpose |
|-------|----------|----|----|---------|
| `psyflow_patient_sessions` | `org-sessions-by-date` | `ORG#orgId` | `SESSION#date#id` | Therapist agenda view |
| `psyflow_exercises` | `type-index` | `ORG#orgId` | `TYPE#type#EXERCISE#id` | Filter exercises by type |

Two GSIs total. `psyflow_patients` does not need a GSI for status — a FilterExpression on the main org query is sufficient given the small per-org patient count.

---

## How the Prontuário Screen Loads

Data is loaded on demand per tab — only what the user is viewing. Nothing is prefetched upfront except the patient header.

| Trigger | Table | Query |
|---------|-------|-------|
| Enter patient view | `psyflow_patients` | `GetItem PK=ORG#orgId, SK=PATIENT#patientId` |
| Open Visão Geral tab | `psyflow_patient_mood` | `Query PK=ORG#orgId#PATIENT#id, SK begins_with MOOD#` |
| Open Sessões tab | `psyflow_patient_sessions` | `Query PK=ORG#orgId#PATIENT#id, ScanIndexForward=false` |
| Open Tarefas tab | `psyflow_patient_tasks` | `Query PK=ORG#orgId#PATIENT#id, SK begins_with TASK#` |
| Open Chat tab | `psyflow_patient_chat` | `Query PK=ORG#orgId#PATIENT#id, ScanIndexForward=false, Limit=50` |
| Open session card | `psyflow_patient_session_content` | `GetItem PK=ORG#orgId, SK=SESSION#id#TRANSCRIPTION` |

Each query runs only once per tab visit within a React Query session (cached until stale time). The patient header loads immediately on navigation; tab content loads on first tab open.

---

## S3 Key Conventions

Audio and transcript files stored in S3 follow predictable key patterns:

```
audio/<orgId>/<patientId>/<sessionId>.mp3
transcripts/<orgId>/<patientId>/<sessionId>.txt
```

Both files always go to S3 — transcript text is never stored in DynamoDB. The DynamoDB items reference these keys in `audioS3Key` and `transcriptS3Key` fields. Lambda endpoints generate presigned upload URLs before the client uploads to S3 directly.

---

## Security + LGPD Baseline

This system processes health data, so encryption and pseudonymization are required from day one.

1. Encryption in transit
    - Enforce HTTPS/TLS for all client-to-API traffic
    - Use TLS for all AWS service calls

2. Encryption at rest
    - DynamoDB SSE enabled with AWS KMS
    - S3 SSE-KMS for audio/transcript buckets
    - Encrypted backups/snapshots

3. Pseudonymization (production)
    - Keep operational data identifiable by internal IDs (`patientId`), not by exposing direct identifiers
    - Never use anonymization in primary clinical tables (care workflows require re-identification)
    - Use anonymized datasets only for analytics/research exports

4. Access control + tenant isolation
    - IAM least privilege for API role and background jobs
    - Enforce org isolation on every query and lookup
    - Add per-role restrictions in hardening phase

5. Logs and observability
    - Never log transcripts, notes, JWTs, or raw sensitive fields
    - Mask identifiers in error logs

6. Retention and deletion
    - Define retention windows for audio/transcripts and audit artifacts
    - Support secure deletion/archival workflows when records are no longer required

---

## Implementation Phases

### Phase 1 — Foundation
- Lambda project bootstrap (`src/backend`) with shared request/response utilities
- DynamoDB client (boto3)
- CDK stack for all infrastructure (DynamoDB tables + GSIs, S3 bucket, Cognito User Pool, IAM roles)
- API Gateway + Lambda baseline (health route, shared middleware/util layer)
- repo structure migration baseline (`src/ui/web`, `src/backend`, `src/infra`) with import aliases kept stable
- KMS keys and encryption defaults (DynamoDB SSE, S3 SSE-KMS)
- health check endpoint
- API Gateway CORS configuration
- environment configuration
- standard error response shape: `{ "error": "<human message>", "code": "<ERROR_CODE>" }`
- pagination cursor convention: base64-encode DynamoDB `LastEvaluatedKey`, expose as `?cursor=` query param
- logging policy with sensitive-field masking (no transcript/PII/token payloads in logs)

### Phase 2 — Read APIs (unblock the UI)
- `GET /api/patients` — patient list
- `GET /api/patients/:id` — patient header (GetItem, loads on navigation)
- `GET /api/patients/:id/sessions` — Sessões tab
- `GET /api/patients/:id/mood` — Visão Geral tab
- `GET /api/patients/:id/tasks` — Tarefas tab
- `GET /api/patients/:id/chat` — Chat tab
- `GET /api/exercises` — exercise library

Each endpoint is called independently by the tab that needs it. No single endpoint assembles the full prontuário.

### Phase 3 — Write APIs
- `POST /api/patients/:id/sessions`
- `POST /api/patients/:id/tasks`
- `POST /api/patients/:id/mood`
- `POST /api/exercises`
- `POST /api/sessions/:id/transcription`

### Phase 4 — Uploads
- `POST /api/uploads/audio` — return presigned S3 URL
- `PATCH /api/sessions/:id` — persist S3 key after successful upload

### Phase 5 — Frontend integration
Replace the current in-process Hono mock API and `mock-data.ts` with API Gateway endpoints.

- remove Vite `/api/*` mock middleware once backend endpoints are available
- point frontend API client to `VITE_API_BASE_URL`
- keep local dev option with mock server behind an explicit flag

### Phase 6 — Hardening
- input validation
- tenant isolation checks on every request (especially: validate sessionId belongs to requesting org's patient before fetching session content)
- per-role endpoint restrictions (all roles currently equivalent; refine therapist / assistant / admin boundaries here)
- API tests per endpoint
- IAM least-privilege audit
- retention and deletion policy enforcement for audio/transcript artifacts
- optional anonymized export pipeline for analytics

---

## Open Decisions

1. Should exercise templates be org-scoped only, or should there be a global library that all orgs inherit from?
2. Should transcription processing be synchronous (block until done) or async (return immediately, poll for status)?
3. Do we want a `psyflow_audit_log` table for clinical record changes from day one?
4. What retention windows should we apply for audio, transcripts, and audit artifacts under LGPD policy?


---

---

## Authentication — AWS Cognito

### Why Cognito fits here

Using AWS Cognito keeps the entire stack on AWS — single vendor, single IAM policy model, single billing account. Cognito handles login, password reset, MFA, and token issuance. The backend verifies tokens with Cognito's public JWKS endpoint. No additional auth service is needed.

### How it works end-to-end

```
User logs in via Cognito (Amplify SDK or amazon-cognito-identity-js on frontend)
    → Cognito returns an ID token (JWT, RS256-signed)
    → Frontend sends ID token on every request:
        Authorization: Bearer <id_token>
    → API Gateway JWT authorizer validates token (issuer/audience/signature)
    → Lambda receives validated claims in request context
    → Handler extracts user_id, org_id, and role from claims
    → Scopes all DynamoDB queries to that org_id
```

### Custom attributes — how org_id and role get into the JWT

Cognito User Pools support custom attributes on the user schema. Define them as:

| Attribute | Cognito name | Mutable by user |
|-----------|-------------|-----------------|
| org_id | `custom:org_id` | No |
| role | `custom:role` | No |

Setting `mutable = false` means only the admin API can change them — users cannot elevate their own role or switch orgs. The ID token includes these as `custom:org_id` and `custom:role` claims.

Available roles: `admin`, `therapist`, `assistant`.

### Lambda auth handling

Preferred path: validate JWT at API Gateway (Cognito/JWT authorizer) and trust claims from `requestContext.authorizer` in Lambda handlers.

If you need in-function validation for internal invokes, use a shared verifier utility.

```python
# src/backend/auth.py
import os
import jwt
from jwt import PyJWKClient
from typing import Any, Dict

USER_POOL_ID  = os.environ["COGNITO_USER_POOL_ID"]
AWS_REGION    = os.environ["AWS_REGION"]
APP_CLIENT_ID = os.environ["COGNITO_APP_CLIENT_ID"]

JWKS_URL = (
    f"https://cognito-idp.{AWS_REGION}.amazonaws.com"
    f"/{USER_POOL_ID}/.well-known/jwks.json"
)
_jwks_client = PyJWKClient(JWKS_URL, cache_jwk_set=True, lifespan=3600)

def verify_bearer_token(auth_header: str) -> Dict[str, Any]:
    if not auth_header.startswith("Bearer "):
        raise ValueError("missing bearer token")
    token = auth_header[7:]
    signing_key = _jwks_client.get_signing_key_from_jwt(token)
    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=APP_CLIENT_ID,
    )
    org_id = payload.get("custom:org_id")
    if not org_id:
        raise PermissionError("user has no org assigned")
    return {
        "user_id": payload["sub"],
        "org_id": org_id,
        "role": payload.get("custom:role"),
    }
```

The JWKS client caches keys for 1 hour — no remote call on every request. With API Gateway authorizer enabled, Lambda usually reads claims from request context and does not call JWKS directly.

### Example protected Lambda handler

```python
import json

def list_patients(event, _context):
    claims = event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
    org_id = claims.get("custom:org_id")
    if not org_id:
        return {"statusCode": 403, "body": '{"error":"forbidden","code":"ORG_REQUIRED"}'}

    items = dynamo.query(
        TableName="psyflow_patients",
        KeyConditionExpression="PK = :pk",
        ExpressionAttributeValues={":pk": {"S": f"ORG#{org_id}"}},
    )["Items"]
    return {"statusCode": 200, "body": json.dumps(items)}
```

### User profiles in DynamoDB

`psyflow_orgs_users` is a **profile store**, not an auth store. It holds display data (name, avatar, contact) that Cognito does not manage. The Cognito `sub` (UUID) is used as the `userId` key, so the two are always in sync.

When provisioning a new therapist:
1. Create the user in Cognito User Pool (via AWS Console or Admin SDK)
2. Set `custom:org_id` and `custom:role` as non-mutable custom attributes
3. Write a matching profile item to `psyflow_orgs_users` using the Cognito UUID as the SK

The provisioning script must be idempotent: check whether the Cognito user already exists before creating it, then upsert the DynamoDB profile. This ensures partial failures (e.g. DynamoDB write failed after Cognito user was created) are safely retryable without creating duplicates.

```
PK: ORG#clinic-abc
SK: USER#<cognito-uuid>
name: "Dra. Ana Lima"
email: "ana@clinica.com"
role: "therapist"
avatarUrl: "https://..."
```

### Tenant isolation guarantee

The contract enforced by API Gateway authorizer + handler checks:

- `org_id` comes only from the verified JWT, never from query params or request body
- Every DynamoDB `Query` and `GetItem` includes `ORG#<org_id>` in the primary key condition (directly or as part of a composite PK such as `ORG#orgId#PATIENT#patientId`)
- For session-content reads, require both org-scoped key access and patient/session ownership validation in handler logic
- A therapist from org A cannot read data from org B even if they know patient IDs

### Phase 1 additions (auth)

Add to Phase 1 — Foundation:
- Cognito User Pool + App Client (provisioned via CDK stack)
- `COGNITO_USER_POOL_ID`, `AWS_REGION`, `COGNITO_APP_CLIENT_ID` in `.env` and deployment config
- API Gateway JWT authorizer configuration (issuer, audience)
- `src/backend/auth.py` for shared claims extraction/optional token verification
- `GET /api/auth/me` — decode token, return user profile from `psyflow_orgs_users`
- Provisioning script: creates Cognito user with custom attributes + writes DynamoDB profile in one step (idempotent — safe to re-run on partial failure)

> **Roles:** all authenticated org members (therapist, assistant, admin) have equivalent access for now. The `custom:role` claim is read from API Gateway/Lambda request claims for future use. Per-role endpoint restrictions are a Phase 6 item.
