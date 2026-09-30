import path from "node:path";
import type { TaskCategory } from "../core/state-graph";

export interface TaskPlan {
    category: TaskCategory;
    skills: string[];
    tools: string[];
    preferredModelCapability: "text" | "coding" | "reasoning" | "vision";
    requiresArtifactGen: boolean;
    artifactType?: "docx" | "xlsx" | "pptx" | "pdf";
    description: string;
}

export class TaskPlanner {
    public static plan(prompt: string, filePaths?: string[]): TaskPlan {
        const primaryFile = filePaths && filePaths.length > 0 ? filePaths[0] : undefined;
        return new TaskPlanner().planTask(prompt, primaryFile);
    }

    public planTask(prompt: string, filePath?: string): TaskPlan {
        const lowerPrompt = prompt.toLowerCase();
        const ext = filePath ? path.extname(filePath).toLowerCase() : "";

        // 1. Explicit Industrial Inspection Prompt / File
        if (
            (lowerPrompt.includes("ex-402") || lowerPrompt.includes("t-min") || lowerPrompt.includes("sop-mnt") || lowerPrompt.includes("refinery maintenance")) ||
            (filePath && (filePath.includes("inspection-report") || filePath.includes("scanned-pdf")))
        ) {
            return {
                category: "INDUSTRIAL_INSPECTION",
                skills: ["inspection-analysis", "sandboxed-calculation", "create-docx"],
                tools: ["parse_pdf", "search_knowledge", "sandbox_python", "create_docx"],
                preferredModelCapability: ext === ".pdf" ? "vision" : "reasoning",
                requiresArtifactGen: true,
                artifactType: "docx",
                description: "Refinery equipment inspection analysis and SOP compliance verification."
            };
        }

        // 2. Multimodal Vision / Image / Diagram
        if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || lowerPrompt.includes("diagram") || lowerPrompt.includes("handwritten") || lowerPrompt.includes("image")) {
            return {
                category: "MULTIMODAL_VISION",
                skills: ["image-understanding"],
                tools: ["analyze_image"],
                preferredModelCapability: "vision",
                requiresArtifactGen: false,
                description: "Multimodal visual OCR & image analysis using LLaVA."
            };
        }

        // 3. Presentation / Slide Deck Generation
        if (lowerPrompt.includes("presentation") || lowerPrompt.includes("pitch deck") || lowerPrompt.includes("slide deck") || lowerPrompt.includes("powerpoint") || lowerPrompt.includes("pptx")) {
            return {
                category: "PRESENTATION_GEN",
                skills: ["presentation-design", "create-pptx"],
                tools: ["create_pptx"],
                preferredModelCapability: "reasoning",
                requiresArtifactGen: true,
                artifactType: "pptx",
                description: "Visual presentation slide outline and PPTX deck generation."
            };
        }

        // 4. Code Debugging & Testing
        if (lowerPrompt.includes("debug") || lowerPrompt.includes("fix bug") || lowerPrompt.includes("run test") || lowerPrompt.includes("unit test")) {
            return {
                category: "CODE_DEBUG",
                skills: ["debug-code", "run-tests"],
                tools: ["sandbox_python", "execute_code"],
                preferredModelCapability: "coding",
                requiresArtifactGen: false,
                description: "Sandboxed code debugging and test execution."
            };
        }

        // 5. Code Generation
        if (lowerPrompt.includes("write code") || lowerPrompt.includes("function") || lowerPrompt.includes("python script") || lowerPrompt.includes("sql query") || lowerPrompt.includes("write a script")) {
            return {
                category: "CODE_GEN",
                skills: ["generate-code"],
                tools: ["execute_code"],
                preferredModelCapability: "coding",
                requiresArtifactGen: false,
                description: "Generates clean production-ready code."
            };
        }

        // 6. Spreadsheet / XLSX Analysis
        if (ext === ".xlsx" || ext === ".csv" || lowerPrompt.includes("spreadsheet") || lowerPrompt.includes("excel") || lowerPrompt.includes("revenue") || lowerPrompt.includes("calculate average")) {
            return {
                category: "SPREADSHEET_ANALYSIS",
                skills: ["spreadsheet-analysis", "sandboxed-calculation"],
                tools: ["parse_xlsx", "sandbox_python"],
                preferredModelCapability: "reasoning",
                requiresArtifactGen: lowerPrompt.includes("export") || lowerPrompt.includes("sheet"),
                artifactType: "xlsx",
                description: "Analyzes spreadsheet workbook data and formulas."
            };
        }

        // 7. Company Knowledge Search (RAG)
        if (lowerPrompt.includes("company policy") || lowerPrompt.includes("knowledge base") || lowerPrompt.includes("sop") || lowerPrompt.includes("manual") || lowerPrompt.includes("standard")) {
            return {
                category: "KNOWLEDGE_SEARCH",
                skills: ["search-company-knowledge"],
                tools: ["search_company_knowledge"],
                preferredModelCapability: "reasoning",
                requiresArtifactGen: false,
                description: "Searches persistent enterprise knowledge base with source citations."
            };
        }

        // 8. PDF / Document Analysis
        if (ext === ".pdf" || ext === ".docx" || ext === ".txt" || lowerPrompt.includes("analyze pdf") || lowerPrompt.includes("summarize document") || lowerPrompt.includes("extract text")) {
            const wantsDocx = lowerPrompt.includes("docx") || lowerPrompt.includes("approval note") || lowerPrompt.includes("report document");
            return {
                category: "DOCUMENT_ANALYSIS",
                skills: ["analyze-pdf", ...(wantsDocx ? ["create-docx"] : [])],
                tools: ["parse_pdf", ...(wantsDocx ? ["create_docx"] : [])],
                preferredModelCapability: "reasoning",
                requiresArtifactGen: wantsDocx,
                artifactType: wantsDocx ? "docx" : undefined,
                description: "Parses document structure and analyzes findings."
            };
        }

        // 9. Default General Q&A
        return {
            category: "GENERAL_QA",
            skills: ["answer-question"],
            tools: [],
            preferredModelCapability: "text",
            requiresArtifactGen: false,
            description: "Direct on-screen answer without unnecessary file workflows."
        };
    }
}
