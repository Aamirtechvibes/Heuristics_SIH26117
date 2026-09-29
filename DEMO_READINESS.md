# AURA — SIH 2026 PS 26117 Judge Demonstration Readiness Checklist

**Product Name:** AURA — Sovereign Agentic AI Workbench  
**Target Organization:** Mangalore Refinery and Petrochemicals Limited (MRPL)  
**Date:** September 29, 2026

---

## 1. Hackathon Demonstration Readiness Scorecard

| Judge Demonstration Criterion | Status | Verification & Empirical Proof |
|---|---|---|
| **LIVE END-TO-END** | **PASS** | Complete execution from PDF/text report input -> Ollama model router -> SOP retrieval -> Python sandbox math -> DOCX/XLSX/PPTX outputs. |
| **REAL OLLAMA INFERENCE** | **PASS** | `OllamaLocalProvider` connects to local Ollama API over `http://127.0.0.1:11434`. |
| **REAL MULTIMODAL VISION** | **PASS** | `LocalOcrEngine` & `IndustrialDocumentParser` process visual image frames and scanned document text using local vision model `llava:latest`. |
| **REAL MODEL ROUTING** | **PASS** | Task-based router selecting `llava` for `vision_ocr` & `qwen2.5-coder:7b` for `document_reasoning`. |
| **REAL AGENT DECISION** | **PASS** | State machine graph transitions dynamically based on tool observations (`CRITICAL_HAZARD_ISOLATION` vs `NORMAL_MAINTENANCE_MONITORING`). |
| **LOCAL KNOWLEDGE** | **PASS** | `LocalKnowledgeRetriever` indexes MRPL SOP manuals locally and passes citations (`sourceFile`, `pageNumber`, `snippet`) into the reasoning engine. |
| **PYTHON SANDBOX MATH** | **PASS** | `PythonSandboxTool` executes Python sub-process math calculating wall thickness deficit (e.g. `1.40 mm` deficit vs `4.50 mm` T-min limit). |
| **CLAIM VERIFICATION** | **PASS** | `VerifierTool` evaluates hazard rules against retrieved SOP evidence (`SUPPORTED` vs `UNCERTAIN`). |
| **REAL DOCX GENERATION** | **PASS** | Generates real Word Approval Note (`MRPL_Confidential_Approval_Note.docx` / `MRPL_Inspection_Certificate.docx`). |
| **REAL XLSX GENERATION** | **PASS** | Generates real Excel Inspection Sheet (`MRPL_Inspection_Findings_Analysis.xlsx`). |
| **REAL PPTX GENERATION** | **PASS** | Generates real PowerPoint Deck (`MRPL_Management_Inspection_Summary.pptx`). |
| **OFFLINE COMPLIANCE** | **PASS** | Operates 100% locally with internet disconnected (`SOVEREIGN_MODE=true`). |
| **SOVEREIGNTY GUARD** | **PASS** | Socket-level fetch interceptor hard-blocks cloud AI endpoints (`openrouter.ai`, `api.openai.com`, `anthropic`). Includes UI "Test Sovereignty Block" button. |
| **ANTI-HARDCODING PROOF** | **PASS** | Tested with 2 different reports (`REPORT A` = 3.10mm critical vs `REPORT B` = 5.20mm safe); agent decision branches and output DOCX change dynamically. |
| **WEB WORKBENCH UI** | **PASS** | React UI connected via live API server (`http://localhost:3001`), visualizing execution timeline, model routing, SOP cards, sandbox output, and download buttons. |

---

## 2. Recommended Hackathon Judge Demonstration Sequence

1. **Step 1: Sovereignty Proof & Test Block**
   - Show the **Sovereignty Badge**: `SOVEREIGN MODE: ACTIVE | 0 CLOUD CALLS`.
   - Click the **"Test Sovereignty Block"** button in the UI.
   - Show the live audit ledger intercepting and blocking the outbound request to `https://openrouter.ai`.

2. **Step 2: Submit Industrial Request**
   - Select **REPORT A** (`EX-402A`: measured thickness `3.10 mm` vs `4.50 mm` T-min limit).
   - Click **"Run Autonomous Industrial Worker Task"**.

3. **Step 3: Show Model Routing & Multimodal OCR**
   - Point to the **Model Router Panel**: `LLaVA (Vision/OCR)` & `Qwen 2.5 Coder (Reasoning)`.

4. **Step 4: Show SOP Citations & Sandboxed Math**
   - Show retrieved MRPL SOP `SOP-MNT-2024-04` Section 4.2 emergency repair protocol.
   - Show Python Sandbox output: `CRITICAL DEFICIT: Wall thickness is 1.40 mm below minimum allowable limit (T-min)`.

5. **Step 5: Show Conditional Decision Branch**
   - Point to Node 6: `BRANCH TAKEN: Measured 3.10mm < T-min 4.50mm -> CRITICAL_HAZARD_ISOLATION`.

6. **Step 6: Anti-Hardcoding Comparison (Switch to REPORT B)**
   - Click **REPORT B** (`EX-402B`: measured thickness `5.20 mm` vs `4.50 mm` T-min limit).
   - Click **"Run Task"**.
   - Show Node 6: `BRANCH TAKEN: Measured 5.20mm >= T-min 4.50mm -> NORMAL_MAINTENANCE_MONITORING`.
   - Show generated document changed to `MRPL_Inspection_Certificate.docx`.

7. **Step 7: Download Real Deliverables**
   - Click download links to open real `.docx`, `.xlsx`, and `.pptx` deliverables generated on disk.

---

## 3. Exact Commands to Run

```bash
# 1. Run All Automated Unit Tests (E2E & Sovereignty)
bun test

# 2. Run Full Judge Demonstration
bun run demo:full

# 3. Run Anti-Hardcoding Evaluation Test (Report A vs Report B)
bun aura/demo/test-anti-hardcoding.ts

# 4. Start Live Backend API & Web Workbench UI
bun run api           # Starts API server on http://localhost:3001
cd todo-app && bun run dev  # Starts Web Workbench UI on http://localhost:5173
```

---

## 4. What NOT to Claim (Hackathon Honesty Guidelines)

- **Do NOT claim** live cloud integration with Canva or Google Sheets (explain data sovereignty requires 100% on-premise local file generation first).
- **Do NOT claim** a 100B parameter model is required (explain open-weight 7B & vision models provide fast, highly accurate on-premise industrial inference).
