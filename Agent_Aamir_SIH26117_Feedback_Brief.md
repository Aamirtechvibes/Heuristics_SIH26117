# Agent Aamir × SIH26117
## Focused Feedback Brief for Aamir

**Problem Statement:** SIH26117 — *Sovereign On-Premise Agentic AI Workbench using Open-Weight Multimodal LLMs for Confidential Industrial Work*  
**Organization:** Mangalore Refinery and Petrochemicals Limited (MRPL)  
**Repo reviewed:** https://github.com/Aamirtechvibes/Agent-Aamir  
**Reference PS:** https://www.codehuntersacademy.com/sih-2026-ps#SIH26117

---

## 1. Executive Read

Agent Aamir is a **strong architectural starting point** for SIH26117.

The repo already contains several of the hard middle-layer primitives the problem statement expects:

- multi-step agent execution;
- separate Agent / Plan / Ask modes;
- local file read/write/search/analyse tools;
- staged mutations instead of blind execution;
- human approval with diff review;
- shell/tool execution;
- CLI and Telegram interaction surfaces;
- web/research tooling;
- a basic skill discovery mechanism.

The main gap is not “build an agent from scratch.”

The main gap is to turn the existing agent into a **genuinely sovereign, on-premise, multimodal industrial workbench** and prove that sovereignty during the demo.

A useful framing is:

> **Agent Aamir already has the agentic workbench core. SIH26117 requires us to make the intelligence, knowledge, tools, execution and evidence layers fully local and industrial-grade.**

---

## 2. What the Problem Statement Actually Demands

The MRPL brief is unusually specific. A credible submission should demonstrate:

1. **Entirely on-premise / air-gapped operation**
2. **Open-weight models**
3. **More than one model**
4. **Automatic model selection for different task types**
5. **Agentic multi-step execution**
6. **Local tools**
7. **Sandboxed code execution**
8. **Local organizational knowledge / RAG**
9. **Multimodal understanding**
   - scanned PDFs
   - handwriting
   - drawings
   - photographs
10. **Useful deliverables**
    - Word
    - PowerPoint
    - Excel
    - code
    - calculations
11. **Visible proof of zero external calls**

This last point matters: the PS explicitly asks for **logs or a visible network monitor**, not merely a claim that the system is private.

---

## 3. Where Agent Aamir Already Fits

### Agentic runtime — strong fit

`modes/agent/orchestrator.ts` already uses a tool-loop agent capable of iterating through a task and invoking local tools.

This is much closer to the requested architecture than a normal chat UI.

### Planning — strong fit

Plan Mode already researches a task, generates structured steps and allows the user to choose which steps to execute.

That maps well to the requirement that the assistant should **plan multi-step work and iterate**, rather than answer once.

### Local tools — strong foundation

The current tool layer already includes:

- `read_file`
- `create_file`
- `modify_file`
- `delete_file`
- `create_folder`
- `list_files`
- `search_files`
- `analyze_codebase`
- `execute_shell`
- `list_skills`
- `read_skill`

This is a useful base for extending into spreadsheets, Office documents, OCR, local knowledge retrieval and specialist industrial tools.

### Human-in-the-loop — potential differentiator

This may be one of the best existing parts of the repo.

File mutations and shell actions are staged first. The user can:

- approve everything;
- review actions individually;
- inspect diffs;
- accept;
- reject;
- cancel.

For a confidential industrial or defence-oriented system, this is stronger than “full autonomy by default.”

Keep it.

### Action tracking — useful seed

The `ActionTracker` already records:

- type of action;
- path;
- timestamp;
- before/after state;
- command/tool details;
- approval state.

Today this is in-memory. With persistence, it can become the beginning of an **audit/evidence trail**.

---

# 4. Non-Negotiable Changes for SIH26117

## P0 — Replace cloud inference with local open-weight inference

Today the model is supplied through OpenRouter.

That directly conflicts with the sovereign/air-gapped requirement.

Introduce a local model abstraction such as:

```text
Agent Aamir
    ↓
Local Model Gateway
    ↓
Model Registry
    ├── General reasoning model
    ├── Coding model
    ├── Vision/document model
    └── Embedding model
```

Possible serving layers:

- Ollama
- llama.cpp
- vLLM
- another entirely local OpenAI-compatible endpoint

The specific models can change. The **architecture should not depend on one model**.

### Goal

Adding a new model should mean editing a model registry/config, not rewriting Agent Aamir.

---

## P0 — Build a real Sovereign / Air-Gapped Mode

Do not simply say “we don't call the internet.”

Make it a visible product mode.

Example:

```text
PROFILE=SOVEREIGN
```

In Sovereign Mode:

- OpenRouter unavailable;
- Firecrawl unavailable;
- Telegram unavailable;
- external HTTP tools unavailable;
- local model endpoints only;
- local knowledge sources only;
- outbound networking blocked;
- audit/evidence logging enabled.

The current Telegram and Firecrawl capabilities can remain in the repo for non-sovereign deployments, but they should be **impossible to invoke in Sovereign Mode**.

This turns a limitation into an architectural feature.

---

## P0 — Prove zero external calls

