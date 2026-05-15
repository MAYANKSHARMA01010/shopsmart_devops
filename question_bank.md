# DevOps CSA 326 — Comprehensive Question Bank
### Pattern Analysis + Full Question Set with Solutions

---

## Professor's Pattern Analysis

Before diving into questions, here is what was observed from the provided material:

**Question styles used:**
1. Scenario-based questions with a named character (Arjun, Priya, Aisha, Karthik) — very common in written section
2. Code/YAML snippets shown in the question, student must diagnose or fix
3. "Two jobs/two issues" structure — identify both problems independently
4. Conceptual one-liners disguised as MCQs with one clearly wrong distractor and one subtly wrong one
5. "Why does X fail even though Y worked?" — tests understanding of order/timing/scope
6. Security-focused questions (least privilege, .env, secrets, chmod) appear in every topic
7. Commands must be exact — no partial credit for wrong flags
8. Idempotency is a recurring theme across Linux, Docker, and CI/CD

**What is repeatedly tested:**
- Layer caching in Docker (COPY order matters)
- Container vs image vs volume lifecycle
- GitHub Actions: runners are isolated, artifacts needed between jobs, secrets for credentials
- Terraform state file = source of truth; drift = mismatch
- `needs:` in GH Actions, `depends_on:` in Compose, `depends_on` in Terraform (implicit)
- Security group inbound vs outbound defaults in AWS
- `chmod 400` for .pem files, `export` for environment variables
- `tail -f` for live logs, `lsof -i` for port inspection
- Wall of Confusion, Snowflake Servers as named anti-patterns

---

## Topic 1: DevOps Philosophy and the SDLC

### Subtopic 1.1 — Evolution of Delivery (Waterfall → Agile → DevOps)

**Q1.1.1 (Conceptual)**
What is the fundamental difference between Agile and DevOps? Many students confuse them — clarify.

**Answer:**
Agile is a development methodology that organises work into short iterative sprints to gather feedback faster. It solves the Waterfall problem of "build everything, test at the end." However, Agile still typically requires a manual deployment step — a human must push the release out. DevOps extends Agile by automating that final step. DevOps integrates Operations into the loop, so code that passes tests is automatically built, packaged, and deployed to production without human intervention. In short: Agile fixes the development cycle; DevOps fixes the delivery cycle.

**Common mistake:** Students say "DevOps is just Agile with automation." That is incomplete — DevOps is specifically about breaking the wall between Dev and Ops teams and automating the entire path from commit to production.

---

**Q1.1.2 (Compare and Contrast)**
Fill in this comparison table (exam-style):

| Dimension | Waterfall | Agile | DevOps |
|---|---|---|---|
| Release frequency | ? | ? | ? |
| When testing happens | ? | ? | ? |
| Risk level | ? | ? | ? |
| Deployment | ? | ? | ? |

**Answer:**

| Dimension | Waterfall | Agile | DevOps |
|---|---|---|---|
| Release frequency | Once (at end) | Every sprint (weeks) | Continuously |
| When testing happens | End of project | End of each sprint | On every commit (automated) |
| Risk level | High (late defect discovery) | Medium | Low (small changes, fast rollback) |
| Deployment | Manual, rare | Manual, per sprint | Automated, frequent |

---

**Q1.1.3 (Scenario)**
A company ships software once every six months. When bugs appear, the engineering team spends two weeks just identifying which commit introduced the problem. A consultant says this is a structural problem, not a people problem. What is the root cause, and what delivery model would fix it?

**Answer:**
The root cause is "Big, Rare Releases." When six months of changes are merged at once, a bug could have been introduced by any one of hundreds of commits. The diagnostic surface is enormous. The fix is to adopt Continuous Deployment with small, frequent releases. When each release contains only a few commits, the diff is small, and a bug can be traced almost instantly. The structural guarantee is: smaller change sets = smaller blast radius = faster diagnosis.

---

**Q1.1.4 (Definition)**
Why is the Waterfall model described as "high risk"? Give a specific example.

**Answer:**
Waterfall is high risk because all testing happens at the end of the development phase. If a fundamental architectural mistake was made in Week 1, it will not be discovered until Week 20 (or whenever testing begins). By then, months of work have been built on a broken foundation. Example: a team builds an e-commerce platform for six months. On the first day of testing they discover the payment module cannot handle concurrent transactions. The entire checkout flow must be redesigned — wasting months of downstream work built on top of it.

---

### Subtopic 1.2 — The DevOps Mindset and Wall of Confusion

**Q1.2.1 (Definition)**
What is the "Wall of Confusion" and what are the two conflicting incentives that create it?

**Answer:**
The Wall of Confusion is the cultural and organisational barrier between Development and Operations teams in traditional software organisations.

Developers are incentivised by shipping new features quickly — their performance is measured by how much they build.

Operations teams are incentivised by system stability — their performance is measured by uptime and preventing outages.

These goals directly conflict. Developers want to push changes frequently; Operations wants to change as little as possible. When code breaks in production, each team blames the other. Developers say "it worked on my machine." Operations says "your code broke the server." DevOps dissolves this wall by making Dev and Ops share responsibility for the full lifecycle.

---

**Q1.2.2 (Scenario)**
Ravi deploys a new feature on Friday evening. By Saturday morning, the production database is returning errors. Ravi says "my code was tested in staging." The Ops team says "we didn't change anything on the server." Identify the anti-pattern at work and explain how DevOps practices would have prevented this situation.

**Answer:**
Anti-pattern: Wall of Confusion combined with Big, Rare Releases and lack of environment parity.

DevOps prevention:
1. Environment parity via Docker — the same container image runs in staging and production, eliminating "it worked on my machine."
2. Automated testing in CI — the pipeline runs integration tests against a staging database before any merge.
3. Small releases with feature flags — instead of deploying everything at once on Friday evening, individual features go out incrementally with the ability to toggle them off instantly.
4. Shared on-call — Dev and Ops share the pager, so both are incentivised to write stable, deployable code.

---

### Subtopic 1.3 — The DevOps Lifecycle

**Q1.3.1 (Definition)**
List the eight stages of the DevOps Lifecycle and give one concrete activity that happens at each stage.

**Answer:**

| Stage | Concrete Activity |
|---|---|
| Plan | Write user stories in a Jira board, define sprint goals |
| Code | Developer writes a feature in a branch, opens a pull request |
| Build | GitHub Actions runs `npm run build`, compiles source into a deployable artifact |
| Test | Automated unit and integration tests run in the CI pipeline |
| Release | The build artifact is tagged with a version (e.g. v1.4.2) and stored in ECR |
| Deploy | ECS service is updated to use the new task definition |
| Operate | Kubernetes scales pods up during high traffic, restarts crashed containers |
| Monitor | CloudWatch alerts fire when error rate exceeds 5% in a five-minute window |

---

**Q1.3.2 (MCQ-style)**
Which DevOps lifecycle stage involves real-time tracking of system health and user-facing errors?
- A) Deploy
- B) Operate
- C) Monitor
- D) Release

**Answer: C — Monitor.** The Monitor stage uses tools like Prometheus, Grafana, CloudWatch, or Datadog to track application performance, error rates, and user experience in production in real time.

---

## Topic 2: Advanced Version Control and Collaboration

### Subtopic 2.1 — Git Fundamentals

**Q2.1.1 (Conceptual)**
Describe the three zones of a local Git repository and explain how a file moves through them.

**Answer:**
1. Working Directory — where you edit files. Git tracks that changes exist but has not captured them yet.
2. Staging Area (Index) — a preparation zone. You use `git add <file>` to place changes here. This lets you choose exactly which changes belong in the next commit.
3. Local Repository — permanent snapshot storage. `git commit` takes everything in the Staging Area and saves it as a commit object with a unique SHA hash.

Flow: Edit file → `git add` → Staging Area → `git commit` → Local Repository → `git push` → Remote Repository (GitHub)

**Common mistake:** Students confuse `git add` (moves to staging) with `git commit` (saves to local repo) with `git push` (sends to remote). These are three separate steps.

---

**Q2.1.2 (Command)**
You made changes to three files: `app.js`, `config.json`, and `README.md`. You want to commit only the `app.js` and `config.json` changes — not the README. Write the exact commands.

**Answer:**
```bash
git add app.js config.json
git commit -m "feat: update app logic and config"
```
Do NOT use `git add .` — that would stage all three files including README.

---

**Q2.1.3 (Scenario)**
A developer accidentally committed a 200 MB video file to the `main` branch three commits ago. Other team members have already pulled. `git rm` in a new commit removes it from the working tree but the file is still in the repository history, making every clone slow. What is the correct solution?

**Answer:**
The correct tool is `git filter-repo` (the modern replacement for `git filter-branch`). It rewrites Git history to remove the file from every past commit.

Steps:
1. Install: `pip install git-filter-repo`
2. Run: `git filter-repo --path video.mp4 --invert-paths`
3. Force-push: `git push --force`
4. Every team member must delete their local clone and re-clone the repository.

**Why `git rm` in a new commit is insufficient:** `git rm` removes the file from the working tree and the next commit, but the file still exists in all previous commit objects. Anyone cloning still downloads the full history, including the 200 MB blob.

---

**Q2.1.4 (Scenario — Tough)**
Explain what `git stash` does. Give a real scenario where it is necessary.

**Answer:**
`git stash` temporarily saves your uncommitted changes (both staged and unstaged) to a hidden stack and reverts your working directory to the last clean commit. Your changes are not lost — they are stored and can be reapplied later with `git stash pop`.

Real scenario: You are halfway through building a new feature on a `feature/payments` branch when a critical production bug is reported. You need to switch to `main` immediately, but Git will not let you switch branches with uncommitted changes that conflict. You run `git stash`, switch to `main`, fix the bug, commit and push, then return to your feature branch and run `git stash pop` to restore your in-progress work.

---

### Subtopic 2.2 — GitHub Collaboration (PRs, Reviews)

