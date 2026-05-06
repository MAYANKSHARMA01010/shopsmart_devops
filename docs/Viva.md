# DevOps Viva Cheat Sheet

A simple, beginner-friendly guide for: **VPC, EC2, Docker, Docker Hub, Docker Compose, ECR, ECS, EKS**, and how deployment differs across **EKS vs ECS vs Vercel vs Render**, plus **Load Balancers**.

Every section starts with a one-line "what is it?" answer in plain English, then goes deeper.

---

## Table of Contents
1. [VPC](#1-vpc-virtual-private-cloud)
2. [EC2](#2-ec2-elastic-compute-cloud)
3. [Docker](#3-docker)
4. [Docker Hub](#4-docker-hub)
5. [Docker Compose](#5-docker-compose)
6. [ECR](#6-ecr-elastic-container-registry)
7. [ECS](#7-ecs-elastic-container-service)
8. [EKS](#8-eks-elastic-kubernetes-service)
9. [Load Balancers](#9-load-balancers)
10. [Vercel](#10-vercel)
11. [Render](#11-render)
12. [ECS vs EKS vs Vercel vs Render — Comparison](#12-ecs-vs-eks-vs-vercel-vs-render--comparison)
13. [Quick Q&A (likely viva questions)](#13-quick-qa-likely-viva-questions)

---

## 1. VPC (Virtual Private Cloud)

**Plain English:** Your own private network inside AWS. Like your home Wi-Fi, but in the cloud — only the things you put inside it can talk to each other (unless you allow outside traffic).

### Why does it exist?
AWS has millions of customers running servers on shared hardware. A VPC keeps **your** servers, databases, and load balancers in a network that **only you** control. No one else can see inside.

### Things that live inside a VPC
| Thing | What it does |
|-------|--------------|
| **Subnet** | A slice of the VPC. Like rooms inside a house. Each subnet lives in one Availability Zone. |
| **Public subnet** | A subnet that can reach the internet (used for load balancers, web servers). |
| **Private subnet** | A subnet that **cannot** be reached from the internet (used for databases, internal services). |
| **Internet Gateway (IGW)** | The door that connects your VPC to the public internet. |
| **NAT Gateway** | Lets private subnets *go out* to the internet (e.g., to download updates) but blocks anyone from coming in. |
| **Route Table** | Rules that say "traffic going to X should go through Y" — controls how packets move around. |
| **Security Group** | A firewall attached to a server. Says "allow port 80 from anywhere, port 22 only from my IP." |

### Mental picture
```
                        Internet
                            │
                    Internet Gateway
                            │
   ┌────────────────────────┴────────────────────────┐
   │                       VPC                        │
   │                                                  │
   │   ┌─────── Public Subnet ───────┐                │
   │   │   Load Balancer  Web Server │                │
   │   └──────────────────────────────┘                │
   │                                                  │
   │   ┌─────── Private Subnet ──────┐                │
   │   │   Database     Internal API │                │
   │   └──────────────────────────────┘                │
   └──────────────────────────────────────────────────┘
```

### Why this matters for the viva
- Every EC2 instance, ECS task, and EKS pod **lives inside a VPC**.
- Without a VPC, you can't deploy anything on AWS.
- The default VPC AWS creates for you is fine for learning; production setups often build a custom one.

---

## 2. EC2 (Elastic Compute Cloud)

**Plain English:** A virtual computer you rent from AWS. You pick the size, AWS gives you a Linux (or Windows) server you can SSH into and use however you want.

### Why "Elastic"?
You can resize, start, stop, or delete servers at any time. Need more power? Bigger instance. Don't need it tonight? Stop it and stop paying.

### Key pieces
| Term | What it means (plain English) |
|------|-------------------------------|
| **Instance** | One running EC2 server. |
| **Instance type** | The "size" of the server: `t2.micro` (tiny, free tier), `t3.medium` (small), `m5.large` (medium), etc. Bigger = more CPU/RAM = more $$. |
| **Key pair** | An SSH key. AWS gives you a `.pem` file; you use it to log into the server. |
| **Security Group** | The firewall (see VPC section). Decides which ports are open. |
| **Public IP** | A web-facing address. Without one, the server can't be reached from the internet. |
| **Elastic IP** | A public IP that doesn't change when you stop/start the server. |

### Pricing models (cheap → expensive)
| Model | When to use |
|-------|-------------|
| **Spot** | You're OK with the server being killed at 2-min notice. ~90% cheaper. Good for batch jobs. |
| **On-Demand** | Pay-by-the-second. No commitment. Default. |
| **Reserved / Savings Plans** | Commit for 1 or 3 years to save ~30-70%. |

### Lifecycle
`Launch → Running → Stop (paused, not billed for CPU) → Start (resumes) → Terminate (gone forever)`

### Typical use flow
1. Pick the OS (Ubuntu, Amazon Linux, etc.).
2. Pick the instance size.
3. Pick which VPC + subnet it goes in.
4. Open the right ports in the security group (22 for SSH, 80 for HTTP).
5. Download the SSH key.
6. SSH in. Install Docker / Node / whatever.

---

## 3. Docker

**Plain English:** Docker packs your app and everything it needs (libraries, runtime, OS bits) into a sealed box called a **container**. The box runs the same way on your laptop, your friend's laptop, and a server in the cloud.

### The "works on my machine" problem
Without Docker:
- App works on your laptop.
- You give it to a teammate. Their Node version is different. It breaks.
- You deploy to a server. Server is missing a library. It breaks.

With Docker:
- You build a container with everything bundled.
- It runs identically everywhere. End of problem.

### Container vs Virtual Machine (very common viva question)
| Container | Virtual Machine |
|-----------|-----------------|
| Shares the host computer's OS kernel | Runs its own full OS inside |
| Starts in **seconds** | Starts in **minutes** |
| **Megabytes** in size | **Gigabytes** in size |
| Many can run on one machine cheaply | Heavy — fewer per machine |

Think of containers as **apps in zip files** and VMs as **whole laptops**.

### Core concepts
| Term | Plain English |
|------|---------------|
| **Image** | The recipe + all ingredients for an app. Read-only. |
| **Container** | A running copy of an image. |
| **Dockerfile** | A text file with instructions to build an image. |
| **Registry** | A place to store images online (Docker Hub, ECR). |
| **Volume** | Storage that survives even if the container is deleted. |
| **Network** | A virtual network that lets containers talk to each other. |

### A simple Dockerfile (Node.js)
```dockerfile
FROM node:20-alpine            # Start with a small Linux + Node.js
WORKDIR /app                   # All commands run inside /app
COPY package*.json ./          # Copy package.json first (caching trick)
RUN npm install --omit=dev     # Install dependencies
COPY . .                       # Copy the rest of the source code
EXPOSE 3000                    # Note: this app listens on port 3000
CMD ["node", "server.js"]      # Command to start when container runs
```

### Commands you must know
```bash
docker build -t myapp:1.0 .          # Build an image from Dockerfile
docker images                         # See all images on your machine
docker run -d -p 3000:3000 myapp:1.0  # Run a container in background, map port
docker ps                             # See running containers
docker ps -a                          # See all containers (including stopped)
docker logs <id>                      # See what the container printed
docker exec -it <id> sh               # Open a shell inside the container
docker stop <id>                      # Stop a container nicely
docker rm <id>                        # Delete a stopped container
docker rmi <image>                    # Delete an image
docker system prune -a                # Clean up unused stuff
```

### Why Dockerfile order matters (caching)
Each line in a Dockerfile is a **layer**. Docker reuses layers if they haven't changed. That's why we copy `package.json` *before* the source — if your code changes but dependencies don't, Docker skips the slow `npm install` step.

---

## 4. Docker Hub

**Plain English:** Like GitHub, but for Docker images. The default place where everyone shares container images.

### Quick facts
- Website: `hub.docker.com`
- Public images are free and unlimited.
- Private images: 1 free, more cost money.
- It's where images like `node`, `nginx`, `postgres`, `mongo` actually live.

### How image names work
```
nginx                                     # short name → Docker Hub official
nginx:1.25                                 # specific version
mycompany/api:v2                          # someone's account on Docker Hub
ghcr.io/octocat/hello:v1                  # GitHub's registry
123456.dkr.ecr.us-east-1.amazonaws.com/api  # AWS ECR (private)
```

### Common commands
```bash
docker login                              # Log in to Docker Hub
docker tag myapp:1.0 username/myapp:1.0   # Rename image to your account
docker push username/myapp:1.0            # Upload it
docker pull nginx:latest                  # Download an image
```

### Other registries you should know exist
- **ECR** — AWS's private registry (covered below)
- **GHCR** — GitHub's container registry
- **Google / Azure** — each cloud has its own
- **Harbor** — you can run your own

---

## 5. Docker Compose

**Plain English:** A tool to start a bunch of containers together with one command. Defined in one YAML file.

### Why?
A real app usually has more than one part:
- A web server
- A database
- Maybe a Redis cache
- Maybe a background worker

Running each one with separate `docker run` commands is annoying and error-prone. Compose says "here are 4 services, run them all" — and starts them in the right order, on a shared network.

### Sample `docker-compose.yml`
```yaml
version: "3.9"
services:
  web:
    build: .
    ports:
      - "3000:3000"          # host:container
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/app
    depends_on:
      - db                   # start db before web

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    volumes:
      - dbdata:/var/lib/postgresql/data   # data survives restarts

volumes:
  dbdata:
```

### Things to notice
- `web` can talk to `db` just by saying `db` (Compose makes a hidden network where service names are hostnames).
- Volumes keep data even after `docker compose down`.

### Commands
```bash
docker compose up -d            # Start everything in background
docker compose down             # Stop and remove everything
docker compose down -v          # Also delete volumes (data!)
docker compose ps               # Status of services
docker compose logs -f web      # Tail logs of one service
docker compose exec web sh      # Shell into a running service
```

### Compose vs Production
Compose is great for **local development**. In real production, you usually use ECS, EKS, or another orchestrator.

---

## 6. ECR (Elastic Container Registry)

**Plain English:** AWS's version of Docker Hub. Private by default, owned by your AWS account.

### Why use ECR instead of Docker Hub?
- **Private**: Your images stay inside AWS. Other people can't see them.
- **No separate login**: ECR uses your AWS credentials. No extra password to manage.
- **Closer to your servers**: ECR images live in AWS, so pulling them into ECS/EKS is fast and free.
- **Auto-scanning**: It can scan your images for known security bugs.

### Image URL format
```
<account-id>.dkr.ecr.<region>.amazonaws.com/<repo>:<tag>
123456789.dkr.ecr.us-east-1.amazonaws.com/shopsmart:latest
```

### How to push an image
```bash
# 1. Log Docker into ECR (uses your AWS credentials)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# 2. Tag your local image with the ECR address
docker tag myapp:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest

# 3. Push it
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

### ECR Public vs Private
- **Private** (default): Only your AWS account can access it.
- **Public** (`gallery.ecr.aws`): For sharing with everyone, like Docker Hub.

---

## 7. ECS (Elastic Container Service)

**Plain English:** AWS's own way to run Docker containers in the cloud — without you needing to learn Kubernetes.

### Core terms (super important for viva)
| Term | What it is (plain English) |
|------|----------------------------|
| **Cluster** | A logical group where your containers live. |
| **Task Definition** | The blueprint: "use this image, give it 1 CPU, 2 GB RAM, open port 80, set this env var." |
| **Task** | One running copy of a task definition (one or more containers). |
| **Service** | The boss that says "I want 3 tasks running at all times. If one dies, start another." Also handles deployments and connects to the load balancer. |

### Two ways to run ECS
| Mode | Who manages the underlying servers? | When to choose |
|------|-------------------------------------|----------------|
| **EC2 launch type** | You. You provision EC2 servers, ECS schedules containers onto them. | You want full control or have spare EC2 capacity. |
| **Fargate launch type** | AWS. You only say "this task needs 1 CPU + 2 GB" and AWS finds a server. | You don't want to manage servers. **(ShopSmart uses this.)** |

### How ECS Fargate deployment works (simple flow)
```
1. You build a Docker image                   →  docker build
2. You push it to ECR                         →  docker push
3. ECS creates a task from your task def      →  uses the image
4. The task runs in a Fargate VPC subnet
5. The Application Load Balancer routes
   user traffic to the running tasks
6. ECS keeps "desired count" tasks alive
   (replaces dead ones automatically)
```

### Auto-scaling
ECS can add/remove tasks based on:
- CPU usage
- Memory usage
- Number of requests per minute
- Any custom CloudWatch metric

### Pros and cons
| Pros | Cons |
|------|------|
| Easy to learn | AWS-only (no easy way to move to another cloud) |
| No Kubernetes complexity | Less powerful than Kubernetes |
| Tightly integrated with AWS | |
| Fargate = no servers to manage | |

---

## 8. EKS (Elastic Kubernetes Service)

**Plain English:** AWS-managed Kubernetes. Same Kubernetes as anywhere else, but AWS runs the brain (the "control plane") for you.

### What is Kubernetes (K8s) in 30 seconds?
Kubernetes is the most popular open-source tool for running containers. It works on any cloud or on-prem. Big and powerful, but complex.

### What AWS handles vs what you handle
| AWS handles | You handle |
|-------------|------------|
| The Kubernetes brain (API server, etcd, scheduler) | The actual containers and configs |
| Brain availability across data centers | Your application code |
| Brain version upgrades | Your YAML files (Deployments, Services, etc.) |
| | The worker nodes (unless you use Fargate-on-EKS) |

### Core Kubernetes terms
| Term | Plain English |
|------|---------------|
| **Pod** | The smallest thing K8s runs. Usually one container, sometimes a few that need to live together. |
| **Deployment** | "I want N copies of this Pod running." Handles rolling updates. |
| **Service** | A stable network address for a group of Pods (since Pods come and go). |
| **Ingress** | HTTP routing rules: "send /api to this service, send /shop to that one." |
| **ConfigMap / Secret** | Configuration and passwords passed to Pods. |
| **Namespace** | A folder inside the cluster to keep things organized. |
| **kubectl** | The command-line tool to talk to your cluster. |
| **Helm** | Like a package manager for K8s. |

### Cost reality check
EKS charges **$0.10 per hour** just for the brain (about $73/month) — even before you run any containers. That's why for small apps, ECS Fargate is often cheaper.

### When EKS makes sense
- Your team already uses Kubernetes elsewhere.
- You want to avoid AWS lock-in (K8s runs anywhere).
- You need the K8s ecosystem (Helm, Argo CD, Istio, operators).
- Your workload is complex (stateful apps, batch jobs, advanced scheduling).

---

## 9. Load Balancers

**Plain English:** A traffic cop that takes incoming requests and spreads them across many backend servers. If one server dies, the cop stops sending traffic to it.

### Why we need them
- One server can't handle all traffic forever.
- One server can crash. With a load balancer, users don't notice — traffic goes to the others.
- Lets you do **rolling deployments**: launch new version, stop sending traffic to the old version, kill the old version.

### Three AWS load balancer types
| Type | Layer | Plain English | Use case |
|------|-------|---------------|----------|
| **ALB** (Application Load Balancer) | Layer 7 (HTTP) | Understands web stuff (URLs, paths, hostnames) | Web apps, REST APIs, anything HTTP/HTTPS. **Most common.** |
| **NLB** (Network Load Balancer) | Layer 4 (TCP/UDP) | Just shovels packets — super fast, doesn't read them | Gaming, real-time, non-HTTP protocols |
| **CLB** (Classic Load Balancer) | Old, mixed | The old original, deprecated | Don't use for new stuff |

### Key ALB pieces
| Term | Plain English |
|------|---------------|
| **Listener** | "Listen on port 443 for HTTPS." |
| **Target Group** | The list of backends to send traffic to (servers, ECS tasks, IPs). |
| **Rule** | "If URL starts with /api → send to target-group-api. Otherwise → target-group-web." |
| **Health Check** | The ALB pings each backend (e.g., GET /health every 30s). If it fails, that backend gets removed from rotation. |

### How traffic flows
```
User → DNS (Route 53) → Load Balancer → Target Group → Backend (ECS task / EC2 / Pod)
```

### Algorithms (how it picks which backend)
- **Round Robin**: Take turns, one after another.
- **Least Outstanding Requests**: Send to whichever backend is least busy.
- **Sticky Sessions**: Same user keeps getting the same backend (uses a cookie).

---

## 10. Vercel

**Plain English:** A super-easy hosting service that's especially good at frontend apps (React, Next.js). You connect your GitHub repo, and every push deploys automatically. No servers to set up.

### How it works
1. You connect your GitHub repo.
2. Vercel detects your framework (Next.js, React, Vue, etc.).
3. Every push → Vercel builds → deploys to a global edge network.
4. You get a URL. Done.

### What you DON'T have to do
- No Dockerfile.
- No server provisioning.
- No load balancer.
- No autoscaling config.
- No SSL setup.

### What Vercel is great for
- Frontend-heavy apps (Next.js especially).
- Marketing/landing pages.
- Static sites that need fast global delivery.

### Limits
- Long-running backend processes don't fit (functions have time limits).
- Not great for traditional always-on backend services.
- Can get pricey at scale.

---

## 11. Render

**Plain English:** A simple hosting platform that's like Heroku — for backend services, databases, workers, and full-stack apps. Connect your repo, push code, and it deploys.

### What Render supports
- Web services (Node, Python, Go, Ruby, …)
- Static sites
- Background workers
- Cron jobs
- Managed databases (PostgreSQL, Redis)
- Anything in a Dockerfile

### How it works
- Auto-deploy on git push.
- Free SSL/TLS.
- Custom domains.
- Configurable via a `render.yaml` file (this project has one).
- Can build from native runtimes OR a Dockerfile.

### Where Render fits
- Replacing Heroku.
- Small-to-medium full-stack apps.
- Teams that want simple hosting without learning AWS.

### Limits
- Free tier sleeps when idle (cold starts).
- Less flexibility than ECS/EKS.
- Fewer regions than AWS.

---

## 12. ECS vs EKS vs Vercel vs Render — Comparison

### The big table
| Dimension | **Vercel** | **Render** | **ECS (Fargate)** | **EKS** |
|-----------|------------|------------|-------------------|---------|
| What is it? | PaaS for frontends | Heroku-style PaaS | AWS container service | Managed Kubernetes |
| How much you manage | Almost nothing | Very little | Some (VPC, IAM, ALB) | Lots (K8s manifests + AWS) |
| What you write | Just code | Code + `render.yaml` or Dockerfile | Dockerfile + task def + service | Dockerfile + K8s YAML / Helm |
| Containers? | Hidden from you | Hidden from you | Yes (Docker) | Yes (Docker via K8s) |
| Lock-in | Vercel-specific | Render-specific | AWS lock-in | Portable (K8s runs anywhere) |
| Scaling | Automatic | Automatic | Auto-scaling rules | HPA + Cluster Autoscaler |
| Small-app cost | Free → low | Free → low | Low (per-second billing) | High ($73/mo brain + nodes) |
| Big-app cost | Expensive | Moderate | Efficient | Most efficient |
| Setup time | Minutes | Minutes | Hours | Days |
| Multi-cloud? | No | No | No | Yes |
| Best for | Next.js / static sites | Heroku-style apps | AWS shops, no-K8s | Multi-cloud or complex |

### One-line picks
- **Static site / Next.js?** → Vercel.
- **Small full-stack with database?** → Render.
- **Production AWS workload, don't want K8s?** → ECS Fargate.
- **Already use Kubernetes / need multi-cloud?** → EKS.

### Levels of "how much do I have to manage?"
```
Bare metal  →  EC2  →  Docker on EC2  →  ECS  →  EKS  →  Render  →  Vercel
   ↑                                                                   ↑
You manage everything                                You manage almost nothing
```
**Going right** = less control + less work for you.
**Going left** = more control + more work.

---

## 13. Quick Q&A (likely viva questions)

**Q: What's the difference between a container and a virtual machine?**
A virtual machine includes a full operating system — heavy, slow to start. A container shares the host's OS kernel and only packages the app + its libraries — light, starts in seconds.

**Q: What's the difference between a Docker image and a container?**
An image is the blueprint (read-only). A container is a running copy of an image.

**Q: Why use Docker?**
It guarantees your app runs the same on every machine — your laptop, a teammate's laptop, the production server. No more "works on my machine" problems.

**Q: What's a Dockerfile?**
A text file with step-by-step instructions to build a Docker image — like a recipe.

**Q: Difference between `CMD` and `ENTRYPOINT` in a Dockerfile?**
`ENTRYPOINT` is the command that always runs. `CMD` provides the default arguments to it. You can override `CMD` from `docker run`, but `ENTRYPOINT` stays.

**Q: Difference between `EXPOSE` and `-p` in Docker?**
`EXPOSE` is just a note in the Dockerfile saying "this container uses port X." It does NOT actually open the port. `-p host:container` (used with `docker run`) actually maps the port to the host.

**Q: What's a Docker volume?**
A way to keep data alive even after the container is deleted. Without a volume, data inside a container is lost when the container goes away.

**Q: What does `docker compose` do?**
Lets you define and run multi-container apps using one YAML file. One command (`docker compose up`) starts everything.

**Q: How is ECR different from Docker Hub?**
ECR is private by default, owned by your AWS account, and uses AWS credentials (no separate login). Docker Hub is public-by-default and the global default registry.

**Q: Difference between ECS and EKS?**
Both run containers on AWS. ECS is AWS's own simpler system (no Kubernetes). EKS is managed Kubernetes — more powerful and portable but more complex and more expensive.

**Q: What is Fargate?**
A way to run containers without managing the underlying servers. You only specify CPU and memory; AWS handles everything else. Available for both ECS and EKS.

**Q: What is a task definition in ECS?**
A JSON blueprint describing the Docker image, CPU, memory, environment variables, ports, and IAM role. A "task" is a running copy of a task definition.

**Q: What is an ECS service?**
A controller that keeps a desired number of tasks running, replaces unhealthy ones, and works with the load balancer for zero-downtime deployments.

**Q: What is a Pod in Kubernetes?**
The smallest deployable thing in K8s. Usually one container, sometimes a few that share network and storage and must live together.

**Q: What is `kubectl`?**
The command-line tool you use to send commands to a Kubernetes cluster.

**Q: What does a load balancer do?**
Distributes incoming traffic across multiple backend servers, checks their health, and removes broken ones from rotation.

**Q: ALB vs NLB?**
ALB works at Layer 7 — understands HTTP, can route by URL or hostname. NLB works at Layer 4 — just forwards TCP/UDP packets, very fast, used for non-HTTP traffic.

**Q: What is a Security Group?**
A firewall that lives on AWS resources (EC2, ALB, ECS tasks). Controls which ports can be reached and from where.

**Q: What is a VPC?**
A private virtual network inside AWS. Every AWS resource (EC2, ECS task, ALB, RDS) lives inside one. It isolates your stuff from other AWS customers.

**Q: Public subnet vs private subnet?**
Public subnets have a route to the internet (used for load balancers and web servers). Private subnets do not (used for databases and internal services).

**Q: Why would you choose Vercel over ECS?**
For frontend or Next.js apps, Vercel is way simpler — just push code. ECS is overkill for that and requires a lot of setup.

**Q: Why Render over Vercel?**
Render handles long-running backend services, databases, and workers natively. Vercel is optimized for frontends and serverless functions, not always-on backends.

**Q: What does this project (`shopsmart`) use?**
AWS **ECS Fargate** (containers), images stored in **ECR**, traffic handled by an **Application Load Balancer**, all deployed by a GitHub Actions CI/CD pipeline. The repo also has a `render.yaml` for Render deploys and a `docker-compose.yml` for local development.

---

## Recap (one-liners)
| Term | Expansion | One-line |
|------|-----------|----------|
| VPC | Virtual Private Cloud | Your private network in AWS |
| EC2 | Elastic Compute Cloud | Rent-a-server in AWS |
| ECR | Elastic Container Registry | AWS's private Docker Hub |
| ECS | Elastic Container Service | AWS container runner (no K8s) |
| EKS | Elastic Kubernetes Service | Managed Kubernetes on AWS |
| ALB | Application Load Balancer | HTTP traffic cop (Layer 7) |
| NLB | Network Load Balancer | TCP/UDP traffic cop (Layer 4) |
| IAM | Identity & Access Management | AWS permissions system |
| Docker | — | Tool that packs apps into portable containers |
| Docker Hub | — | Public registry to share Docker images (like GitHub for images) |
| Docker Compose | — | Run multiple containers together with one YAML file |
| SaaS | Software-as-a-Service | Ready-to-use apps over the internet (Gmail, Notion, Figma) |
| PaaS | Platform-as-a-Service | Push code, the platform runs it (Vercel, Render, Heroku) |
| IaaS | Infrastructure-as-a-Service | Rent raw servers/networks (EC2, plain VPC) |

Good luck with the viva. Read this twice, picture the diagrams, and you'll be fine.