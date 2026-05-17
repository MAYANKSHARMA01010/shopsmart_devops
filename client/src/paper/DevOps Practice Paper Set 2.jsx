"use client";

import { useState } from "react";

const PRE_MID = [
  {
    id: "Q11",
    topic: "Linux — Permissions & SSH",
    marks: 10,
    scenario: "The Locked-Out Engineer",
    context: `Ravi downloads a .pem key pair from the AWS Console to connect to an EC2 instance. His first SSH attempt fails instantly. After fixing permissions he gets in, but now wants to understand the numeric permission system and set up a script that only the owner can read or execute.`,
    code: [
      {
        label: "SSH attempt and error",
        lang: "bash",
        content: `$ ssh -i ~/Downloads/devkey.pem ec2-user@13.233.45.67

@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!         @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Permissions 0644 for 'devkey.pem' are too open.
It is required that your private key files are NOT accessible by others.
This private key will be ignored.
Permission denied (publickey).`
      },
      {
        label: "ls -l output before fix",
        lang: "bash",
        content: `-rw-r--r--  1 ravi  staff  1678 Jun 10 09:12 devkey.pem`
      },
      {
        label: "deploy-internal.sh (needs tighter permissions)",
        lang: "bash",
        content: `#!/bin/bash
# This script contains DB credentials — only owner should run it
DB_PASSWORD="super_secret_123"
echo "Connecting to DB with password: $DB_PASSWORD"
pg_dump -U admin -h prod-db.example.com mydb > backup.sql`
      }
    ],
    problems: [
      'SSH refuses the private key because file permissions are too open (0644 — world-readable)',
      'deploy-internal.sh currently has default permissions — anyone on the server can read the DB password inside it'
    ],
    questions: [
      {
        num: "11.1",
        marks: 3,
        text: "Explain why SSH specifically rejects a private key with permissions 0644. Decode the three permission groups shown in the ls -l output (rw-r--r--) and explain what each group (owner, group, others) can currently do with the file."
      },
      {
        num: "11.2",
        marks: 3,
        text: "Write the Linux command that fixes the .pem file permissions so SSH accepts it. Explain what the permission number means — break down each digit (4, 2, 1 values) and state exactly who can now read, write, or execute the file."
      },
      {
        num: "11.3",
        marks: 4,
        text: "Set permissions on deploy-internal.sh so that: (a) only the owner can read and execute it, (b) group members and others have zero access. Write the chmod command using numeric notation, decode each digit, and explain how this implements the Principle of Least Privilege."
      }
    ]
  },
  {
    id: "Q12",
    topic: "GitHub Actions — Artifacts & Job Isolation",
    marks: 10,
    scenario: "The Build Output That Vanished",
    context: `Aanya splits her CI workflow into two jobs: build and deploy. The build job compiles a React app and produces a dist/ folder. The deploy job is supposed to sync that folder to an S3 bucket. After splitting the workflow, deploy starts failing with a missing directory error.`,
    code: [
      {
        label: "frontend-ci.yml",
        lang: "yaml",
        content: `name: Frontend CI
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
        # produces dist/ folder

  deploy:
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - name: Sync to S3
        run: aws s3 sync dist/ s3://my-react-app-prod
        env:
          AWS_ACCESS_KEY_ID: \${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: \${{ secrets.AWS_SECRET_ACCESS_KEY }}`
      }
    ],
    problems: [
      'deploy fails with: fatal error: dist/: No such file or directory — even though build clearly produced it',
      'The team also wants to know: if the build fails, how can they inspect what files were produced for debugging?'
    ],
    questions: [
      {
        num: "12.1",
        marks: 4,
        text: "Explain in detail why the deploy job cannot see the dist/ folder even though build produced it. Your answer must explain what a GitHub Actions runner is, whether job runners share a filesystem, and what happens to the runner's disk after a job finishes."
      },
      {
        num: "12.2",
        marks: 4,
        text: "Rewrite the workflow — show only the steps that change — so deploy reliably receives the build output. Name the GitHub Actions feature you are using, show the exact steps added to each job, and explain the upload → download lifecycle."
      },
      {
        num: "12.3",
        marks: 2,
        text: "The team wants to download and inspect the dist/ folder manually after a failed deploy run. Describe where GitHub Actions stores artifacts and how a developer accesses them outside of the pipeline."
      }
    ]
  }
];

