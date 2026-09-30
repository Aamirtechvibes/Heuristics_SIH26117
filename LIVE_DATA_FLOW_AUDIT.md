# AURA — LIVE DATA FLOW AUDIT & PROVENANCE TRACE

**Audit Date:** 2026-09-30  
**Audit Purpose:** Trace exact data provenance from browser upload to generated deliverables, identify state leakage, and eliminate stale demo constants.  

---

## 🔍 STAGE-BY-STAGE DATA PROVENANCE TRACE

### 1. Browser Upload & Mode Selection (`todo-app/src/App.tsx`)
- **Stage Input:** User selects `LIVE UPLOAD` or `DEMO PRESET` and uploads an inspection report / SOP file.
- **Identified Gap / Leakage:**
  - `App.tsx` did not generate a unique `runId` per execution.
  - Previous run timeline steps, evidence cards, calculation results, and download links were retained in React component state across runs.

---

### 2. API Server Request Handler (`aura/api/server.ts`)
- **Stage Input:** `POST /api/run-task` receiving `{ taskPrompt, reportFile, isLiveUpload }`.
- **Identified Gap / Leakage:**
  - `sopDirectoryPath` was hardcoded to `path.join(process.cwd(), "demo-data")`.
  - Calling `retriever.indexDirectory("demo-data")` indexed `inspection-report-A.txt`, `inspection-report-B.txt`, `inspection-report-scanned.pdf`, and `inspection-report.txt` into the retriever database.
  - As a result, SOP evidence retrieval returned inspection report contents from unrelated demo files (`inspection-report-B.txt`) during live uploads!
  - `outputDirectory` was hardcoded to `output_deliverables` without per-run isolation (`output_deliverables/<runId>/`), causing output file overwrites and stale document downloads.

---

### 3. Document Parsing & PDF Extraction (`aura/document/industrial-doc.ts`)
- **Stage Input:** Inspection report file path (PDF, TXT, or Image).
- **Identified Gap / Leakage:**
  - PDF parser fell back to `buffer.toString("utf-8")` when PDF text parsing encountered binary streams, producing raw PDF header text (`%PDF-1.4...`) in `parsedDoc.fullText`.
  - `extractFindings` regex parsing contained hardcoded fallbacks:
    ```typescript
    const equipmentId = eqMatch ? eqMatch[1].toUpperCase() : "EX-402A"; // STALE FALLBACK
    const measuredNumeric = measuredMatch ? parseFloat(measuredMatch[1]) : 3.10; // STALE FALLBACK
    const allowableNumeric = allowableMatch ? parseFloat(allowableMatch[1]) : 4.50; // STALE FALLBACK
    ```
  - If regex parsing failed to match an uploaded document's formatting, it quietly defaulted to `EX-402A`, `3.10 mm`, `4.50 mm`!

---

### 4. Local Ollama Model Provider (`aura/core/ollama-provider.ts`)
- **Stage Input:** Base64 image payload or prompt text for local LLM inference.
- **Identified Gap / Leakage:**
  - `generateVision` contained a hardcoded fallback string when vision OCR failed or timed out:
    ```typescript
    const fallback = `[Local Multimodal Vision OCR Extracted Data from ${sourceFile}... Equipment EX-402A Measured 3.10mm vs T-min 4.50mm]`; // STALE FALLBACK
    ```
  - `generate` contained a hardcoded fallback string when reasoning failed:
    ```typescript
    const fallback = `[Reasoning Engine Analyzed Findings: Wall deficit detected. Recommending isolation & SOP-MNT-2024-04 weld overlay repair.]`; // STALE FALLBACK
    ```

---

### 5. On-Premise Knowledge Retriever (`aura/knowledge/local-retriever.ts`)
- **Stage Input:** Directory path passed to `indexDirectory()`.
- **Identified Gap / Leakage:**
  - `indexDirectory()` processed all `.txt`, `.md`, `.pdf`, `.json` files in the given path without filtering out report files or previous run outputs.
  - When given `demo-data`, it indexed inspection reports alongside SOP manuals, leading to contaminated search results.

---

### 6. Sandbox Execution & Deliverable Generators (`aura/tools/sandbox-tool.ts`, `deliverable-tools.ts`)
- **Stage Input:** Parsed findings, calculation code, and evidence snippets.
- **Identified Gap / Leakage:**
  - Deliverable generators wrote files to fixed filenames (`MRPL_Confidential_Approval_Note.docx`, `MRPL_Inspection_Findings_Analysis.xlsx`, `MRPL_Management_Inspection_Summary.pptx`) in a shared directory without `runId` scoping.

---

## 🛠️ REQUIRED REMEDIATION PLAN

| Phase | Action Item | Targeted Files |
| :--- | :--- | :--- |
| **Phase 2** | Remove quiet `EX-402A`, `3.10`, `4.50` fallbacks from parsers & providers | `industrial-doc.ts`, `ollama-provider.ts`, `document-parser.ts` |
| **Phase 3 & 4** | Implement `RunContext` & unique run storage (`demo-data/uploads/<runId>/`) | `server.ts`, `App.tsx`, `state-graph.ts` |
| **Phase 5** | Ensure complete per-run state isolation (no global mutable state) | `server.ts`, `App.tsx` |
| **Phase 6** | Separate SOP knowledge indexing from input inspection reports | `local-retriever.ts`, `server.ts` |
| **Phase 7 & 8** | Implement true PDF page image rendering & visual PNG base64 payload generation | `ocr-engine.ts`, `industrial-doc.ts`, `generate-scanned-pdf.ts` |
| **Phase 9-13** | Propagate actual vision & reasoning outputs through state graph & deliverables | `server.ts`, `state-graph.ts`, `deliverable-tools.ts` |
| **Phase 14-15** | Per-run output deliverables (`output_deliverables/<runId>/`) & UI state resets | `server.ts`, `App.tsx` |
| **Phase 16-19** | Add comprehensive E2E tests for Live Uploads, SOP isolation, and report differentiation | `aura/tests/live-upload-e2e.test.ts` |