**Q2.2.1 (Conceptual)**
What is a Pull Request (PR)? Why is it a critical DevOps practice beyond just merging code?

**Answer:**
A Pull Request is a formal proposal to merge a feature branch into the main branch. Beyond merging code, PRs serve as:
1. Code Review Gate — other engineers review the diff and leave comments before merging
2. Automated Quality Gate — CI checks (tests, linters, security scans) run automatically on the PR and must pass before merging is allowed
3. Audit Trail — the PR records who approved the change, what was discussed, and why the change was made
4. Knowledge Sharing — team members learn about each other's changes through reviews

Without PRs, code can be pushed directly to `main`, bypassing all quality checks.

---

**Q2.2.2 (Scenario)**
A team lead wants to ensure no one can merge code into `main` without at least two approvals and all CI checks passing. What GitHub feature do they configure?

**Answer:**
GitHub Branch Protection Rules on the `main` branch. Specifically:
- Enable "Require pull request reviews before merging" → set required reviewers to 2
- Enable "Require status checks to pass before merging" → select the CI workflow name
- Enable "Require branches to be up to date before merging"
- Optionally: "Restrict who can push to matching branches"

---

### Subtopic 2.3 — Automated PR Checks, Pre-commit Hooks, Webhooks

**Q2.3.1 (Compare and Contrast)**
What is the difference between a Pre-commit Hook and a GitHub Actions PR Check? When would you use each?

**Answer:**

| | Pre-commit Hook | GitHub Actions PR Check |
|---|---|---|
| Where it runs | Developer's local machine | GitHub's cloud runner |
| When it runs | Before `git commit` executes | When a PR is opened or updated |
| Who controls it | Individual developer (can be bypassed with `--no-verify`) | Repository admins (enforced for all) |
| Best for | Fast local checks: linting, formatting, syntax errors | Slower checks: full test suite, security scans, build verification |
| Bypass possible? | Yes (`--no-verify`) | No (branch protection prevents merge) |

Use pre-commit hooks to catch simple mistakes before they even leave the developer's machine. Use PR checks to enforce team-wide quality standards that no one can bypass.

---

**Q2.3.2 (Definition)**
What is a Webhook? Give a concrete DevOps example of a webhook trigger.

**Answer:**
A Webhook is an HTTP callback — when a specific event happens in one system, it automatically sends an HTTP POST request to a URL in another system, carrying data about the event.

Concrete DevOps example: A GitHub repository is configured with a webhook pointing to a Jenkins server URL. When a developer pushes to `main`, GitHub immediately sends a POST request to Jenkins with the commit details. Jenkins receives this, triggers a build pipeline, and starts running tests — without any manual intervention. The webhook is the bridge that connects the code push event to the CI pipeline start.

---

**Q2.3.3 (Scenario — Tough)**
A developer runs `git commit` but nothing happens — the terminal returns to the prompt without creating a commit. They check `git status` and see their changes are still staged. What is the most likely cause?

**Answer:**
A pre-commit hook is likely failing silently or exiting with a non-zero exit code, which tells Git to abort the commit. Git interprets any non-zero exit from a hook as "reject this commit."

Diagnosis steps:
1. Check `.git/hooks/pre-commit` — does it exist and is it executable (`chmod +x`)?
2. Run it manually: `bash .git/hooks/pre-commit`
3. Check its exit code: `echo $?`

If the hook script has a bug (e.g., a linter is not installed, or a test fails), it exits with code 1 and Git aborts. The fix is either to repair the hook or, in an emergency, bypass it with `git commit --no-verify`.

---

## Topic 3: Linux Fundamentals and Bash Automation

### Subtopic 3.1 — The CLI Advantage

**Q3.1.1 (Conceptual)**
Why do DevOps engineers prefer the CLI over a GUI for server management? Give three concrete reasons.

**Answer:**
1. Scriptability — CLI commands can be placed in bash scripts and executed automatically by CI pipelines. A GUI click cannot be scripted.
2. Remote access — servers in data centres have no monitor attached. SSH gives full CLI access to any server from anywhere. GUIs require remote desktop tools which are slow and often unavailable.
3. Repeatability and precision — a bash script runs the exact same commands in the exact same order every time. A GUI sequence relies on a human clicking the right things in the right order, which introduces error.
Bonus: Speed — experienced engineers can execute dozens of operations per minute in a terminal; the equivalent GUI navigation would take much longer.

---

### Subtopic 3.2 — File System and Navigation

**Q3.2.1 (Command — Scenario)**
You are logged into an EC2 instance. You need to: (a) find out where you currently are, (b) list all files including hidden ones with their permissions, (c) navigate to the home directory. Write all three commands.

**Answer:**
```bash
pwd                  # (a) print working directory
ls -la               # (b) list all files including hidden, with permissions
cd ~                 # (c) navigate to home directory
```
Note: `cd` alone (no arguments) also goes to home. `cd ~` is explicit and clearer.

---

**Q3.2.2 (Scenario)**
You need to delete a directory called `old_build` that contains hundreds of nested files and subdirectories. `rmdir old_build` fails. Why, and what command succeeds?

**Answer:**
`rmdir` only removes empty directories. If a directory has any contents, it refuses and throws an error.

Correct command:
```bash
rm -rf old_build
```
- `-r` = recursive (descend into subdirectories)
- `-f` = force (no confirmation prompts, ignore non-existent files)

**WARNING:** `rm -rf` is permanent. There is no Recycle Bin. Always double-check the path before running. A famous accident: `rm -rf /` (with a trailing space typo) can wipe an entire system.

---

**Q3.2.3 (Fill in)**
Match the command to its purpose:

| Command | Purpose |
|---|---|
| `cp -r src/ dest/` | ? |
| `mv old.txt new.txt` | ? |
| `touch app.log` | ? |
| `mkdir -p a/b/c` | ? |
| `cat file.txt` | ? |

**Answer:**

| Command | Purpose |
|---|---|
| `cp -r src/ dest/` | Recursively copy directory `src/` to `dest/` |
| `mv old.txt new.txt` | Rename (or move) `old.txt` to `new.txt` |
| `touch app.log` | Create an empty file (or update its timestamp if it exists) |
| `mkdir -p a/b/c` | Create nested directories, no error if they already exist |
| `cat file.txt` | Print entire file contents to terminal |

---

### Subtopic 3.3 — Permissions and Security

**Q3.3.1 (Conceptual)**
Explain the Linux permission model. What does the output `rw-r--r--` mean? What is its numeric equivalent?

**Answer:**
Linux assigns three sets of permissions, each with three bits:
- Owner (user): what the file's owner can do
- Group: what members of the file's group can do
- Others: what everyone else can do

Each set: `r` (read=4), `w` (write=2), `x` (execute=1)

`rw-r--r--`:
- Owner: `rw-` = 4+2+0 = **6** (can read and write)
- Group: `r--` = 4+0+0 = **4** (can only read)
- Others: `r--` = 4+0+0 = **4** (can only read)

Numeric: **644**

---

**Q3.3.2 (Scenario)**
You download a `.pem` key file and try to SSH into an EC2 instance. You get: `WARNING: UNPROTECTED PRIVATE KEY FILE! Permissions 0644 for 'key.pem' are too open.` What command fixes this and why does SSH enforce this?

**Answer:**
```bash
chmod 400 key.pem
```
`400` = owner can read (`r--`), nobody else can do anything (`--- ---`).

SSH enforces this as a security policy: if your private key file is readable by group or others (like `644`), any other user on the same system could steal your key. SSH refuses to use a key that is too permissive to protect you from this risk. The Principle of Least Privilege: the key file needs only to be readable by you, so `400` is the minimum required.

---

**Q3.3.3 (Scenario — Tough)**
An engineer runs `chmod 777 /etc/passwd`. Why is this catastrophically dangerous?

**Answer:**
`chmod 777` = `rwxrwxrwx` — everyone (owner, group, others) can read, write, and execute.

