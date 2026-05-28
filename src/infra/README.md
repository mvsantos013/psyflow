# PsyFlow Infra (AWS CDK - Python)

This folder is the active infrastructure definition for PsyFlow.

- Active CDK app: [app.py](app.py)
- Active stack: [psyflow_infra/psyflow_stack.py](psyflow_infra/psyflow_stack.py)
- TypeScript CDK files in this folder are placeholders and not used (`package.json` marks TS as deprecated).

Stage model:
- Supported stages: `dev`, `prod`
- Default stage: `dev` (from [cdk.json](cdk.json))
- Resource names are stage-scoped (for example `psyflow-patients-dev`, `psyflow-patients-prod`).

## What This Stack Creates

- 1 Lambda function (`app.handler`) from `../backend`
- 1 HTTP API (API Gateway v2)
- 1 Cognito User Pool (email sign-in, admin-created users only, no federated providers)
- 1 Cognito App Client (no client secret)
- 6 DynamoDB tables created by stack:
  - `psyflow_patients`
  - `psyflow_patient_sessions`
  - `psyflow_patient_mood`
  - `psyflow_patient_tasks`
  - `psyflow_patient_chat`
  - `psyflow_exercises`
- 1 S3 bucket for transcription/audio flows:
  - Imported from `TRANSCRIPTIONS_BUCKET_NAME` when provided
  - Otherwise created by the stack
- Lambda asset bundling that installs backend dependencies from `../backend/requirements.txt`

## Required Tooling

- Python 3.12+
- uv (`https://docs.astral.sh/uv/`)
- AWS CLI configured (`aws configure` or SSO profile)
- AWS CDK CLI v2 (`npm i -g aws-cdk`)
- Docker (required for Lambda Python dependency bundling during `cdk synth/deploy`)

## Required AWS Permissions

At minimum, your deploy principal needs permissions for:

- CloudFormation stack create/update/delete
- IAM role creation/update for Lambda execution roles
- Lambda create/update/delete
- API Gateway v2 create/update/delete
- DynamoDB create/describe/grant permissions
- S3 read bucket metadata and grant permissions (if using transcription bucket)

## Deploy

From `src/infra`:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync
```

If `uv.lock` is already committed and you want strict reproducibility:

```bash
uv sync --frozen
```

Set deploy context and optional auth/bucket envs:

```bash
export AWS_PROFILE=<your-profile>
export AWS_REGION=us-east-1

# Optional bucket used by transcription/upload flows
export TRANSCRIPTIONS_BUCKET_NAME=<bucket-name>
```

If `TRANSCRIPTIONS_BUCKET_NAME` is not set, CDK creates a managed bucket.

Bootstrap once per account/region:

```bash
uv run cdk bootstrap aws://<account-id>/<region>
```

Deploy:

```bash
uv run cdk deploy -c stage=dev -c account=<account-id> -c region=<region>
```

Deploy prod:

```bash
uv run cdk deploy -c stage=prod -c account=<account-id> -c region=<region>
```

After deploy, read outputs:

- `HttpApiUrl`
- `ApiLambdaName`
- `UserPoolId`
- `UserPoolClientId`
- `UserPoolIssuerUrl`
- table names and bucket output fields

## Cognito User Bootstrap (Admin-Created Users)

Create your first user (replace placeholders):

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <UserPoolId> \
  --username user@example.com \
  --user-attributes \
    Name=email,Value=user@example.com \
    Name=email_verified,Value=true \
    Name=custom:org_id,Value=<org-id> \
    Name=custom:role,Value=admin \
  --temporary-password '<TempPassword123>' \
  --message-action SUPPRESS
```

Set a permanent password:

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id <UserPoolId> \
  --username user@example.com \
  --password '<StrongPassword123>' \
  --permanent
```

Authenticate with USER_PASSWORD_AUTH to obtain tokens:

```bash
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id <UserPoolClientId> \
  --auth-parameters USERNAME=user@example.com,PASSWORD='<StrongPassword123>'
```

Use the returned JWT token in protected API calls:

```bash
Authorization: Bearer <token>
```

## Destroy

```bash
uv run cdk destroy -c stage=dev -c account=<account-id> -c region=<region>
```

## Lock and Export

Generate/update lockfile:

```bash
uv lock
```

Export pinned requirements for compatibility tooling:

```bash
uv export --format requirements-txt --no-hashes -o requirements.txt
```

`requirements.txt` is now generated from uv and should not be edited manually.

Notes:
- All DynamoDB tables in this stack use `RemovalPolicy.DESTROY`.
- The managed S3 bucket (when created by stack) uses `RemovalPolicy.DESTROY` and `auto_delete_objects=true`.
- If `TRANSCRIPTIONS_BUCKET_NAME` points to an existing bucket, destroy does not delete that external bucket.

## Recommended Next Infra Work

Harden production posture by switching removal policies from `DESTROY` to `RETAIN` and by scoping CORS/auth settings per environment.
