"use client";

import { useState } from "react";

const PRE_MID = [
  {
    id: "Q21",
    topic: "GitHub Actions — Matrix Strategy & Conditional Jobs",
    marks: 10,
    scenario: "The Matrix That Deployed Thrice",
    context: `A team runs their test suite across three Node.js versions using a matrix strategy. The deploy job is supposed to push to production only once — from the Node 20 run, and only on pushes to main. Instead, it deploys three times on every push, including feature branches. A second bug: if any single matrix leg fails, the entire deploy is skipped even though the other legs passed.`,
    code: [
      {
        label: "frontend-ci.yml (broken)",
        lang: "yaml",
        content: `name: CI
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
      - run: npm ci
      - run: npm test

  deploy:
    runs-on: ubuntu-latest
    needs: [test]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: aws s3 sync dist/ s3://prod-bucket
        env:
          AWS_ACCESS_KEY_ID: \${{ secrets.AWS_KEY }}
          AWS_SECRET_ACCESS_KEY: \${{ secrets.AWS_SECRET }}`
      },
      {
        label: "Observed deploy job runs per push",
        lang: "text",
        content: `Push to feature/login:
  deploy run #1  ← triggered by node-18 leg
  deploy run #2  ← triggered by node-20 leg
  deploy run #3  ← triggered by node-22 leg

Push to main (node-22 test fails):
  deploy → SKIPPED entirely (all 3 legs required)`
      }
    ],
    problems: [
      'deploy runs three times per push — once per matrix leg — deploying to production redundantly',
      'A single failing matrix leg (e.g. node-22) blocks deploy entirely, even though node-18 and node-20 passed',
      'deploy runs on every push including feature branches — it should only run on pushes to main'
    ],
    questions: [
      {
        num: "21.1",
        marks: 4,
        text: "Explain precisely why deploy runs three times. When a job declares needs: [test] and test is a matrix job, what does GitHub Actions consider as the dependency — one job or many? How does adding a fan-in job fix the triple-deploy problem? Write the fan-in job that waits for all matrix legs and then rewrite the deploy job to depend on it."
      },
      {
        num: "21.2",
        marks: 3,
        text: "The fan-in job should succeed even if some matrix legs fail (e.g. node-22 is allowed to fail, but node-18 and node-20 must pass). Show how to add continue-on-error and fail-fast: false to the matrix strategy and explain the difference between the two fields."
      },
      {
        num: "21.3",
        marks: 3,
        text: "Add an if: condition to the deploy job so it only runs on pushes to the main branch. Write the exact condition using GitHub Actions context expressions. Also explain the difference between the on: push trigger and specifying branches — why does on: [push] alone not restrict which branches trigger the workflow?"
      }
    ]
  },
  {
    id: "Q22",
    topic: "Bash — Subshells, Trap & Robust Error Handling",
    marks: 10,
    scenario: "The Script That Left a Mess",
    context: `Meera writes a deployment script that: (1) changes into a build directory, (2) runs a long build process, and (3) cleans up temp files afterwards. Two subtle bugs appear — the directory change doesn't persist to later lines, and if the build crashes midway, temp files are never cleaned up, leaving the server in a broken state.`,
    code: [
      {
        label: "deploy.sh (broken)",
        lang: "bash",
        content: `#!/bin/bash

TEMP_DIR="/tmp/build_$$"
APP_DIR="/var/www/app"

echo "Creating temp workspace..."
mkdir -p $TEMP_DIR

# Bug 1: cd inside subshell
(cd $APP_DIR && git pull origin main)
echo "Now in: $(pwd)"   # still in original dir!

# Bug 2: no cleanup on failure
cp -r $APP_DIR/src $TEMP_DIR/
npm run build --prefix $TEMP_DIR    # if this crashes...
cp $TEMP_DIR/dist/* $APP_DIR/public/

# This cleanup never runs if build crashes above
echo "Cleaning up..."
rm -rf $TEMP_DIR
echo "Done."`
      },
      {
        label: "What happens on build failure",
        lang: "text",
        content: `$ bash deploy.sh
Creating temp workspace...
Now in: /home/meera        ← cd had no effect outside subshell
npm ERR! Build failed with exit code 1
                           ← script exits here
                           ← /tmp/build_12345 is NEVER deleted
                           ← server left in partial state`
      }
    ],
    problems: [
      'The cd command runs inside a subshell ( ) — the working directory change is lost after the subshell exits',
      'If npm run build fails, the script exits immediately (or continues blindly) and the cleanup rm -rf never runs',
      'The script has no way to signal to the caller whether it succeeded or failed'
    ],
    questions: [
      {
        num: "22.1",
        marks: 3,
        text: "Explain what a subshell is in Bash and why wrapping cd inside ( ) means the directory change does not persist to the next line. What is the parent shell vs subshell relationship, and what environment changes are and are not inherited? Write the corrected version of those two lines without a subshell."
      },
      {
        num: "22.2",
        marks: 4,
        text: "Explain the trap command in Bash. Write a trap handler for the deploy.sh script that: (a) catches EXIT and ERR signals, (b) always deletes $TEMP_DIR regardless of whether the script succeeds or fails, and (c) prints a clear error message with the line number that failed. Also explain what set -euo pipefail does and why all three flags together are stronger than set -e alone."
      },
      {
        num: "22.3",
        marks: 3,
        text: "Write the fully corrected deploy.sh incorporating all fixes: no subshell for cd, trap-based cleanup, and set -euo pipefail. Add an exit code check after the npm build step that explicitly exits with code 1 and a descriptive message if the build fails. Explain how the calling CI system uses this exit code to mark the pipeline step as failed."
      }
    ]
  }
];