The problem statement explicitly asks for this.

During the demo, show something visible such as:

- network interface disabled; and/or
- firewall egress deny policy;
- local connection monitor;
- packet/network monitor;
- application egress log.

The judge should be able to see:

```text
External inference calls: 0
External tool calls: 0
Local model calls: 6
Local knowledge retrievals: 4
Local tool calls: 9
```

Do not leave sovereignty as a slide.

**Demonstrate it.**

---

## P0 — Implement model routing across at least two task types

The PS explicitly expects model auto-selection.

Keep this simple and demonstrable.

For example:

```text
Task
 ↓
Task Classifier
 ├── DOCUMENT / GENERAL → General local LLM
 ├── CODE → Coding model
 └── VISION / SCANNED DOCUMENT → Vision-language model
```

Record the selection in the audit trace:

```text
Task: analyse scanned inspection report
Detected capability: vision_document
Selected model: <local VLM>
Reason: image/PDF input present
```

Then run a second task:

```text
Task: create and verify calculation script
Detected capability: code
Selected model: <local coding/reasoning model>
```

That satisfies the requirement far more convincingly than a dropdown containing several models.

---

## P0 — Sandbox code execution

Current shell execution happens on the host workspace after approval.

That is useful for development, but not strong enough for the SIH requirement.

Move code/shell execution into a bounded sandbox, for example:

```text
Agent
 ↓
Execution Request
 ↓
Approval
 ↓
Disposable Sandbox / Container
 ↓
stdout + stderr + generated artifacts
 ↓
Agent
```

At minimum:

- isolated working directory;
- time limit;
- CPU/memory limits where practical;
- no network;
- explicit allowed mounts;
- command/output capture.

Human approval + sandboxing together becomes a strong story.

---

# 5. P1 — Capabilities That Complete the MRPL Use Case

## Local Knowledge Base / RAG

The system should be able to ingest local:

- manuals;
- SOPs;
- internal correspondence;
- inspection reports;
- technical references.

A simple architecture is enough:

```text
Local Documents
 ↓
Parser / OCR
 ↓
Chunking
 ↓
Local Embedding Model
 ↓
Local Vector Store
 ↓
Retriever
 ↓
Agent
```

The important part is not which vector database wins a benchmark.

The important part is that:

- documents stay local;
- citations/source references can be surfaced;
- the agent can ground its work in organization-specific knowledge.

---

## Multimodal ingestion

The PS explicitly mentions scanned PDFs, handwritten notes, engineering drawings and photographs.

Do not try to solve every visual modality equally well.

Build **one excellent multimodal flow**:

```text
Scanned Inspection Report / Drawing
 ↓
Local OCR / VLM
 ↓
Structured extracted findings
 ↓
Local knowledge retrieval
 ↓
Agent reasoning
 ↓
Final deliverable
```

If this works reliably in the demo, it is enough to establish the architecture.

---

## Real deliverable generation

Chat output alone is not sufficient.

Give Agent Aamir artifact tools such as:

- `create_docx`
- `create_xlsx`
- `create_pptx`
- `create_report`
- `export_calculation`

For the main demo, **Word output is probably sufficient**.

Make the agent produce an actual approval note `.docx`, not Markdown pretending to be one.

Excel/PPT support can follow if time permits.

---

# 6. P1 — Turn ActionTracker into an Evidence Trail

The existing `ActionTracker` is a valuable foundation.

Persist it to something simple such as SQLite or JSONL.

For every run, record:

```text
Run ID
Timestamp
User goal
Execution profile
Model(s) selected
Selection reason
Knowledge sources retrieved
Tools called
Files read
Files proposed for modification
Approval / rejection events
Sandbox commands
Command outputs
Artifacts produced
External calls attempted
Final status
```

Then add a simple:

```text
/audit/<run-id>
```

or terminal report.

This gives the team a clean answer when judges ask:

> “How do I know what this AI actually did?”

---

# 7. Existing Repo Issues Worth Fixing Before the Demo

These are small compared with the architecture work, but they can destroy a live demo.

### Plan Mode early return

Inside `modes/plan/orchestrator.ts`, the current pattern:

```ts
if (r.text) return console.log(...)
```

can terminate Plan Mode after the first selected step returns text.

That may prevent later selected steps and the final approval/apply flow from running.

Fix this before relying on multi-step execution.

---

### Declare direct dependencies explicitly

`zod` is imported throughout the implementation but is not currently declared directly in `package.json`.

Even if it is arriving transitively, declare it explicitly.

Hackathon demos should not depend on accidental dependency resolution.

---

### Review startup exit handling

The wake-up menu logic should be tested thoroughly, including explicit Exit behaviour and cancellation.

Small CLI flow bugs are highly visible during a demo.

---

### Add end-to-end regression tests

At minimum create repeatable tests for:

1. read-only Ask task;
2. Agent task with staged file creation;
3. rejection leaves filesystem unchanged;
4. approval applies exact staged changes;
5. multi-step Plan task executes all selected steps;
6. sandbox has no external network;
7. Sovereign Mode rejects any external connector;
8. model router selects two different models for two known task classes.

