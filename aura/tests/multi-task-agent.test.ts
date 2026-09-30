import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { startAuraApiServer } from "../api/server";
import { TaskPlanner } from "../planner/task-planner";
import { PersistentKnowledgeBase } from "../knowledge/company-knowledge";
import * as path from "path";
import * as fs from "fs";

describe("AURA Multi-Task Sovereign Agent Comprehensive Test Suite", () => {
    let server: ReturnType<typeof Bun.serve>;
    const TEST_PORT = 3098;
    const BASE_URL = `http://localhost:${TEST_PORT}`;

    beforeAll(() => {
        server = startAuraApiServer(TEST_PORT);
    });

    afterAll(() => {
        if (server) server.stop(true);
    });

    test("1. Task Classification & Skill Selection across 12 Task Types", () => {
        const generalPlan = TaskPlanner.plan("What is the difference between REST and GraphQL?");
        expect(generalPlan.category).toBe("GENERAL_QA");
        expect(generalPlan.skills).toContain("answer-question");
        expect(generalPlan.requiresArtifactGen).toBe(false);

        const codeGenPlan = TaskPlanner.plan("Write a Python function to calculate Fibonacci numbers.");
        expect(codeGenPlan.category).toBe("CODE_GEN");
        expect(codeGenPlan.skills).toContain("generate-code");

        const debugPlan = TaskPlanner.plan("Debug this python function and run tests");
        expect(debugPlan.category).toBe("CODE_DEBUG");
        expect(debugPlan.skills).toContain("debug-code");

        const pdfPlan = TaskPlanner.plan("Analyze this PDF document and summarize key points", ["report.pdf"]);
        expect(pdfPlan.category).toBe("DOCUMENT_ANALYSIS");
        expect(pdfPlan.skills).toContain("analyze-pdf");

        const pptPlan = TaskPlanner.plan("Create a PPT presentation on future AI trends");
        expect(pptPlan.category).toBe("PRESENTATION_GEN");
        expect(pptPlan.skills).toContain("presentation-design");
        expect(pptPlan.requiresArtifactGen).toBe(true);

        const industrialPlan = TaskPlanner.plan("Check EX-402A wall thickness against maintenance SOP");
        expect(industrialPlan.category).toBe("INDUSTRIAL_INSPECTION");
        expect(industrialPlan.skills).toContain("inspection-analysis");
    });

    test("2. GENERAL_QA returns direct answer without industrial equipment fields or artifacts", async () => {
        const res = await fetch(`${BASE_URL}/api/run-task`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                taskPrompt: "What is recursion in computer science?"
            })
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.plan.category).toBe("GENERAL_QA");
        expect(data.finalResponse).toBeDefined();
        expect(data.finalResponse).not.toContain("EX-402A");
        expect(data.finalResponse).not.toContain("3.10 mm");
        expect(data.finalResponse).not.toContain("Wall Thickness Deficit");
    }, 30000);

    test("3. CODE_GEN executes Python task in sandbox", async () => {
        const res = await fetch(`${BASE_URL}/api/run-task`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                taskPrompt: "Write a python script to reverse a string"
            })
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.plan.category).toBe("CODE_GEN");
        expect(data.finalResponse).toContain("```python");
        expect(data.finalResponse).toContain("Sandbox Output");
    }, 30000);

    test("4. PRESENTATION_GEN invokes PresentationSkill to build visual PPTX", async () => {
        const res = await fetch(`${BASE_URL}/api/run-task`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                taskPrompt: "Create a PPT presentation on Sovereign AI in Enterprise"
            })
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.plan.category).toBe("PRESENTATION_GEN");
        expect(data.deliverableUrls?.pptx).toBeDefined();
    }, 30000);

    test("5. Persistent Knowledge Base CRUD Operations", async () => {
        const kb = PersistentKnowledgeBase.getInstance();
        const tempFilePath = path.join(process.cwd(), "demo-data", "temp-kb-test.txt");
        fs.writeFileSync(tempFilePath, "MRPL Enterprise Safety SOP 2026: Mandatory 6-month inspection cycle for pressure vessels.");
        
        // CREATE
        const doc = await kb.addDocument(tempFilePath, "test-sop.txt", ["sop", "safety"]);
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

        expect(doc.id).toBeDefined();
        expect(doc.originalName).toBe("test-sop.txt");

        // READ
        const docs = await kb.listDocuments();
        expect(docs.some(d => d.id === doc.id)).toBe(true);

        // SEARCH
        const searchRes = await kb.searchKnowledge("pressure vessels");
        expect(searchRes.length).toBeGreaterThan(0);
        expect(searchRes[0].content).toContain("pressure vessels");

        // DELETE
        const deleted = await kb.deleteDocument(doc.id);
        expect(deleted).toBe(true);
        const docsAfter = await kb.listDocuments();
        expect(docsAfter.some(d => d.id === doc.id)).toBe(false);
    });

    test("6. HTTP Knowledge API Endpoints", async () => {
        // List
        const listRes = await fetch(`${BASE_URL}/api/knowledge`);
        expect(listRes.status).toBe(200);
        const listData = await listRes.json();
        expect(Array.isArray(listData.documents)).toBe(true);

        // Upload to Knowledge Base
        const formData = new FormData();
        const testFile = new File(["Company Standard Operating Procedure for Data Sovereignty"], "company-policy.txt", { type: "text/plain" });
        formData.append("file", testFile);

        const uploadRes = await fetch(`${BASE_URL}/api/knowledge`, {
            method: "POST",
            body: formData
        });
        expect(uploadRes.status).toBe(200);
        const uploadData = await uploadRes.json();
        expect(uploadData.success).toBe(true);
        expect(uploadData.document.originalName).toBe("company-policy.txt");

        // Delete from KB
        const delRes = await fetch(`${BASE_URL}/api/knowledge/${uploadData.document.id}`, {
            method: "DELETE"
        });
        expect(delRes.status).toBe(200);
        const delData = await delRes.json();
        expect(delData.success).toBe(true);
    });
});
