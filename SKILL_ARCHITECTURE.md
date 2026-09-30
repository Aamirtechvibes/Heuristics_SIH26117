# AURA — SKILL SYSTEM ARCHITECTURE & CONTRACT SPECIFICATION

**Date:** 2026-09-30  
**Project:** AURA Sovereign Agentic AI Workbench  

---

## 1. Skill System Overview

In the new AURA architecture, **Skills are first-class, modular execution handlers**. Industrial inspection is no longer embedded into the core agent graph; instead, it is **one specialized skill among many** registered in the `SkillRegistry`.

```
                    ┌──────────────────────────────────────────┐
                    │              SKILL REGISTRY              │
                    └────────────────────┬─────────────────────┘
                                         │
     ┌───────────────────┬───────────────┴───┬───────────────────┐
     ▼                   ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   GENERAL    │  │  DEVELOPER   │  │   DOCUMENT   │  │ PRESENTATION │
│    SKILLS    │  │    SKILLS    │  │  & DATA RAG  │  │  & ARTIFACTS │
│ (Q&A, Summar │  │(Code, Debug, │  │ (PDF, XLSX,  │  │ (DOCX, PPTX, │
│  ize, Explain│  │  Test, Math) │  │  RAG Search) │  │  PDF Build)  │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 2. Skill Contract Specification

Every skill implements the `AgentSkill` interface:

```typescript
export type SkillCategory = 
    | "GENERAL"
    | "CODE"
    | "DOCUMENT"
    | "VISION"
    | "DATA"
    | "ARTIFACTS"
    | "KNOWLEDGE"
    | "INDUSTRIAL";

export interface SkillContract {
    id: string;
    name: string;
    description: string;
    category: SkillCategory;
    supportedInputTypes: ("text" | "pdf" | "docx" | "xlsx" | "pptx" | "image" | "code")[];
    requiredTools: string[];
    preferredModelCapability: "text" | "coding" | "reasoning" | "vision";
    requiresSandbox: boolean;
    generatesArtifact: boolean;
    instructions: string;
}

export interface SkillExecutionContext {
    runId: string;
    userTask: string;
    inputFiles: Array<{ path: string; name: string; type: string; content?: string }>;
    knowledgeBaseId?: string;
    sandbox: CodeSandbox;
    retriever: KnowledgeBase;
    tools: ToolRegistry;
}

export interface SkillExecutionResult {
    success: boolean;
    skillId: string;
    summary: string;
    data?: any;
    codeOutput?: string;
    artifactPaths?: { docx?: string; xlsx?: string; pptx?: string; pdf?: string };
    citations?: Array<{ source: string; section: string; text: string }>;
    logs: string[];
}
```

---

## 3. Skill Catalog Inventory

### Category 1: GENERAL
- **`answer-question`**: Answers general knowledge, technical, or analytical questions directly on screen.
- **`summarize-text`**: Summarizes plain text, articles, or transcripts.
- **`explain-concept`**: Provides structured educational explanations.

### Category 2: CODE
- **`generate-code`**: Generates clean, production-ready code in Python, TypeScript, SQL, etc.
- **`debug-code`**: Analyzes code errors, identifies root cause, and provides fixes.
- **`run-tests`**: Generates unit tests and executes them inside the Python/Bun sandbox.

### Category 3: DOCUMENT
- **`analyze-pdf`**: Parses PDF structure, extracts text and key sections.
- **`analyze-docx`**: Ingests Word document headings, paragraphs, and tables.
- **`question-answer-over-document`**: Answers specific questions over uploaded document with page citations.

### Category 4: VISION
- **`image-understanding`**: Routes images, diagrams, or handwritten notes to local visual LLM (`llava:latest`).
- **`scanned-document-ocr`**: Renders PDF pages to images and performs OCR extraction.

### Category 5: DATA
- **`spreadsheet-analysis`**: Ingests XLSX sheets, analyzes formulas, columns, and data trends.
- **`sandboxed-calculation`**: Executes Python calculations deterministically inside the sandbox.

### Category 6: ARTIFACTS
- **`create-docx`**: Builds clean Word documents (`.docx`) when explicitly requested by user.
- **`create-xlsx`**: Builds structured Excel workbooks (`.xlsx`).
- **`presentation-design`**: **Dedicated PPTX presentation skill** (see section below).

### Category 7: KNOWLEDGE
- **`search-company-knowledge`**: Searches persistent enterprise RAG index.
- **`manage-company-knowledge`**: Manages CRUD operations (upload, update, delete) for enterprise documents.

### Category 8: INDUSTRIAL (Specialized Demo Workflow)
- **`inspection-analysis`**: Specialized skill for refinery equipment NDT inspection reports, wall thickness calculations, and MRPL maintenance SOP cross-referencing.

---

## 4. Dedicated Presentation Skill (`presentation-design`)

To prevent PPT output from being a raw text dump onto static slides, the `presentation-design` skill enforces visual layout storytelling:

```typescript
export interface PresentationSlide {
    slideNumber: number;
    title: string;
    subtitle?: string;
    layoutType: "TITLE" | "EXECUTIVE_SUMMARY" | "COMPARISON" | "METRICS_GRID" | "TIMELINE" | "CONCLUSION";
    bulletPoints: string[];
    keyMetric?: { label: string; value: string; status: "CRITICAL" | "SAFE" | "NEUTRAL" };
    tableData?: { headers: string[]; rows: string[][] };
}
```

The presentation skill generates a slide structure based on topic and audience, applies typography and color themes, renders tables/cards, and compiles to `.pptx` via `pptxgenjs`.
