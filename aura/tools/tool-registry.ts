export interface ToolDefinition {
    id: string;
    name: string;
    description: string;
    category: "FILE" | "DOCUMENT" | "VISION" | "CODE" | "DATA" | "KNOWLEDGE" | "ARTIFACT" | "VERIFY";
}

export class ToolRegistry {
    private tools: Map<string, ToolDefinition> = new Map();

    constructor() {
        this.registerDefaultTools();
    }

    private registerDefaultTools() {
        this.register({ id: "parse_pdf", name: "PDF Document Parser", description: "Extracts text, page numbers, and structural text from PDF files.", category: "DOCUMENT" });
        this.register({ id: "parse_docx", name: "Word Document Parser", description: "Extracts paragraphs, headings, and tables from DOCX files.", category: "DOCUMENT" });
        this.register({ id: "parse_xlsx", name: "Spreadsheet Parser", description: "Parses Excel worksheets, formulas, columns, and data rows.", category: "DATA" });
        this.register({ id: "analyze_image", name: "Multimodal Vision OCR", description: "Processes images, diagrams, or handwritten notes via LLaVA.", category: "VISION" });
        this.register({ id: "sandbox_python", name: "Python Execution Sandbox", description: "Executes Python code safely in isolated local sandbox process.", category: "CODE" });
        this.register({ id: "execute_code", name: "Code Executor", description: "Evaluates scripts and returns execution stdout/stderr.", category: "CODE" });
        this.register({ id: "search_company_knowledge", name: "Persistent Company RAG Search", description: "Searches enterprise knowledge base chunks with citations.", category: "KNOWLEDGE" });
        this.register({ id: "create_docx", name: "DOCX Document Builder", description: "Compiles structured report text into Word document.", category: "ARTIFACT" });
        this.register({ id: "create_xlsx", name: "XLSX Workbook Generator", description: "Compiles tabular data into styled Excel spreadsheet.", category: "ARTIFACT" });
        this.register({ id: "create_pptx", name: "Visual Presentation Generator", description: "Compiles slide structure into styled PPTX presentation deck.", category: "ARTIFACT" });
        this.register({ id: "verify_claims", name: "Evidence Claim Verifier", description: "Cross-checks facts against retrieved evidence snippets.", category: "VERIFY" });
    }

    public register(tool: ToolDefinition) {
        this.tools.set(tool.id, tool);
    }

    public getTool(id: string): ToolDefinition | undefined {
        return this.skillsGet(id);
    }

    private skillsGet(id: string) {
        return this.tools.get(id);
    }

    public listTools(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }
}