`/etc/passwd` stores user account information. Making it world-writable means:
1. Any user on the system (or any attacker who gains any user's shell) can modify it
2. They can add a new root-level user with no password
3. They can delete existing users, locking out legitimate administrators
4. The system can no longer be trusted

In practice, `sshd`, `sudo`, and other privileged programs check that `/etc/passwd` has safe permissions and may refuse to work if they detect tampering. This is the opposite of Least Privilege — it is Maximum Exposure.

---

**Q3.3.4 (Command)**
What permission set should a shell script have so that: (a) the owner can read, write, and execute it; (b) the group can read and execute it; (c) others can only read it?

**Answer:**
- Owner: `rwx` = 4+2+1 = **7**
- Group: `r-x` = 4+0+1 = **5**
- Others: `r--` = 4+0+0 = **4**

Command: `chmod 754 script.sh`

---

### Subtopic 3.4 — Shell Scripting Anatomy

**Q3.4.1 (Conceptual)**
What is a Shebang line? Why is it necessary?

**Answer:**
The Shebang is the first line of a shell script, formatted as `#!` followed by the absolute path to the interpreter:
```bash
#!/bin/bash
```
When you make a script executable and run it (`./setup.sh`), the operating system reads the first two bytes. If it sees `#!`, it uses the rest of that line as the interpreter path and runs the script through it. Without a Shebang, the OS does not know which interpreter to use (bash? python? zsh?) and may fail or use the wrong one.

---

**Q3.4.2 (Scenario — Debug)**
Arjun writes a GitHub Actions workflow that calls `./setup.sh`. The script contains:
```bash
#bin/bash
echo "Configuring for ${{ env.APP_NAME }}..."
sudo apt install tree
```
Two things go wrong: (1) the variable is not substituted, (2) the apt command hangs. Identify both bugs and write the corrected script.

**Answer:**
Bug 1: The Shebang is wrong. `#bin/bash` is missing the `!`. Without `#!/bin/bash`, this is not a valid Shebang — the file runs as a plain shell script in whatever the default shell is, and the `${{ env.APP_NAME }}` syntax is a GitHub Actions template syntax, not bash syntax. It only works inside the `env:` and `run:` blocks of the YAML file, not inside a separate `.sh` script. The script should use bash environment variable syntax: `$APP_NAME`.

Bug 2: `sudo apt install tree` is interactive — apt asks "Do you want to continue? [Y/n]" and waits for user input. In a CI pipeline, there is no user, so it hangs until timeout.

Corrected script:
```bash
#!/bin/bash
echo "Configuring the environment for $APP_NAME..."
sudo apt-get install -y tree
echo "Setup Complete!"
```
And in the workflow YAML:
```yaml
env:
  APP_NAME: "ShopSmart"
steps:
  - name: Run Setup Script
    run: ./setup.sh
```
The `-y` flag automatically answers "yes" to all apt prompts.

---

**Q3.4.3 (Conceptual)**
What is the difference between `$1`, `$0`, `$?`, and `$#` in bash?

**Answer:**

| Variable | Meaning | Example |
|---|---|---|
| `$0` | Name of the script itself | `./setup.sh` |
| `$1` | First positional argument passed to the script | `./deploy.sh production` → `$1` = "production" |
| `$?` | Exit code of the last command (0=success, non-zero=failure) | After `npm install`, check `$?` |
| `$#` | Total number of arguments passed | `./deploy.sh prod v1.2` → `$#` = 2 |

---

### Subtopic 3.5 — Defensive Scripting and Idempotency

**Q3.5.1 (Conceptual)**
Define idempotency in the context of bash scripting. Why is it critical in DevOps automation?

**Answer:**
A script is idempotent if running it once and running it ten times produces the same final system state, with no errors or unintended side effects on the second and subsequent runs.

Why it matters: In DevOps, scripts are often run automatically by CI pipelines or configuration management tools. If a deployment script fails halfway, you need to re-run it. A non-idempotent script might:
- Crash with "directory already exists" on `mkdir`
- Append duplicate entries to a config file with `>>`
- Re-install a package unnecessarily

An idempotent script checks the current state before acting: if the directory exists, skip. If the config already has the entry, skip. This is the Check-Before-Act pattern.

---

**Q3.5.2 (Scenario — Code Analysis)**
The following script is run twice on the same server. Identify which steps violate idempotency and explain why:

```bash
#!/bin/bash
mkdir logs
echo "PORT=8080" >> .env
if [ -d "node_modules" ]; then echo "Skipping"; else npm install; fi
```

**Answer:**
Step 1 — `mkdir logs` — VIOLATES idempotency. On the second run, `logs/` already exists. `mkdir` will throw an error: `mkdir: cannot create directory 'logs': File exists`. Fix: `mkdir -p logs` (the `-p` flag is a no-op if the directory exists).

Step 2 — `echo "PORT=8080" >> .env` — VIOLATES idempotency. The `>>` operator always appends. The second run will add a duplicate `PORT=8080` line. Now your `.env` has two PORT entries. Fix: check if the line already exists before appending:
```bash
grep -q "PORT=8080" .env 2>/dev/null || echo "PORT=8080" >> .env
```

Step 3 — `npm install` with directory check — CORRECT (idempotent). It checks if `node_modules` exists before running.

---

**Q3.5.3 (Write the code)**
Write an idempotent bash script section that:
1. Creates directory `/opt/app/logs` (no error if it exists)
2. Sets a `DB_HOST=localhost` variable in `/opt/app/.env` only if it's not already there
3. Checks that `node` is installed before proceeding; exits with a clear message if not

**Answer:**
```bash
#!/bin/bash

# 1. Idempotent directory creation
mkdir -p /opt/app/logs

# 2. Idempotent env variable insertion
if ! grep -q "DB_HOST=localhost" /opt/app/.env 2>/dev/null; then
    echo "DB_HOST=localhost" >> /opt/app/.env
    echo "Added DB_HOST to .env"
else
    echo "DB_HOST already set, skipping."
fi

# 3. Dependency check
if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: Node.js is not installed. Please install it first."
    exit 1
fi

echo "Environment setup complete."
```

---

**Q3.5.4 (Scenario — PATH Variable)**
Maya adds `/opt/dev-tools` to her PATH with `export PATH=$PATH:/opt/dev-tools` in her current terminal. It works. She closes the terminal, opens a new one, and the tools are gone. Why, and how does she fix it permanently?

**Answer:**
Why: Environment variables set with `export` only exist for the current shell session. When a terminal closes, that session dies and all its variables are discarded. A new terminal starts a fresh shell session with no memory of the previous one.

Why `PATH=$PATH:/opt/dev-tools` (without `export`) also fails differently: This sets the variable locally but does not mark it for inheritance by child processes. The `export` keyword is needed to make it available to child processes.

Permanent fix: Add the export command to the shell's startup configuration file. For bash on Linux: `~/.bashrc` or `~/.bash_profile`. For zsh on macOS: `~/.zshrc`.

```bash
echo 'export PATH=$PATH:/opt/dev-tools' >> ~/.bashrc
source ~/.bashrc   # apply immediately without restarting
```

Now every new terminal session runs `~/.bashrc` at startup, which sets the PATH.

---

**Q3.5.5 (Command — Monitoring)**
You suspect port 3000 is already in use and your new server fails to start. Write the command to find which process is using that port, and explain its flags.

**Answer:**
```bash
lsof -i :3000
```
- `lsof` = "List Open Files" (in Linux, network sockets are treated as files)
- `-i` = filter by internet connections
- `:3000` = show only connections on port 3000

Output shows the process name, PID (process ID), and user. To kill it: `kill -9 <PID>`.

Alternative: `ss -tlnp | grep :3000` or `netstat -tlnp | grep :3000`

---

## Topic 4: CI/CD Foundations and GitHub Actions

### Subtopic 4.1 — CI vs CD vs Continuous Deployment

**Q4.1.1 (Define and Distinguish)**
Define Continuous Integration, Continuous Delivery, and Continuous Deployment. What is the key difference between Continuous Delivery and Continuous Deployment?

**Answer:**
Continuous Integration (CI): Every commit to a shared branch automatically triggers a build and automated test run. The goal is to detect integration errors immediately.

Continuous Delivery (CD): Extends CI — after tests pass, the software is packaged and deployed to a staging environment. However, a human must manually approve the final push to production.

Continuous Deployment: Extends Continuous Delivery — there is no manual approval step. If all automated checks pass, the code goes to production automatically.

Key difference: Continuous Delivery requires a human to press the "go live" button. Continuous Deployment removes that button entirely and ships automatically. Continuous Delivery is safer for regulated industries (banking, healthcare) where manual sign-off is legally required.

---

**Q4.1.2 (MCQ)**
A medical device software team must have a regulatory sign-off before any update reaches patients. Which model fits?
- A) Continuous Deployment
- B) Continuous Delivery
- C) Continuous Integration only
- D) Waterfall

**Answer: B — Continuous Delivery.** Automated testing catches bugs, staging environment validates changes, but the final deployment to production requires a human (regulatory) approval. Continuous Deployment would remove that required approval step.

---

### Subtopic 4.2 — GitHub Actions: Workflows, Triggers, Jobs, Runners

**Q4.2.1 (Conceptual)**
What is a GitHub Actions Runner? What happens to the runner's filesystem after a job completes?

**Answer:**
A runner is a virtual machine (or container) provided by GitHub (or self-hosted) that executes the steps of a CI job. GitHub-hosted runners are ephemeral — they are created fresh for each job and destroyed completely when the job ends.

This means: any file created during a job (compiled binaries, test reports, node_modules) is gone forever after the job finishes. The runner's filesystem is not shared between jobs, and it does not persist between workflow runs. This is why artifacts must be explicitly uploaded if another job needs them.

---

**Q4.2.2 (Scenario — Debug)**
Aanya's CI workflow has two jobs: `build` and `deploy`. The `build` job compiles a React app and creates a `dist/` folder. The `deploy` job tries to sync `dist/` to S3 but fails: `dist/: No such file or directory`. Why, and how do you fix it?

**Answer:**
Why: Each job runs on a separate, freshly provisioned runner. The `dist/` folder created during `build` lived on build's runner machine, which was destroyed when the build job ended. The deploy job starts on a completely different machine with an empty filesystem.

Fix: Use GitHub Actions Artifacts.

In the `build` job, upload the artifact:
```yaml
- name: Upload build artifact
  uses: actions/upload-artifact@v4
  with:
    name: dist-folder
    path: dist/
```

In the `deploy` job, download it before syncing:
```yaml
- name: Download build artifact
  uses: actions/download-artifact@v4
  with:
    name: dist-folder
    path: dist/
- name: Sync to S3
  run: aws s3 sync dist/ s3://my-app-prod
```

---

**Q4.2.3 (Write the YAML)**
Write a GitHub Actions workflow that:
1. Triggers on every push to `main`
2. Has one job that runs on `ubuntu-latest`
3. Checks out code, installs Node.js dependencies, and runs tests

**Answer:**
```yaml
name: CI Pipeline

on:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
```

Note: `npm ci` is preferred over `npm install` in CI environments because it installs exact versions from `package-lock.json` and is faster and more deterministic.

---

**Q4.2.4 (Scenario — Job Ordering)**
You have three jobs: `lint`, `test`, and `deploy`. `deploy` should only run after both `lint` and `test` pass. Write the YAML structure showing only the job definitions and their dependencies.

**Answer:**
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  deploy:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - run: ./deploy.sh
```
`needs: [lint, test]` tells GitHub Actions: do not start `deploy` until both `lint` and `test` have completed successfully. If either fails, `deploy` is skipped.

---

**Q4.2.5 (Scenario — Triggers)**
You want a deployment workflow to run only when a human manually triggers it from the GitHub UI (not on every push). Which trigger do you use?

**Answer:**
```yaml
on:
  workflow_dispatch:
