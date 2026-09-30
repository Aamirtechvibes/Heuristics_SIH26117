# AURA — TASK ROUTING & INTENT CLASSIFICATION AUDIT

**Date:** 2026-09-30  
**Project:** AURA Sovereign Agentic AI Workbench  

---

## 1. End-to-End Task Routing Provenance

To transform AURA from a fixed industrial pipeline into a multi-task agent, every incoming request must be classified by **Task Intent** and **Input Type** before selecting skills, tools, and models.

```
USER INPUT (Prompt + Optional File)
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                 TASK INTENT CLASSIFIER                  │
│  Classifies: GENERAL_QA | CODE | DOCUMENT | VISION |    │
│              DATA | ARTIFACT | INDUSTRIAL               │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    SKILL SELECTION                      │
│   (Selects primary skill module & required tools)       │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 DYNAMIC MODEL ROUTER                    │
│   (Discovers local Ollama models & capability flags)     │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 EXECUTION ENGINE LOOP                   │
│   (Runs tool sequence, evaluates code, retrieves RAG)   │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│               RESPONSE & ARTIFACT BUILDER               │
│   (Outputs text/code on screen; builds file ONLY if     │
│                     requested)                          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Provenance Matrices for Supported Task Capabilities

### Task 1: General Small Query / Text Question
- **User Input:** *"What is the difference between REST and GraphQL?"*
- **Intent Category:** `GENERAL_QA`
- **Selected Skill:** `answer-question`
- **Selected Model:** `qwen2.5-coder:7b` (Text / Reasoning)
- **Tools Invoked:** None
- **Output:** On-screen markdown answer. **No file artifact generated.**

### Task 2: Code Generation
- **User Input:** *"Write a Python function to calculate Fibonacci numbers efficiently."*
- **Intent Category:** `CODE_GEN`
- **Selected Skill:** `generate-code`
- **Selected Model:** `qwen2.5-coder:7b` (Coding)
- **Tools Invoked:** `create_code_file` (optional)
- **Output:** Formatted code block with explanation on screen.

### Task 3: Code Debugging & Testing
- **User Input:** *"Debug this Python script and run tests in the sandbox."*
- **Intent Category:** `CODE_DEBUG`
- **Selected Skill:** `debug-and-test-code`
- **Selected Model:** `qwen2.5-coder:7b`
- **Tools Invoked:** `execute_code_sandbox`
- **Output:** Actual stdout/stderr from sandbox execution, test pass/fail results, corrected code.

### Task 4: Generic PDF Analysis / Summarization
- **User Input:** Uploaded `SIH_Presentation.pdf` + *"Summarize key findings."*
- **Intent Category:** `DOCUMENT_ANALYSIS`
- **Selected Skill:** `analyze-pdf`
- **Selected Model:** `llava:latest` (if scanned) or `qwen2.5-coder:7b` (text PDF)
- **Tools Invoked:** `parse_pdf`, `render_pdf_page`
- **Output:** Structured summary of uploaded PDF content. **No equipment/wall-thickness fields.**

### Task 5: PDF Question Answering with Page Citations
- **User Input:** Uploaded `Architecture_Guide.pdf` + *"What are the recommendations on page 4?"*
- **Intent Category:** `DOCUMENT_QA`
- **Selected Skill:** `question-answer-over-document`
- **Selected Model:** `qwen2.5-coder:7b`
- **Tools Invoked:** `parse_pdf`, `search_document_chunks`
- **Output:** Direct answer citing Page 4 content.

### Task 6: Spreadsheet (XLSX) Data Analysis
- **User Input:** Uploaded `Q3_Sales.xlsx` + *"Calculate average monthly revenue and identify top region."*
- **Intent Category:** `DATA_SPREADSHEET`
- **Selected Skill:** `spreadsheet-analysis`
- **Selected Model:** `qwen2.5-coder:7b`
- **Tools Invoked:** `parse_xlsx`, `sandbox_python_calc`
- **Output:** Statistical summary table and insights derived from spreadsheet data.

### Task 7: Multimodal Image / Diagram / Handwriting Ingestion
- **User Input:** Uploaded `handwritten_notes.png` + *"Transcribe and explain."*
- **Intent Category:** `VISION_MULTIMODAL`
- **Selected Skill:** `image-understanding`
- **Selected Model:** `llava:latest` (Vision capability)
- **Tools Invoked:** `analyze_image`
- **Output:** Vision model observation and text explanation.

### Task 8: Artifact Document Generation (DOCX / PDF)
- **User Input:** *"Analyze this market report PDF and generate a formal DOCX executive summary."*
- **Intent Category:** `ARTIFACT_GENERATION`
- **Selected Skill:** `analyze-pdf` + `create-docx`
- **Selected Model:** `qwen2.5-coder:7b`
- **Tools Invoked:** `parse_pdf`, `create_docx`
- **Output:** On-screen summary **AND** download link for generated `.docx` deliverable.

### Task 9: Visual Presentation Generation (PPTX)
- **User Input:** *"Create a pitch deck presentation from this strategy document."*
- **Intent Category:** `PRESENTATION_GEN`
- **Selected Skill:** `presentation-design`
- **Selected Model:** `qwen2.5-coder:7b`
- **Tools Invoked:** `create_pptx`
- **Output:** Visual slide outline on screen **AND** download link for generated `.pptx` deck.

### Task 10: Enterprise Knowledge Search (Company RAG)
- **User Input:** *"What is our company safety protocol for hot work permits?"*
- **Intent Category:** `KNOWLEDGE_SEARCH`
- **Selected Skill:** `search-company-knowledge`
- **Selected Model:** `qwen2.5-coder:7b`
- **Tools Invoked:** `search_knowledge_base`
- **Output:** Verified snippets retrieved from persistent company RAG index with source citations.

### Task 11: Specialized Refinery Industrial Inspection (Legacy Demo Workflow)
- **User Input:** *"Analyze EX-402A against refinery maintenance SOP-MNT-2024..."*
- **Intent Category:** `INDUSTRIAL_INSPECTION`
- **Selected Skill:** `inspection-analysis`
- **Selected Model:** `llava:latest` + `qwen2.5-coder:7b`
- **Tools Invoked:** `parse_industrial_report`, `search_sop`, `calculate_wall_deficit`, `create_approval_note`
- **Output:** Equipment findings, wall thickness deficit math, hazard isolation decision, DOCX approval note.

---

## 3. Dynamic Model Router Design

The model router inspects installed Ollama models via `GET http://127.0.0.1:11434/api/tags` and maps model capabilities dynamically:

```typescript
export interface ModelCapability {
    modelId: string;
    displayName: string;
    capabilities: ("text" | "coding" | "reasoning" | "vision" | "structured-output")[];
    contextWindow: number;
    isAvailable: boolean;
}
```

- **Vision Tasks (`image-understanding`, `scanned-pdf`)** $\rightarrow$ Requires model with `"vision"` capability (`llava:latest`).
- **Coding & Debugging Tasks (`generate-code`, `run-tests`)** $\rightarrow$ Prefers model with `"coding"` capability (`qwen2.5-coder:7b`).
- **General Q&A & Document Reasoning** $\rightarrow$ Uses available `"text"` / `"reasoning"` model.
- **Resource Constraints**: Avoids loading vision models when handling pure text/code queries.
