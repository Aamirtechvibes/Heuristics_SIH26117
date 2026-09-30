# AURA — DUAL-LAYER KNOWLEDGE BASE & ENTERPRISE RAG SPECIFICATION

**Date:** 2026-09-30  
**Project:** AURA Sovereign Agentic AI Workbench  

---

## 1. Dual-Layer Concept Separation

To prevent cross-run contamination while supporting enterprise RAG, AURA strictly separates knowledge into **two distinct concepts**:

```
                                  KNOWLEDGE ARCHITECTURE
                                            │
           ┌────────────────────────────────┴────────────────────────────────┐
           ▼                                                                 ▼
 ┌───────────────────────────────────┐                     ┌───────────────────────────────────┐
 │   LAYER 1: TEMPORARY RUN INPUT    │                     │ LAYER 2: PERSISTENT ENTERPRISE KB │
 ├───────────────────────────────────┤                     ├───────────────────────────────────┤
 │ • Uploaded for single task run    │                     │ • Uploaded to company knowledge   │
 │ • Scoped to demo-data/uploads/<run>│                     │ • Stored in company-knowledge/    │
 │ • Deleted/ignored after run       │                     │ • Persists across all user runs   │
 │ • NEVER added to global RAG index │                     │ • Full CRUD management interface  │
 └───────────────────────────────────┘                     └───────────────────────────────────┘
```

---

## 2. Persistent Knowledge Base CRUD Specification

The `PersistentKnowledgeBase` manager provides full lifecycle management for enterprise documents:

```typescript
export interface KnowledgeDocumentMetadata {
    id: string;
    filename: string;
    originalName: string;
    filePath: string;
    fileType: "pdf" | "docx" | "txt" | "xlsx" | "md";
    fileSizeBytes: number;
    checksum: string;
    uploadedAt: string;
    updatedAt: string;
    chunkCount: number;
    status: "INDEXED" | "PENDING" | "ERROR";
    tags: string[];
}

export interface KnowledgeChunk {
    chunkId: string;
    documentId: string;
    filename: string;
    sectionTitle: string;
    pageNumber?: number;
    content: string;
    tokens: number;
}
```

### CRUD Interface API

1. **CREATE (`addDocument(file: File | string, tags?: string[])`)**:
   - Copies source file to `demo-data/company-knowledge/`.
   - Generates document ID and SHA256 checksum.
   - Extracts text, chunks by heading/section (300-500 tokens), and updates the persistent index.

2. **READ / SEARCH (`searchKnowledge(query: string, limit: number = 5)`)**:
   - Searches indexed chunks using keyword-frequency overlap and TF-IDF section scoring.
   - Returns evidence snippets with source filename, section title, page number, and score.

3. **UPDATE (`updateDocument(documentId: string, newFile: File | string)`)**:
   - Replaces the existing file in `demo-data/company-knowledge/`.
   - Purges all old chunks associated with `documentId`.
   - Re-indexes the new file content and updates `updatedAt` timestamp.

4. **DELETE (`deleteDocument(documentId: string)`)**:
   - Deletes the source file from `demo-data/company-knowledge/`.
   - Completely removes all associated chunks from the in-memory and persistent index.
   - Guarantees future queries will NEVER return deleted document evidence.

5. **RE-INDEX (`reindexAll()`)**:
   - Clears the index store and re-scans `demo-data/company-knowledge/` directory.

---

## 3. Storage Structure

```text
demo-data/
├── company-knowledge/              <-- PERSISTENT ENTERPRISE RAG (Shared)
│   ├── index-metadata.json        <-- Tracks document IDs, checksums, chunks
│   ├── SOP-Maintenance-2024.pdf
│   ├── Engineering-Manual-CDU.pdf
│   └── Safety-Guidelines.docx
└── uploads/                       <-- TEMPORARY RUN INPUTS (Isolated)
    ├── run_1790742572/
    │   └── user-uploaded-task-file.pdf
    └── run_1790742999/
        └── custom-report.txt
```

---

## 4. Sovereignty & Data Protection Guarantee

- **100% On-Premise Execution**: All chunking, text parsing, and search indexing are processed locally using Bun native filesystem operations.
- **Zero Cloud API Exposure**: No embeddings or text chunks are sent to external vector database providers (e.g. Pinecone, OpenAI Embeddings).
- **Run Isolation**: Temporary task files uploaded via the main task prompt interface are stored strictly inside `demo-data/uploads/<runId>/` and are **never** indexed into the persistent enterprise knowledge index.