const POST_MID = [
  {
    id: "Q23",
    topic: "Docker — Bind Mounts, Anonymous Volumes & Volume Precedence",
    marks: 10,
    scenario: "The Hot-Reload That Overwrote Nothing",
    context: `A team uses Docker for local development. They want live code reloading — changes to src/ on the host should immediately reflect inside the container without rebuilding. Their Dockerfile copies node_modules into the image, but when they mount the host directory, the container's node_modules disappears. In production they use a named volume, but a hidden anonymous volume in the Dockerfile is silently winning over it.`,
    code: [
      {
        label: "Dockerfile",
        lang: "dockerfile",
        content: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
VOLUME /app/node_modules    ← anonymous volume declared here
EXPOSE 3000
CMD ["npm", "run", "dev"]`
      },
      {
        label: "docker run (dev — bind mount attempt)",
        lang: "bash",
        content: `docker run -d \
  -p 3000:3000 \
  -v $(pwd):/app \
  myapp:dev
# Problem: node_modules inside container is now EMPTY
# Host machine has no node_modules (it's in .gitignore)`
      },
      {
        label: "docker run (prod — named volume)",
        lang: "bash",
        content: `docker run -d \
  -p 3000:3000 \
  -v app_uploads:/app/uploads \
  myapp:prod
# Problem: VOLUME /app/node_modules in Dockerfile creates an
# anonymous volume that takes precedence in unexpected ways`
      }
    ],
    problems: [
      'Bind-mounting $(pwd):/app overwrites /app entirely — including node_modules that was installed inside the container during build',
      'The VOLUME /app/node_modules instruction in the Dockerfile creates an anonymous volume that causes confusion and can override named volume mounts in prod'
    ],
    questions: [
      {
        num: "23.1",
        marks: 4,
        text: "Explain Docker's volume mount precedence rules. When -v $(pwd):/app mounts the host directory, why does the container's node_modules (which was installed during RUN npm install) disappear? Trace through exactly what the container sees at /app after the bind mount is applied. What is the correct two-volume command that mounts the host src/ for live reload while preserving the container's node_modules?"
      },
      {
        num: "23.2",
        marks: 3,
        text: "Explain the difference between a named volume, a bind mount, and an anonymous volume. What does the VOLUME instruction in a Dockerfile actually do, and why is declaring VOLUME /app/node_modules in a Dockerfile considered bad practice? What problem does it create for prod deployments using named volumes?"
      },
      {
        num: "23.3",
        marks: 3,
        text: "Write the correct docker run command for the dev workflow that achieves live code reloading without losing node_modules. Then write the corresponding compose.yaml service definition that achieves the same result — show the volumes: section carefully. Explain why this pattern is called the 'node_modules volume trick'."
      }
    ]
  },
  {
    id: "Q24",
    topic: "Docker Compose — Advanced depends_on, Healthchecks & Profiles",
    marks: 10,
    scenario: "The Migration That Ran Too Early",
    context: `A team's stack has four services: db, migrate (runs DB migrations once), api, and debug-tools (a psql shell only needed in development). Two critical failures happen on every fresh docker compose up. The migrate service runs before the database is actually ready to accept connections. The api starts before migrations complete, causing it to crash on uninitialized tables. The debug-tools service also starts in production where it is not wanted.`,
    code: [
      {
        label: "compose.yaml (broken)",
        lang: "yaml",
        content: `services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret

  migrate:
    image: myapp:latest
    command: npm run db:migrate
    depends_on:
      - db        # ← only waits for container start, not readiness

  api:
    image: myapp:latest
    ports:
      - "4000:4000"
    depends_on:
      - migrate   # ← migrate exits 0 instantly if DB not ready

  debug-tools:
    image: postgres:16
    command: psql postgres://app:secret@db:5432/appdb
    depends_on:
      - db`
      },
      {
        label: "Failure sequence on fresh docker compose up",
        lang: "text",
        content: `t=0s  db container starts (postgres initialising...)
t=0s  migrate starts → tries DB connection → ECONNREFUSED → exits 1
t=0s  api starts → tables don't exist → crashes
t=0s  debug-tools starts → unwanted in prod

Even after fixing migrate timing:
t=5s  migrate completes migrations
t=0s  api already crashed before migrations finished`
      }
    ],
    problems: [
      'depends_on: - db only waits for the db container to start, not for PostgreSQL to be ready to accept connections',
      'api starts in parallel with migrate instead of waiting for migrations to complete successfully',
      'debug-tools starts in every environment including production'
    ],
    questions: [
      {
        num: "24.1",
        marks: 4,
        text: "Explain the difference between depends_on with a simple service name versus depends_on with condition: service_healthy. Rewrite the db service to include a healthcheck that verifies PostgreSQL is actually accepting connections (not just that the container started). Then rewrite the migrate service depends_on to use condition: service_healthy. Show the exact YAML for both."
      },
      {
        num: "24.2",
        marks: 3,
        text: "The api must not start until migrate has finished and exited successfully — not just started. Which depends_on condition ensures this? Show the corrected api service depends_on that waits for migrate to complete successfully. Also explain condition: service_completed_successfully vs condition: service_healthy — when would you use each?"
      },
      {
        num: "24.3",
        marks: 3,
        text: "Explain Docker Compose profiles. Rewrite the debug-tools service so it only starts when explicitly requested. Show the compose.yaml change and the docker compose up command a developer would run to include debug-tools. How does this prevent it from running in production CI/CD pipelines that just run docker compose up?"
      }
    ]
  },
  {
    id: "Q25",
    topic: "AWS IAM — Roles, Policies & Instance Profiles",
    marks: 10,
    scenario: "The Access Denied That Shouldn't Exist",
    context: `A Node.js app running on EC2 uploads files to S3. The team hardcoded IAM user credentials as environment variables. A security audit flags this and demands they switch to IAM Roles. After the switch, the app still gets AccessDenied on S3 PutObject. The role exists and is attached to the instance, but the policy is misconfigured.`,
    code: [
      {
        label: "Current setup (insecure — IAM user keys)",
        lang: "bash",
        content: `# On EC2 — hardcoded in /etc/environment
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENGbPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1`
      },
      {
        label: "IAM Role Policy (attached to EC2 — broken)",
        lang: "json",
        content: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-uploads-bucket"
    }
  ]
}`
      },
      {
        label: "Trust Policy on the Role",
        lang: "json",
        content: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}`
      }
    ],
    problems: [
      'The S3 policy Resource is missing /* — it grants permissions on the bucket itself, not on objects inside it',
      'The Trust Policy allows lambda.amazonaws.com to assume the role — not ec2.amazonaws.com — so the EC2 instance cannot assume the role at all'
    ],
    questions: [
      {
        num: "25.1",
        marks: 4,
        text: "Identify and explain both policy bugs precisely. For Bug 1: explain the difference between the ARN arn:aws:s3:::my-uploads-bucket and arn:aws:s3:::my-uploads-bucket/* — which one is needed for PutObject and why? For Bug 2: explain what a Trust Policy (assume role policy) is and why the Principal must be ec2.amazonaws.com for an EC2 instance profile. Write the corrected versions of both policies."
      },
      {
        num: "25.2",
        marks: 3,
        text: "Explain the full chain: IAM Role → Instance Profile → EC2 Instance. How does a Node.js app running on EC2 get temporary credentials without any hardcoded keys? Name the local HTTP endpoint the AWS SDK queries automatically for credentials, and explain why these temporary credentials are more secure than long-lived IAM user access keys."
      },
      {
        num: "25.3",
        marks: 3,
        text: "Apply the Principle of Least Privilege to this scenario. The app only ever uploads files to a specific prefix (uploads/2024/) inside the bucket and never needs to delete or list. Write a tighter IAM policy that restricts: (a) the action to only s3:PutObject, (b) the resource to only that prefix, and (c) adds a condition that requires server-side encryption on every upload."
      }
    ]
  },
  {
    id: "Q26",
    topic: "Terraform — count vs for_each & Data Sources",
    marks: 10,
    scenario: "The Bucket Deletion That Destroyed Everything",
    context: `A team uses Terraform with count to provision S3 buckets for three teams: frontend, backend, and data. They later need to remove the backend bucket. Using count, deleting an element from the middle of the list causes Terraform to destroy and recreate the wrong buckets. They also hardcode the latest AMI ID — when it becomes unavailable, all plans break.`,
    code: [
      {
        label: "main.tf (broken — using count)",
        lang: "hcl",
        content: `variable "team_buckets" {
  default = ["frontend", "backend", "data"]
}

resource "aws_s3_bucket" "team" {
  count  = length(var.team_buckets)
  bucket = "mycompany-\${var.team_buckets[count.index]}"

  tags = {
    Team = var.team_buckets[count.index]
  }
}

resource "aws_instance" "worker" {
  ami           = "ami-0c55b159cbfafe1f0"  # hardcoded
  instance_type = "t3.micro"
}`
      },
      {
        label: "What Terraform plans after removing 'backend' from the list",
        lang: "text",
        content: `variable "team_buckets" {
  default = ["frontend", "data"]   # backend removed
}

Terraform plan output:
  ~ aws_s3_bucket.team[1]  # was "backend", now "data"
                            # Terraform tries to RENAME it
  - aws_s3_bucket.team[2]  # "data" bucket DESTROYED
                            # Data loss risk!`
      }
    ],
    problems: [
      'Removing "backend" from the count list shifts all indices — Terraform renames team[1] and destroys team[2] instead of just deleting the backend bucket',
      'The hardcoded AMI ID will break terraform plan when that AMI is deregistered or unavailable in a different region'
    ],
    questions: [
      {
        num: "26.1",
        marks: 4,
        text: "Explain precisely why count causes this destructive behaviour when an element is removed from the middle of a list. How does Terraform track count-based resources in state (by index) versus how for_each tracks resources (by key)? Rewrite the S3 bucket resource using for_each with a set of strings so that removing 'backend' only destroys the backend bucket and leaves frontend and data untouched."
      },
      {
        num: "26.2",
        marks: 3,
        text: "Explain what a Terraform data source is and how it differs from a resource. Write a data block that dynamically fetches the latest Amazon Linux 2023 AMI for us-east-1 using aws_ami data source — filtering for the correct owner and name pattern. Then reference it in the aws_instance resource instead of the hardcoded ID."
      },
      {
        num: "26.3",
        marks: 3,
        text: "The team wants to output the bucket names and ARNs after apply so they can be consumed by other Terraform configurations. Write the output blocks for all bucket names and ARNs using for_each syntax. Then explain how another Terraform configuration in a different directory would read these outputs using a terraform_remote_state data source."
      }
    ]
  },
  {
    id: "Q27",
    topic: "Terraform — Modules & Workspace Isolation",
    marks: 10,
    scenario: "The Copy-Paste Infrastructure",
    context: `A startup has identical Terraform code duplicated across three directories: environments/dev/, environments/staging/, and environments/prod/. Every time a security group rule changes, an engineer must update all three directories. A bug fix in one environment is routinely forgotten in others. They want a single source of truth with per-environment variable overrides.`,
    code: [
      {
        label: "Current structure (duplicated)",
        lang: "text",
        content: `environments/
├── dev/
│   ├── main.tf        # full copy
│   ├── variables.tf   # full copy
│   └── terraform.tfvars
├── staging/
│   ├── main.tf        # full copy (may have drifted)
│   ├── variables.tf   # full copy
│   └── terraform.tfvars
└── prod/
    ├── main.tf        # full copy (may have drifted)
    ├── variables.tf   # full copy
    └── terraform.tfvars`
      },
      {
        label: "dev/main.tf (representative — all three are similar)",
        lang: "hcl",
        content: `resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"    # differs per env
  tags = { Environment = "dev" }
}

resource "aws_security_group" "app_sg" {
  name = "app-sg-dev"
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`
      }
    ],
    problems: [
      'Security group rules, AMI IDs, and tag structures are duplicated — a change must be applied to three files manually',
      'Over time the three copies have drifted — staging/main.tf no longer matches prod/main.tf in subtle ways'
    ],
    questions: [
      {
        num: "27.1",
        marks: 4,
        text: "Design a Terraform module structure that eliminates the duplication. Show the directory layout, the module's variables.tf (with instance_type, environment, and allowed_cidr as inputs), the module's main.tf using those variables, and one calling configuration (environments/prod/main.tf) that invokes the module with prod-specific values. Explain what a module input and module output are."
      },
      {
        num: "27.2",
        marks: 3,
        text: "A colleague suggests using terraform workspace instead of separate directories. Explain what Terraform workspaces are and how terraform.workspace can be used inside HCL to vary instance_type per environment. Then explain the key limitation of workspaces compared to separate directories — specifically around state isolation and access control — and state when you would choose each approach."
      },
      {
        num: "27.3",
        marks: 3,
        text: "The module needs to create either 1 EC2 instance in dev or 3 in prod. Show how to use the count meta-argument inside the module driven by an input variable. Then explain why you cannot use both count and for_each on the same resource, and what happens to existing resources in state when you change the count value from 3 to 1."
      }
    ]
  },
  {
    id: "Q28",
    topic: "AWS ECS — ALB Integration, awsvpc Networking & Task IAM",
    marks: 10,
    scenario: "The Load Balancer That Says All Targets Are Unhealthy",
    context: `A team deploys an ECS Fargate service behind an Application Load Balancer. ECS reports the service as stable with 3 running tasks. But the ALB target group shows all 3 targets as unhealthy. Users get 502 Bad Gateway. There are two misconfigurations — one in the security groups and one in the health check path.`,
    code: [
      {
        label: "ECS Task Definition (excerpt)",
        lang: "json",
        content: `{
  "networkMode": "awsvpc",
  "containerDefinitions": [{
    "name": "api",
    "image": "myapi:v3",
    "portMappings": [{ "containerPort": 4000 }]
  }],
  "executionRoleArn": "arn:aws:iam::123:role/ecsTaskExecutionRole"
}`
      },
      {
        label: "Security Group configuration",
        lang: "text",
        content: `ALB Security Group (alb-sg):
  Inbound:  0.0.0.0/0 → port 443  ✓
  Outbound: ALL traffic            ✓

ECS Task Security Group (task-sg):
  Inbound:  0.0.0.0/0 → port 4000   ← allows world, not just ALB
  Outbound: ALL traffic              ✓`
      },
      {
        label: "ALB Target Group health check config",
        lang: "text",
        content: `Protocol:             HTTP
Path:                 /
Port:                 traffic-port
Healthy threshold:    2
Unhealthy threshold:  3
Timeout:              5s
Interval:             30s

App's actual health endpoint: /api/health (returns 200)
App's root path /:            returns 301 redirect to /dashboard`
      }
    ],
    problems: [
      'ALB health checks hit GET / which returns a 301 redirect — ALB considers anything other than 2xx a failure, marking targets unhealthy',
      'Task security group allows 0.0.0.0/0 instead of only the ALB security group — this is a security violation, not a connectivity bug, but is still wrong'
    ],
    questions: [
      {
        num: "28.1",
        marks: 4,
        text: "Explain precisely why all ALB targets are unhealthy. What HTTP response codes does an ALB target group health check consider healthy by default? Why does a 301 redirect cause a health check failure? Write the corrected ALB target group health check configuration. Also explain what 'Unhealthy threshold: 3' means in terms of how many consecutive failures before a target is marked unhealthy."
      },
      {
        num: "28.2",
        marks: 3,
        text: "In awsvpc network mode, each ECS task gets its own Elastic Network Interface and security group. Explain why the task security group should only allow inbound traffic from the ALB security group — not from 0.0.0.0/0. Write the corrected inbound rule for task-sg using security group referencing (not CIDR). Why is this more secure and operationally better than using a CIDR range?"
      },
      {
        num: "28.3",
        marks: 3,
        text: "The task definition has executionRoleArn but no taskRoleArn. Explain the difference between the ECS Task Execution Role and the ECS Task Role. If the API container needs to read from an SQS queue and write to DynamoDB, which role needs those permissions and why? Write the Trust Policy that allows ECS tasks to assume the task role."
      }
    ]
  },
  {
    id: "Q29",
    topic: "Kubernetes — Resource Limits, OOMKilled & HPA",
    marks: 10,
    scenario: "The Pod That Keeps Getting Killed",
    context: `A production API pod keeps restarting every few hours. kubectl describe pod shows the last termination reason as OOMKilled. The team has no resource requests or limits set. They also tried to set up a Horizontal Pod Autoscaler to scale between 2 and 10 replicas based on CPU, but HPA shows TARGETS: unknown/50% and never scales.`,
    code: [
      {
        label: "api-deployment.yaml (no resource config)",
        lang: "yaml",
        content: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: myapi:v5
        ports:
        - containerPort: 4000`
      },
      {
        label: "hpa.yaml",
        lang: "yaml",
        content: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50`
      },
      {
        label: "kubectl describe hpa api-hpa (broken output)",
        lang: "bash",
        content: `Name: api-hpa
Metrics:  ( unknown/50% )
Conditions:
  Type            Status  Reason
  AbleToScale     True    ReadyForNewScale
  ScalingActive   False   FailedGetResourceMetric
  ScalingLimited  False   DesiredWithinRange
Events:
  Warning  FailedGetResourceMetric
  unable to get metrics for resource cpu: no metrics returned
  from resource metrics API`
      }
    ],
    problems: [
      'No memory limit set — the container consumes all available node memory and is killed by the Linux OOM killer',
      'HPA shows TARGETS: unknown because without resource requests, the metrics-server cannot calculate percentage CPU utilization'
    ],
    questions: [
      {
        num: "29.1",
        marks: 4,
        text: "Explain the difference between resource requests and resource limits in Kubernetes. What does Kubernetes use requests for (scheduling) versus limits for (enforcement)? Why does OOMKilled happen when no memory limit is set — specifically what is the Linux OOM killer and when does it fire? Write the corrected container spec with appropriate requests and limits for a typical Node.js API (suggest reasonable values and explain your choices)."
      },
      {
        num: "29.2",
        marks: 3,
        text: "Explain precisely why HPA shows unknown/50% with no resource requests defined. HPA calculates utilization as (current usage / request). What happens mathematically when the request is undefined (zero)? How does adding resource requests fix the HPA metric calculation? Also explain what the metrics-server component does and why it must be installed separately in minikube."
      },
      {
        num: "29.3",
        marks: 3,
        text: "The team wants to prevent any pod in the default namespace from running without resource limits — even if a developer forgets. Explain what a LimitRange object does in Kubernetes. Write a LimitRange manifest for the default namespace that sets default requests (100m CPU, 128Mi memory) and default limits (500m CPU, 256Mi memory) for any container that doesn't specify them."
      }
    ]
  },
  {
    id: "Q30",
    topic: "Kubernetes — StatefulSets, PVCs & Storage",
    marks: 10,
    scenario: "The Database That Split Its Brain",
    context: `A team runs a MongoDB instance as a Kubernetes Deployment with a single PersistentVolumeClaim. When a load spike hits, they scale the Deployment to 3 replicas hoping for better throughput. All three pods start — but now three separate MongoDB processes are all writing to the same volume simultaneously, causing data corruption. A Kubernetes expert tells them they need a StatefulSet, not a Deployment.`,
    code: [
      {
        label: "mongo-deployment.yaml (broken approach)",
        lang: "yaml",
        content: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongo
spec:
  replicas: 3    # ← scaled up hoping for throughput
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
      - name: mongo
        image: mongo:7
        volumeMounts:
        - name: mongo-data
          mountPath: /data/db
      volumes:
      - name: mongo-data
        persistentVolumeClaim:
          claimName: mongo-pvc    # all 3 pods share ONE PVC`
      },
      {
        label: "mongo-pvc.yaml",
        lang: "yaml",
        content: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongo-pvc
spec:
  accessModes:
    - ReadWriteOnce    # ← only one node can mount this at a time
  resources:
    requests:
      storage: 10Gi`
      }
    ],
    problems: [
      'ReadWriteOnce PVC can only be mounted by one node — pods scheduled on different nodes will fail to mount. Pods on the same node share the volume causing write conflicts',
      'A Deployment gives pods random names (mongo-abc123) and no stable identity — MongoDB replica sets require stable, predictable hostnames to form a cluster'
    ],
    questions: [
      {
        num: "30.1",
        marks: 4,
        text: "Explain the three PersistentVolume access modes: ReadWriteOnce, ReadOnlyMany, and ReadWriteMany. Why does ReadWriteOnce cause failures when pods are on different nodes? Why is sharing one PVC across multiple MongoDB instances fundamentally wrong regardless of access mode — what is 'split-brain' in a database context? Explain what StatefulSet volumeClaimTemplates does differently — how many PVCs does it create for 3 replicas?"
      },
      {
        num: "30.2",
        marks: 4,
        text: "Rewrite the configuration as a StatefulSet with volumeClaimTemplates. Show the complete StatefulSet manifest including the volumeClaimTemplates section. Explain three key differences between a StatefulSet and a Deployment: (a) pod naming, (b) pod creation/deletion order, and (c) volume binding. Also explain why a StatefulSet requires a Headless Service and show the Headless Service manifest."
      },
      {
        num: "30.3",
        marks: 2,
        text: "The team's minikube cluster only has a single-node StorageClass. Explain what a StorageClass is and what the default minikube StorageClass (standard) provides. In a production AWS EKS cluster, name the StorageClass backed by EBS volumes and explain why EBS (backed by ReadWriteOnce) is still appropriate for StatefulSets even though it cannot be shared — connecting this back to why each StatefulSet pod having its own PVC is the correct architecture."
      }
    ]
  }
];

function CodeBlock({ content, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderBottom: "none", borderRadius: "var(--border-radius-md) var(--border-radius-md) 0 0", padding: "6px 12px" }}>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>{label}</span>
        <button onClick={copy} style={{ fontSize: 11, padding: "2px 8px", cursor: "pointer", borderRadius: 4, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)" }}>
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "12px 14px", fontSize: 12.5, lineHeight: 1.6, fontFamily: "var(--font-mono)", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "0 0 var(--border-radius-md) var(--border-radius-md)", overflowX: "auto", color: "var(--color-text-primary)", whiteSpace: "pre" }}>{content}</pre>
    </div>
  );
}

function DifficultyBadge() {
  return (
    <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: "#FAECE7", color: "#993C1D", border: "0.5px solid #F0997B", letterSpacing: "0.04em" }}>HARDER</span>
  );
}

function QuestionCard({ q, index, sectionColor }) {
  const [open, setOpen] = useState(index === 0);
  const dotColor = sectionColor === "teal" ? "#1D9E75" : "#7F77DD";
  const dotBg = sectionColor === "teal" ? "#E1F5EE" : "#EEEDFE";
  return (
    <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", marginBottom: 14, overflow: "hidden", background: "var(--color-background-primary)" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 34, height: 34, borderRadius: "50%", background: dotBg, color: dotColor, fontWeight: 500, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{q.id}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontWeight: 500, fontSize: 15, color: "var(--color-text-primary)" }}>{q.scenario}</span>
            <DifficultyBadge />
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{q.topic} · {q.marks} marks</div>
        </div>
        <span style={{ fontSize: 18, color: "var(--color-text-secondary)", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
      </button>

      {open && (
        <div style={{ padding: "0 18px 18px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 14, marginBottom: 12, lineHeight: 1.6 }}>{q.context}</p>
          {q.code.map((c, i) => <CodeBlock key={i} {...c} />)}

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Observed problems</div>
            {q.problems.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#FAECE7", color: "#993C1D", fontWeight: 500, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>!</span>
                <span style={{ fontSize: 13.5, color: "var(--color-text-primary)", lineHeight: 1.5 }}>{p}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Questions</div>
          {q.questions.map((qq, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: i < q.questions.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
              <div style={{ flexShrink: 0, minWidth: 32, paddingTop: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: dotColor, fontFamily: "var(--font-mono)" }}>{qq.num}</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 4px", fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.65 }}>{qq.text}</p>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)", padding: "2px 7px", borderRadius: 4, border: "0.5px solid var(--color-border-tertiary)" }}>{qq.marks} marks</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState("post");

  const conceptMap = [
    { id: "Q21", label: "GH Actions matrix + if conditions", hard: "Fan-in jobs, fail-fast, branch filters" },
    { id: "Q22", label: "Bash subshells + trap + pipefail", hard: "Parent/child env, EXIT/ERR traps, set -euo" },
    { id: "Q23", label: "Bind mounts vs named vs anonymous", hard: "Volume precedence, node_modules trick" },
    { id: "Q24", label: "Compose healthcheck + profiles", hard: "service_healthy, service_completed_successfully" },
    { id: "Q25", label: "IAM Role + Instance Profile + Policy", hard: "Trust policy, resource ARN scoping, conditions" },
    { id: "Q26", label: "Terraform count vs for_each + data", hard: "Index shifting, aws_ami data source, outputs" },
    { id: "Q27", label: "Terraform modules + workspaces", hard: "Module inputs/outputs, workspace vs directories" },
    { id: "Q28", label: "ECS ALB + awsvpc + task roles", hard: "Health check codes, SG referencing, execution vs task role" },
    { id: "Q29", label: "K8s resource limits + OOMKilled + HPA", hard: "Requests vs limits, metrics-server, LimitRange" },
    { id: "Q30", label: "K8s StatefulSet + PVC + StorageClass", hard: "volumeClaimTemplates, headless service, split-brain" },
  ];

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px 40px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Practice Paper — Set 3 · DevOps End-Sem</div>
          <DifficultyBadge />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>10 Harder Scenario Questions</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>Q21–Q30 · Deeper edge cases, multi-bug scenarios, cross-system reasoning</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        {conceptMap.map(t => (
          <div key={t.id} style={{ padding: "9px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: parseInt(t.id.replace("Q","")) <= 22 ? "#EEEDFE" : "#E1F5EE", color: parseInt(t.id.replace("Q","")) <= 22 ? "#7F77DD" : "#1D9E75", fontSize: 10, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{t.id.replace("Q","")}</span>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--color-text-primary)" }}>{t.label}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", paddingLeft: 34 }}>{t.hard}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { id: "pre", label: "Section A — Pre-mid (20%)", color: "purple" },
          { id: "post", label: "Section B — Post-mid (80%)", color: "teal" }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSection(tab.id)} style={{
            padding: "8px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid",
            borderColor: activeSection === tab.id ? (tab.color === "teal" ? "#1D9E75" : "#7F77DD") : "var(--color-border-secondary)",
            background: activeSection === tab.id ? (tab.color === "teal" ? "#E1F5EE" : "#EEEDFE") : "transparent",
            color: activeSection === tab.id ? (tab.color === "teal" ? "#085041" : "#3C3489") : "var(--color-text-secondary)",
            fontWeight: activeSection === tab.id ? 500 : 400, fontSize: 13, cursor: "pointer"
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeSection === "pre" && (
        <div>
          <div style={{ background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#3C3489" }}>
            Q21–Q22 · Topics 1–6 · Advanced Bash and GitHub Actions · Attempt both
          </div>
          {PRE_MID.map((q, i) => <QuestionCard key={q.id} q={q} index={i} sectionColor="purple" />)}
        </div>
      )}

      {activeSection === "post" && (
        <div>
          <div style={{ background: "#E1F5EE", border: "0.5px solid #5DCAA5", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#085041" }}>
            Q23–Q30 · Topics 7–12 · Docker, AWS, Terraform, Kubernetes · 8 questions — attempt 5
          </div>
          {POST_MID.map((q, i) => <QuestionCard key={q.id} q={q} index={i} sectionColor="teal" />)}
        </div>
      )}

      <div style={{ marginTop: 28, padding: "14px 18px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>What makes Set 3 harder than Set 1 & 2</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            ["Multi-bug scenarios", "Each scenario has 2–3 interacting bugs, not just one"],
            ["Cross-layer reasoning", "Questions connect IAM → EC2 → app, or HPA → requests → metrics-server"],
            ["Write & explain both", "Sub-questions ask for corrected YAML/HCL AND the underlying concept"],
            ["Edge case focus", "count index shifting, OOMKilled without limits, RWO on multi-replica"],
            ["Production realism", "Split-brain databases, ALB 502s, Fargate task roles, state locking races"],
            ["No throwaway fixes", "Every fix requires understanding — changing one value is never enough"],
          ].map(([title, detail], i) => (
            <div key={i} style={{ padding: "8px 10px", background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 3 }}>{title}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
