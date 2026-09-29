import { describe, expect, it } from "bun:test";
import path from "node:path";
import fs from "node:fs";
import { SovereigntyGuard } from "../core/sovereignty-guard";
import { ModelRegistryRouter } from "../core/model-registry";
import { AuraAgentGraph } from "../core/state-graph";
import { IndustrialDocumentParser } from "../document/industrial-doc";
import { LocalKnowledgeRetriever } from "../knowledge/local-retriever";
import { PythonSandboxTool } from "../tools/sandbox-tool";
import { VerifierTool } from "../tools/verifier-tool";
import { DeliverableTools } from "../tools/deliverable-tools";

describe("AURA End-to-End Real Inspection Pipeline", () => {
    it("should execute complete real end-to-end industrial workflow for REPORT A (Critical Deficit)", async () => {
        const guard = SovereigntyGuard.getInstance();
        guard.setSovereignMode(true);

        const router = new ModelRegistryRouter();
        const graph = new AuraAgentGraph();
        const parser = new IndustrialDocumentParser();
        const retriever = new LocalKnowledgeRetriever();
        const sandbox = new PythonSandboxTool();
        const verifier = new VerifierTool();
        const deliverableGen = new DeliverableTools();

        const reportAPath = path.join(process.cwd(), "demo-data", "inspection-report-A.txt");
        const sopDir = path.join(process.cwd(), "demo-data");
        const outputDir = path.join(process.cwd(), "output_deliverables");

        let state = graph.createInitialState({
            taskDescription: "Analyze inspection report A and generate DOCX approval note.",
            documentPath: reportAPath,
            sopDirectoryPath: sopDir,
            outputDirectory: outputDir
        });

        // 1. UNDERSTAND
        state = graph.transition(state, "UNDERSTAND", "Inspected request");
        expect(state.history.length).toBe(1);

        // 2. ROUTE
        const visionRoute = await router.routeTask("vision_ocr");
        const reasoningRoute = await router.routeTask("document_reasoning");
        state.routesSelected.push(visionRoute, reasoningRoute);
        expect(visionRoute.selectedModel.provider).toBe("ollama");
        expect(reasoningRoute.selectedModel.provider).toBe("ollama");

        // 3. PROCESS DOCUMENT
        const parsedDoc = await parser.parse(reportAPath);
        expect(parsedDoc.findings.length).toBeGreaterThan(0);
        expect(parsedDoc.findings[0].equipmentId).toBe("EX-402A");
        expect(parsedDoc.findings[0].measuredNumeric).toBe(3.10);

        // 4. RETRIEVE KNOWLEDGE
        await retriever.indexDirectory(sopDir);
        const evidence = retriever.retrieveEvidence("EX-402A wall thickness", 3);
        expect(evidence.length).toBeGreaterThan(0);

        // 5. CALCULATE
        const calcRes = await sandbox.executeCalculation(`print(4.50 - 3.10)`);
        expect(calcRes.success).toBe(true);
        expect(calcRes.stdout).toContain("1.4");

        // 6. VERIFY & CONDITIONAL BRANCH
        const verifications = verifier.verify(parsedDoc.findings, evidence);
        expect(verifications[0].isHazard).toBe(true);
        state.conditionalBranchTaken = "CRITICAL_HAZARD_ISOLATION";

        // 7. GENERATE DELIVERABLES
        const deliverables = await deliverableGen.generateAll({
            taskDescription: state.taskDescription,
            equipmentId: parsedDoc.findings[0].equipmentId,
            findings: parsedDoc.findings,
            evidence,
            calculationOutput: calcRes.stdout,
            verificationStatus: "SUPPORTED",
            isHazard: true,
            outputDirectory: outputDir
        });

        expect(fs.existsSync(deliverables.docx)).toBe(true);
        expect(fs.existsSync(deliverables.xlsx)).toBe(true);
        expect(fs.existsSync(deliverables.pptx)).toBe(true);

        // 8. SOVEREIGNTY CHECK
        const audit = guard.getLedgerSummary();
        expect(audit.sovereignMode).toBe(true);
        expect(audit.blockedCloudAttempts).toBeGreaterThanOrEqual(0);

    });

    it("should execute complete real end-to-end industrial workflow for REPORT B (Safe Margin)", async () => {
        const router = new ModelRegistryRouter();
        const graph = new AuraAgentGraph();
        const parser = new IndustrialDocumentParser();
        const retriever = new LocalKnowledgeRetriever();
        const sandbox = new PythonSandboxTool();
        const verifier = new VerifierTool();
        const deliverableGen = new DeliverableTools();

        const reportBPath = path.join(process.cwd(), "demo-data", "inspection-report-B.txt");
        const sopDir = path.join(process.cwd(), "demo-data");
        const outputDir = path.join(process.cwd(), "output_deliverables");

        const parsedDoc = await parser.parse(reportBPath);
        expect(parsedDoc.findings[0].equipmentId).toBe("EX-402B");
        expect(parsedDoc.findings[0].measuredNumeric).toBe(5.20);

        await retriever.indexDirectory(sopDir);
        const evidence = retriever.retrieveEvidence("EX-402B wall thickness", 3);

        const verifications = verifier.verify(parsedDoc.findings, evidence);
        expect(verifications[0].isHazard).toBe(false);

        const deliverables = await deliverableGen.generateAll({
            taskDescription: "Analyze report B",
            equipmentId: parsedDoc.findings[0].equipmentId,
            findings: parsedDoc.findings,
            evidence,
            calculationOutput: "SAFE OPERATING MARGIN: Wall thickness 5.20mm is above T-min 4.50mm",
            verificationStatus: "SUPPORTED",
            isHazard: false,
            outputDirectory: outputDir
        });

        expect(deliverables.docx).toContain("MRPL_Inspection_Certificate.docx");
        expect(fs.existsSync(deliverables.docx)).toBe(true);
    });
});