---

# 8. Recommended Demo

Do **one deep story**, not ten shallow capabilities.

## Suggested scenario

Provide the workstation with:

- one synthetic scanned refinery inspection report;
- one synthetic/internal-style SOP or maintenance manual;
- optionally one image/drawing associated with the inspection.

Then ask:

> **Review this inspection package, identify the important findings, check them against the relevant internal procedure, perform the necessary calculation if required, and prepare an approval note.**

The audience should visibly see:

```text
1. File received locally
2. OCR / vision model selected automatically
3. Findings extracted
4. Local SOP retrieved
5. Agent generates a plan
6. User reviews/selects plan
7. Calculation/code task routed to appropriate local model
8. Code executes inside sandbox
9. Agent drafts approval note
10. Proposed artifact/action is shown
11. Human approves
12. Word file is produced
13. Audit report is shown
14. Network monitor shows zero outbound traffic
```

Then run a tiny second task specifically to prove model routing:

> “Write and verify a Python calculation for X.”

Show the coding model being selected instead.

This one demonstration touches almost the entire PS.

---

# 9. The Pitch Should NOT Be “We Built a Local ChatGPT”

That framing undersells the architecture and puts the team into a crowded comparison.

A stronger positioning is:

> **Agent Aamir is a sovereign agentic workbench that allows confidential industrial teams to use modern AI capabilities without allowing organizational data to leave their premises.**

Even stronger:

> **It does not just answer questions locally. It plans work, chooses the appropriate local model, works with internal knowledge, operates local tools, executes code in isolation, produces real deliverables, and keeps humans in control of consequential actions.**

That is much closer to what MRPL is actually asking for.

---

# 10. What I Would NOT Build Yet

Avoid losing the hackathon to scope creep.

Do not prioritize:

- five different UI clients;
- ten model integrations;
- elaborate multi-agent roleplay;
- a sophisticated admin portal;
- dozens of artifact formats;
- huge-model benchmarking;
- enterprise SSO;
- production Kubernetes;
- fine-tuning;
- perfect handwriting recognition;
- every engineering drawing type.

Those can come later.

For the hackathon, nail this:

> **AIR-GAPPED → MULTIMODAL INPUT → LOCAL KNOWLEDGE → MODEL ROUTING → AGENT PLAN → SANDBOXED TOOL EXECUTION → HUMAN APPROVAL → REAL DELIVERABLE → AUDIT / ZERO-EGRESS PROOF**

If that chain works reliably, the project will already feel much more complete than a feature-heavy prototype whose core sovereign claim cannot be demonstrated.

---

# 11. Suggested Build Order

### Phase 1 — Sovereign foundation
1. Local inference adapter
2. Sovereign execution profile
3. hard-disable all cloud/network tools
4. visible zero-egress proof

### Phase 2 — Agent reliability
5. fix Plan Mode multi-step flow
6. sandbox shell/code execution
7. persist ActionTracker

### Phase 3 — SIH intelligence requirements
8. model registry
9. task classifier/router
10. two-model automatic-selection demo

### Phase 4 — Industrial workflow
11. local document ingestion
12. local embeddings + retrieval
13. OCR/VLM pipeline
14. one strong scanned-document workflow

### Phase 5 — Deliverable + demo
15. `.docx` generation
16. end-to-end inspection-to-approval-note scenario
17. audit viewer/report
18. offline demo rehearsal and regression testing

---

# 12. Stretch Differentiators — Only After the Core Works

If time remains:

### Policy-based tool permissions

Example:

```text
READ_ONLY
ANALYST
ENGINEERING
SOVEREIGN_ADMIN
```

Each profile determines which tools/actions an agent may request.

### Source provenance

Final output can identify which local documents supported each major conclusion.

### Model-selection explanation

Show not only which model was chosen, but why.

### Approval risk tiers

Example:

```text
Read local document        → automatic
Create draft artifact      → review
Run calculation            → review
Modify source file         → explicit approval
Shell/system operation     → explicit approval
```

### Reproducible run package

Export:

- goal;
- model routing;
- retrieved sources;
- tool trace;
- approvals;
- artifacts;
- hashes/logs.

That could become an excellent judging artifact.

---

# Final Recommendation

**Do not rebuild Agent Aamir. Refactor it around the sovereignty requirement.**

The strongest existing components — tool-loop execution, Plan/Ask/Agent modes, staged changes, approval, diffs, local file tooling and action tracking — are already useful.

Spend the engineering effort on the missing pieces that SIH26117 explicitly rewards:

1. local open-weight inference;
2. automatic model routing;
3. air-gap enforcement and proof;
4. local knowledge retrieval;
5. multimodal document understanding;
6. sandboxed execution;
7. real artifact generation;
8. persistent auditability.

If those pieces are integrated into **one reliable end-to-end industrial workflow**, Agent Aamir stops looking like a generic developer agent and starts looking like a credible answer to the MRPL problem statement.

---

## One-Line Build Thesis

> **Keep the agent. Localize the intelligence. Govern the tools. Ground it in private knowledge. Prove the air gap. Ship a real deliverable.**