```
`workflow_dispatch` adds a "Run workflow" button to the Actions tab in GitHub. No push or PR can trigger it — only a human clicking that button. You can also add input parameters:
```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
```

---

### Subtopic 4.3 — Secrets and Artifacts

**Q4.3.1 (Conceptual)**
What is a GitHub Secret? Why should AWS credentials never be placed as plaintext in workflow YAML?

**Answer:**
GitHub Secrets are encrypted key-value pairs stored at the repository (or organisation) level. They are:
- Encrypted at rest using libsodium
- Never printed in CI logs (GitHub automatically redacts them)
- Not accessible to forked repositories
- Only injected into the workflow at runtime via `${{ secrets.SECRET_NAME }}`

Why never plaintext in YAML: The workflow YAML file is committed to the repository. If your repository is public (or becomes public by mistake), your AWS credentials are instantly exposed to the entire internet. Bots actively scan GitHub for AWS key patterns and can compromise accounts within minutes of exposure. Even in private repos, anyone with read access to the repo can see plaintext credentials.

---

**Q4.3.2 (Write)**
Show how to use a GitHub Secret called `AWS_SECRET_ACCESS_KEY` inside a workflow step.

**Answer:**
```yaml
- name: Deploy to S3
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_DEFAULT_REGION: us-east-1
  run: aws s3 sync dist/ s3://my-app-bucket
```
The `${{ secrets.NAME }}` syntax injects the secret value as an environment variable at runtime. The value never appears in logs.

---

**Q4.3.3 (Scenario — Tough)**
A team commits their `.env` file to GitHub. Within four hours, their AWS account shows $14,000 in charges for GPU instances being spun up in regions they never use. Explain the attack chain and the three practices that would have prevented it.

**Answer:**
Attack chain: The `.env` file contained `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. Automated bots continuously scan all GitHub commits (including force-deleted ones, as GitHub retains blobs) for AWS credential patterns using regex. The bot found the credentials, used them with the AWS API to call `ec2:RunInstances` and `ec2:RequestSpotFleet`, and launched large GPU instances (for crypto mining). The charges accumulated instantly.

Prevention:
1. `.gitignore` — add `.env` to `.gitignore` before ever creating it. Secrets never touch the repository.
2. GitHub Secrets — store all credentials in GitHub Secrets and reference with `${{ secrets.NAME }}` in workflows.
3. IAM least privilege — even if keys are leaked, an IAM policy scoped to only `s3:PutObject` on one bucket cannot launch EC2 instances. Limit blast radius.
Bonus: Enable AWS CloudTrail and billing alerts to detect anomalous activity early.

---

## Topic 5: Frontend Build and Deployment Lifecycle

### Subtopic 5.1 — Client-Server-Database Architecture and CORS

**Q5.1.1 (Conceptual)**
Explain CORS. Why does a React app on `http://localhost:3000` get a CORS error when calling an API on `http://localhost:4000`, even though both are on the same machine?

**Answer:**
CORS (Cross-Origin Resource Sharing) is a browser security policy. A browser enforces the Same-Origin Policy: JavaScript can only make requests to the same origin (protocol + domain + port) as the page it is running on.

`http://localhost:3000` and `http://localhost:4000` are different origins because the port differs. When the React app (on port 3000) tries to call the API (on port 4000), the browser blocks the request unless the API server explicitly includes CORS headers in its response:
```
Access-Control-Allow-Origin: http://localhost:3000
```

This is a browser-enforced restriction, not a network restriction. `curl` from the terminal has no Same-Origin Policy and would reach port 4000 without issue.

---

**Q5.1.2 (Scenario)**
Why must a React frontend communicate through a backend API instead of querying MongoDB directly from the browser?

**Answer:**
Security: To query MongoDB, you need the database connection string, which includes username, password, and host. If this were in the React app's code, it would be shipped to every user's browser. Any user could open DevTools, read the connection string, and have full database access — including reading, modifying, or deleting all data.

The backend acts as a security layer:
- It validates the user is authenticated before touching the database
- It applies business logic (e.g., users can only see their own data)
- It exposes only the specific data the frontend needs via HTTP API endpoints
- The database credentials never leave the server

---

### Subtopic 5.2 — The Build Process and Environment Variable Trap

**Q5.2.1 (Conceptual)**
Explain the "Environment Variable Trap" in React. A team builds their app locally pointing to `localhost` then uploads the build to S3. Production users see requests going to `localhost` in their browser. Why?

**Answer:**
React frontend environment variables (prefixed with `REACT_APP_`) are compile-time variables — they are not read at runtime but are "baked into" (inlined into) the JavaScript bundle during `npm run build`. When webpack builds the bundle, it replaces every occurrence of `process.env.REACT_APP_API_URL` with the literal string value that was set at build time.

If the local build had `REACT_APP_API_URL=http://localhost:4000`, every occurrence in the bundle becomes the string `"http://localhost:4000"`. Uploading that bundle to S3 and serving it globally means every user's browser receives JavaScript that makes requests to `localhost` — which, in their browser, means their own machine, not the server.

Fix: Set the correct production URL at build time in the CI pipeline before running `npm run build`:
```yaml
env:
  REACT_APP_API_URL: https://api.myapp.com
run: npm run build
```

---

**Q5.2.2 (Compare)**
Compare how environment variables work in a Node.js backend versus a React frontend.

**Answer:**

| | Node.js Backend | React Frontend |
|---|---|---|
| When read | Runtime (when the server starts) | Build time (when `npm run build` runs) |
| How to access | `process.env.DB_PASSWORD` | `process.env.REACT_APP_API_URL` |
| Where stored | `.env` file (server-side, secret) | `.env` file → baked into bundle |
| Changeable after build? | Yes — restart server with new env | No — must rebuild the app |
| Security | Never reaches the user | Visible to anyone who inspects the JS bundle |

---

### Subtopic 5.3 — The Testing Pyramid

**Q5.3.1 (Define and Rank)**
Describe the three levels of the Testing Pyramid. Which is fastest? Which gives the most confidence that the whole system works?

**Answer:**
Unit Tests (base — widest): Test a single function or component in complete isolation. No database, no network, no other modules. Extremely fast (milliseconds). Should be the most numerous. Example: test that a `calculateTax(price)` function returns the correct value for various inputs.

Integration Tests (middle): Test how multiple components interact. May mock external services (using Jest mocks or MSW). Moderate speed. Example: test that the checkout page correctly calls the API and displays the order confirmation.

End-to-End (E2E) Tests (top — narrowest): Automate a real browser against real services (or near-real). Test complete user journeys. Very slow (minutes per test), expensive to maintain, can be flaky. Example: open Chrome, navigate to the login page, enter credentials, complete a purchase, verify the confirmation email was sent.

Fastest: Unit tests. Most confidence in full system: E2E tests (but at highest cost).

---

**Q5.3.2 (Scenario)**
Why do CI pipelines use Jest mocks (network mocking) instead of calling the real API during frontend tests?

**Answer:**
CI runners are blank, isolated virtual machines. They do not have access to:
- The application's backend server (which is not running in CI)
- The database (no MongoDB instance)
- External APIs (which may require authentication)

If tests tried to call the real API, they would fail every time with "Connection refused." Network mocking intercepts API calls at the JavaScript level and returns predefined fake JSON responses instantly. This makes tests:
- Deterministic (same input → same output, always)
- Fast (no network latency)
- Independent (tests do not break if the backend is down)
- Safe (no real data is created or deleted during testing)

---

### Subtopic 5.4 — Deployment Strategy

**Q5.4.1 (Conceptual)**
Why should a React app be deployed to S3 static hosting rather than an EC2 instance running a Node.js server?

**Answer:**
After `npm run build`, a React app is just static files: `index.html`, `bundle.js`, CSS, and images. There is no server-side code to run — the entire app executes in the user's browser.

Reasons S3 is better:
1. Cost: S3 charges fractions of a cent per GB stored and per request. Running a 24/7 EC2 instance to serve static files costs $10–50/month minimum.
2. Scalability: S3 handles millions of requests without configuration. An EC2 instance needs load balancers and auto-scaling groups to scale.
3. Simplicity: S3 + CloudFront CDN delivers files from the nearest edge location globally. EC2 requires managing OS updates, security patches, Node.js version, reverse proxy (nginx), and certificates.
4. Reliability: S3 has 99.999999999% durability by design.

---

## Topic 6: Cloud Computing and AWS Automation

### Subtopic 6.1 — Cloud Service Models

**Q6.1.1 (Classify)**
Classify each of the following as IaaS, PaaS, or SaaS:
- Amazon EC2
- Gmail
- AWS Elastic Beanstalk
- Heroku
- Google Docs
- AWS Fargate

**Answer:**
- Amazon EC2 — **IaaS** (you rent raw VMs, manage OS yourself)
- Gmail — **SaaS** (fully managed email service, no infrastructure to manage)
- AWS Elastic Beanstalk — **PaaS** (you deploy code, AWS manages the platform)
- Heroku — **PaaS** (same as Beanstalk)
- Google Docs — **SaaS** (fully managed productivity tool)
- AWS Fargate — **PaaS** (you provide containers, AWS manages the underlying compute)

---

**Q6.1.2 (Scenario — Tough)**
A startup wants to run a web app. They are debating between EC2 and Fargate. EC2 gives them more control; Fargate charges for exact CPU/memory used. Under what conditions would each be preferable?

**Answer:**
Prefer EC2 when:
- You need to SSH into the machine for debugging
- Your app uses a GPU or specialised hardware
- You have specific OS-level requirements (custom kernel modules, specific Linux distribution)
- You have predictable, constant traffic and want to optimise costs with Reserved Instances
- Your app is a monolith that is not containerised

Prefer Fargate when:
- You have containerised your app with Docker
- You want zero server management (no OS patching, no SSH, no instance sizing)
- Traffic is variable — Fargate scales to zero, so you only pay when tasks are running
- Your team is small and cannot afford to maintain infrastructure
- You want to deploy new versions by simply pushing a new Docker image

