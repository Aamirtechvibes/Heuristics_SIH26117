import { describe, expect, it } from "bun:test";
import { SovereigntyGuard } from "./sovereignty-guard";
import { ModelRegistryRouter } from "./model-registry";
import { IndustrialDocumentParser } from "../document/industrial-doc";
import { LocalKnowledgeRetriever } from "../knowledge/local-retriever";
import { PythonSandboxTool } from "../tools/sandbox-tool";
import path from "node:path";

describe("AURA Sovereign Core Architecture", () => {
    it("should enforce sovereign mode by default with socket-level interceptor", () => {
        const guard = SovereigntyGuard.getInstance();
        expect(guard.isSovereign()).toBe(true);
    });

    it("should block external cloud AI calls in sovereign mode", async () => {
        const guard = SovereigntyGuard.getInstance();
        guard.setSovereignMode(true);
        expect(fetch("https://openrouter.ai/api/v1/chat/completions")).rejects.toThrow();
    });

    it("should route industrial tasks to local open-weight models", async () => {
        const router = new ModelRegistryRouter();
        const visionRoute = await router.routeTask("vision_ocr");
        expect(visionRoute.selectedModel.provider).toBe("ollama");
        expect(visionRoute.isLocal).toBe(true);

        const reasoningRoute = await router.routeTask("document_reasoning");
        expect(reasoningRoute.selectedModel.id).toContain("coder");
        expect(reasoningRoute.isLocal).toBe(true);
    });


    it("should parse industrial report and extract equipment findings", async () => {
        const parser = new IndustrialDocumentParser();
        const docPath = path.join(process.cwd(), "demo-data", "inspection-report.txt");
        const doc = await parser.parse(docPath);

        expect(doc.findings.length).toBeGreaterThan(0);
        expect(doc.findings[0].equipmentId).toBe("EX-402A");
    });

    it("should retrieve on-premise SOP evidence snippets", async () => {
        const retriever = new LocalKnowledgeRetriever();
        const sopDir = path.join(process.cwd(), "demo-data");
        await retriever.indexDirectory(sopDir);

        const evidence = retriever.retrieveEvidence("EX-402A wall thickness", 2);
        expect(evidence.length).toBeGreaterThan(0);
    });

    it("should execute sandboxed Python engineering math safely", async () => {
        const sandbox = new PythonSandboxTool();
        const res = await sandbox.executeCalculation("print(4.50 - 3.10)");
        expect(res.success).toBe(true);
        expect(res.stdout).toContain("1.4");
    });
});
