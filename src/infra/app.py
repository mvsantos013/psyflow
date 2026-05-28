#!/usr/bin/env python3
import os

import aws_cdk as cdk

from psyflow_infra.psyflow_stack import PsyflowStack

app = cdk.App()

stage = (app.node.try_get_context("stage") or os.getenv("STAGE") or "dev").strip().lower()
if stage not in {"dev", "prod"}:
    raise ValueError("stage must be one of: dev, prod")

stack_id = f"PsyflowStack{stage.capitalize()}"

PsyflowStack(
    app,
    stack_id,
    stage=stage,
    env=cdk.Environment(
        account=app.node.try_get_context("account") or None,
        region=app.node.try_get_context("region") or "us-east-1",
    ),
)

app.synth()