---

### Subtopic 6.2 — Amazon EC2 and Security Groups

**Q6.2.1 (Conceptual)**
What is an AWS Security Group? What are the default inbound and outbound rules for a newly created Security Group?

**Answer:**
A Security Group is a virtual stateful firewall that controls inbound and outbound traffic to AWS resources (EC2 instances, RDS databases, etc.). Rules are evaluated before any traffic reaches the resource.

Default rules for a NEW Security Group:
- Inbound: DENY ALL — no traffic can enter the instance from outside
- Outbound: ALLOW ALL — the instance can reach any destination on any port

This is designed to be secure by default. You must explicitly add inbound rules for each type of traffic you want to allow (e.g., TCP port 22 for SSH, TCP port 80 for HTTP, TCP port 443 for HTTPS).

---

**Q6.2.2 (Scenario)**
You deploy a Node.js app on EC2 listening on port 3000. You can ping the instance's public IP successfully, but `http://<ip>:3000` does not load in the browser. What is the most likely cause?

**Answer:**
The Security Group is missing an inbound rule for TCP port 3000.

`ping` uses the ICMP protocol. A Security Group rule that allows ICMP (or no rule — depends on configuration) permits ping. But TCP port 3000 (HTTP traffic to your app) requires a separate explicit inbound rule:
- Type: Custom TCP
- Port range: 3000
- Source: 0.0.0.0/0 (allow from anywhere)

The Security Group acts as a whitelist: if a port is not explicitly allowed, it is blocked, even if the app is running and listening on that port correctly.

---

**Q6.2.3 (Scenario — Security)**
A security audit finds that an EC2 instance's Security Group has an inbound rule: `TCP port 22, source 0.0.0.0/0`. Why is this dangerous and how should it be fixed?

**Answer:**
Port 22 is SSH. Allowing it from `0.0.0.0/0` (the entire internet) means any machine in the world can attempt to SSH into your instance. Automated bots continuously scan the internet for open port 22 and attempt credential brute-force attacks.

Fix: Restrict the source IP to your own IP address or your organisation's VPN IP range:
- Source: `203.0.113.45/32` (your specific IP, `/32` = exactly one IP)
- Or use AWS Systems Manager Session Manager to SSH without exposing port 22 at all

Principle of Least Privilege applied to networks: the Security Group should only allow SSH from known, trusted sources.

---

### Subtopic 6.3 — AWS CLI and Security Best Practices

**Q6.3.1 (Scenario)**
A developer accidentally pushes a commit that contains `AWS_ACCESS_KEY_ID=AKIA...`. Even after deleting the file in the next commit, the credentials are still compromised. Why?

**Answer:**
Git history is permanent. Every commit is stored as an immutable object with a SHA hash. Even after `git rm` and committing the removal, the original commit containing the credentials still exists in the repository's history. Anyone can run `git log --all -p` or browse the commit history to see the deleted file's contents.

Additionally, GitHub's systems scan for credential patterns and may have already captured it. Bots that mirror GitHub can also have cached the commit.

Immediate response:
1. Revoke the compromised keys immediately in AWS IAM Console (takes effect in seconds)
2. Generate new access keys
3. Use `git filter-repo` to rewrite history and remove the credentials from all commits
4. Force-push and have all team members re-clone
5. Review AWS CloudTrail for any unauthorised API calls made with the compromised keys

---

## Topic 7: Docker and Containerisation I

### Subtopic 7.1 — The Need for Containerisation

**Q7.1.1 (Conceptual)**
Explain the "Matrix from Hell" problem that Docker solves.

