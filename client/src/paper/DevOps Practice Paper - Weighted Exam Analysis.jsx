"use client";

import { useState } from "react";

const PRE_MID = [
  {
    id: "Q1",
    topic: "Linux & Bash Automation",
    marks: 10,
    scenario: "The Broken Deploy Script",
    context: `Priya writes a deployment script deploy.sh to automate Node.js app setup on an Ubuntu server. She runs it with bash deploy.sh but gets unexpected errors.`,
    code: [
      {
        label: "deploy.sh",
        lang: "bash",
        content: `#!/bin/bash
APP_DIR = "/var/www/myapp"
LOG_FILE = "/var/log/deploy.log"

echo "Starting deployment to $APP_DIR..."
cd $APP_DIR
git pull origin main
npm install
pm2 restart app
echo "Done at $(date)" >> $LOG_FILE`
      }
    ],
    problems: [
      'Terminal prints: APP_DIR: command not found',
      'If git pull fails, npm install and pm2 restart still execute, corrupting state'
    ],
    questions: [
      {
        num: "1.1",
        marks: 3,
        text: "Identify the syntax error in the variable declarations and state the exact Bash rule it violates."
      },
      {
        num: "1.2",
        marks: 3,
        text: "Explain what set -e does and how adding it at the top of the script prevents Problem 2. Also explain the 'Check-Before-Act' idempotency pattern — how would you verify APP_DIR exists before cd-ing into it?"
      },
      {
        num: "1.3",
        marks: 4,
        text: "Write the fully corrected and improved version of deploy.sh that fixes both problems and includes an idempotency check for APP_DIR."
      }
    ]
  },
  {
    id: "Q2",
    topic: "GitHub Actions / CI Debugging",
    marks: 10,
    scenario: "The Test That Never Blocked",
    context: `A team's frontend CI pipeline has three jobs: lint, test, and deploy. On every push to main, the deploy job runs even when tests are failing. Additionally, AWS credentials are visible in plain YAML.`,
    code: [
      {
        label: "frontend-ci.yml",
        lang: "yaml",
        content: `name: Frontend CI
on:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test

  deploy:
    runs-on: ubuntu-latest
    needs: [lint]
    steps:
      - uses: actions/checkout@v4
      - run: npm run build
      - name: Deploy to S3
        run: aws s3 sync dist/ s3://my-frontend-bucket
        env:
          AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE
          AWS_SECRET_ACCESS_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
      }
    ],
    problems: [
      'deploy runs and pushes broken code to S3 even when the test job fails',
      'AWS credentials are visible in plain YAML and will be exposed when pushed to GitHub'
    ],
    questions: [
      {
        num: "2.1",
        marks: 3,
        text: "Why does deploy run even when the test job fails? Identify the exact YAML line causing this and state the correct fix."
      },
      {
        num: "2.2",
        marks: 3,
        text: "Explain the security risk of hardcoding AWS credentials in YAML. What happens the moment this file is pushed to a public (or even private) GitHub repository? Name the GitHub Actions feature that solves this."
      },
      {
        num: "2.3",
        marks: 4,
        text: "Rewrite only the deploy job — fixing both the dependency problem and the credentials problem. Show exactly how secrets are stored in GitHub and how they are referenced in the YAML step."
      }
    ]
  }
];

const POST_MID = [
  {
    id: "Q3",
    topic: "Docker — Dockerfile & Layer Caching",
    marks: 10,
    scenario: "The Flask App That Rebuilds Forever",
    context: `Leela is containerizing a Flask application. Her project structure includes a large static/ folder and a .git/ directory. Every time she edits app.py, the pip install step runs from scratch — wasting several minutes.`,
    code: [
      {
        label: "Project structure",
        lang: "text",
        content: `flask-app/
├── Dockerfile
├── requirements.txt     (30 libraries)
├── app.py
├── static/              (~60 MB images)
├── .git/                (~90 MB)
└── tests/`
      },
      {
        label: "Dockerfile",
        lang: "dockerfile",
        content: `FROM python:3.11-slim

WORKDIR /app

COPY . .

RUN pip install -r requirements.txt

EXPOSE 5000

CMD ["python", "app.py"]`
      }
    ],
    problems: [
      'Docker prints: Sending build context to Docker daemon 155.3MB — build takes minutes before starting',
      'Every time app.py is edited, pip install runs again from scratch even though requirements.txt did not change'
    ],
    questions: [
      {
        num: "3.1",
        marks: 4,
        text: "Explain Docker's layer caching mechanism. Why does a single change to app.py invalidate the pip install layer with the current Dockerfile ordering? Trace through the layers step by step."
      },
      {
        num: "3.2",
        marks: 2,
        text: "Write a .dockerignore file that eliminates the bloated build context. Identify which two directories are causing the 155 MB and explain why each one should be excluded."
      },
      {
        num: "3.3",
        marks: 4,
        text: "Rewrite the Dockerfile so pip install is only re-executed when requirements.txt changes, not when app.py changes. Explain the instruction ordering principle that makes this work."
      }
    ]
  },
  {
    id: "Q4",
    topic: "Docker — Volumes & Data Persistence",
    marks: 10,
    scenario: "The Vanishing Patient Records",
    context: `A clinic runs a PostgreSQL database in Docker. After upgrading the image version, all patient records disappear. The team is shocked — the old image is still on disk.`,
    code: [
      {
        label: "Original deployment (postgres:15)",
        lang: "bash",
        content: `docker run -d \\
  --name clinic-db \\
  -e POSTGRES_PASSWORD=secret \\
  -p 5432:5432 \\
  postgres:15`
      },
      {
        label: "Upgrade command (postgres:16)",
        lang: "bash",
        content: `docker stop clinic-db
docker rm clinic-db

docker run -d \\
  --name clinic-db \\
  -e POSTGRES_PASSWORD=secret \\
  -p 5432:5432 \\
  postgres:16`
      }
    ],
    problems: [
      'All patient records are gone after docker rm + recreate, even though the image is still on disk',
      'The team wants to move to AWS ECS Fargate next quarter — the same fix may not apply'
    ],
    questions: [
      {
        num: "4.1",
        marks: 4,
        text: "Explain precisely where PostgreSQL stored the data in the v1 (postgres:15) container and why docker rm deleted it. Use the terms image, container, writable layer, and filesystem correctly in your answer."
      },
      {
        num: "4.2",
        marks: 3,
        text: "Write the corrected docker run command for postgres:16 that preserves all records across container replacement. Explain where the data physically lives after your fix, and why it survives docker rm."
      },
      {
        num: "4.3",
        marks: 3,
        text: "The clinic's CTO says the stack will move to AWS ECS Fargate next quarter. Explain precisely why the Docker volume fix from 4.2 will stop working on Fargate and name the AWS service that solves the same problem in that environment."
      }
    ]
  },
  {
    id: "Q5",
    topic: "Docker Compose — Multi-Container",
    marks: 10,
    scenario: "The API That Races the Database",
    context: `A startup builds a web app with three services. Two issues appear on every fresh docker compose up.`,
    code: [
      {
        label: "compose.yaml",
        lang: "yaml",
        content: `services:
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://admin:pass@db:5432/shopdb

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: shopdb`
      }
    ],
    problems: [
      '(a) On first docker compose up, the api container exits with ECONNREFUSED. Restarting it manually a few seconds later works fine.',
      '(b) After docker compose down && docker compose up, all seed/test data in the database is wiped clean.'
    ],
    questions: [
      {
        num: "5.1",
        marks: 3,
        text: "There is no explicit networks: block in the compose file, yet the api container can resolve the hostname db. Explain in 2–3 sentences how Docker Compose makes this work automatically."
      },
      {
        num: "5.2",
        marks: 4,
        text: "Diagnose precisely why issue (a) happens on the first run. Modify only the api service in the compose file to fix it without writing retry logic in the application code. Show the changed snippet and explain what the fix actually does."
      },
      {
        num: "5.3",
        marks: 3,
        text: "Fix issue (b) by modifying the db service so seed data survives docker compose down. Show the complete modified db service snippet and explain where data is stored after your change."
      }
    ]
  },
  {
    id: "Q6",
    topic: "AWS ECS & ECR — Deployment",
    marks: 10,
    scenario: "The Deployment That Changed Nothing",
    context: `A team's CI pipeline builds, tags, and pushes a Node.js image to ECR with the latest tag on every merge to main. It then forces a new ECS deployment. ECS reports success — but users still see old behavior and logs confirm the old code is running.`,
    code: [
      {
        label: "CI deployment steps",
        lang: "bash",
        content: `# Step 1 — Build and push to ECR
docker build -t myapp:latest .
docker tag myapp:latest \\
  123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
docker push \\
  123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest

# Step 2 — Force ECS redeployment
aws ecs update-service \\
  --cluster prod \\
  --service api-service \\
  --force-new-deployment`
      },
      {
        label: "ECS Task Definition (relevant excerpt)",
        lang: "json",
        content: `{
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest",
      "environment": [
        { "name": "AWS_ACCESS_KEY_ID", "value": "AKIA..." },
        { "name": "AWS_SECRET_ACCESS_KEY", "value": "abc123..." }
      ]
    }
  ]
}`
      }
    ],
    problems: [
      'ECS reports a successful deployment but running tasks still execute old code',
      'AWS credentials are baked into the task definition as plaintext environment variables'
    ],
    questions: [
      {
        num: "6.1",
        marks: 4,
        text: "Explain the root cause of the stale deployment. Reference exactly how ECS resolves an image reference and why using the latest tag causes this specific failure — even when the image in ECR has already been overwritten."
      },
      {
        num: "6.2",
        marks: 4,
        text: "Design a deployment pipeline that eliminates this problem. Be specific about: (a) how images should be tagged, (b) how the ECS Task Definition must be updated, and (c) what command(s) correctly roll out the new version."
      },
      {
        num: "6.3",
        marks: 2,
        text: "The task definition passes AWS credentials via environment variables for S3 access. Name the AWS-native replacement and state one concrete security benefit of switching to it."
      }
    ]
  },
  {
    id: "Q7",
    topic: "Terraform — State & Remote Backend",
    marks: 10,
    scenario: "Two Brains, One Database",
    context: `Two engineers, Arjun and Sneha, both manage the same AWS account with Terraform. Each stores terraform.tfstate locally on their laptop. Two incidents happen in the same week.`,
    code: [
      {
        label: "main.tf",
        lang: "hcl",
        content: `provider "aws" {
  region = "ap-south-1"
}

resource "aws_db_instance" "main" {
  identifier        = "prod-database"
  engine            = "mysql"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  username          = "admin"
  password          = "password123"
  skip_final_snapshot = true
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
}`
      }
    ],
    problems: [
      'Incident (i): Arjun applies on Tuesday — RDS is created. Sneha applies 10 minutes later from her laptop (old state). Terraform tries to create "prod-database" again → naming conflict. Now their state files diverge — one has the DB, the other does not.',
      'Incident (ii): On Monday, Sneha notices the web EC2 instance type was changed via the AWS Console (t2.micro → t3.small during an outage). She runs terraform plan and sees Terraform wants to revert the change.'
    ],
    questions: [
      {
        num: "7.1",
        marks: 5,
        text: "Explain precisely why local state caused the conflict in Incident (i). What is the Terraform state file and what does it track? What single architectural change prevents this — and show the complete Terraform configuration block required to implement it."
      },
      {
        num: "7.2",
        marks: 3,
        text: "Explain in one clear paragraph why Terraform's behavior in Incident (ii) is correct and expected — not a bug. Use the phrase 'source of truth' in your answer."
      },
      {
        num: "7.3",
        marks: 2,
        text: "Sneha decides the console change was correct and wants to keep t3.small without Terraform reverting it. Describe the cleanest one-step fix and show the relevant HCL change."
      }
    ]
  },
  {
    id: "Q8",
    topic: "Terraform — IaC Concepts & Dependency Graph",
    marks: 10,
    scenario: "The Snowflake Dev Cluster",
    context: `A fintech startup has three environments (dev, staging, prod) each manually configured by different engineers over six months via the AWS Console, SSH, and ad-hoc config edits. A critical security patch must be applied across all three environments.`,
    code: [
      {
        label: "Patch results",
        lang: "text",
        content: `Dev     → Patch succeeds ✓
Staging → Crashes (older library version, undocumented)
Prod    → Breaks (custom Nginx config overwritten)`
      },
      {
        label: "New Terraform configuration (excerpt)",
        lang: "hcl",
        content: `resource "aws_security_group" "web_sg" {
  name        = "web-sg"
  description = "Allow HTTPS traffic"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "web" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.web_sg.id]

  tags = {
    Name = "WebServer"
  }
}`
      }
    ],
    problems: [
      'Each environment has diverged in ways nobody documented — the "snowflake server" problem',
      'A new engineer wonders if the Terraform config needs an explicit depends_on to create the security group before the EC2 instance'
    ],
    questions: [
      {
        num: "8.1",
        marks: 3,
        text: "Identify the DevOps anti-pattern illustrated in this scenario. Explain precisely why manual infrastructure management causes environments to drift apart over time, and what term describes servers that have been uniquely customised this way."
      },
      {
        num: "8.2",
        marks: 4,
        text: "Compare Imperative infrastructure vs Declarative infrastructure approaches with a concrete example of each. Which model does Terraform use? Explain how Terraform's model prevents configuration drift — specifically, what happens when Terraform plan detects a difference between desired and actual state."
      },
      {
        num: "8.3",
        marks: 3,
        text: "The aws_instance block references aws_security_group.web_sg.id, but no explicit depends_on is written anywhere. Will Terraform still create the security group before the EC2 instance? Explain exactly how Terraform builds its dependency graph and determines creation order automatically."
      }
    ]
  },
  {
    id: "Q9",
    topic: "Kubernetes — Pods & Deployments",
    marks: 10,
    scenario: "The Self-Healing Payment Service",
    context: `A developer applies the following Deployment to a minikube cluster and then interacts with it in various ways.`,
    code: [
      {
        label: "payment-deployment.yaml",
        lang: "yaml",
        content: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 4
  selector:
    matchLabels:
      app: payment
  template:
    metadata:
      labels:
        app: payment
    spec:
      containers:
      - name: payment
        image: payment-service:v2
        ports:
        - containerPort: 8080`
      }
    ],
    problems: [
      'The developer deletes one pod manually and wants to understand exactly what restores it',
      'The developer edits the Deployment image from v2 to v3 and wants to know what happens to the ReplicaSets'
    ],
    questions: [
      {
        num: "9.1",
        marks: 4,
        text: "The developer runs: kubectl delete pod payment-service-7d9f8b-xyz99. Within seconds, kubectl get pods shows four pods again — one with a new name suffix. Walk through exactly what happened, from the delete command to the new pod appearing. Your answer must mention the Deployment, the ReplicaSet, and the concept of desired-vs-actual state."
      },
      {
        num: "9.2",
        marks: 3,
        text: "The developer updates the image to payment-service:v3. Predict what kubectl get replicasets will show during and after the rollout — including how many ReplicaSets exist and what their DESIRED/CURRENT/READY counts are at each stage. Explain the rolling update strategy Kubernetes uses by default."
      },
      {
        num: "9.3",
        marks: 3,
        text: "Explain the architectural difference between a standalone Pod and a Deployment. Give two specific reasons why you would never run a production workload as a bare Pod."
      }
    ]
  },
  {
    id: "Q10",
    topic: "Kubernetes — Services & Networking",
    marks: 10,
    scenario: "The Unreachable Backend",
    context: `A team runs a two-tier app on minikube. The frontend tries to reach the backend via http://backend-svc:4000/api/data but always gets connection refused. Everything appears to be running.`,
    code: [
      {
        label: "backend-service.yaml (broken)",
        lang: "yaml",
        content: `apiVersion: v1
kind: Service
metadata:
  name: backend-svc
spec:
  type: ClusterIP
  selector:
    app: backend-api      # ← note label here
  ports:
  - port: 4000
    targetPort: 4000`
      },
      {
        label: "Backend Deployment labels (excerpt)",
        lang: "yaml",
        content: `template:
  metadata:
    labels:
      app: backend          # ← note label here`
      },
      {
        label: "Frontend Service (for minikube access from laptop)",
        lang: "yaml",
        content: `apiVersion: v1
kind: Service
metadata:
  name: frontend-svc
spec:
  type: ________            # student must fill this
  selector:
    app: frontend
  ports:
  - port: 3000
    targetPort: 3000`
      }
    ],
    problems: [
      'Frontend cannot reach backend — connection refused despite both pods being Running',
      'Developer cannot reach the frontend from their laptop browser on minikube'
    ],
    questions: [
      {
        num: "10.1",
        marks: 4,
        text: "Identify the exact bug causing connection refused. Explain in detail how Kubernetes Services use label selectors to route traffic to pods — and what happens when the selector does not match any pod labels."
      },
      {
        num: "10.2",
        marks: 3,
        text: "Write the corrected backend-service.yaml. Then explain: the backend Deployment has 3 replicas. How does the Service distribute requests across all three pods — what mechanism handles this, and is any additional configuration required?"
      },
      {
        num: "10.3",
        marks: 3,
        text: "The team wants to access the frontend from their laptop browser while running minikube locally. Describe all three Service types — ClusterIP, NodePort, and LoadBalancer — and explain which one is appropriate for minikube local access. Why are the other two unsuitable in a minikube environment?"
      }
    ]
  }
];

function CodeBlock({ content, label, lang }) {
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
  return (
    <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", marginBottom: 14, overflow: "hidden", background: "var(--color-background-primary)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}
      >
        <span style={{ width: 34, height: 34, borderRadius: "50%", background: sectionColor === "teal" ? "#E1F5EE" : "#EEEDFE", color: dotColor, fontWeight: 500, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{q.id}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 15, color: "var(--color-text-primary)" }}>{q.scenario}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{q.topic} · {q.marks} marks</div>
        </div>
        <span style={{ fontSize: 18, color: "var(--color-text-secondary)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>›</span>
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

  const totalPre = PRE_MID.reduce((s, q) => s + q.marks, 0);
  const totalPost = POST_MID.reduce((s, q) => s + q.marks, 0);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px 40px" }}>
      <h2 style={{ sr: true }} className="sr-only">DevOps Practice Question Paper</h2>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Practice Paper · DevOps End-Sem</div>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>DevOps Scenario-Based Questions</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>10 scenario questions · All sub-questions are 2–4 marks · Each question is 10 marks</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Pre-mid section", value: "2 questions", sub: "20% weightage" },
          { label: "Post-mid section", value: "8 questions", sub: "80% weightage" },
          { label: "Topics covered", value: "1–12", sub: "All syllabus topics" },
          { label: "Marks per question", value: "10", sub: "Sub-questions: 2–5" }
        ].map((c, i) => (
          <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { id: "pre", label: "Section A — Pre-mid (20%)", count: PRE_MID.length, color: "purple" },
          { id: "post", label: "Section B — Post-mid (80%)", count: POST_MID.length, color: "teal" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            style={{
              padding: "8px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid",
              borderColor: activeSection === tab.id ? (tab.color === "teal" ? "#1D9E75" : "#7F77DD") : "var(--color-border-secondary)",
              background: activeSection === tab.id ? (tab.color === "teal" ? "#E1F5EE" : "#EEEDFE") : "transparent",
              color: activeSection === tab.id ? (tab.color === "teal" ? "#085041" : "#3C3489") : "var(--color-text-secondary)",
              fontWeight: activeSection === tab.id ? 500 : 400,
              fontSize: 13, cursor: "pointer"
            }}
          >
            {tab.label} <span style={{ opacity: 0.7, marginLeft: 4 }}>({tab.count}Q)</span>
          </button>
        ))}
      </div>

      {activeSection === "pre" && (
        <div>
          <div style={{ background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#3C3489" }}>
            Topics 1–6 · Linux, Bash, GitHub Actions, AWS basics · Attempt both questions
          </div>
          {PRE_MID.map((q, i) => <QuestionCard key={q.id} q={q} index={i} sectionColor="purple" />)}
        </div>
      )}

      {activeSection === "post" && (
        <div>
          <div style={{ background: "#E1F5EE", border: "0.5px solid #5DCAA5", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#085041" }}>
            Topics 7–12 · Docker I &amp; II, AWS ECS, Terraform, Kubernetes · 8 questions — attempt 5 (as per your exam format)
          </div>
          {POST_MID.map((q, i) => <QuestionCard key={q.id} q={q} index={i} sectionColor="teal" />)}
        </div>
      )}

      <div style={{ marginTop: 28, padding: "14px 18px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Weightage breakdown</div>
        <div style={{ display: "flex", gap: 0, height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ width: "20%", background: "#7F77DD" }} title="Pre-mid 20%" />
          <div style={{ width: "80%", background: "#1D9E75" }} title="Post-mid 80%" />
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--color-text-secondary)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#7F77DD", display: "inline-block" }} /> Pre-mid (Topics 1–6) — 20%</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#1D9E75", display: "inline-block" }} /> Post-mid (Topics 7–12) — 80%</span>
        </div>
      </div>
    </div>
  );
}