const POST_MID = [
  {
    id: "Q13",
    topic: "Docker — Multi-Stage Builds",
    marks: 10,
    scenario: "The 900 MB Production Image",
    context: `Vikram builds a Go REST API. His single-stage Dockerfile produces a 900 MB image that gets pushed to production. A senior engineer tells him he can ship the same binary in under 20 MB using a multi-stage build.`,
    code: [
      {
        label: "Dockerfile (current — single stage)",
        lang: "dockerfile",
        content: `FROM golang:1.22

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o server .

EXPOSE 8080

CMD ["./server"]`
      },
      {
        label: "docker images output",
        lang: "bash",
        content: `REPOSITORY   TAG       IMAGE ID       SIZE
myapi        latest    a3f2b1c09d4e   912MB`
      }
    ],
    problems: [
      'The 912 MB image contains the entire Go compiler, build tools, and SDK — none of which are needed at runtime',
      'Shipping a 912 MB image to ECR on every deploy is slow and expensive in bandwidth and storage'
    ],
    questions: [
      {
        num: "13.1",
        marks: 3,
        text: "Explain why the current image is 912 MB even though the compiled Go binary is only a few MB. What does the golang:1.22 base image contain that inflates the size? Why is all of that unnecessary in a production image?"
      },
      {
        num: "13.2",
        marks: 4,
        text: "Rewrite the Dockerfile as a multi-stage build. Use golang:1.22 as the builder stage and scratch (or alpine) as the final stage. Explain what the COPY --from=builder instruction does and why the final image is dramatically smaller."
      },
      {
        num: "13.3",
        marks: 3,
        text: "Explain the security benefit of using a minimal base image (scratch or distroless) in production beyond just size reduction. What attack surface is eliminated, and how does this align with the Principle of Least Privilege applied to containers?"
      }
    ]
  },
  {
    id: "Q14",
    topic: "Docker Compose — Environment Variables & .env Files",
    marks: 10,
    scenario: "The Credentials Committed to Git",
    context: `A team's compose.yaml hardcodes database credentials and API keys directly in the file. A security scan flags the repository. A senior DevOps engineer asks them to restructure the setup using environment variable files — without breaking local development.`,
    code: [
      {
        label: "compose.yaml (insecure current version)",
        lang: "yaml",
        content: `services:
  api:
    build: ./api
    ports:
      - "4000:4000"
    environment:
      DB_HOST: db
      DB_USER: admin
      DB_PASSWORD: SuperSecret123
      STRIPE_SECRET_KEY: sk_live_abc123xyz789
      NODE_ENV: production

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: SuperSecret123
      POSTGRES_DB: shopdb`
      }
    ],
    problems: [
      'Credentials are hardcoded in compose.yaml which is committed to version control — a critical security violation',
      'Different developers need different values for NODE_ENV and DB_HOST for local vs production use'
    ],
    questions: [
      {
        num: "14.1",
        marks: 3,
        text: "Explain the security risk of committing credentials directly in compose.yaml to a Git repository. What automated systems actively scan public and private repositories for this pattern, and what can happen within minutes of a secret being pushed?"
      },
      {
        num: "14.2",
        marks: 4,
        text: "Restructure the compose.yaml to use a .env file for all sensitive values. Show: (a) the complete updated compose.yaml using variable substitution syntax, (b) the .env file with all values, and (c) the .gitignore entry that prevents accidental commits. Explain how Docker Compose automatically loads the .env file."
      },
      {
        num: "14.3",
        marks: 3,
        text: "The team wants to provide a safe example for new developers to copy. Show what a .env.example file should contain for this project and explain the convention of committing .env.example but not .env. How does this support developer onboarding without exposing secrets?"
      }
    ]
  },
  {
    id: "Q15",
    topic: "AWS EC2 — Networking & Security Groups",
    marks: 10,
    scenario: "The Server That Nobody Can Reach",
    context: `Divya launches a Node.js/Express API on an EC2 instance. The terminal confirms the server is running. But every browser and curl request from the internet either times out or gets connection refused. The EC2 instance is running and the code has no bugs.`,
    code: [
      {
        label: "server.js",
        lang: "javascript",
        content: `const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Divya's code — three versions she tests:
// Version A:
app.listen(3000, '127.0.0.1', () => console.log('Server on port 3000'));

// Version B (after fixing A):
app.listen(3000, () => console.log('Server on port 3000'));

// Version C (what she runs on EC2):
app.listen(3000, '0.0.0.0', () => console.log('Server on port 3000'));`
      },
      {
        label: "EC2 Inbound Security Group Rules",
        lang: "text",
        content: `Type        Protocol  Port Range  Source
SSH         TCP       22          0.0.0.0/0
HTTP        TCP       80          0.0.0.0/0
HTTPS       TCP       443         0.0.0.0/0
# Port 3000 has no rule`
      }
    ],
    problems: [
      'Version A: curl http://<EC2-IP>:3000/health from laptop → connection refused',
      'Version C is running with the Security Group above: browser request times out indefinitely'
    ],
    questions: [
      {
        num: "15.1",
        marks: 4,
        text: "Explain why Version A fails even though the server starts successfully. What does 127.0.0.1 mean? Why does traffic from the internet never reach a server bound to this address? Compare this to binding on 0.0.0.0 and explain the difference."
      },
      {
        num: "15.2",
        marks: 3,
        text: "Version C uses 0.0.0.0 but requests still time out. Identify the second misconfiguration from the Security Group table. Explain how AWS Security Groups work as a virtual firewall and what the default behavior is for traffic on ports without an explicit inbound rule."
      },
      {
        num: "15.3",
        marks: 3,
        text: "Write the AWS CLI command to add the missing inbound Security Group rule for port 3000. Then explain: after both fixes are applied (correct binding address + correct Security Group rule), trace the complete path of an HTTP request from a laptop browser to the Express handler — listing every layer it passes through."
      }
    ]
  },
  {
    id: "Q16",
    topic: "AWS ECS — Health Checks & Rolling Deployments",
    marks: 10,
    scenario: "The Deployment That Broke Production",
    context: `A team pushes a new version of their API to ECS. The new image has a startup bug — it takes 45 seconds to initialize the database connection before it can serve traffic. ECS marks the new tasks as unhealthy and the deployment stalls. During the rollout, some users intermittently hit the old version and some hit a starting new version — causing inconsistent responses.`,
    code: [
      {
        label: "ECS Task Definition (relevant excerpt)",
        lang: "json",
        content: `{
  "family": "api-task",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/api:v4",
      "portMappings": [{ "containerPort": 4000 }],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:4000/health || exit 1"],
        "interval": 5,
        "timeout": 2,
        "retries": 3,
        "startPeriod": 0
      }
    }
  ]
}`
      },
      {
        label: "ECS Service deployment config",
        lang: "json",
        content: `{
  "deploymentConfiguration": {
    "minimumHealthyPercent": 0,
    "maximumPercent": 200
  }
}`
      }
    ],
    problems: [
      'New tasks fail health checks immediately at startup (startPeriod: 0) — they need 45 seconds to initialize before /health responds',
      'minimumHealthyPercent: 0 allows ECS to take down ALL old tasks before new ones are healthy — causing full downtime'
    ],
    questions: [
      {
        num: "16.1",
        marks: 4,
        text: "Explain what the healthCheck.startPeriod field does and why setting it to 0 causes healthy new containers to be killed during startup. What value should startPeriod be set to in this scenario and why? Also explain the relationship between interval, timeout, and retries — when exactly does ECS declare a container unhealthy?"
      },
      {
        num: "16.2",
        marks: 3,
        text: "Explain what minimumHealthyPercent and maximumPercent control during a rolling deployment. Why does minimumHealthyPercent: 0 cause complete downtime during this deployment? Write the corrected values for a zero-downtime rolling deployment of a service with 4 running tasks."
      },
      {
        num: "16.3",
        marks: 3,
        text: "The /health endpoint currently just returns 200 OK immediately on process start — before the database connection is ready. Explain the difference between a liveness check and a readiness check. Write a better /health endpoint implementation in Express.js that only returns 200 once the database connection is confirmed ready."
      }
    ]
  },
  {
    id: "Q17",
    topic: "Terraform — Variables & Sensitive Values",
    marks: 10,
    scenario: "The Hardcoded Production Password",
    context: `Meera writes Terraform code to provision an RDS database. She hardcodes the database password directly in main.tf. A teammate reviews the PR and flags two problems: the password is visible in the .tf file and will appear in the Terraform state file in plaintext.`,
    code: [
      {
        label: "main.tf (current — insecure)",
        lang: "hcl",
        content: `provider "aws" {
  region = "us-east-1"
}

resource "aws_db_instance" "main" {
  identifier        = "prod-db"
  engine            = "postgres"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  db_name           = "appdb"
  username          = "dbadmin"
  password          = "MyH@rdcodedP@ss123"
  skip_final_snapshot = true
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
}`
      }
    ],
    problems: [
      'password = "MyH@rdcodedP@ss123" is visible in plain text in main.tf which is committed to Git',
      'Even if moved to a variable, Terraform stores all resource attributes (including passwords) in terraform.tfstate in plaintext'
    ],
    questions: [
      {
        num: "17.1",
        marks: 4,
        text: "Refactor main.tf to use an input variable for the database password. Show: (a) the variable block with the sensitive = true flag, (b) how it is referenced in the resource, (c) a terraform.tfvars file with the value, and (d) the .gitignore entry for tfvars. Explain what sensitive = true does to Terraform plan output."
      },
      {
        num: "17.2",
        marks: 3,
        text: "Explain why the Terraform state file is a security risk even after moving the password to a variable. Where does Terraform store resource attribute values in the state file? What two measures should the team implement to protect the state file containing sensitive data?"
      },
      {
        num: "17.3",
        marks: 3,
        text: "The team wants to use different instance types for dev and prod without duplicating their .tf files. Explain how Terraform input variables with a type constraint and a terraform.tfvars file per environment solves this. Show the variable declaration for instance_type with a default value and the two separate .tfvars files."
      }
    ]
  },
  {
    id: "Q18",
    topic: "Terraform — Remote State & Locking",
    marks: 10,
    scenario: "The Corrupted State File",
    context: `A startup stores their Terraform state in an S3 bucket but forgot to configure state locking. On a Friday afternoon, two engineers (Pooja and Rahul) both run terraform apply simultaneously. After both finish, the infrastructure in AWS is inconsistent and neither state file accurately reflects reality.`,
    code: [
      {
        label: "backend.tf (current — missing locking)",
        lang: "hcl",
        content: `terraform {
  backend "s3" {
    bucket = "mycompany-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}`
      },
      {
        label: "What happened during simultaneous apply",
        lang: "text",
        content: `Pooja (12:01 PM): terraform apply → reads state v1, plans 3 changes
Rahul (12:01 PM): terraform apply → reads state v1, plans 2 changes

Pooja (12:04 PM): apply complete → writes state v2 to S3
Rahul (12:05 PM): apply complete → overwrites with state v3 (based on v1!)

Result: Pooja's 3 changes exist in AWS but are missing from the state.
        Rahul's state thinks resources Pooja created don't exist.`
      }
    ],
    problems: [
      'Simultaneous applies caused a race condition — the last writer wins and overwrites the other engineer\'s state changes',
      'Resources exist in AWS that are not tracked in the state file — Terraform will try to recreate them on the next apply'
    ],
    questions: [
      {
        num: "18.1",
        marks: 4,
        text: "Explain the race condition that caused state corruption. What is state locking and why does S3 alone not provide it? Write the corrected backend.tf that adds state locking using the AWS-native solution — name the AWS service used and explain what it does during a terraform apply."
      },
      {
        num: "18.2",
        marks: 3,
        text: "Resources now exist in AWS that are absent from the Terraform state file. Explain the terraform import command — what problem does it solve, and write the command to import an existing EC2 instance (ID: i-0abc123def456) into the Terraform state as aws_instance.web."
      },
      {
        num: "18.3",
        marks: 3,
        text: "Explain the full recommended setup for Terraform remote state in a team environment. Include: S3 bucket configuration (versioning, encryption), DynamoDB table for locking, and the IAM permissions each engineer needs. Why is bucket versioning specifically important for state files?"
      }
    ]
  },
  {
    id: "Q19",
    topic: "Kubernetes — CrashLoopBackOff & ConfigMaps",
    marks: 10,
    scenario: "The Pod That Keeps Dying",
    context: `A developer deploys a Node.js API to minikube. Within seconds, kubectl get pods shows the pod in CrashLoopBackOff state. The app crashes because it cannot find the DATABASE_URL environment variable — the value is hardcoded nowhere in the Deployment YAML.`,
    code: [
      {
        label: "api-deployment.yaml (broken)",
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
        image: myapi:v1
        ports:
        - containerPort: 4000`
      },
      {
        label: "kubectl get pods output",
        lang: "bash",
        content: `NAME                   READY   STATUS             RESTARTS   AGE
api-5d9f8b-abc12      0/1     CrashLoopBackOff   5          3m
api-5d9f8b-xyz99      0/1     CrashLoopBackOff   5          3m`
      },
      {
        label: "kubectl logs api-5d9f8b-abc12",
        lang: "bash",
        content: `Error: DATABASE_URL environment variable is not set
    at Object.<anonymous> (/app/server.js:5:9)
    at Module._compile (node:internal/modules/cjs/loader:1364:14)
process exited with code 1`
      }
    ],
    problems: [
      'Both pods are in CrashLoopBackOff — the application crashes on startup because DATABASE_URL is missing',
      'The team wants to store non-sensitive config (DB host, port, app name) separately from the Deployment YAML so it can be updated without redeploying'
    ],
    questions: [
      {
        num: "19.1",
        marks: 3,
        text: "Explain what CrashLoopBackOff means in Kubernetes. Why does the restart count keep climbing? What is the exponential backoff behavior Kubernetes applies between restarts, and why does Kubernetes do this instead of restarting immediately in a tight loop forever?"
      },
      {
        num: "19.2",
        marks: 4,
        text: "Create a Kubernetes ConfigMap named api-config that stores DATABASE_URL, DB_PORT, and APP_NAME. Then rewrite the Deployment YAML to inject these values as environment variables in the container using envFrom. Show both the ConfigMap and the updated Deployment YAML."
      },
      {
        num: "19.3",
        marks: 3,
        text: "The database password must also be injected but cannot go in a ConfigMap. Explain why ConfigMaps are unsuitable for secrets. Show how to create a Kubernetes Secret for the DB password and how to reference it in the Deployment YAML alongside the ConfigMap values."
      }
    ]
  },
  {
    id: "Q20",
    topic: "Kubernetes — Ingress & Multi-Service Routing",
    marks: 10,
    scenario: "The One Public Entry Point",
    context: `A team runs three microservices on minikube: a frontend (React), an API (Node.js), and an admin panel. Each currently has its own NodePort Service on a different port. The team wants a single entry point on port 80 that routes traffic to each service by URL path — without exposing multiple ports.`,
    code: [
      {
        label: "Current setup (three separate NodePort services)",
        lang: "bash",
        content: `$ kubectl get services
NAME            TYPE        CLUSTER-IP     PORT(S)          
frontend-svc    NodePort    10.96.10.1     80:30080/TCP     
api-svc         NodePort    10.96.10.2     4000:30400/TCP   
admin-svc       NodePort    10.96.10.3     3001:30300/TCP`
      },
      {
        label: "Desired routing behaviour",
        lang: "text",
        content: `http://myapp.local/           → frontend-svc:80
http://myapp.local/api/      → api-svc:4000
http://myapp.local/admin/    → admin-svc:3001`
      },
      {
        label: "Ingress YAML (incomplete — student must complete)",
        lang: "yaml",
        content: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: myapp.local
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: ________
            port:
              number: ________
      # student must add /admin and / routes`
      }
    ],
    problems: [
      'Three separate NodePort services expose three different ports — messy, not production-like, and hard to manage with TLS',
      'The Ingress YAML is incomplete — routing for /admin and / paths is missing'
    ],
    questions: [
      {
        num: "20.1",
        marks: 4,
        text: "Explain what a Kubernetes Ingress is and what problem it solves compared to using multiple NodePort or LoadBalancer Services. What is an Ingress Controller and why must it be installed separately (it is not built into Kubernetes by default)? Name the Ingress Controller the team would enable on minikube."
      },
      {
        num: "20.2",
        marks: 4,
        text: "Complete the Ingress YAML to route all three paths correctly. Include: /api → api-svc:4000, /admin → admin-svc:3001, and / (catch-all) → frontend-svc:80. Show the full completed YAML. Explain the difference between pathType: Prefix and pathType: Exact and which one is correct for each route here."
      },
      {
        num: "20.3",
        marks: 2,
        text: "After applying the Ingress, the team adds the host myapp.local to their /etc/hosts file pointing to the minikube IP. Explain why this step is necessary and write the exact /etc/hosts entry required. What kubectl command retrieves the minikube IP needed for this entry?"
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
          <div style={{ fontWeight: 500, fontSize: 15, color: "var(--color-text-primary)" }}>{q.scenario}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{q.topic} · {q.marks} marks</div>
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

  const topics = [
    { id: "Q11", label: "Linux Permissions & SSH", section: "pre" },
    { id: "Q12", label: "GitHub Actions Artifacts", section: "pre" },
    { id: "Q13", label: "Docker Multi-Stage Builds", section: "post" },
    { id: "Q14", label: "Docker Compose & .env Files", section: "post" },
    { id: "Q15", label: "AWS EC2 Networking", section: "post" },
    { id: "Q16", label: "ECS Health Checks", section: "post" },
    { id: "Q17", label: "Terraform Variables", section: "post" },
    { id: "Q18", label: "Terraform Remote State & Locking", section: "post" },
    { id: "Q19", label: "Kubernetes CrashLoopBackOff & ConfigMaps", section: "post" },
    { id: "Q20", label: "Kubernetes Ingress", section: "post" },
  ];

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px 40px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Practice Paper — Set 2 · DevOps End-Sem</div>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>10 New Scenario-Based Questions</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>Q11–Q20 · Fresh scenarios, same exam format · Each question 10 marks</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 20 }}>
        {topics.map(t => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: t.section === "pre" ? "#EEEDFE" : "#E1F5EE", color: t.section === "pre" ? "#7F77DD" : "#1D9E75", fontSize: 11, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{t.id.replace("Q","")}</span>
            <span style={{ fontSize: 12.5, color: "var(--color-text-primary)" }}>{t.label}</span>
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
            Q11–Q12 · Topics 1–6 · Linux, Bash, GitHub Actions · Attempt both
          </div>
          {PRE_MID.map((q, i) => <QuestionCard key={q.id} q={q} index={i} sectionColor="purple" />)}
        </div>
      )}

      {activeSection === "post" && (
        <div>
          <div style={{ background: "#E1F5EE", border: "0.5px solid #5DCAA5", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#085041" }}>
            Q13–Q20 · Topics 7–12 · Docker, AWS ECS, Terraform, Kubernetes · 8 questions — attempt 5
          </div>
          {POST_MID.map((q, i) => <QuestionCard key={q.id} q={q} index={i} sectionColor="teal" />)}
        </div>
      )}

      <div style={{ marginTop: 28, padding: "16px 18px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>What's new in Set 2 vs Set 1</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            ["Linux chmod numeric notation", "chmod 400/700 breakdown, ls -l decoding"],
            ["GitHub Actions artifacts", "upload-artifact / download-artifact lifecycle"],
            ["Docker multi-stage builds", "golang:1.22 → scratch, COPY --from"],
            ["Docker Compose .env files", ".env, .env.example, gitignore pattern"],
            ["AWS EC2 networking", "127.0.0.1 vs 0.0.0.0, Security Group firewall"],
            ["ECS health checks", "startPeriod, minimumHealthyPercent, rolling deploy"],
            ["Terraform variables", "sensitive=true, tfvars, .gitignore pattern"],
            ["Terraform state locking", "DynamoDB locking, terraform import, S3 versioning"],
            ["Kubernetes CrashLoopBackOff", "exponential backoff, ConfigMaps, Secrets"],
            ["Kubernetes Ingress", "Ingress Controller, path routing, /etc/hosts"],
          ].map(([title, detail], i) => (
            <div key={i} style={{ padding: "8px 10px", background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)" }}>{detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