**Answer:**
Before containers, deploying applications meant dealing with a matrix of compatibility problems: every application has specific dependencies (Node 14, Python 3.8, specific npm packages), and every environment has its own OS, library versions, and configurations (Developer's MacBook, Staging Ubuntu 20.04, Production CentOS 7).

With 5 applications and 4 environments, you have 20 compatibility combinations to manage and test. Each has unique conflicts: a library that works on macOS fails on Ubuntu; a package version required by App A conflicts with one required by App B on the same server.

Docker solves this by packaging each application with all its dependencies in a self-contained image. The image runs identically on any machine that has Docker installed — developer's MacBook, CI runner, or production server. The matrix collapses: one image, works everywhere.

---

**Q7.1.2 (Compare)**
Compare Virtual Machines and Containers on: isolation level, startup time, size, and resource efficiency.

**Answer:**

| | Virtual Machine | Container |
|---|---|---|
| Isolation level | Hardware-level (full OS + hypervisor) | OS-level (shared kernel, isolated processes) |
| Startup time | 30–120 seconds (boots full OS) | Milliseconds (starts a process) |
| Typical size | 5–20 GB (includes full OS image) | 50–500 MB (app + runtime only) |
| Resource efficiency | Poor (each VM runs a full OS consuming RAM/CPU) | High (containers share the host OS kernel) |

Containers are not more secure than VMs — the shared kernel means a kernel exploit can escape a container. VMs have stronger isolation. The tradeoff is efficiency vs isolation.

---

### Subtopic 7.2 — Core Docker Concepts

**Q7.2.1 (Define)**
What is the relationship between a Docker Image, a Docker Container, and a Docker Volume?

**Answer:**
Docker Image: A read-only, layered template that contains the application code, runtime, libraries, and everything needed to run. Think of it as a class definition or a blueprint. Images are built from Dockerfiles.

Docker Container: A running instance of an image. Docker adds a thin writable layer on top of the read-only image layers. Multiple containers can be created from the same image, each with their own writable layer. Think of a container as an object instantiated from a class.

Docker Volume: Persistent storage that exists outside the container's lifecycle. When a container is removed, its writable layer is deleted — any data written there is gone. A volume is mounted into the container at a specific path; data written to that path goes to the volume, not the container's writable layer. Volumes survive container deletion, replacement, and upgrades.

---

**Q7.2.2 (Scenario)**
What happens to data when you run `docker rm <container>`? What if that container was running a MySQL database?

**Answer:**
`docker rm` permanently deletes the container, including its writable layer. Any data written inside the container that was not in a mounted volume is gone forever.

For MySQL: All database tables, rows, user accounts, and schema changes stored in `/var/lib/mysql` inside the container are deleted. When you start a new MySQL container, it initialises a fresh, empty database.

Fix: Mount a Docker volume:
```bash
docker run -d \
  -v mysql_data:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  mysql:8
```
Now `/var/lib/mysql` writes to the `mysql_data` volume, which lives outside the container. `docker rm` deletes the container but the volume (and all data) remains.

---

**Q7.2.3 (Command sequence)**
Write the Docker commands to: (a) list all running containers, (b) list all containers including stopped ones, (c) follow the logs of a container named `api`, (d) open an interactive shell inside a running container named `api`.

**Answer:**
```bash
# (a) Running containers only
docker ps

# (b) All containers (including stopped)
docker ps -a

# (c) Follow logs (real-time, like tail -f)
docker logs -f api

# (d) Interactive shell inside running container (use sh if bash not available)
docker exec -it api /bin/bash
```

Common mistake: Using `docker run -it <image> bash` when you mean to enter an already-running container. `docker run` creates a NEW container. `docker exec` enters an existing running one.

---

## Topic 8: Docker and Containerisation II

### Subtopic 8.1 — Dockerfile Fundamentals

**Q8.1.1 (Write + Explain)**
Write a production-ready Dockerfile for a Node.js backend. Explain the purpose of each instruction.

**Answer:**
```dockerfile
# 1. Base image: Node.js 20 on Alpine Linux (small, ~50MB)
FROM node:20-alpine

# 2. Set working directory inside the container
# All subsequent commands run relative to /app
WORKDIR /app

# 3. CRITICAL: Copy dependency files FIRST (before source code)
# This layer only changes when package.json or package-lock.json changes
COPY package*.json ./

# 4. Install dependencies
# This layer is cached until step 3 changes
RUN npm ci --only=production

# 5. Copy application source code
# This layer changes on every code edit (which is fine — npm install is already cached above)
COPY . .

# 6. Tell Docker the container listens on port 3000 (documentation only, does not open port)
EXPOSE 3000

# 7. The default command to run when the container starts
CMD ["node", "server.js"]
```

---

**Q8.1.2 (Scenario — Debug)**
Priya's Dockerfile has `COPY . .` before `RUN npm install`. Every time she edits `server.js` and rebuilds, npm install runs from scratch, wasting 3 minutes. Explain why and write the corrected order.

**Answer:**
Docker builds images in layers. Each instruction creates a layer. Docker caches layers — if a layer's inputs haven't changed, Docker reuses the cached version and skips rebuilding it.

The problem: `COPY . .` copies all files including `server.js`. Any change to any file (even `server.js`) invalidates this layer's cache. Since `RUN npm install` comes after, its cache is also invalidated — Docker sees "the layer above changed, so I must rebuild this one too."

Corrected order:
```dockerfile
COPY package*.json ./   # Layer only changes if dependencies change
RUN npm install          # Cache is preserved if package.json is unchanged
COPY . .                 # Source code changes freely — npm install above is already cached
```
Now editing `server.js` only invalidates the `COPY . .` layer and everything after it. The `npm install` layer (above it) is untouched and served from cache.

---

**Q8.1.3 (Conceptual — Tough)**
What is a multi-stage Dockerfile build? Give a concrete example for a React app and explain the benefit.

**Answer:**
A multi-stage build uses multiple `FROM` instructions in one Dockerfile. Each stage can use a different base image, and files can be selectively copied between stages. Only the final stage is included in the output image.

React multi-stage example:
```dockerfile
# Stage 1: Build the React app (uses Node.js — large, ~900MB)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# /app/build/ now contains static HTML/CSS/JS

# Stage 2: Serve the static files (uses nginx — tiny, ~25MB)
FROM nginx:alpine
# Copy only the build output from Stage 1 — nothing else
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Benefit: The final image is ~25MB (nginx only). Without multi-stage builds, the image would include Node.js, npm, all source files, and node_modules — potentially 900MB+. Smaller images pull faster, deploy faster, and have a smaller attack surface.

---

### Subtopic 8.2 — Docker Compose

**Q8.2.1 (Scenario — Debug)**
A team's `docker-compose.yml` has a backend service with `depends_on: [db]`. The backend still crashes on the first start with "connection refused." They add a restart policy but that feels like a hack. What is the real fix?

**Answer:**
`depends_on` only controls start order — it waits for the `db` container to start, not for the database inside the container to be ready to accept connections. A PostgreSQL container takes 2–5 seconds to initialise its data directory, run startup scripts, and begin listening on port 5432, even after the container reports as "running."

The correct fix: add a healthcheck to the `db` service and use `condition: service_healthy` in `depends_on`:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    depends_on:
      db:
        condition: service_healthy
```

Now Compose waits until `pg_isready` returns success before starting the backend.

---

**Q8.2.2 (Write)**
Write a `docker-compose.yml` for a three-service stack: a React frontend (built locally), a Node.js backend (built locally), and a MongoDB database. The backend should receive the MongoDB URI as an environment variable.

**Answer:**
```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:4000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      MONGO_URI: mongodb://mongo:27017/myapp
      PORT: 4000
    depends_on:
      - mongo

  mongo:
    image: mongo:7
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```
Note: Services within a Compose stack resolve each other by service name. The backend reaches MongoDB at `mongo:27017` (not `localhost:27017`).

---

**Q8.2.3 (Scenario — Tough)**
In a `docker-compose.yml`, a `frontend` service has `API_URL: http://api:4000` in its environment. But when a browser makes the API call, it gets a network error. Why? (This is a common mistake.)

**Answer:**
The `api:4000` hostname works inside the Docker network — one container can reach another by service name. However, when a React app runs in a browser, the JavaScript executes on the user's machine, not inside Docker.

From the user's browser's perspective, `api` is not a valid hostname — it does not exist in public DNS. The browser cannot resolve `api:4000`.

Fix options:
1. Use `localhost:4000` for local development (with port mapping `-p 4000:4000` on the api service)
2. Use the real domain/IP for production environments
3. Use a reverse proxy (nginx in the compose stack) that routes `/api` requests to the backend, so the browser only talks to one origin

The environment variable `API_URL: http://api:4000` would be correct for a server-side rendered app (SSR) running inside Docker, but not for a pure client-side React app.

---

### Subtopic 8.3 — Container Registries (ECR)

**Q8.3.1 (Scenario)**
Before a CI pipeline can push a Docker image to AWS ECR, what steps must be completed? Write the AWS CLI commands.

**Answer:**
Step 1: Authenticate Docker to ECR. ECR is a private registry. Docker must exchange AWS credentials for a temporary login token:
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com
```

Step 2: Tag the image with the ECR repository URI:
```bash
docker build -t my-app .
docker tag my-app:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

Step 3: Push:
```bash
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

The login token is valid for 12 hours. In CI pipelines, the authenticate step runs on every pipeline execution.

---

## Topic 9: Cloud Architecture — AWS Deployment

### Subtopic 9.1 — IAM and Least Privilege

**Q9.1.1 (Scenario)**
An ECS task reads files from one specific S3 bucket: `my-app-assets`. A developer writes this IAM policy:
```json
{
  "Effect": "Allow",
  "Action": "s3:*",
  "Resource": "*"
}
```
What is wrong? Write a corrected policy.

**Answer:**
The policy grants full S3 access (`s3:*` = read, write, delete, manage ACLs, delete buckets) to ALL buckets (`*`). If the ECS task is compromised, an attacker can access every S3 bucket in the account, including backups, user data, and secrets stored in other buckets.

Corrected policy (Least Privilege):
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:ListBucket"
  ],
  "Resource": [
    "arn:aws:s3:::my-app-assets",
    "arn:aws:s3:::my-app-assets/*"
  ]
}
```
Note: `s3:ListBucket` requires the bucket ARN; `s3:GetObject` requires the `/*` suffix.

---

**Q9.1.2 (Conceptual)**
Why should ECS tasks use IAM roles instead of hardcoded AWS access keys in environment variables?

**Answer:**
Hardcoded access keys (static credentials) create several risks:
1. Long-lived: keys remain valid until manually rotated. If leaked, they work indefinitely.
2. Visible: environment variables can appear in `docker inspect`, application logs, error messages, and debugging tools.
3. Hard to rotate: updating keys requires redeploying every task.

IAM roles solve all three:
1. Temporary credentials: ECS injects short-lived, auto-rotating credentials (valid for 15 minutes–1 hour) via the task metadata endpoint. No key to leak.
2. Never stored: the application calls the metadata endpoint at runtime; no credentials in environment variables or config files.
3. Automatic rotation: credentials rotate automatically with no deployment needed.
4. Auditable: CloudTrail shows exactly which role made which API calls.

---

### Subtopic 9.2 — ECS Concepts

**Q9.2.1 (Scenario — The latest tag problem)**
A team's CI pipeline always pushes to ECR with the `latest` tag. After a deployment, users report seeing old behaviour. Logs confirm old code is running. Why, and how do you fix it?

**Answer:**
Root cause: ECS Task Definitions reference a Docker image URI. If the task definition says `my-app:latest` and a previous deployment cached the `latest` image on the underlying compute, ECS may serve the cached (old) image rather than pulling the new one. Even with `--force-new-deployment`, ECS may determine the task definition hasn't changed (same image URI) and not pull a new image.

Fix: Use immutable, unique image tags. The standard is the Git commit SHA:
```bash
IMAGE_TAG=$(git rev-parse --short HEAD)
docker build -t my-app:$IMAGE_TAG .
docker push $ECR_URI/my-app:$IMAGE_TAG

# Register a new task definition revision pointing to the unique tag
aws ecs register-task-definition \
  --container-definitions "[{\"image\":\"$ECR_URI/my-app:$IMAGE_TAG\"}]"

# Update the service to use the new revision
aws ecs update-service --cluster prod --service api \
  --task-definition my-app-task:NEW_REVISION
```
Now each deploy points to a unique, immutable image. Rollbacks are unambiguous — just point to a previous SHA tag.

---

**Q9.2.2 (Conceptual)**
Explain the relationship between an ECS Task Definition, an ECS Task, and an ECS Service.

**Answer:**
Task Definition: A versioned JSON blueprint that describes how to run one or more containers. It specifies: which Docker image to use, CPU and memory limits, port mappings, environment variables, IAM role, and logging configuration. Think of it as a recipe.

Task: A running instance of a Task Definition. One task = one set of containers running together (similar to a Kubernetes Pod). A task can be run once (like a batch job) or maintained continuously.

Service: A long-running manager that ensures a desired number of tasks are always running. If a task crashes or becomes unhealthy, the Service automatically starts a replacement. The Service is what you update during a deployment — you point it to a new Task Definition revision, and it replaces old tasks with new ones using a rolling deployment strategy.

---

**Q9.2.3 (Scenario)**
Why does a Docker named volume (`-v uploads:/app/uploads`) not work on AWS Fargate? What is the AWS-native alternative?

**Answer:**
Docker named volumes are stored on the local filesystem of the Docker host machine. On a standard Docker host, the volume lives at `/var/lib/docker/volumes/uploads/`. On Fargate, there is no persistent host filesystem — each task runs on ephemeral, managed compute that AWS provisions and decommissions automatically. There is no persistent local disk you can write to, and volumes do not survive task replacement.

AWS-native alternatives:
1. Amazon EFS (Elastic File System): A managed NFS filesystem that can be mounted by multiple Fargate tasks simultaneously. Persistent, shared storage that survives task replacement. Best for user uploads, shared files.
2. Amazon S3: For object storage. Instead of writing files to a local path, the application uploads to S3 using the AWS SDK. Files survive indefinitely.
3. Amazon RDS/Aurora: For structured data that was being stored in files.

---

## Topic 10: Infrastructure as Code (Terraform)

### Subtopic 10.1 — Snowflake Servers and IaC

**Q10.1.1 (Conceptual)**
What is a "Snowflake Server"? Why does it emerge when infrastructure is managed manually?

**Answer:**
A Snowflake Server is a server that has become so unique through manual configuration that it cannot be reproduced. Like a snowflake, no two look alike — each server has been individually tweaked by different engineers at different times.

How it emerges: Over months, different engineers SSH into servers and make ad-hoc changes — installing a package here, editing a config there, applying a security patch manually. None of these changes are recorded or version-controlled. Each server diverges from the others slightly but cumulatively.

Consequences: When the server fails and must be rebuilt, nobody knows exactly what configuration it had. The same patch or update produces different results on different servers (as seen in CloudByte's story — Dev patched fine, Staging crashed, Production broke). The team spends weeks trying to recreate the "exact" server configuration from memory and old Slack messages.

---

**Q10.1.2 (Compare and Contrast)**
What is the difference between Imperative and Declarative infrastructure management? Which does Terraform use?

**Answer:**
Imperative: You specify the exact sequence of steps to reach a desired state.
Example: "Run `apt install nginx`, then `systemctl enable nginx`, then `sudo sed -i 's/port 80/port 8080/' /etc/nginx/nginx.conf`, then restart nginx."
Problem: Every step must be written, ordered correctly, and maintained. Re-running the script may fail if state has changed.

Declarative: You describe the desired end state. The tool figures out how to get there.
Example (Terraform):
```hcl
resource "aws_instance" "web" {
  ami           = "ami-0abc123"
  instance_type = "t3.micro"
}
```
You say "I want an EC2 instance of this type." Terraform compares current state to desired state and makes only the necessary changes.

Terraform uses the declarative approach. This prevents the Snowflake problem because the desired state is written in code, version-controlled in Git, and applied identically every time by Terraform.

---

### Subtopic 10.2 — Terraform Concepts and Workflow

**Q10.2.1 (Explain the Workflow)**
Explain the `terraform init → plan → apply` workflow. What does each command do?

**Answer:**
`terraform init`: Downloads provider plugins (e.g., the AWS provider) and modules defined in the configuration. Must be run once when setting up a new project or after adding a new provider. Creates `.terraform/` directory.

`terraform plan`: Reads your `.tf` configuration files and the current state file. Queries AWS to see actual current state. Computes the diff and shows you exactly what will be created, modified, or destroyed — without making any changes. This is your "preview." Always review this before applying.

`terraform apply`: Executes the plan. Creates, modifies, or destroys resources in AWS to match your `.tf` configuration. Updates the state file to reflect the new real-world state. Prompts for confirmation (unless `-auto-approve` is passed).

Safe workflow: init → plan → review plan carefully → apply.

---

**Q10.2.2 (Scenario)**
Rohan writes a Terraform configuration with `aws_security_group` and `aws_instance`. He does not write `depends_on`. Will Terraform create them in the correct order? Explain the mechanism.

**Answer:**
Yes — Terraform will correctly create the security group before the EC2 instance, without any explicit `depends_on`.

Mechanism: Implicit dependency inference. In the `aws_instance` resource, Rohan references the security group:
```hcl
vpc_security_group_ids = [aws_security_group.app_sg.id]
```
Terraform's dependency graph builder sees that `aws_instance.backend` references an attribute of `aws_security_group.app_sg`. It infers that the security group must exist before the instance can be created. Terraform builds a Directed Acyclic Graph (DAG) of all resources and their dependencies, then applies them in topological order.

`depends_on` is only needed when there is a dependency that Terraform cannot see through attribute references — for example, when one resource depends on a side effect of another.

---

**Q10.2.3 (Scenario — Drift)**
Aisha's Terraform manages an EC2 instance configured as `t2.micro`. During an outage, a colleague changes it to `t3.small` in the AWS Console. Later, Aisha runs `terraform plan`. What does Terraform report and why?

**Answer:**
Terraform reports a planned change: it will modify the EC2 instance to change `instance_type` from `t3.small` back to `t2.micro`.

Why: Terraform reads two sources of truth:
1. The `.tf` configuration files (desired state: `t2.micro`)
2. The state file (last recorded state: `t2.micro`)
3. Real AWS state via API (actual state: `t3.small`)

Terraform detects "drift" — the actual AWS state differs from what Terraform expects. Its job is to enforce that the real world matches the declared configuration. So it plans to revert the instance type.

This is the correct and expected behaviour. Terraform's `.tf` files are the authoritative source of truth. Manual console changes are "drift" that Terraform will undo.

One-time fix to accept the console change: Update the `.tf` file to say `instance_type = "t3.small"` and run `terraform apply`. Now the declared state matches reality.

---

**Q10.2.4 (Scenario — State Management)**
Two engineers, Mira and Dhruv, both run `terraform apply` at the same time from their laptops, each with a local copy of the state file. What goes wrong?

**Answer:**
State corruption. Here's the sequence:
1. Both read the current state file (both see: 1 EC2 instance)
2. Both compute a plan independently
3. Mira applies first — creates a new S3 bucket. Her state file now shows: 1 EC2 + 1 S3
4. Dhruv applies 30 seconds later — his state file still shows 1 EC2. He creates an RDS database. His state file shows: 1 EC2 + 1 RDS
5. Dhruv's state file overwrites Mira's on the local machine (or they diverge)

Result: One state file shows EC2+S3, the other shows EC2+RDS. The real AWS has EC2+S3+RDS. Neither state file is complete. Terraform is now "blind" to some resources — it may try to recreate resources that already exist, or destroy resources it cannot see.

Solution: Remote state with locking.
- Store state in S3 (shared, single source of truth)
- Use DynamoDB for state locking (only one `apply` can run at a time; others see "state locked" and wait)

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock"
  }
}
```

---

## Topic 11: Kubernetes Core Concepts

### Subtopic 11.1 — Kubernetes Architecture

**Q11.1.1 (Conceptual)**
What is the role of each of these Kubernetes control plane components: kube-scheduler, kube-apiserver, etcd, kube-controller-manager?

**Answer:**
kube-apiserver: The front door to the cluster. All kubectl commands, web UI requests, and internal component communications go through the API server. It validates requests and updates the cluster state.

etcd: The distributed key-value store that holds the entire cluster state — every Pod, Deployment, Service, and configuration. Think of it as the cluster's database. If etcd is lost, the cluster loses its memory.

kube-scheduler: Watches for newly created Pods with no assigned Node. It selects the best Node for each Pod based on resource requirements, affinity rules, and available capacity.

kube-controller-manager: Runs multiple controllers that watch the cluster state and work to bring actual state to desired state. Examples: the Deployment controller creates/deletes ReplicaSets; the ReplicaSet controller creates/deletes Pods; the Node controller handles node failures.

---

**Q11.1.2 (Scenario)**
A student runs `kubectl delete pod hello-abc123`. Within 10 seconds, `kubectl get pods` shows three pods running, but one has a new name. Walk through exactly what happened.

**Answer:**
1. `kubectl delete pod hello-abc123` sends a DELETE request to the kube-apiserver, which deletes the Pod object from etcd.
2. The ReplicaSet controller (inside kube-controller-manager) receives a watch event: "one of the Pods I own just disappeared."
3. The ReplicaSet controller checks: desired count = 3, actual count = 2. Desired ≠ Actual. It creates a new Pod object in etcd.
4. kube-scheduler sees the new Pod has no Node assigned. It evaluates available Nodes, selects the best one, and writes the Node assignment to etcd.
5. The kubelet on the selected Node watches for Pods assigned to it. It sees the new Pod and tells Docker/containerd to pull the image and start the container.
6. The new Pod gets a new random name suffix (e.g., `hello-xyz789`) because Pod names are generated, not reused.

The whole cycle takes seconds. This demonstrates Kubernetes' core feature: self-healing through declarative desired state.

---

### Subtopic 11.2 — Kubernetes Objects

**Q11.2.1 (Scenario — YAML writing)**
Write a Kubernetes Deployment for an nginx app with 3 replicas and a NodePort Service to expose it on port 30080.

**Answer:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  type: NodePort
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080
```
The `selector` on the Service (`app: nginx`) must match the `labels` on the Pod template.

