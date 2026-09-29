# AURA — Sovereign Agentic AI Workbench

### Private, on-premise AI that can understand, reason, act, verify and deliver.

[![SIH 2026](https://img.shields.io/badge/SIH%202026-PS%2026117-blue.svg)](https://sih.gov.in)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.1+-black.svg)](https://bun.sh)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![Ollama](https://img.shields.io/badge/Ollama-Local_Inference-orange.svg)](https://ollama.com)
[![LangGraph](https://img.shields.io/badge/Orchestration-LangGraph_StateGraph-green.svg)](https://github.com/langchain-ai/langgraphjs)

AURA is a sovereign Agentic AI Workbench designed for confidential industrial knowledge work. It combines local open-weight models, multimodal document understanding, task-based model routing, local knowledge retrieval, tool execution, verification, and real business document generation without requiring cloud AI services.

---

```
 🛡️ LOCAL AI   │   🤖 AGENTIC EXECUTION   │   👁️ MULTIMODAL
 📚 LOCAL KNOWLEDGE   │   🔍 VERIFICATION   │   📄 REAL DELIVERABLES
```

---

## 🏢 The Problem

Industrial organizations such as refineries (e.g., MRPL), PSUs, defence-linked manufacturing units, and government enterprises handle highly sensitive data every day:

- Scanned inspection reports & thickness measurements
- Piping & Instrumentation Diagrams (P&IDs) and engineering drawings
- Standard Operating Procedures (SOPs) & OEM technical manuals
- Engineering calculations & allowable stress formulas
- Confidential internal notes, approvals, & financial records

**Why cloud AI fails industrial requirements:**
1. **Data Leakage Risk:** Sending proprietary engineering data to external cloud APIs violates strict security compliance.
2. **Lack of Verifiable Grounding:** Generic chatbots fabricate answers without verifiable mathematical or document citations.
3. **No Executive Output:** Chatbots output raw text markdown instead of structured, ready-to-sign corporate documents (`.docx`, `.xlsx`, `.pptx`).

**AURA keeps the entire AI workflow strictly local, private, and verifiable on-premise.**

---

## 💡 The Big Idea

```text
       CONFIDENTIAL INPUT (PDF / Image / Report)
                           ↓
             LOCAL MULTIMODAL UNDERSTANDING
                           ↓
                  TASK / MODEL ROUTING
                           ↓
                     AGENT PLANNING
                           ↓
                    LOCAL KNOWLEDGE
                           ↓
               TOOLS & PYTHON SANDBOX
                           ↓
               AUTOMATED VERIFICATION
                           ↓
               REAL BUSINESS DELIVERABLE
                           ↓
                     HUMAN APPROVAL
```

---

## ⚔️ Why AURA is Not Just a Chatbot

| Feature / Capability | Normal Cloud Chatbot | AURA Sovereign Agentic Workbench |
| :--- | :--- | :--- |
| **Primary Output** | Text / Markdown answers | Multi-step execution & actual DOCX/XLSX/PPTX files |
| **Workflow** | Single prompt-response loop | Autonomous multi-phase planning & tool orchestration |
| **Model Strategy** | Single monolithic model | Task-based local open-weight routing (`qwen2.5-coder`, `llava`) |
| **Data Privacy** | Sends raw data to external cloud APIs | 100% On-Premise socket-enforced local inference |
| **Evidence & Truth** | Unverified hallucinated text | Source-aware evidence & claim verification against SOPs |
| **Engineering Math** | Approx. LLM mental arithmetic | Isolated sandboxed Python code execution |
| **Auditability** | Opaque black box response | Step-by-step execution timeline with inspectable state |

---

## 🌟 Key Features

### 1. 🛡️ Sovereign Local AI
- Socket-level network interceptor (`SovereigntyGuard`) blocks outbound HTTP/HTTPS requests to external LLM vendors.
- Zero data leaves your physical or air-gapped infrastructure.

### 2. 🔀 Intelligent Model Router
- Dynamically selects optimal local models per sub-task:
  - **Vision & OCR:** `llava:latest`
  - **Reasoning & Planning:** `qwen2.5-coder:7b`
  - **Engineering Code:** `qwen2.5-coder:7b`

### 3. 👁️ Multimodal Document Understanding
- Renders PDF pages into images and processes visual artifacts, engineering stamps, tables, and handwritten notes directly via local open-weight vision models.

### 4. 📚 Local Knowledge Retrieval
- Local indexed search over confidential SOPs, manuals, and technical specifications with exact clause extraction and page citations.

### 5. 🧠 Stateful Agent Execution
- Built on a stateful graph topology (`LangGraph`), orchestrating Planning → Inspection OCR → SOP Retrieval → Math Execution → Claim Verification → Deliverable Generation.

### 6. 🧮 Sandboxed Engineering Calculations
- Runs generated Python code in an isolated sub-process sandbox to evaluate formulas (e.g., Barlow's formula for pipe wall thickness: $t = \frac{P \cdot D}{2SE + 2PY}$).

### 7. ✅ Evidence & Verification
- Cross-checks extracted measurements against allowable limits in local SOPs and generates a verifiable audit log with claim statuses (`VERIFIED`, `VIOLATION`, `UNVERIFIED`).

### 8. 📄 Real Business Deliverables
- Programmatically compiles output directly into formatted Word documents (`.docx`), Excel spreadsheets (`.xlsx`), and PowerPoint presentations (`.pptx`).

---

## 🎯 Primary Demo: The "Killer Workflow"

### Scenario
An industrial engineer uploads a scanned inspection report of a refinery pipeline along with the refinery's Pipe Inspection SOP.

**User Prompt:**
> *"Analyze the inspection report, identify critical findings, cross-check them against the SOP, perform the engineering calculation, verify the result, and prepare the approval note."*

```text
       ┌──────────────────────────────┐
       │ Scanned Inspection Report    │
       │ + Piping Maintenance SOP     │
       └──────────────┬───────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │  Local OCR / Vision     │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │  Task & Model Router    │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │  Agent Planning Graph   │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │  Local SOP Retrieval    │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │  Python Math Sandbox    │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │   Claim Verification    │
         └────────────┬────────────┘
                      │
                      ▼
   ┌─────────────────────────────────────┐
   │  Executive Approval Note (.docx)     │
   │  Engineering Calculation (.xlsx)     │
   │  Executive Briefing (.pptx)          │
   └──────────────────┬──────────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │   Human-in-the-Loop     │
         │   Review & Sign-Off     │
         └─────────────────────────┘
```

---

## 🏗️ System Architecture

```text
                                  +---------------------------------------+
                                  |         AURA Web Dashboard            |
                                  |    (React 18 + Vite + TypeScript)     |
                                  +-------------------+-------------------+
                                                      |
                                                      | HTTP / API
                                                      v
                                  +---------------------------------------+
                                  |          Bun API Server               |
                                  |            (port 3001)                |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |           Sovereignty Guard           |
                                  |     (Socket Level Air-Gap Enforcement)|
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |          Task & Model Router          |
                                  +---------+-----------------+-----------+
                                            |                 |
                          (Vision / OCR)    |                 | (Reasoning / Code)
                                            v                 v
                                  +------------------+ +------------------+
                                  |   llava:latest   | | qwen2.5-coder:7b |
                                  +------------------+ +------------------+
                                            |                 |
                                            +--------+--------+
                                                     |
                                                     v
                                  +---------------------------------------+
                                  |        LangGraph Execution Graph      |
                                  |   (Planner -> OCR -> Retrieval ->     |
                                  |    Sandbox -> Verifier -> Deliverer)  |
                                  +---+-------------------+---------------+
                                      |                   |
               +----------------------+                   +----------------------+
               |                                                                 |
               v                                                                 v
+-----------------------------+                                   +-----------------------------+
|    Local SOP Retriever      |                                   |    Python Execution Sandbox   |
| (On-Premise In-Memory DB)   |                                   |  (Isolated Subprocess Engine)|
+-----------------------------+                                   +-----------------------------+
               |                                                                 |
               +----------------------+                   +----------------------+
                                      |                   |
                                      v                   v
                                  +---------------------------------------+
                                  |       Document Generator Engine       |
                                  |       (docx, exceljs, pptxgenjs)      |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |         Executive Deliverables        |
                                  |  (.docx Approval Note, .xlsx, .pptx)  |
                                  +---------------------------------------+
```

---

## 📁 Repository Structure

```text
.
├── aura/                       # AURA Core Engine
│   ├── api/                    # Bun HTTP API server (port 3001)
│   ├── core/                   # Sovereignty Guard, Model Registry, Ollama Provider, StateGraph
│   ├── demo/                   # E2E CLI demonstration & anti-hardcoding test suite
│   ├── document/               # PDF Parser, Local Vision OCR Engine, Scanned PDF Generator
│   ├── knowledge/              # On-premise SOP retriever & indexer
│   └── tools/                  # Python Sandbox Tool, Claim Verifier Tool, Deliverable Generators
├── todo-app/                   # AURA Modern Web Dashboard (React + Vite + Vanilla CSS)
│   └── src/                    # Reactive UI components, state visualization, execution timeline
├── demo-data/                  # Synthetic Demonstration Dataset (Reproducible SIH Test Files)
├── tests/                      # Unit and integration test suite
├── .env.example                # Safe environment variable configuration template
├── package.json                # Project dependencies & root run scripts
└── tsconfig.json               # TypeScript configuration
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js / Bun**: [Bun v1.1+](https://bun.sh) installed.
- **Ollama**: [Ollama](https://ollama.com) installed and running locally.
- **Python**: Python 3.x installed (for sandboxed calculations).

### 2. Pull Local Open-Weight Models
Start Ollama and pull the required open-weight models:
```bash
ollama pull qwen2.5-coder:7b
ollama pull llava:latest
```

### 3. Setup Project
Clone the repository and install dependencies:
```bash
git clone https://github.com/Aamirtechvibes/Heuristics_SIH26117.git
cd Heuristics_SIH26117

# Copy environment configuration
cp .env.example .env

# Install backend dependencies
bun install

# Install frontend dependencies
cd todo-app && bun install && cd ..
```

---

## 🧪 Running Demos & Testing

### Run End-to-End Automated Demonstration
Runs the full pipeline using synthetic test files, verifying OCR, local model routing, Python math sandbox, claim verification, and deliverable creation:
```bash
bun aura/demo/run-aura-demo.ts
```

### Run Anti-Hardcoding Validation
Demonstrates dynamic behavior by running the pipeline on two distinct synthetic inspection reports (Report A vs. Report B) to verify that decisions, calculations, and generated deliverables change dynamically:
```bash
bun aura/demo/test-anti-hardcoding.ts
```

### Run Unit & Integration Test Suite
```bash
bun test
```

### Run Web Application (Dashboard + API Server)
Start the backend server and frontend development interface:

**Backend API Server:**
```bash
bun run api
```

**Frontend Dashboard:**
```bash
cd todo-app && bun run dev
```
Open `http://localhost:5173` in your browser to interact with the AURA Web Workbench.

---

## 📊 Synthetic Demonstration Data Notice

> **IMPORTANT DISCLAIMER:**
> All files contained within the `demo-data/` directory (e.g., `inspection-report-scanned.pdf`, `sop-maintenance.txt`) are **100% SYNTHETIC DEMONSTRATION DATA** generated solely for testing and evaluating the Smart India Hackathon 2026 prototype.
> 
> They **DO NOT** contain real, proprietary, or confidential data from Mangalore Refinery and Petrochemicals Limited (MRPL) or any other organization.

---

## 📄 License & Attribution

Developed for **Smart India Hackathon 2026 (Problem Statement 26117)**.
Organization: **Mangalore Refinery and Petrochemicals Limited (MRPL)**.
