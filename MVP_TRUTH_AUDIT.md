# AURA Sovereign AI Workbench — MVP Truth Audit
**Date:** September 29, 2026  
**Auditor:** AI Agentic System  
**Purpose:** Honest evaluation of every feature and architectural module against SIH 2026 PS 26117 requirements.

---

## 1. Feature-by-Feature Truth Audit Table

| Feature / Component | Current Status | Real / Fake / Partial | Empirical Evidence | Strategic Decision |
|---|---|---|---|---|
| **Sovereignty Monitor & Guard** | Working | **PARTIAL** | Intercepts model calls in `models.config.ts` and throws `SovereigntyViolationError`. **Gap:** Does not yet monkeypatch global Node/Bun `fetch` to trap un-monitored HTTP traffic across 3rd-party libs. | **REWRITE / ENHANCE** into a global fetch-intercepting `SovereigntyGuard`. |
| **Local Model Router** | Working | **PARTIAL** | `ModelRouter` maps task types (`vision_ocr`, `coding_calculation`, `document_reasoning`) to distinct local model IDs (`llava`, `qwen2.5-coder`, `llama3.2`). **Gap:** Currently selects models theoretically; needs explicit runtime fallback when Ollama is active vs offline. | **ENHANCE** with real dynamic Ollama API calls and live availability detection. |
| **Multimodal Document Parser** | Working | **PARTIAL** | Parses PDF text via `pdf-parse` and extracts equipment findings. **Gap:** Image OCR (scanned PDFs / PNGs) uses fallback metadata rather than rendering canvas image frames for local vision model / OCR processing. | **REWRITE / ENHANCE** to add native canvas page rendering & image OCR pipeline. |
| **Local Knowledge Base** | Working | **REAL** | `LocalKnowledgeBase` indexes local `.txt`, `.md`, `.pdf`, `.json` SOP documents and searches section headers returning exact snippets and page citations. | **KEEP & ENHANCE** with BM25 / ranking score. |
| **Sandboxed Python Calculator** | Working | **REAL** | `CodeSandbox` executes Python script in isolated sub-process via `spawn("python3")`, capturing stdout/stderr with a 10s execution timeout. | **KEEP & ENHANCE** with strict memory and environment boundaries. |
| **Claim & SOP Verifier** | Working | **REAL** | `ClaimVerifier` cross-checks extracted equipment measurements against SOP safety rules and flags status (`SUPPORTED` vs `UNCERTAIN`). | **KEEP & ENHANCE** to support multi-condition verification. |
| **DOCX Deliverable Generator** | Working | **REAL** | `DocxGenerator` programmatically creates valid Word documents (`.docx`) using the `docx` library with tables, metadata, and signoff blocks. | **KEEP**. |
| **XLSX Deliverable Generator** | Working | **REAL** | `XlsxGenerator` programmatically creates Excel spreadsheets (`.xlsx`) using `exceljs` with formatted headers and severity coloring. | **KEEP**. |
| **PPTX Deliverable Generator** | Working | **REAL** | `PptxGenerator` programmatically creates PowerPoint presentations (`.pptx`) using `pptxgenjs` with title, findings table, and security slides. | **KEEP**. |
| **Agent Orchestration** | Working | **PARTIAL** | `SovereignOrchestrator` executes timeline steps sequentially. **Gap:** Operates as a linear async runner rather than a formal state graph with conditional retry branches. | **REWRITE** into a formal Stateful Agent Graph (State Machine) with state transitions & error recovery. |
| **Web Workbench UI** | Working | **REAL** | React app (`todo-app/App.tsx`) displays live execution timeline, model choices, retrieved SOP snippets, sandboxed python output, and deliverable download actions. | **KEEP & POLISH**. |
| **Old Agent Aamir CLI** | Legacy | **REDUNDANT** | Terminal CLI tools (`modes/ask`, `modes/plan`) designed for software coding rather than industrial engineering workflows. | **RESTRUCTURE / DEPRECATE** in favor of AURA Sovereign Workbench. |

---

## 2. Weakness & Gap Identification

1. **Global Network Interception**:
   - *Current limitation:* Sovereignty guard relies on explicit function calls.
   - *Fix needed:* Intercept global `fetch` / `http.request` so any attempt by any package to connect to external IPs/domains in Sovereign Mode is blocked at the socket level.

2. **State Graph vs Linear Flow**:
   - *Current limitation:* `SovereignOrchestrator` executes steps sequentially.
   - *Fix needed:* Implement a state machine graph (`AuraAgentGraph`) where state transitions (`state.currentStep`), error retries (`ON_ERROR -> REPAIR`), and verification branches (`IF verification == UNCERTAIN -> REQUEST_HUMAN_REVIEW`) are explicitly modeled.

3. **Scanned PDF & Image OCR Rendering**:
   - *Current limitation:* Text PDFs extract text directly; scanned images have metadata extraction.
   - *Fix needed:* Add a dedicated image rendering & OCR pipeline for scanned industrial documents.

---

## 3. Re-Architecture Plan

We will restructure the codebase cleanly under `aura/`:

```
aura/
├── core/
│   ├── state-graph.ts         # Stateful Agent Execution Graph & State Machine
│   ├── sovereignty-guard.ts    # Global fetch interceptor & audit ledger
│   └── model-registry.ts      # Ollama local model provider & router
├── document/
│   ├── ocr-engine.ts           # PDF page image renderer & local OCR
│   └── industrial-doc.ts      # Industrial document model (MRPL equipment specs)
├── knowledge/
│   └── local-retriever.ts     # On-premise SOP document indexer & ranker
├── tools/
│   ├── sandbox-tool.ts        # Python engineering calculation sandbox
│   ├── verifier-tool.ts       # Claim & safety verification engine
│   └── deliverable-tools.ts   # Programmatic DOCX, XLSX, PPTX generators
├── demo/
│   ├── synthetic-data.ts      # Realistic MRPL refinery synthetic dataset
│   └── run-aura-demo.ts       # One-click hackathon demonstration
└── ui/                        # Web Workbench UI (todo-app integration)
```
