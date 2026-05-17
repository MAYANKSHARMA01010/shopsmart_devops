"use client";

import { useState } from "react";

const PRE_MID = [
  {
    id: "Q31",
    topic: "GitHub Actions — Dependency Caching",
    marks: 10,
    scenario: "The CI That Downloads The Internet Every Time",
    context: `A team's CI pipeline takes 9 minutes per run — almost entirely spent on npm ci downloading 400 MB of packages. A developer adds actions/cache to speed it up but the cache never hits. Every run still shows "Cache not found" and downloads everything from scratch.`,
    code: [
      {
        label: "frontend-ci.yml (cache never hits)",
        lang: "yaml",
        content: `name: CI
on:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Cache node modules
        uses: actions/cache@v3
        with:
          path: node_modules
          key: npm-cache-\${{ hashFiles('package.json') }}

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test`
      },
      {
        label: "CI run logs — cache always misses",
        lang: "text",
        content: `Run actions/cache@v3
  Cache not found for key: npm-cache-ab3f9e1c...

Run npm ci
  added 847 packages in 4m 12s   ← downloads every time

# Next run (nothing changed):
  Cache not found for key: npm-cache-ab3f9e1c...
  added 847 packages in 4m 09s   ← still downloads!`
      }
    ],
    problems: [
      'The cache key uses package.json but npm ci writes to node_modules AFTER the cache step — so node_modules is always empty when cache tries to save it',
      'The cache path is node_modules — but npm ci regenerates this from package-lock.json. The key should hash package-lock.json, not package.json, for precise cache invalidation'
    ],
    questions: [
      {
        num: "31.1",
        marks: 4,
        text: "Explain why the cache never hits. Walk through the cache lifecycle: when does actions/cache look up the cache key, when does it save the cache, and what must exist in the path at save time? Why does putting cache before npm ci mean nothing gets cached on the first run — and what does GitHub Actions actually do when a cache miss occurs at restore time?"
      },
      {
        num: "31.2",
        marks: 3,
        text: "Explain why hashing package.json is a weaker cache key than hashing package-lock.json for npm ci. What information does package-lock.json contain that package.json does not? Write the corrected cache step with the right path and the right key. Also show how to add a restore-keys fallback so a partial cache is used when the lockfile changes."
      },
      {
        num: "31.3",
        marks: 3,
        text: "The team wants the cache to also work across branches — a feature branch should reuse the cache built on main if its own lockfile hasn't changed. Show the restore-keys pattern that achieves this. Then explain the difference between a cache hit (exact key match) and a cache restore via restore-keys, and whether npm ci still needs to run in each case."
      }
    ]
  },
  {
    id: "Q32",
    topic: "Linux — Systemd & Cron",
    marks: 10,
    scenario: "The Backup That Never Ran",
    context: `Riya sets up two automation tasks on an Ubuntu server. First: a cron job to back up the database at 2 AM daily. Second: a Node.js API that should start automatically when the server reboots. Both fail silently — the backup never runs and the API never starts after a reboot.`,
    code: [
      {
        label: "Riya's crontab entry (crontab -e)",
        lang: "bash",
        content: `# Runs backup daily at 2 AM
* 2 * * * /opt/scripts/db-backup.sh >> /var/log/backup.log 2>&1`
      },
      {
        label: "/etc/systemd/system/api.service (broken)",
        lang: "text",
        content: `[Unit]
Description=My Node.js API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/api
ExecStart=node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target`
      },
      {
        label: "Observed behavior",
        lang: "text",
        content: `# Cron — backup.sh never runs at 2 AM
# journalctl -u cron shows the job was "started" but backup is missing

# Systemd — API does not start on reboot
$ sudo systemctl status api
● api.service - My Node.js API
   Loaded: loaded (/etc/systemd/system/api.service)
   Active: inactive (dead)
# No errors — it just never starts`
      }
    ],
    problems: [
      'The cron expression "* 2 * * *" means "every minute of the 2nd hour (2:00–2:59)" not "once at 2:00 AM"',
      'The systemd service file is correct but was never enabled — it needs systemctl enable to create the symlink that makes it start on boot'
    ],
    questions: [
      {
        num: "32.1",
        marks: 3,
        text: "Decode the five fields of a cron expression (minute, hour, day-of-month, month, day-of-week). Explain exactly what '* 2 * * *' means and why it runs 60 times instead of once. Write the corrected cron expression that runs exactly once at 2:00 AM every day. Also explain what the '2>&1' at the end of the cron command does."
      },
      {
        num: "32.2",
        marks: 4,
        text: "Explain the difference between systemctl start and systemctl enable. Why does the service file being present in /etc/systemd/system/ not mean it runs on boot? What does enable actually do on disk (hint: symlink)? Write the two commands needed to both start the service now AND make it persist across reboots. Also explain what sudo systemctl daemon-reload does and when it is required."
      },
      {
        num: "32.3",
        marks: 3,
        text: "The ExecStart uses node server.js as a relative command. Explain why this is fragile in a systemd service and what two problems it can cause (PATH and working directory). Write the corrected ExecStart line using absolute paths. Also explain what Restart=on-failure does — under what conditions will systemd restart the service, and what condition will it NOT restart on?"
      }
    ]
  }
];

