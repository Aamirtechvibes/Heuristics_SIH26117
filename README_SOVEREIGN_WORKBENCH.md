# Sovereign On-Premise Agentic AI Workbench (AURA)
**SIH 2026 Problem Statement 26117**  
**Target Organization:** Mangalore Refinery and Petrochemicals Limited (MRPL)  
**Base Architecture:** Evolved from Agent Aamir Execution Foundation

---

## 1. Executive Summary & Problem Overview

Industrial organizations such as refineries, PSUs, and defense manufacturing units work with highly confidential data:
- Inspection reports & NDT ultrasonic wall thickness scans
- P&IDs and engineering drawings
- Standard Operating Procedures (SOPs) and maintenance manuals
- Scanned documents and handwritten notes
- Engineering calculations & failure mode analysis

This sensitive operational information **must never leave on-premise infrastructure** or be sent to public cloud AI APIs (e.g., OpenAI, Anthropic, OpenRouter).

**AURA (Sovereign AI Workbench)** provides a 100% on-premise, air-gapped, open-weight multimodal AI worker capable of executing end-to-end industrial workflows, retrieving local SOP evidence, running sandboxed Python engineering calculations, and programmatically generating real DOCX, XLSX, and PPTX deliverables—all backed by visible proof of zero external cloud calls.

---

## 2. Architecture Diagram

```
[ Confidential Industrial Document / Report ]
                     │
                     ▼
       ┌──────────────────────────┐
       │   SOVEREIGNTY MONITOR    │ ◄── Enforces 0 Cloud AI Calls & Audit Log
       └─────────────┬────────────┘
                     │
                     ▼
       ┌──────────────────────────┐
       │    LOCAL MODEL ROUTER    │ ◄── Routes Task -> Open-Weight Model
       └──────┬──────────────┬────┘
              │              │
    Vision/OCR model     Reasoning model
   (LLaVA / Qwen2-VL)   (Qwen 2.5 Coder)
              │              │
              └──────┬───────┘
                     │
                     ▼
       ┌──────────────────────────┐
       │ LOCAL KNOWLEDGE RETRIEVER │ ◄── Indexes Local SOP Manuals & Evidence
       └─────────────┬────────────┘
                     │
                     ▼
       ┌──────────────────────────┐
       │ PYTHON SANDBOX CALCULATOR│ ◄── Calculates T-min deficit & safe life
       └─────────────┬────────────┘
                     │
                     ▼
       ┌──────────────────────────┐
       │   CLAIM & SOP VERIFIER   │ ◄── SUPPORTED vs UNCERTAIN verification
       └─────────────┬────────────┘
                     │
                     ▼
       ┌──────────────────────────┐
       │  PROGRAMMATIC GENERATORS │ ◄── Real DOCX, XLSX, PPTX Output Files
       └─────────────┬────────────┘
                     │
                     ▼
       ┌──────────────────────────┐
       │ HUMAN APPROVAL & AUDIT   │ ◄── Staged Signoff before action commit
       └──────────────────────────┘
```

---

## 3. What Is Fully Implemented & Working

| Feature / Module | Implementation Status | Description |
|---|---|---|
| **Sovereignty Monitor** | **WORKING** | Guardrailsingleton that blocks external cloud AI calls (`openrouter.ai`, `api.openai.com`, `anthropic`) when `SOVEREIGN_MODE=true` and logs network audits. |
| **Local Model Router** | **WORKING** | Task-based router selecting local Ollama models (`qwen2.5-coder`, `llava`, `llama3.2`) with explicit task type, selection reason, and fallback. |
| **Multimodal Document Parser** | **WORKING** | Local text/PDF parser extracting equipment IDs, inspection dates, wall thickness measurements, allowable T-min limits, and severity. |
| **Local Knowledge Base** | **WORKING** | On-premise SOP document indexer and evidence-aware search returning source filename, page/section, and exact snippet. |
| **Sandboxed Python Calculator** | **WORKING** | Subprocess-isolated Python engineering math execution (evaluates wall thickness deficit, corrosion rate, remaining safe service life). |
| **Claim & Evidence Verifier** | **WORKING** | Cross-verifies extracted equipment findings against SOP safety rules. |
| **DOCX Deliverable Generator** | **WORKING** | Programmatically generates confidential Word Approval Notes (`.docx`) with headers, metadata, findings tables, SOP citations, and signature signoff blocks. |
| **XLSX Deliverable Generator** | **WORKING** | Programmatically generates Excel inspection analysis spreadsheets (`.xlsx`) with formatted headers and severity highlights. |
| **PPTX Deliverable Generator** | **WORKING** | Programmatically generates PowerPoint executive management decks (`.pptx`). |
| **Deterministic Demo Runner** | **WORKING** | One-click command `bun run demo` executing the complete end-to-end killer workflow. |
| **Workbench Web UI** | **WORKING** | Interactive React workbench UI (`todo-app`) visualizing the execution timeline, model routing, SOP citations, python output, and download buttons. |

---

## 4. Installation & Setup Instructions

### Prerequisites
1. **Bun** (v1.3+) installed:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
2. **Ollama** (for local open-weight model inference):
   ```bash
   # Download Ollama from https://ollama.com
   ollama pull qwen2.5-coder:7b
   ollama pull llava
   ollama pull llama3.2:3b
   ```

### Quick Start
1. Clone the repository and install dependencies:
   ```bash
   cd "Agent Aamir"
   bun install
   ```

2. Run the deterministic Industrial Demo:
   ```bash
   bun run demo
   ```
   Or via the CLI menu:
   ```bash
   bun start
   ```

3. Run the Web Workbench UI:
   ```bash
   cd todo-app
   bun run dev
   ```

4. Run unit tests:
   ```bash
   bun test
   ```

---

## 5. Primary Hackathon Demo Journey

1. **Start the Demo**: Execute `bun run demo`.
2. **Observe Sovereignty Status**: `[SOVEREIGNTY MONITOR] Sovereign Mode: ACTIVE | Cloud AI Calls: BLOCKED | 0 External Calls`.
3. **Model Routing**: Router selects `LLaVA` for vision/OCR task and `Qwen 2.5 Coder` for engineering logic and SOP reasoning.
4. **Document & SOP Processing**: Parses `demo-data/inspection-report.txt` for equipment `EX-402A` (Crude Pre-Heat Exchanger Shell), identifying wall thickness `3.10 mm` vs allowable minimum `4.50 mm`.
5. **Knowledge Search**: Retrieves MRPL Standing Operating Procedure `SOP-MNT-2024-04` Section 4.2 emergency repair protocol.
6. **Sandboxed Calculation**: Python runner executes remaining safe life math:
   `CRITICAL DEFICIT: Wall thickness is 1.40 mm below minimum allowable limit (T-min).`
7. **Real Deliverables Produced**:
   - `output_deliverables/MRPL_Confidential_Approval_Note.docx`
   - `output_deliverables/MRPL_Inspection_Findings_Analysis.xlsx`
   - `output_deliverables/MRPL_Management_Inspection_Summary.pptx`
8. **Human Signoff**: Staging approval gate presented before final action commitment.

---

## 6. Security Assumptions & Data Sovereignty

- **Zero External AI Calls**: Network calls to cloud providers are guarded and rejected at runtime by `SovereigntyMonitor`.
- **On-Premise Model Runtimes**: Ollama handles all inference locally over `http://127.0.0.1:11434`.
- **Sandboxed Execution**: Python calculation scripts run in isolated scratch sub-processes with strict execution timeouts.
- **Human-in-the-loop**: Sensitive engineering mutations remain staged until explicit engineering approval.
