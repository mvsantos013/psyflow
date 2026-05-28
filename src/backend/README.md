# PsyFlow Backend

This backend is being migrated from a monolithic Flask module to a layered architecture for better readability, testability, and maintainability.

Canonical API contract: [docs/api-contract.md](docs/api-contract.md).
Infra deployment guide: [../infra/README.md](../infra/README.md).

## Current Direction

Target request flow:

1. Controller: HTTP transport concerns.
2. Service: business logic and orchestration.
3. Repository: DynamoDB access.
4. Core: cross-cutting concerns (auth, rate limit, logging, errors).

## Local Backend Setup

1. Install uv (one time):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. Sync dependencies from [pyproject.toml](pyproject.toml):

```bash
uv sync
```

If `uv.lock` is already committed and you want strict reproducibility:

```bash
uv sync --frozen
```

3. Configure runtime environment variables:

```bash
export STAGE=dev
export PATIENTS_TABLE_NAME=psyflow-patients-dev
export SESSIONS_TABLE_NAME=psyflow-patient-sessions-dev
export MOOD_TABLE_NAME=psyflow-patient-mood-dev
export TASKS_TABLE_NAME=psyflow-patient-tasks-dev
export CHAT_TABLE_NAME=psyflow-patient-chat-dev
export EXERCISES_TABLE_NAME=psyflow-exercises-dev

# Optional, required for upload/transcription features
export TRANSCRIPTIONS_BUCKET_NAME=<bucket-name>
export AUDIO_UPLOADS_BUCKET_NAME=<bucket-name>
```

If `STAGE` is not set, backend defaults to `dev`.

4. Provide AWS credentials for boto3 access:

```bash
export AWS_PROFILE=<your-profile>
export AWS_REGION=us-east-1
```

5. Run the backend locally:

```bash
uv run flask --app app:app run --host 0.0.0.0 --port 8000 --debug
```

### Lock and Export

Generate/update lockfile:

```bash
uv lock
```

Export pinned requirements for compatibility tooling:

```bash
uv export --format requirements-txt --no-hashes -o requirements.txt
```

`requirements.txt` is now generated from uv and should not be edited manually.

## Local Auth Expectations

- Send `Authorization: Bearer <jwt>` for protected endpoints.
- Required claims used by the backend:
	- `custom:org_id`
	- `custom:role`
	- `sub`
- Write endpoints require `custom:role` as `admin` or `therapist`.

## Secrets and Environment Management

- Do not commit secrets to git.
- Prefer AWS profile/SSO over long-lived static keys.
- Keep local env values in shell profile or secret manager.