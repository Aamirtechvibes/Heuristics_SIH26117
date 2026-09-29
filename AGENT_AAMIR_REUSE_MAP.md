# Agent Aamir Architectural Reuse Map
**Project:** Sovereign On-Premise Agentic AI Workbench (SIH 2026 PS 26117)

## 1. Executive Strategy
We preserve the core execution engine of **Agent Aamir**—its staged mutation model, human-in-the-loop approval workflow, tool executor, action tracking, and tool-loop orchestration—while evolving it into a Sovereign Agentic AI Workbench for confidential industrial tasks (MRPL scenario).

---

## 2. Component Reuse & Evolution Mapping

| Existing Agent Aamir Module | Current Function | Evolved Sovereign Workbench Function | Status & Action |
|---|---|---|---|
| `ai/ai.config.ts` | OpenRouter model instantiation | **Local Model Provider & Registry** (`OllamaProvider`, Local/Sovereign model switching, task-based model routing) | **Extend** with Ollama support & Sovereign blocking filter |
| `modes/agent/tool-executor.ts` | Filesystem & shell mutation, staged state management | **Local Tool Executor Engine** + Extended Industrial Document & Sandbox Tools | **Extend** with DOCX/XLSX/PPTX tools, local vector/PDF parser, sandbox execution |
| `modes/agent/agent-tools.ts` | Tool definitions (`read_file`, `create_file`, `execute_shell`, etc.) | **Industrial Skill & Tool Registry** (adds `parse_document`, `retrieve_knowledge`, `generate_docx`, `run_sandbox_code`, `verify_claims`) | **Extend** with new Zod-validated industrial tools |
| `modes/agent/actionTracker.ts` | Staged changes tracker & audit trail | **Sovereign Audit & Action Tracker** (audits local tool usage, model routing logs, evidence citations, human approvals) | **Reuse & Extend** |
| `modes/agent/approval.ts` | Terminal approval UI for file/shell changes | **Human-in-the-loop Safety & Approval Layer** | **Reuse & Extend** for CLI & Web UI approval gates |
| `modes/agent/orchestrator.ts` | CLI execution loop with `ToolLoopAgent` | **Sovereign Agent Orchestrator** (Multi-step plan execution, model routing step, evidence tracking) | **Reuse core loop & Adapt** for local model pipelines |
| `modes/plan/planner.ts` | Multi-step task planner | **Task Planner & Model Router** | **Reuse & Adapt** for industrial workflow planning |
| `terminalUserInterface/` | CLI UI, banners, markdown rendering | **Sovereign CLI Interface** | **Reuse & Enhance** |
| `todo-app/` (React + Vite) | Web App Scaffold | **Sovereign AI Workbench UI** (Execution timeline, model router status, evidence viewer, document preview, network monitor) | **Evolve** into full Web Workbench UI |

---

## 3. New Sovereign Workbench Architecture Layers

1. **Sovereignty Monitor & Network Guard**:
   - Centralized network guard blocking unauthorized external AI endpoints (OpenAI, Anthropic, OpenRouter) when `SOVEREIGN_MODE=true`.
   - Real-time logging of network requests & 0-cloud-call verification proof.

2. **Local Model Provider & Task Router**:
   - Model Registry supporting Ollama local models (`qwen2.5-coder`, `llama3.2`, `llava`/`qwen2-vl` vision, etc.).
   - Model Router selecting appropriate model based on task type (Vision/OCR, Reasoning/Document, Coding, Summary).

3. **Multimodal Document Processing Engine**:
   - PDF & scanned document parser (text extraction, structured equipment/finding extraction).

4. **Local Knowledge Base & Evidence Retriever**:
   - Local PDF/SOP document indexing & evidence-aware search returning filename, page/section, and exact match snippets.

5. **Deliverable Generators**:
   - Programmatic DOCX approval note generator.
   - Programmatic XLSX inspection report spreadsheet generator.
   - Programmatic PPTX presentation summary generator.

6. **Sandboxed Code Execution**:
   - Containerized / isolated Python script execution for engineering calculations and verification.
