# AURA — REPOSITORY-WIDE HARDCODING & CONSTANT AUDIT

**Date:** 2026-09-30  
**Project:** AURA Sovereign Agentic AI Workbench  

---

## 1. Classification Categories

- **A. Legitimate domain/demo fixture**: Valid static test data reserved strictly for DEMO PRESET mode or demo files in `demo-data/`.
- **B. Configuration**: Environment variables, default ports, model names.
- **C. Test fixture**: Test inputs used in test suites (`*.test.ts`).
- **D. UI copy**: Labels, headings, placeholder texts in frontend UI components.
- **E. Dangerous runtime hardcoding**: Code logic that forces specific domain values into execution logic regardless of user input.
- **F. Hardcoded fallback**: Dummy or synthetic values returned when parsing, vision, or reasoning fails.
- **G. Architectural coupling**: Code structure tightly coupled to a single workflow.

---

## 2. Hardcoding Inventory Matrix

| File Path | Line(s) | Value / String / Pattern | Classification | Context & Risk | Action Required |
|---|---|---|---|---|---|
| `sovereign/document/document-parser.ts` | 196–211 | `equipmentId: "EX-402A"`, `measuredValue: "3.10 mm"`, `allowableLimit: "4.50 mm"`, `severity: "CRITICAL"` | **F. Hardcoded fallback** | Triggers whenever document parsing yields no findings. Forces arbitrary PDFs into EX-402A critical thickness output. | **REMOVE COMPLETELY**. Return empty findings array or throw parse error. |
| `aura/document/industrial-doc.ts` | 138 & 149 | `let measuredNumeric = 3.10;`, `let allowableNumeric = 4.50;` | **F. Hardcoded fallback** | Default numeric variables if regex fails to find numbers with `mm`. Forces 3.10 < 4.50 critical deficit. | **REMOVE COMPLETELY**. Return `undefined` if no numeric values found. |
| `sovereign/agent/sovereign-orchestrator.ts` | 127–128 | `t_measured = ... || "3.10"`, `t_min = ... || "4.50"` | **F. Hardcoded fallback** | Fallback string values in Python sandbox calculation code. | **REMOVE COMPLETELY**. Fail calculation if values missing. |
| `sovereign/agent/sovereign-orchestrator.ts` | 154, 157 | `equipmentId || "EX-402A"` | **F. Hardcoded fallback** | Fallback subject string in approval note generator. | **REMOVE COMPLETELY**. Use generic document title. |
| `aura/core/state-graph.ts` | 5–19 | `BRANCH_CRITICAL_HAZARD`, `BRANCH_NORMAL_MAINTENANCE` | **G. Architectural coupling** | Hardcoded node names in the primary agent state graph. | **REFACTOR**. Generalize node names to `EVALUATE`, `BRANCH`, `EXECUTE_SKILL`. |
| `aura/core/state-graph.ts` | 43, 78 | `conditionalBranchTaken: "CRITICAL_HAZARD_ISOLATION"` | **G. Architectural coupling** | Initial state defaults to critical hazard isolation branch. | **REFACTOR**. Generalize state to `branchTaken?: string`. |
| `aura/tools/deliverable-tools.ts` | 28, 29, 30 | `"MRPL_Confidential_Approval_Note.docx"`, `"MRPL_Inspection_Findings_Analysis.xlsx"`, `"MRPL_Management_Inspection_Summary.pptx"` | **E. Dangerous runtime hardcoding** | Fixed deliverable filenames generated on every run. | **REFACTOR**. Use dynamic names based on user task (`Analysis_Report.docx`, etc.). |
| `aura/api/server.ts` | 136 | `"Analyze inspection report, cross-check against refinery maintenance SOP..."` | **D. UI copy / Fallback** | Fallback task description prompt in API route handler. | **REFACTOR**. Default to `"Process user task"`. |
| `aura/api/server.ts` | 196–210 | `calcCode = ... t_deficit = t_min - t_measured ...` | **E. Dangerous runtime hardcoding** | Formats refinery wall thickness deficit script on every task run. | **REFACTOR**. Move calculation into `EngineeringCalculationSkill` invoked only when requested. |
| `todo-app/src/App.tsx` | 27 | `'Analyze inspection report for EX-402A...'` | **D. UI copy** | Initial task prompt textarea state in React frontend. | **REFACTOR**. Change default prompt to `"Analyze uploaded document and answer questions."` |
| `todo-app/src/App.tsx` | 80–88 | `title: 'Task Inspection'`, `details: 'Executing Python sandbox script for wall thickness...'` | **D. UI copy / Coupling** | Hardcoded 8 initial UI execution timeline steps. | **REFACTOR**. Render dynamic timeline steps received from backend API. |
| `todo-app/src/App.tsx` | 301–310 | `setCalculationResult('CRITICAL DEFICIT: Wall thickness is below minimum allowable limit (T-min)...')` | **F. Hardcoded fallback** | Catch block forces hardcoded critical hazard text into calculation UI if backend errors. | **REMOVE COMPLETELY**. Render actual error message. |
| `todo-app/src/App.tsx` | 445–472 | `documentFile === 'inspection-report-A.txt'`, `EX-402A (3.10mm Critical)` | **A. Legitimate domain/demo fixture** | Preset selector buttons in DEMO PRESET mode. | **KEEP** in DEMO PRESET mode only. |
| `demo-data/inspection-report-A.txt` | All | `EQUIPMENT IDENTIFIER: EX-402A`, `3.10 mm` | **A. Legitimate domain/demo fixture** | Controlled demo data file. | **KEEP** in `demo-data/` for preset testing. |
| `demo-data/inspection-report-B.txt` | All | `EQUIPMENT IDENTIFIER: EX-402B`, `5.20 mm` | **A. Legitimate domain/demo fixture** | Controlled demo data file. | **KEEP** in `demo-data/` for preset testing. |
| `aura/tests/e2e-inspection.test.ts` | All | `EX-402A`, `3.10` | **C. Test fixture** | Unit test assertion constants. | **KEEP** for inspection skill test assertions. |

---

## 3. Mandatory Remediation Summary

1. **Eliminate All Class F (Hardcoded Fallbacks)**: Remove dummy `EX-402A`, `3.10 mm`, `4.50 mm` values from `document-parser.ts`, `industrial-doc.ts`, and `sovereign-orchestrator.ts`.
2. **Decouple Class G (Architectural Coupling)**: Replace fixed industrial node names in `state-graph.ts` with generic state machine nodes (`UNDERSTAND`, `PLAN`, `SELECT_SKILL`, `EXECUTE_TOOL`, `VERIFY`, `RESPOND`).
3. **Decouple Class E (Dangerous Runtime Hardcoding)**: Move wall thickness calculation code and approval note generation out of the core API server into dedicated, optional skills (`IndustrialInspectionSkill`).
4. **Generalize Class D (UI Copy)**: Make the frontend UI task prompt, execution timeline, and deliverable buttons completely generic and responsive to the actual task.
