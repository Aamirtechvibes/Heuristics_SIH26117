# Agent Aamir — Pitch

> An AI-powered development agent that turns natural language into safe, audited code actions.

---

## 🎯 The Problem

Software development is full of **repetitive, manual grunt work**: scaffolding projects, searching codebases, editing files, running commands. For non-technical users, this work is **inaccessible**. For developers, it's a **productivity drain**.

Existing AI coding tools either:
- Act as **black boxes** (you don't know what they'll change)
- Lack **safety rails** (they can wreck your codebase)
- Require **technical setup** to use effectively

---

## 💡 The Solution: Agent Aamir

**Agent Aamir** is a modular AI agent — built on **Bun + TypeScript** — that:
1. **Understands plain English goals** ("Create a todo app", "Find all API endpoints")
2. **Stages every action** before execution (create, modify, delete, search, analyze, run shell)
3. **Shows a human-in-the-loop approval flow** for every change
4. **Logs every action** with full audit trail (ID, timestamp, status, approval)

Think of it as **Lego for automation**: tools are bricks, skills are blueprints, and you snap them together safely.

---

## 🧩 What It Can Do (Even for Non-Tech Users)

| Capability | Example Prompt | Result |
|------------|----------------|--------|
| 📝 Create files | "Create a README for my project" | Drafts a structured README |
| 🔍 Search code | "Find all `.ts` files in `src/`" | Returns matching file list |
| 🗂️ Analyze codebase | "Summarize my project structure" | File counts, sizes, extensions |
| ✏️ Edit files | "Update the homepage title" | Stages a diff for approval |
| 🏗️ Scaffold projects | "Make me a todo app" | Creates folders + boilerplate |
| 🐚 Run shell (gated) | "Install dependencies" | Queues command for approval |
| 📚 Document | "Write API docs" | Generates structured markdown |
| 🧪 Plan tasks | "Break this feature into steps" | Returns a roadmap |

> **Non-tech translation**: "Tell it what you want, in English. It shows you exactly what it will do. You approve. Done."

---

## 🏗️ Architecture

```
agent-aamir/
├── modes/
│   ├── agent/      # Core agent loop (orchestrator, tools, action tracker, approval)
│   ├── ask/        # Q&A mode for explaining the codebase
│   ├── plan/       # Planning + research mode (with web tools)
│   ├── telegram/   # Run the agent over Telegram
│   └── cli.ts      # Unified CLI entry
├── skills/         # Extensible SKILL.md capability definitions
├── index.ts        # Entry point
└── package.json    # Bun-powered, TypeScript strict
```

### Key Modules
- **`types.ts`** — `ActionType`, `ActionStatus`, `ActionLog`, `AgentConfig`
- **`agent-tools.ts`** — `createFile`, `modifyFile`, `deleteFile`, `searchFiles`, `analyzeCodebase`, `executeShell`, `readFile`
- **`orchestrator.ts`** — Goal intake → tool selection → staging → approval
- **`actionTracker.ts`** — Full audit trail of every action
- **`approval.ts`** + **`diff-view.ts`** — Human-in-the-loop review

---

## 🛡️ Safety by Design

Every action follows a strict lifecycle:

```
pending → staged → reviewed → approved/rejected → executed
```

- 🔒 **No silent changes** — nothing is applied without explicit human approval
- 👀 **Diff preview** — you see exactly what will change
- 📜 **Audit log** — every action is timestamped and traceable
- 🚫 **Excluded paths** — `node_modules`, `.git`, `dist` are off-limits by default

---

## 🚀 Why It Wins at SIH

### 1. **Accessibility**
Non-developers can use it. "Create a website" works as a prompt. This **democratizes software creation**.

### 2. **Safety**
Unlike most AI coding tools, **nothing happens without approval**. This makes it viable for **enterprise, education, and government** use cases.

### 3. **Extensibility**
A **skill system** (SKILL.md files) lets anyone teach the agent new capabilities — no code changes required.

### 4. **Multi-Modal**
- **CLI** for power users
- **Ask mode** for codebase Q&A
- **Plan mode** with web research for strategy
- **Telegram mode** to run the agent from your phone

### 5. **Modern Stack**
Bun (the speed-demon JS runtime) + TypeScript strict typing = **fast, type-safe, production-ready**.

---

## 🎬 30-Second Demo Script

> "Hey Aamir, create a todo list app with HTML, CSS, and JS."
>
> *Agent stages 3 files → shows diff → user approves → files created*
>
> "Now add a delete button to each item."
>
> *Agent reads the file, stages a modification, shows the diff*
>
> "Find all files using the `fetch` API."
>
> *Agent searches and returns a filtered list*

**Time saved**: 30 minutes → 30 seconds.

---

## 📈 Future Scope

- 🔌 Plugin marketplace for community skills
- 🌐 Web-based approval UI (browser diff viewer)
- 🤖 Multi-agent collaboration (one agent plans, another executes)
- 📱 First-class mobile experience via Telegram/WhatsApp
- 🏢 Enterprise SSO + role-based approval chains

---

## 🧠 One-Line Pitch

> **Agent Aamir: Your AI coding sidekick — fast, safe, and usable by everyone.**

⚡ Fast (Bun-powered)
🧩 Modular (plug-and-play tools)
🛡️ Safe (approval-gated execution)
🧠 Extensible (skill system ready to grow)

---

*Built with ❤️ for SIH — turning "ugh, manual work" into "done, what's next?" 🤖✨*
