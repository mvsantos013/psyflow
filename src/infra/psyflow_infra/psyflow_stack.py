from __future__ import annotations

import os

from aws_cdk import BundlingOptions, CfnOutput, Duration, RemovalPolicy, Stack
from aws_cdk import aws_apigatewayv2 as apigwv2
from aws_cdk import aws_apigatewayv2_authorizers as apigwv2_auth
from aws_cdk import aws_apigatewayv2_integrations as apigwv2_integrations
from aws_cdk import aws_cognito as cognito
from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_s3 as s3
from constructs import Construct


class PsyflowStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, *, stage: str = "dev", **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        stage = stage.strip().lower()
        if stage not in {"dev", "prod"}:
            raise ValueError("stage must be one of: dev, prod")

        def _name(base: str) -> str:
            return f"{base}-{stage}"

        transcriptions_bucket_name = os.getenv("TRANSCRIPTIONS_BUCKET_NAME", "")

        user_pool = cognito.UserPool(
            self,
            "PsyflowUserPool",
            user_pool_name=_name("psyflow-user-pool"),
            self_sign_up_enabled=False,
            sign_in_aliases=cognito.SignInAliases(email=True),
            mfa=cognito.Mfa.OFF,
            password_policy=cognito.PasswordPolicy(
                min_length=10,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=False,
                temp_password_validity=Duration.days(7),
            ),
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(required=True, mutable=True),
            ),
            custom_attributes={
                "org_id": cognito.StringAttribute(min_len=1, max_len=128, mutable=True),
                "role": cognito.StringAttribute(min_len=1, max_len=32, mutable=True),
            },
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY,
            removal_policy=RemovalPolicy.DESTROY,
        )

        user_pool_client = user_pool.add_client(
            "PsyflowUserPoolClient",
            user_pool_client_name=_name("psyflow-app-client"),
            generate_secret=False,
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True,
                admin_user_password=True,
            ),
            read_attributes=cognito.ClientAttributes().with_standard_attributes(email=True).with_custom_attributes(
                "org_id", "role"
            ),
            write_attributes=cognito.ClientAttributes().with_standard_attributes(email=True).with_custom_attributes(
                "org_id", "role"
            ),
            prevent_user_existence_errors=True,
        )

        jwt_authorizer = apigwv2_auth.HttpJwtAuthorizer(
            "JwtAuthorizer",
            jwt_issuer=user_pool.user_pool_provider_url,
            jwt_audience=[user_pool_client.user_pool_client_id],
        )

        patients_table = dynamodb.Table(
            self,
            "PatientsTable",
            table_name=_name("psyflow-patients"),
            partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        sessions_table = dynamodb.Table(
            self,
            "SessionsTable",
            table_name=_name("psyflow-patient-sessions"),
            partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        mood_table = dynamodb.Table(
            self,
            "MoodTable",
            table_name=_name("psyflow-patient-mood"),
            partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        tasks_table = dynamodb.Table(
            self,
            "TasksTable",
            table_name=_name("psyflow-patient-tasks"),
            partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        chat_table = dynamodb.Table(
            self,
            "ChatTable",
            table_name=_name("psyflow-patient-chat"),
            partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        exercises_table = dynamodb.Table(
            self,
            "ExercisesTable",
            table_name=_name("psyflow-exercises"),
            partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        organizations_table = dynamodb.Table(
            self,
            "OrganizationsTable",
            table_name=_name("psyflow-organizations"),
            partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        if transcriptions_bucket_name:
            transcriptions_bucket = s3.Bucket.from_bucket_name(
                self,
                "TranscriptionsBucketRef",
                transcriptions_bucket_name,
            )
            effective_transcriptions_bucket_name = transcriptions_bucket_name
        else:
            transcriptions_bucket = s3.Bucket(
                self,
                "TranscriptionsBucket",
                encryption=s3.BucketEncryption.S3_MANAGED,
                block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
                removal_policy=RemovalPolicy.DESTROY,
                auto_delete_objects=True,
            )
            effective_transcriptions_bucket_name = transcriptions_bucket.bucket_name

        api_lambda = lambda_.Function(
            self,
            "ApiLambda",
            runtime=lambda_.Runtime.PYTHON_3_12,
            architecture=lambda_.Architecture.ARM_64,
            timeout=Duration.seconds(20),
            code=lambda_.Code.from_asset(
                "../backend",
                bundling=BundlingOptions(
                    image=lambda_.Runtime.PYTHON_3_12.bundling_image,
                    command=[
                        "bash",
                        "-c",
                        "pip install -r requirements.txt -t /asset-output && cp -au . /asset-output",
                    ],
                ),
            ),
            handler="app.handler",
            environment={
                "STAGE": stage,
                "PATIENTS_TABLE_NAME": patients_table.table_name,
                "SESSIONS_TABLE_NAME": sessions_table.table_name,
                "MOOD_TABLE_NAME": mood_table.table_name,
                "TASKS_TABLE_NAME": tasks_table.table_name,
                "CHAT_TABLE_NAME": chat_table.table_name,
                "EXERCISES_TABLE_NAME": exercises_table.table_name,
                "ORGANIZATIONS_TABLE_NAME": organizations_table.table_name,
                "TRANSCRIPTIONS_BUCKET_NAME": effective_transcriptions_bucket_name,
                "AUDIO_UPLOADS_BUCKET_NAME": effective_transcriptions_bucket_name,
            },
        )

        patients_table.grant_read_data(api_lambda)

        sessions_table.grant_read_write_data(api_lambda)
        mood_table.grant_read_write_data(api_lambda)
        tasks_table.grant_read_write_data(api_lambda)
        chat_table.grant_read_data(api_lambda)
        exercises_table.grant_read_write_data(api_lambda)
        organizations_table.grant_read_write_data(api_lambda)

        transcriptions_bucket.grant_read_write(api_lambda)

        http_api = apigwv2.HttpApi(
            self,
            "PsyflowHttpApi",
            cors_preflight=apigwv2.CorsPreflightOptions(
                allow_methods=[
                    apigwv2.CorsHttpMethod.GET,
                    apigwv2.CorsHttpMethod.POST,
                    apigwv2.CorsHttpMethod.PATCH,
                    apigwv2.CorsHttpMethod.OPTIONS,
                ],
                allow_origins=["*"],
                allow_headers=["content-type", "authorization"],
            ),
        )

        api_integration = apigwv2_integrations.HttpLambdaIntegration(
            "ApiIntegration",
            api_lambda,
        )

        protected_routes_args = {
            "authorizer": jwt_authorizer,
        } if jwt_authorizer else {}

        http_api.add_routes(
            path="/api/{proxy+}",
            methods=[
                apigwv2.HttpMethod.GET,
                apigwv2.HttpMethod.POST,
                apigwv2.HttpMethod.PATCH,
                apigwv2.HttpMethod.PUT,
                apigwv2.HttpMethod.DELETE,
            ],
            integration=api_integration,
            **protected_routes_args,
        )

        CfnOutput(self, "HttpApiUrl", value=http_api.url or "")
        CfnOutput(self, "Stage", value=stage)
        CfnOutput(self, "ApiLambdaName", value=api_lambda.function_name)
        CfnOutput(self, "PatientsTableName", value=patients_table.table_name)
        CfnOutput(self, "SessionsTableName", value=sessions_table.table_name)
        CfnOutput(self, "MoodTableName", value=mood_table.table_name)
        CfnOutput(self, "TasksTableName", value=tasks_table.table_name)
        CfnOutput(self, "ChatTableName", value=chat_table.table_name)
        CfnOutput(self, "ExercisesTableName", value=exercises_table.table_name)
        CfnOutput(self, "OrganizationsTableName", value=organizations_table.table_name)
        CfnOutput(self, "TranscriptionsBucketName", value=effective_transcriptions_bucket_name)
        CfnOutput(self, "UserPoolId", value=user_pool.user_pool_id)
        CfnOutput(self, "UserPoolArn", value=user_pool.user_pool_arn)
        CfnOutput(self, "UserPoolClientId", value=user_pool_client.user_pool_client_id)
        CfnOutput(self, "UserPoolIssuerUrl", value=user_pool.user_pool_provider_url)