const POST_MID = [
  {
    id: "Q33",
    topic: "Docker — ENTRYPOINT vs CMD & Exec vs Shell Form",
    marks: 10,
    scenario: "The Container That Ignores Its Arguments",
    context: `A team packages a Python data processing script into Docker. They want to run it with different --mode flags at runtime without rebuilding the image. But docker run myimage --mode=prod is ignored — the container always runs in default mode. A second bug: the container does not respond to Ctrl+C and takes 10 seconds to stop every time.`,
    code: [
      {
        label: "Dockerfile (broken)",
        lang: "dockerfile",
        content: `FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt

# Shell form — wraps in /bin/sh -c
CMD ["python", "process.py", "--mode=dev"]`
      },
      {
        label: "docker run attempts",
        lang: "bash",
        content: `# Attempt to override mode at runtime:
docker run myimage --mode=prod
# Container runs with --mode=dev (argument ignored!)

# Stopping container:
docker stop myimage
# Waits 10 seconds, then SIGKILL
# Ctrl+C has no effect`
      }
    ],
    problems: [
      'Using CMD alone means the entire command is replaced when arguments are passed at runtime — --mode=prod replaces python process.py entirely',
      'Shell form (/bin/sh -c) means PID 1 is the shell, not Python — SIGTERM from docker stop goes to the shell which does not forward it to the Python process'
    ],
    questions: [
      {
        num: "33.1",
        marks: 4,
        text: "Explain the difference between ENTRYPOINT and CMD. When both are defined, how do they combine? Why does CMD alone mean runtime arguments replace the entire command instead of appending to it? Rewrite the Dockerfile so that python process.py is always the entrypoint and any runtime arguments (like --mode=prod) are appended automatically."
      },
      {
        num: "33.2",
        marks: 3,
        text: "Explain the difference between exec form and shell form for CMD and ENTRYPOINT. What is PID 1 in each case? Why does shell form cause docker stop to take 10 seconds (the default SIGTERM timeout) before force-killing with SIGKILL? How does switching to exec form fix signal handling? Show both forms and explain which one is always preferred in production."
      },
      {
        num: "33.3",
        marks: 3,
        text: "Write the final corrected Dockerfile using the right combination of ENTRYPOINT and CMD in exec form so that: (a) docker run myimage runs with --mode=dev by default, (b) docker run myimage --mode=prod overrides only the mode, and (c) docker stop works immediately. Show three different docker run examples and what each one actually executes inside the container."
      }
    ]
  },
  {
    id: "Q34",
    topic: "Docker Compose — Cross-Stack Networking",
    marks: 10,
    scenario: "The Frontend That Cannot Find the Backend",
    context: `A team splits their app into two separate Docker Compose files: one for the frontend stack and one for the backend stack. Each is started independently. The frontend Nginx container tries to proxy requests to the backend API at http://api:4000 but gets "host not found in upstream: api".`,
    code: [
      {
        label: "backend/compose.yaml",
        lang: "yaml",
        content: `services:
  api:
    build: .
    ports:
      - "4000:4000"
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret`
      },
      {
        label: "frontend/compose.yaml",
        lang: "yaml",
        content: `services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf`
      },
      {
        label: "frontend/nginx.conf",
        lang: "text",
        content: `server {
  listen 80;
  location /api/ {
    proxy_pass http://api:4000/;
  }
  location / {
    root /usr/share/nginx/html;
    try_files $uri /index.html;
  }
}`
      }
    ],
    problems: [
      'Each docker compose stack creates its own isolated network — frontend_default and backend_default are completely separate and cannot resolve each other\'s service names',
      'The frontend web container has no way to reach the api container by hostname because they are on different Docker networks'
    ],
    questions: [
      {
        num: "34.1",
        marks: 3,
        text: "Explain how Docker Compose automatically names and creates networks for a stack. Why do two separate compose files create two isolated networks? Why can the web container not resolve the hostname 'api' even though both stacks are running on the same Docker host? What two approaches can fix cross-stack communication?"
      },
      {
        num: "34.2",
        marks: 4,
        text: "Fix the problem using a shared external Docker network. Show: (a) the docker network create command to create the shared network, (b) the updated backend/compose.yaml that joins this network and marks it as external, (c) the updated frontend/compose.yaml that joins the same network. Explain what external: true means and what happens if the network does not exist when compose up runs."
      },
      {
        num: "34.3",
        marks: 3,
        text: "A colleague suggests an alternative: expose the backend API on the host with -p 4000:4000 and point Nginx to http://host.docker.internal:4000 instead of http://api:4000. Explain what host.docker.internal resolves to and when this approach is appropriate vs inappropriate. What is the production-appropriate solution when both stacks are deployed on the same server?"
      }
    ]
  },
  {
    id: "Q35",
    topic: "AWS — S3 Static Hosting, CloudFront & CORS",
    marks: 10,
    scenario: "The React App That Cannot Talk to Its API",
    context: `A team deploys their React frontend to S3 static hosting. The app loads fine in the browser but every API call to their Node.js backend (hosted on a separate EC2 instance) fails with a CORS error. They add a CORS header on the Express server but requests to GET /api/users still fail while POST /api/login works fine.`,
    code: [
      {
        label: "Browser console error",
        lang: "text",
        content: `Access to fetch at 'http://api.myapp.com/api/users'
from origin 'http://myapp-frontend.s3-website-us-east-1.amazonaws.com'
has been blocked by CORS policy:

Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the
requested resource.`
      },
      {
        label: "Express CORS setup (incomplete)",
        lang: "javascript",
        content: `const express = require('express');
const app = express();

// Only handles simple requests — missing OPTIONS handler
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.post('/api/login', (req, res) => {
  res.json({ token: 'abc' });
});

app.listen(3000);`
      }
    ],
    problems: [
      'GET /api/users fails because the browser sends a CORS preflight OPTIONS request first — the Express server has no OPTIONS handler so it returns 404, blocking the actual request',
      'POST /api/login works because it is a "simple request" (no custom headers, standard content-type) which does not trigger a preflight check'
    ],
    questions: [
      {
        num: "35.1",
        marks: 4,
        text: "Explain what a CORS preflight request is. Under what conditions does the browser send a preflight OPTIONS request before the actual request? Why does GET /api/users trigger a preflight but POST /api/login (with no custom headers) does not? Trace through the full CORS flow for GET /api/users — what headers does the browser send in the preflight, and what headers must the server return?"
      },
      {
        num: "35.2",
        marks: 3,
        text: "Write the corrected Express CORS middleware that handles both preflight OPTIONS requests and actual requests. Show the complete middleware including: Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, and the OPTIONS handler that returns 200. Then show how using the 'cors' npm package simplifies this to 3 lines."
      },
      {
        num: "35.3",
        marks: 3,
        text: "The team moves the frontend to CloudFront in front of S3. Explain two advantages of using CloudFront over direct S3 website hosting (HTTPS, caching). The team now wants only their specific domain to be allowed in CORS, not '*'. Explain the security risk of Access-Control-Allow-Origin: * and show the corrected Express middleware that only allows requests from https://myapp.com."
      }
    ]
  },
  {
    id: "Q36",
    topic: "AWS ECS — SSM Parameter Store & Secrets Manager",
    marks: 10,
    scenario: "The Secrets in Plain Sight",
    context: `A team stores all configuration in the ECS Task Definition as plaintext environment variables — including a Stripe API key and a database password. A security audit flags this as a critical violation. They need to move secrets to AWS Secrets Manager and non-sensitive config to SSM Parameter Store, without changing the application code.`,
    code: [
      {
        label: "ECS Task Definition (insecure)",
        lang: "json",
        content: `{
  "family": "api-task",
  "containerDefinitions": [{
    "name": "api",
    "image": "myapi:v6",
    "environment": [
      { "name": "NODE_ENV",           "value": "production" },
      { "name": "PORT",               "value": "4000" },
      { "name": "DB_HOST",            "value": "prod-db.abc123.rds.amazonaws.com" },
      { "name": "DB_PASSWORD",        "value": "Pr0d$ecret!" },
      { "name": "STRIPE_SECRET_KEY",  "value": "sk_live_abc123xyz789" }
    ]
  }],
  "executionRoleArn": "arn:aws:iam::123:role/ecsTaskExecutionRole"
}`
      },
      {
        label: "Security audit findings",
        lang: "text",
        content: `CRITICAL: DB_PASSWORD stored in plaintext in task definition
CRITICAL: STRIPE_SECRET_KEY stored in plaintext in task definition
WARNING:  Task definition versions visible to all IAM users
          with ecs:DescribeTaskDefinition permission
FINDING:  Secrets visible in AWS Console, CLI output, and CloudTrail logs`
      }
    ],
    problems: [
      'DB_PASSWORD and STRIPE_SECRET_KEY are visible in plaintext to anyone with ecs:DescribeTaskDefinition IAM permission',
      'The task execution role needs additional permissions to fetch from SSM/Secrets Manager — this is often missed when migrating'
    ],
    questions: [
      {
        num: "36.1",
        marks: 3,
        text: "Explain the difference between AWS SSM Parameter Store (SecureString) and AWS Secrets Manager. When would you use each? Which one should store DB_PASSWORD and STRIPE_SECRET_KEY, and which one is appropriate for NODE_ENV and PORT? State one advantage Secrets Manager has over SSM Parameter Store for production secrets."
      },
      {
        num: "36.2",
        marks: 4,
        text: "Rewrite the ECS Task Definition containerDefinitions to use the secrets array (for sensitive values from Secrets Manager) and keep environment for non-sensitive values. Show: (a) the AWS CLI commands to store DB_PASSWORD and STRIPE_SECRET_KEY in Secrets Manager, (b) the updated task definition JSON using 'valueFrom' with the secret ARNs, (c) the IAM policy statements that must be added to the ecsTaskExecutionRole to allow fetching these secrets."
      },
      {
        num: "36.3",
        marks: 3,
        text: "Explain exactly when ECS fetches the secret values — at task launch time or at runtime when the app reads the environment variable? What implication does this have if a secret is rotated in Secrets Manager? What must the team do to pick up a rotated secret value in a running ECS service, and how can they automate this rotation cycle?"
      }
    ]
  },
  {
    id: "Q37",
    topic: "Terraform — lifecycle Rules",
    marks: 10,
    scenario: "The Plan That Wanted to Delete Production",
    context: `Three Terraform lifecycle incidents happen in the same week. First: changing an RDS instance's instance_class causes Terraform to destroy and recreate the database — losing all data. Second: a terraform apply accidentally destroys a production S3 bucket containing 5 years of customer data. Third: a new EC2 instance must be launched before the old one is destroyed to avoid downtime during instance type changes.`,
    code: [
      {
        label: "main.tf (before lifecycle fixes)",
        lang: "hcl",
        content: `resource "aws_db_instance" "prod" {
  identifier     = "prod-db"
  engine         = "postgres"
  instance_class = "db.t3.micro"   # changing this destroys the DB
  username       = "admin"
  password       = var.db_password
  allocated_storage = 100
}

resource "aws_s3_bucket" "customer_data" {
  bucket = "mycompany-customer-data-prod"
  # no protection — can be accidentally destroyed
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"   # changing causes destroy-then-create downtime
}`
      },
      {
        label: "terraform plan output (dangerous)",
        lang: "text",
        content: `# Changing instance_class on RDS:
-/+ aws_db_instance.prod (forces replacement)
    # DB WILL BE DESTROYED THEN RECREATED — DATA LOSS

# After someone runs terraform destroy by mistake:
- aws_s3_bucket.customer_data  # GONE — 5 years of data deleted

# Changing instance_type on EC2:
-/+ aws_instance.web (forces replacement)
    # Old instance destroyed BEFORE new one is ready — downtime`
      }
    ],
    problems: [
      'Changing instance_class on aws_db_instance requires replacement — Terraform destroys the old DB (and all data) then creates a new one',
      'No protection on the S3 bucket — terraform destroy or an accidental plan removes it permanently',
      'EC2 replacement is destroy-then-create by default — causes a window of downtime'
    ],
    questions: [
      {
        num: "37.1",
        marks: 4,
        text: "Explain the Terraform lifecycle block and its three most important arguments: prevent_destroy, ignore_changes, and create_before_destroy. For each one: state what problem it solves, show the HCL syntax added to the relevant resource, and explain any trade-offs. Apply all three fixes to the three resources in main.tf above."
      },
      {
        num: "37.2",
        marks: 3,
        text: "The team uses ignore_changes = [instance_class] on the RDS resource. Explain precisely what this does — if a colleague manually changes instance_class in the AWS Console and then runs terraform plan, what will Terraform show? Is this always the right fix for the RDS problem, or is there a better approach for planned instance_class upgrades? Explain the alternative."
      },
      {
        num: "37.3",
        marks: 3,
        text: "prevent_destroy only prevents accidental terraform destroy or terraform apply that would remove the resource. Explain two scenarios where prevent_destroy does NOT protect the resource. Also explain: if prevent_destroy: true is set and a developer intentionally needs to delete the bucket, what is the correct procedure — they cannot just run terraform destroy."
      }
    ]
  },
  {
    id: "Q38",
    topic: "Kubernetes — Rolling Updates & Rollback",
    marks: 10,
    scenario: "The Bad Deploy That Took Down Production",
    context: `A team pushes a new image to their Deployment. The new version has a startup bug — it crashes 30 seconds after launching. Because of their rolling update strategy configuration, all old pods are replaced before the new ones are confirmed healthy, causing complete downtime. They need to roll back urgently but are unsure of the commands.`,
    code: [
      {
        label: "api-deployment.yaml (bad strategy config)",
        lang: "yaml",
        content: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  annotations:
    kubernetes.io/change-cause: "upgrade to v4 — new auth system"
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 0
      maxUnavailable: 4      # all 4 pods can be replaced at once!
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
        image: myapi:v4
        readinessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5`
      },
      {
        label: "kubectl get pods during rollout",
        lang: "bash",
        content: `NAME                  READY   STATUS             RESTARTS
api-v4-abc-1          0/1     CrashLoopBackOff   3
api-v4-abc-2          0/1     CrashLoopBackOff   3
api-v4-abc-3          0/1     CrashLoopBackOff   3
api-v4-abc-4          0/1     CrashLoopBackOff   3
# All old v3 pods already gone — 100% downtime`
      }
    ],
    problems: [
      'maxUnavailable: 4 with 4 replicas means Kubernetes replaces all pods simultaneously — there are zero healthy pods during the rollout',
      'maxSurge: 0 means no extra pods can be created during the update — combined with maxUnavailable: 4, all old pods are killed before any new ones start'
    ],
    questions: [
      {
        num: "38.1",
        marks: 4,
        text: "Explain maxSurge and maxUnavailable in a Kubernetes RollingUpdate strategy. What do they control and how do they interact? Trace through exactly what happens during a rollout with maxSurge: 0 and maxUnavailable: 4 on a 4-replica Deployment. Write the corrected strategy values that guarantee at least 3 out of 4 pods are always serving traffic during a rollout — show two different valid configurations."
      },
      {
        num: "38.2",
        marks: 3,
        text: "Explain how readinessProbe prevents bad pods from receiving traffic during a rolling update. In this scenario, the readinessProbe is configured correctly — but the rollout still caused downtime. Explain why the probe alone was not enough to prevent downtime, and what the interaction between maxUnavailable and the readiness probe should be for safe deployments."
      },
      {
        num: "38.3",
        marks: 3,
        text: "The team needs to roll back to v3 immediately. Write the kubectl command to roll back to the previous revision. Then show how to: (a) view the rollout history and see the change-cause annotation, (b) roll back to a specific revision number (not just the previous one), and (c) check the status of the rollback in real time. Explain what Kubernetes does to the ReplicaSets during a rollback."
      }
    ]
  },
  {
    id: "Q39",
    topic: "Kubernetes — Jobs & CronJobs",
    marks: 10,
    scenario: "The Migration That Ran Forever",
    context: `A team runs database migrations as a Kubernetes Job before each deployment. The migration Job fails on the first attempt (due to a DB connection issue). Instead of stopping, Kubernetes keeps restarting it indefinitely — creating hundreds of failed pods and filling up the node's disk. A CronJob for nightly reports also piles up — old job pods are never cleaned up.`,
    code: [
      {
        label: "migration-job.yaml (broken)",
        lang: "yaml",
        content: `apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: myapp:v5
        command: ["npm", "run", "db:migrate"]
      restartPolicy: Always    # wrong for a Job`
      },
      {
        label: "nightly-report-cronjob.yaml (broken)",
        lang: "yaml",
        content: `apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-report
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: report
            image: myapp:v5
            command: ["npm", "run", "generate:report"]
          restartPolicy: OnFailure`
      },
      {
        label: "kubectl get pods (after 2 hours)",
        lang: "bash",
        content: `NAME                    READY   STATUS
db-migrate-attempt-1    0/1     Error
db-migrate-attempt-2    0/1     Error
db-migrate-attempt-3    0/1     Error
...
db-migrate-attempt-94   0/1     Error   # 94 retries!

nightly-report-28a      0/1     Completed
nightly-report-29b      0/1     Completed
nightly-report-30c      0/1     Completed   # never cleaned up`
      }
    ],
    problems: [
      'restartPolicy: Always on a Job makes Kubernetes retry forever — Jobs must use Never or OnFailure, and backoffLimit controls the maximum retries',
      'CronJob pods are never garbage collected — old Completed pods accumulate and waste resources and disk'
    ],
    questions: [
      {
        num: "39.1",
        marks: 4,
        text: "Explain why restartPolicy: Always is invalid for a Kubernetes Job. What are the two valid restartPolicy values for a Job and what is the difference between them? What does backoffLimit control and what is the default value? Write the corrected migration-job.yaml that retries up to 3 times then stops, and explain the exponential backoff delay between retries."
      },
      {
        num: "39.2",
        marks: 3,
        text: "Explain the two CronJob fields that control pod cleanup: successfulJobsHistoryLimit and failedJobsHistoryLimit. What are their default values? Write the corrected nightly-report CronJob that keeps only the last 3 successful job pods and last 1 failed job pod. Also explain what concurrencyPolicy: Forbid does and when you would use it for a nightly report job."
      },
      {
        num: "39.3",
        marks: 3,
        text: "The team wants the migration Job to run automatically as part of every deployment — before the new Deployment pods start serving traffic. Explain two approaches to sequence a Job before a Deployment in Kubernetes: (a) using an init container inside the Deployment, and (b) using a pre-install Helm hook. Compare the trade-offs of each approach for a production CI/CD pipeline."
      }
    ]
  },
  {
    id: "Q40",
    topic: "Docker — Debugging, Exec & Inspect",
    marks: 10,
    scenario: "The Container That Misbehaves in Production",
    context: `A production Node.js container is running but returning 500 errors. The team cannot reproduce it locally. They need to: inspect what environment variables the container actually has, check if a config file inside the container is correct, watch live logs filtered by error level, and debug a port mapping issue where the app runs on 4000 but external traffic hits 3000.`,
    code: [
      {
        label: "docker ps output",
        lang: "bash",
        content: `CONTAINER ID  IMAGE        STATUS         PORTS
a3f2b1c09d4e  myapi:prod   Up 2 hours     0.0.0.0:3000->4000/tcp`
      },
      {
        label: "Application error in logs",
        lang: "text",
        content: `[ERROR] Cannot connect to Redis at redis:6379
[ERROR] REDIS_URL is undefined — falling back to in-memory cache
[ERROR] POST /api/checkout — 500 Internal Server Error
[INFO]  Server listening on 0.0.0.0:4000`
      },
      {
        label: "docker inspect (partial output showing a surprise)",
        lang: "json",
        content: `"Env": [
  "NODE_ENV=production",
  "PORT=4000",
  "REDIS_URL=",
  "DB_HOST=prod-db.rds.amazonaws.com"
],
"NetworkSettings": {
  "Networks": {
    "bridge": {
      "IPAddress": "172.17.0.2"
    }
  }
  // Redis container is on a DIFFERENT network!
}`
      }
    ],
    problems: [
      'REDIS_URL is set but empty string — the app treats it as undefined. The Redis container is also on a different Docker network so the hostname redis:6379 would not resolve anyway',
      'The team does not know the right debugging commands to inspect the running container without restarting it'
    ],
    questions: [
      {
        num: "40.1",
        marks: 4,
        text: "Walk through the full debugging workflow for this container using only docker commands — without restarting it. Show the exact commands to: (a) stream live logs and filter for ERROR lines only, (b) open an interactive shell inside the running container, (c) inspect all environment variables the container actually has at runtime, (d) check the full network configuration including which networks the container is attached to. Explain what each command reveals in this specific scenario."
      },
      {
        num: "40.2",
        marks: 3,
        text: "Explain the port mapping 0.0.0.0:3000->4000/tcp shown in docker ps. What does this mean — which port is the host port and which is the container port? Who connects to 3000 and who connects to 4000? If a developer runs curl localhost:4000 on the host machine, will it work? If another container tries to reach this container on port 4000, what hostname and port should it use?"
      },
      {
        num: "40.3",
        marks: 3,
        text: "The root cause is that the api container and the redis container are on different Docker networks. Without stopping the api container, show the docker command to connect it to the redis container's network at runtime. Then explain the permanent fix — show the docker run command for the api container that puts it on the correct network from the start. Why is the bridge network (default) considered bad practice for multi-container apps?"
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

function QuestionCard({ q, index, sectionColor }) {
  const [open, setOpen] = useState(index === 0);
  const dotColor = sectionColor === "teal" ? "#1D9E75" : "#7F77DD";
  const dotBg = sectionColor === "teal" ? "#E1F5EE" : "#EEEDFE";
  return (
    <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", marginBottom: 14, overflow: "hidden", background: "var(--color-background-primary)" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 34, height: 34, borderRadius: "50%", background: dotBg, color: dotColor, fontWeight: 500, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{q.id}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 15, color: "var(--color-text-primary)", marginBottom: 2 }}>{q.scenario}</div>
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

  const index = [
    { id: "Q31", label: "GH Actions — Dependency Caching", note: "cache key, restore-keys, lockfile hashing" },
    { id: "Q32", label: "Linux — Systemd & Cron", note: "cron fields, systemctl enable vs start, ExecStart path" },
    { id: "Q33", label: "Docker — ENTRYPOINT vs CMD", note: "exec vs shell form, PID 1, signal handling" },
    { id: "Q34", label: "Docker Compose — Cross-Stack Networking", note: "external networks, host.docker.internal" },
    { id: "Q35", label: "AWS — S3 + CloudFront + CORS", note: "preflight OPTIONS, Allow-Origin, simple vs complex requests" },
    { id: "Q36", label: "AWS ECS — SSM & Secrets Manager", note: "secrets array, valueFrom, execution role permissions" },
    { id: "Q37", label: "Terraform — lifecycle Rules", note: "prevent_destroy, ignore_changes, create_before_destroy" },
    { id: "Q38", label: "Kubernetes — Rolling Updates & Rollback", note: "maxSurge, maxUnavailable, kubectl rollout undo" },
    { id: "Q39", label: "Kubernetes — Jobs & CronJobs", note: "backoffLimit, restartPolicy, historyLimit, concurrencyPolicy" },
    { id: "Q40", label: "Docker — Debugging & Inspect", note: "exec, logs, inspect, network connect at runtime" },
  ];

  const allQ = [...PRE_MID, ...POST_MID];

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px 40px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Practice Paper — Set 4 · DevOps End-Sem</div>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>10 More Scenario Questions</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>Q31–Q40 · Same level as Set 3 · New topics: caching, CORS, lifecycle, rollback, CronJobs, debugging</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        {index.map(t => {
          const num = parseInt(t.id.replace("Q", ""));
          const isPre = num <= 32;
          return (
            <div key={t.id} style={{ padding: "9px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: isPre ? "#EEEDFE" : "#E1F5EE", color: isPre ? "#7F77DD" : "#1D9E75", fontSize: 10, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{num}</span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--color-text-primary)" }}>{t.label}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", paddingLeft: 34, lineHeight: 1.4 }}>{t.note}</div>
            </div>
          );
        })}
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
            Q31–Q32 · Topics 1–6 · GitHub Actions caching and Linux Systemd · Attempt both
          </div>
          {PRE_MID.map((q, i) => <QuestionCard key={q.id} q={q} index={i} sectionColor="purple" />)}
        </div>
      )}

      {activeSection === "post" && (
        <div>
          <div style={{ background: "#E1F5EE", border: "0.5px solid #5DCAA5", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#085041" }}>
            Q33–Q40 · Topics 7–12 · Docker, AWS, Terraform, Kubernetes · 8 questions — attempt 5
          </div>
          {POST_MID.map((q, i) => <QuestionCard key={q.id} q={q} index={i} sectionColor="teal" />)}
        </div>
      )}

      <div style={{ marginTop: 28, padding: "14px 18px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>All 4 sets at a glance — 40 questions total</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[
            { set: "Set 1", range: "Q1–Q10", note: "Foundation scenarios — one bug per question", color: "#E1F5EE", text: "#085041" },
            { set: "Set 2", range: "Q11–Q20", note: "New topic areas — chmod, artifacts, Ingress", color: "#EEF2FF", text: "#3730A3" },
            { set: "Set 3", range: "Q21–Q30", note: "Harder — multi-bug, cross-system reasoning", color: "#FAECE7", text: "#993C1D" },
            { set: "Set 4", range: "Q31–Q40", note: "Practical — caching, debugging, lifecycle, rollback", color: "#FDF4E7", text: "#7C4D0E" },
          ].map(s => (
            <div key={s.set} style={{ padding: "10px 12px", background: s.color, borderRadius: "var(--border-radius-md)" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: s.text, marginBottom: 3 }}>{s.set} · {s.range}</div>
              <div style={{ fontSize: 11, color: s.text, opacity: 0.8, lineHeight: 1.4 }}>{s.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
