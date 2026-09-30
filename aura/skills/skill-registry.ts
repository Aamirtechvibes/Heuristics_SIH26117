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
}

export class SkillRegistry {
    private skills: Map<string, SkillContract> = new Map();

    constructor() {
        this.registerDefaultSkills();
    }

    private registerDefaultSkills() {
        // GENERAL
        this.register({
            id: "answer-question",
            name: "General Q&A",
            description: "Direct markdown answers to general knowledge, analytical, or technical questions.",
            category: "GENERAL",
            supportedInputTypes: ["text"],
            requiredTools: [],
            preferredModelCapability: "text",
            requiresSandbox: false,
            generatesArtifact: false
        });

        this.register({
            id: "summarize-text",
            name: "Text Summarization",
            description: "Summarizes text, articles, or transcripts into concise bullet points.",
            category: "GENERAL",
            supportedInputTypes: ["text"],
            requiredTools: [],
            preferredModelCapability: "reasoning",
            requiresSandbox: false,
            generatesArtifact: false
        });

        // CODE
        this.register({
            id: "generate-code",
            name: "Code Generation",
            description: "Generates clean, production-ready code in Python, TypeScript, SQL, etc.",
            category: "CODE",
            supportedInputTypes: ["text", "code"],
            requiredTools: ["execute_code"],
            preferredModelCapability: "coding",
            requiresSandbox: false,
            generatesArtifact: false
        });

        this.register({
            id: "debug-code",
            name: "Code Debugging & Testing",
            description: "Analyzes code errors, identifies root causes, provides fixes, and runs unit tests.",
            category: "CODE",
            supportedInputTypes: ["code", "text"],
            requiredTools: ["sandbox_python", "execute_code"],
            preferredModelCapability: "coding",
            requiresSandbox: true,
            generatesArtifact: false
        });

        // DOCUMENT
        this.register({
            id: "analyze-pdf",
            name: "PDF & Document Analysis",
            description: "Parses PDF/DOCX structure, extracts text, and provides structured findings.",
            category: "DOCUMENT",
            supportedInputTypes: ["pdf", "docx", "txt"],
            requiredTools: ["parse_pdf"],
            preferredModelCapability: "reasoning",
            requiresSandbox: false,
            generatesArtifact: false
        });

        // VISION
        this.register({
            id: "image-understanding",
            name: "Multimodal Vision OCR",
            description: "Processes images, diagrams, or handwritten notes using visual LLM.",
            category: "VISION",
            supportedInputTypes: ["image", "pdf"],
            requiredTools: ["analyze_image"],
            preferredModelCapability: "vision",
            requiresSandbox: false,
            generatesArtifact: false
        });

        // DATA
        this.register({
            id: "spreadsheet-analysis",
            name: "Spreadsheet Analytics",
            description: "Ingests XLSX workbooks, analyzes formulas, columns, and trends.",
            category: "DATA",
            supportedInputTypes: ["xlsx"],
            requiredTools: ["parse_xlsx", "sandbox_python"],
            preferredModelCapability: "reasoning",
            requiresSandbox: true,
            generatesArtifact: false
        });

        this.register({
            id: "sandboxed-calculation",
            name: "Sandboxed Math Calculation",
            description: "Executes Python math calculations deterministically inside sandbox.",
            category: "DATA",
            supportedInputTypes: ["text", "code"],
            requiredTools: ["sandbox_python"],
            preferredModelCapability: "coding",
            requiresSandbox: true,
            generatesArtifact: false
        });

        // ARTIFACTS & PRESENTATION
        this.register({
            id: "presentation-design",
            name: "Visual Presentation Skill",
            description: "Designs visual slide structure, layout, typography, and PPTX deck.",
            category: "ARTIFACTS",
            supportedInputTypes: ["text", "pdf", "docx"],
            requiredTools: ["create_pptx"],
            preferredModelCapability: "reasoning",
            requiresSandbox: false,
            generatesArtifact: true
        });

        this.register({
            id: "create-docx",
            name: "DOCX Report Builder",
            description: "Builds formatted Word documents (.docx) when explicitly requested.",
            category: "ARTIFACTS",
            supportedInputTypes: ["text", "pdf"],
            requiredTools: ["create_docx"],
            preferredModelCapability: "reasoning",
            requiresSandbox: false,
            generatesArtifact: true
        });

        // KNOWLEDGE
        this.register({
            id: "search-company-knowledge",
            name: "Enterprise RAG Search",
            description: "Searches persistent company knowledge base with source citations.",
            category: "KNOWLEDGE",
            supportedInputTypes: ["text"],
            requiredTools: ["search_company_knowledge"],
            preferredModelCapability: "reasoning",
            requiresSandbox: false,
            generatesArtifact: false
        });

        // INDUSTRIAL (Specialized Demo Workflow)
        this.register({
            id: "inspection-analysis",
            name: "Refinery Inspection Skill",
            description: "Specialized skill for refinery equipment NDT reports and SOP compliance.",
            category: "INDUSTRIAL",
            supportedInputTypes: ["pdf", "txt"],
            requiredTools: ["parse_pdf", "search_knowledge", "sandbox_python", "create_docx"],
            preferredModelCapability: "reasoning",
            requiresSandbox: true,
            generatesArtifact: true
        });
    }

    public register(contract: SkillContract) {
        this.skills.set(contract.id, contract);
    }

    public getSkill(id: string): SkillContract | undefined {
        return this.skills.get(id);
    }

    public listSkills(): SkillContract[] {
        return Array.from(this.skills.values());
    }
}