---

**Q11.2.2 (Compare — Service Types)**
Compare ClusterIP, NodePort, and LoadBalancer service types. When would you use each?

**Answer:**

| Type | Accessible from | Use case |
|---|---|---|
| ClusterIP | Inside the cluster only | Internal services (e.g., backend reaching a database) |
| NodePort | Via any Node's IP + a high port (30000–32767) | Development/testing, direct node access |
| LoadBalancer | Public internet via cloud load balancer | Production external services, requires cloud provider support |

In a minikube environment, `LoadBalancer` type stays in `<pending>` state for EXTERNAL-IP unless you use `minikube tunnel`. Use `NodePort` for local development instead, and access via `minikube service <service-name>`.

---

---

## Section A: Most Important Exam Questions

1. What is the Wall of Confusion and how does DevOps dissolve it?
2. Explain Docker layer caching. Why does `COPY . .` before `RUN npm install` break caching?
3. What is idempotency? Give two examples of non-idempotent bash script commands and their fixes.
4. Why can't a deploy GitHub Actions job see files created by the build job? How do you fix it?
5. Explain the React environment variable trap. Why does a locally-built React app call `localhost` in production?
6. What are the default inbound and outbound rules of a new AWS Security Group?
7. What is Terraform state drift? What happens when you run `terraform plan` after manually changing an EC2 instance in the AWS console?
8. Explain the difference between `depends_on` in Docker Compose (container start order) and actual application readiness.
9. What is the `latest` tag problem in ECS deployments? How do git SHA tags solve it?
10. What is a Snowflake Server and what DevOps practice prevents it?
11. What happens to data in a Docker container when you run `docker rm`? How do volumes fix this?
12. Why must `chmod 400 labsuser.pem` be run before SSH to an EC2 instance?
13. Explain `terraform init → plan → apply`. What happens if you skip `plan`?
14. What is the difference between Continuous Delivery and Continuous Deployment?
15. Explain why a Kubernetes ReplicaSet controller recreates a deleted Pod.

---

## Section B: Tough Practice Questions

**TB1.** A GitHub Actions workflow has three jobs: `unit-test`, `integration-test`, and `deploy`. `unit-test` and `integration-test` should run in parallel. `deploy` should only run after BOTH pass. Write the YAML structure showing job dependencies only.

**Answer:**
```yaml
jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  integration-test:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:integration

  deploy:
    runs-on: ubuntu-latest
    needs: [unit-test, integration-test]
    steps:
      - run: ./deploy.sh
```

---

**TB2.** A Dockerfile passes an API key via `ARG API_KEY` during build. A colleague runs `docker history --no-trunc` on the image and finds the key. Why, and how should secrets be handled instead?

**Answer:**
`ARG` values are stored in image layer metadata and visible via `docker history`. Anyone who can pull the image can read the key. Never pass secrets via `ARG` or `ENV` in Dockerfiles if they need to be secret — they are baked into the image permanently.

Correct approach: Inject secrets at runtime via environment variables on `docker run`:
```bash
docker run -e API_KEY=$API_KEY my-app
```
Or use Docker secrets (Swarm) or AWS Secrets Manager (ECS). The image itself contains no sensitive data.

---

**TB3.** A `npm ci` command in a CI pipeline installs version `1.2.4` of a package, but your local machine installed `1.2.3`. Both used the same `package.json` with `^1.2.0`. What is the most likely cause?

**Answer:**
The `package-lock.json` was not committed to the repository (or was ignored in `.gitignore`). Without a lock file, `npm install` and `npm ci` resolve fresh from the registry. If `1.2.4` was published between your local install and the CI run, CI picks up the newer version because it satisfies `^1.2.0`.

Fix: Commit `package-lock.json` to the repository. `npm ci` will then install exact versions from the lock file on every machine, guaranteeing reproducibility.

---

**TB4.** An ECS Service has `desiredCount: 3`. One task crashes. What does ECS do automatically? What if the desired count is 0?

**Answer:**
With `desiredCount: 3`: ECS Service continuously monitors running tasks. It detects 2 running vs 3 desired. It automatically starts a replacement task to restore the count to 3. This is ECS's self-healing capability — no human intervention needed.

With `desiredCount: 0`: ECS stops all tasks and does not start replacements. This is intentional — setting desired count to 0 is how you "pause" a service without deleting it. Tasks that crash while desired count is 0 are not replaced.

---

**TB5.** Explain why running `terraform apply` automatically on every PR merge (without running `terraform plan` on the PR itself) is dangerous.

**Answer:**
PR reviewers see only code changes (`.tf` file diffs) but have no visibility into what infrastructure changes will actually occur. Terraform's behaviour can be non-obvious — renaming a resource in `.tf` might cause a destroy + recreate in production. Without `plan` in the PR, this destroy goes unreviewed.

Safe practice: Run `terraform plan` as a PR check and post the plan output as a PR comment. Reviewers explicitly approve both the code change and the infrastructure change before merging. Only after merge does `terraform apply` run.

---

## Section C: One-Line Revision Notes

- **Wall of Confusion**: Dev wants speed, Ops wants stability — conflict creates blame culture
- **Shebang**: `#!/bin/bash` — tells OS which interpreter to use; `#bin/bash` is WRONG (missing `!`)
- **chmod 400**: owner read-only — required for SSH private key files
- **chmod 644**: owner rw, group r, others r — common for config files
- **`tail -f`**: watch file grow in real-time (CI logs, server logs)
- **`lsof -i :3000`**: find which process is using a port
- **`export VAR=val`**: makes variable available to child processes; without `export`, variable is local shell only
- **`$?`**: exit code of last command; 0 = success
- **Docker image**: read-only layered template (the class)
- **Docker container**: running instance with writable layer (the object)
- **Docker volume**: persistent storage outside container lifecycle
- **`docker exec -it`**: enter a RUNNING container; `docker run` creates a NEW container
- **COPY order matters**: copy `package.json` first, run `npm install`, THEN copy source code
- **`depends_on` in Compose**: controls start ORDER, not application READINESS
- **GitHub Actions runners**: ephemeral — filesystem reset between jobs; use artifacts to share files
- **`needs:`**: makes a job wait for another job to succeed
- **`workflow_dispatch`**: manual trigger (button in GitHub UI)
- **GitHub Secrets**: encrypted, never appear in logs; referenced as `${{ secrets.NAME }}`
- **React env vars**: baked into bundle at BUILD TIME — cannot be changed after build
- **CORS**: browser blocks cross-origin requests unless server sends `Access-Control-Allow-Origin` header
- **AWS Security Group**: default = deny all inbound, allow all outbound
- **Snowflake Server**: unique, undocumented server that cannot be reproduced — result of manual management
- **Terraform declarative**: you describe desired state; Terraform computes the diff
- **`terraform plan`**: dry-run, no changes; always run before `apply`
- **Terraform drift**: real-world state differs from `.tf` config; `terraform plan` detects it
- **Terraform state**: JSON file tracking what resources Terraform manages; local state = no sharing/locking
- **S3 + DynamoDB**: standard solution for remote Terraform state + locking
- **ECS Task Definition**: versioned blueprint (image, CPU, memory, ports, IAM role)
- **ECS Service**: maintains desired task count; auto-replaces crashed tasks
- **Fargate**: serverless containers — AWS manages the servers; no SSH, no instance management
- **`latest` tag danger**: not immutable; ECS may serve cached old image; use git SHA tags instead
- **IAM Least Privilege**: grant minimum permissions needed — limits blast radius if compromised
- **Kubernetes Pod**: smallest deployable unit; one or more tightly coupled containers
- **Kubernetes ReplicaSet**: ensures desired number of Pods are running; replaces crashed Pods
- **ClusterIP**: internal-only Service; NodePort: external via node IP + port; LoadBalancer: cloud LB
- **`kubectl delete pod`**: ReplicaSet controller detects and creates replacement within seconds

---

## Section D: Common Mistakes

1. **Using `git add .` when only some files should be staged** — review `git status` first
2. **Confusing `docker run` and `docker exec`** — `run` creates new container; `exec` enters existing one
3. **Putting `COPY . .` before `RUN npm install`** — breaks layer caching; reverse the order
4. **Using `latest` tag in production ECS** — not immutable; use git SHA tags
5. **Storing secrets in `.env` files committed to Git** — add `.env` to `.gitignore`
6. **Using `>>` operator for idempotent config writing** — appends every run; use `grep -q` check first
7. **Using `mkdir` without `-p` in scripts** — crashes if directory exists; `-p` is always safe
8. **Forgetting `export` before environment variables** — variable exists but child processes cannot see it
9. **Setting PATH without making it permanent** — works in current session only; must go in `~/.bashrc` or `~/.zshrc`
10. **Using `depends_on` in Compose without healthchecks** — only guarantees container start, not app readiness
11. **Storing Terraform state locally on laptops** — concurrent applies corrupt state; use S3 + DynamoDB
12. **Not running `terraform plan` before `apply`** — applies unexpected destroys without review
13. **Granting `s3:*` on `*` to ECS tasks** — violates least privilege; scope to specific actions and bucket ARN
14. **Inlining `REACT_APP_*` variables in the build** for a config that changes per environment — rebuild is required for each env
15. **Interpreting `chmod 777` as "everyone can do everything"** — correct, but this is a security disaster, not a convenience

---

## Section E: Mini Mock Test (20 Questions with Answers)

**M1.** Which command watches a log file in real-time?
**Answer:** `tail -f logfile.log`

**M2.** What does `chmod 400 key.pem` do?
**Answer:** Gives the owner read-only permission; group and others have no access (required for SSH keys).

**M3.** You run a bash script twice. The second run throws "mkdir: cannot create directory 'logs': File exists." Which principle does this violate?
**Answer:** Idempotency. Fix: use `mkdir -p logs`.

**M4.** In GitHub Actions, why does a `deploy` job fail to find a `dist/` folder produced by the `build` job?
**Answer:** Each job runs on a separate, ephemeral runner. Artifacts must be uploaded by build and downloaded by deploy.

**M5.** What GitHub trigger allows a human to manually start a workflow from the GitHub UI?
**Answer:** `workflow_dispatch`

**M6.** A React app was built locally with `REACT_APP_API_URL=http://localhost:4000`. Production users see calls to `localhost`. Why?
**Answer:** Frontend environment variables are baked into the JavaScript bundle at build time. The local URL was compiled into the bundle.

**M7.** What is the default inbound rule for a newly created AWS Security Group?
**Answer:** Deny all inbound traffic.

**M8.** What does `lsof -i :3000` do?
**Answer:** Lists all processes that have port 3000 open (identifies which process is using the port).

**M9.** A Docker container running MySQL is deleted with `docker rm`. Where is the database data?
**Answer:** Gone forever (it was in the container's writable layer). Solution: use a Docker volume mounted at `/var/lib/mysql`.

**M10.** What is the correct Dockerfile instruction order to preserve npm install cache?
**Answer:** `COPY package*.json ./` → `RUN npm install` → `COPY . .`

**M11.** In Docker Compose, `depends_on: [db]` means the backend service will wait until:
**Answer:** The `db` container starts (not until the database inside is ready to accept connections).

**M12.** What is the Terraform command that shows planned changes without applying them?
**Answer:** `terraform plan`

**M13.** An engineer changes an EC2 instance type in the AWS Console. Terraform's `.tf` file still says the old type. What will `terraform plan` report?
**Answer:** A planned change to revert the instance type back to what the `.tf` file declares (Terraform detects drift).

**M14.** What is the risk of using `latest` as the Docker image tag in ECS task definitions?
**Answer:** `latest` is mutable — it can point to different image content over time. ECS may serve a cached old image. Deployments become non-deterministic, and rollbacks are ambiguous.

**M15.** What IAM construct should give an ECS task read access to a specific S3 bucket?
**Answer:** An IAM Role attached to the task (task role), with a policy scoped to `s3:GetObject` and `s3:ListBucket` on that specific bucket's ARN.

**M16.** A Kubernetes Deployment has `replicas: 3`. An engineer runs `kubectl delete pod <name>`. How many pods are running after 10 seconds?
**Answer:** 3 — the ReplicaSet controller detects the deficit and creates a replacement Pod automatically.

**M17.** What does `export PATH=$PATH:/opt/tools` do, and why does it not persist after a terminal restart?
**Answer:** It appends `/opt/tools` to the PATH for the current shell session and marks it for child process inheritance. It is lost on restart because it was only set in memory, not in the shell's config file (`~/.bashrc` etc.).

**M18.** What is a "Snowflake Server"?
**Answer:** A server configured manually over time by multiple engineers, making it unique and unreproducible. The result of not using Infrastructure as Code.

**M19.** Why should `AWS_SECRET_ACCESS_KEY` never be placed in plaintext in a GitHub Actions YAML file?
**Answer:** The YAML file is committed to the repository. Anyone with read access (or if the repo is public) can see the key. Bots scan GitHub for AWS key patterns and can compromise accounts within minutes.

**M20.** What is the relationship between an ECS Service and an ECS Task Definition?
**Answer:** The Task Definition is the versioned blueprint (what image, CPU, memory, ports). The Service is the long-running manager that runs and maintains a desired number of Tasks based on that blueprint and automatically replaces failed tasks.

---

*End of Question Bank — CSA 326 DevOps*
*Total: 12 topics | 70+ questions with full solutions | All syllabus subtopics covered*
