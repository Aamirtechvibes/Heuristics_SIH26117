import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { IndustrialDocumentParser } from "../document/industrial-doc";
import { LocalKnowledgeRetriever } from "../knowledge/local-retriever";
import { PythonSandboxTool } from "../tools/sandbox-tool";
import { VerifierTool } from "../tools/verifier-tool";
import { DeliverableTools } from "../tools/deliverable-tools";

describe("AURA Live Upload & Per-Run Isolation E2E Test Suite", () => {
    const testDir = path.join(process.cwd(), "demo-data", "scratch_e2e_tests");
    const reportXPath = path.join(testDir, "report-X.txt");
    const reportYPath = path.join(testDir, "report-Y.txt");
    const sopXPath = path.join(testDir, "sop-X.txt");
    const sopYPath = path.join(testDir, "sop-Y.txt");

    beforeAll(() => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // REPORT X (Critical Deficit, PUMP-X01, 2.00 mm)
        fs.writeFileSync(reportXPath, `
MANGALORE REFINERY AND PETROCHEMICALS LIMITED (MRPL)
ULTRASONIC INSPECTION REPORT

INSPECTION DATE: 2026-09-30
EQUIPMENT IDENTIFIER: PUMP-X01
EQUIPMENT NAME: High Pressure Feed Pump Casing

OBSERVED DEFECTS & FINDINGS:
1. Ultrasonic thickness scan on pump casing.
2. Measured Wall Thickness: 2.00 mm
3. Allowable Minimum Limit (T-min): 4.50 mm
4. Status: CRITICAL DEFICIT.
        `.trim());

        // REPORT Y (Safe Margin, VESSEL-Y02, 6.50 mm)
        fs.writeFileSync(reportYPath, `
MANGALORE REFINERY AND PETROCHEMICALS LIMITED (MRPL)
ULTRASONIC INSPECTION REPORT

INSPECTION DATE: 2026-09-30
EQUIPMENT IDENTIFIER: VESSEL-Y02
EQUIPMENT NAME: Hydrocracker Separator Vessel

OBSERVED DEFECTS & FINDINGS:
1. Ultrasonic thickness scan on shell course 3.
2. Measured Wall Thickness: 6.50 mm
3. Allowable Minimum Limit (T-min): 4.50 mm
4. Status: SAFE OPERATING MARGIN.
        `.trim());

        // SOP X (T-min = 4.50 mm)
        fs.writeFileSync(sopXPath, `
MRPL REFINERY STANDARD OPERATING PROCEDURE SOP-X
SECTION 1: EQUIPMENT MINIMUM WALL THICKNESS
Minimum allowable T-min for feed pumps and vessels is 4.50 mm.
Below 4.50 mm requires immediate critical isolation.
        `.trim());

        // SOP Y (T-min = 6.00 mm)
        fs.writeFileSync(sopYPath, `
MRPL REFINERY STANDARD OPERATING PROCEDURE SOP-Y
SECTION 1: EQUIPMENT MINIMUM WALL THICKNESS
Minimum allowable T-min for heavy wall hydrocracker vessels is 6.00 mm.
Below 6.00 mm requires immediate shutdown.
        `.trim());
    });

    afterAll(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    test("Phase 16 — Live Upload of REPORT X vs REPORT Y produces distinct data flow", async () => {
        const parser = new IndustrialDocumentParser();
        const sandbox = new PythonSandboxTool();

        // 1. Process Report X
        const parsedX = await parser.parse(reportXPath);
        expect(parsedX.findings.length).toBeGreaterThan(0);
        const findingX = parsedX.findings[0];
        expect(findingX.equipmentId).toBe("PUMP-X01");
        expect(findingX.measuredNumeric).toBe(2.00);

        const calcCodeX = `
t_measured = ${findingX.measuredNumeric}
t_min = ${findingX.allowableNumeric}
t_deficit = t_min - t_measured
if t_measured < t_min:
    print(f"CRITICAL DEFICIT: {t_deficit:.2f} mm")
else:
    print(f"SAFE MARGIN: {abs(t_deficit):.2f} mm")
        `;
        const resX = await sandbox.executeCalculation(calcCodeX);
        expect(resX.stdout).toContain("CRITICAL DEFICIT: 2.50 mm");

        // 2. Process Report Y
        const parsedY = await parser.parse(reportYPath);
        expect(parsedY.findings.length).toBeGreaterThan(0);
        const findingY = parsedY.findings[0];
        expect(findingY.equipmentId).toBe("VESSEL-Y02");
        expect(findingY.measuredNumeric).toBe(6.50);

        const calcCodeY = `
t_measured = ${findingY.measuredNumeric}
t_min = ${findingY.allowableNumeric}
t_deficit = t_min - t_measured
if t_measured < t_min:
    print(f"CRITICAL DEFICIT: {t_deficit:.2f} mm")
else:
    print(f"SAFE MARGIN: {abs(t_deficit):.2f} mm")
        `;
        const resY = await sandbox.executeCalculation(calcCodeY);
        expect(resY.stdout).toContain("SAFE MARGIN: 2.00 mm");

        // Assert distinct state
        expect(findingX.equipmentId).not.toBe(findingY.equipmentId);
        expect(findingX.measuredNumeric).not.toBe(findingY.measuredNumeric);
        expect(resX.stdout).not.toBe(resY.stdout);
    });

    test("Phase 17 — SOP Isolation Test prevents indexing unrelated report fixtures", async () => {
        const retriever = new LocalKnowledgeRetriever();

        // Run 1: Index ONLY SOP-X
        retriever.reset();
        await retriever.indexKnowledgeFiles([sopXPath]);
        const evidenceX = retriever.retrieveEvidence("PUMP-X01 wall thickness limit", 5);

        expect(evidenceX.length).toBeGreaterThan(0);
        expect(evidenceX.every(e => e.sourceFile.includes("sop-X.txt"))).toBe(true);
        expect(evidenceX.some(e => e.sourceFile.includes("inspection-report-B.txt"))).toBe(false);

        // Run 2: Index ONLY SOP-Y
        retriever.reset();
        await retriever.indexKnowledgeFiles([sopYPath]);
        const evidenceY = retriever.retrieveEvidence("VESSEL-Y02 wall thickness limit", 5);

        expect(evidenceY.length).toBeGreaterThan(0);
        expect(evidenceY.every(e => e.sourceFile.includes("sop-Y.txt"))).toBe(true);
        expect(evidenceY.some(e => e.sourceFile.includes("sop-X.txt"))).toBe(false);
    });

    test("Phase 13 & 14 — Per-Run Output Directory Isolation for Deliverables", async () => {
        const deliverableGen = new DeliverableTools();
        const runId1 = `test_run_${Date.now()}_1`;
        const runId2 = `test_run_${Date.now()}_2`;

        const outDir1 = path.join(process.cwd(), "output_deliverables", runId1);
        const outDir2 = path.join(process.cwd(), "output_deliverables", runId2);

        const res1 = await deliverableGen.generateAll({
            taskDescription: "Analyze Pump X01",
            equipmentId: "PUMP-X01",
            findings: [{
                equipmentId: "PUMP-X01",
                equipmentName: "Feed Pump",
                inspectionDate: "2026-09-30",
                defectDescription: "Pitting corrosion",
                measuredValue: "2.00 mm",
                allowableLimit: "4.50 mm",
                severity: "CRITICAL",
                recommendedAction: "Isolate pump",
                sopReference: "SOP-X",
                measuredNumeric: 2.00,
                allowableNumeric: 4.50
            }],
            evidence: [{ sourceFile: "sop-X.txt", sectionOrPage: "SECTION 1", matchedContent: "T-min is 4.50 mm", score: 0.9 }],
            calculationOutput: "CRITICAL DEFICIT: 2.50 mm",
            verificationStatus: "SUPPORTED",
            isHazard: true,
            outputDirectory: outDir1,
            runId: runId1,
            sourceFile: "report-X.txt"
        });

        const res2 = await deliverableGen.generateAll({
            taskDescription: "Analyze Vessel Y02",
            equipmentId: "VESSEL-Y02",
            findings: [{
                equipmentId: "VESSEL-Y02",
                equipmentName: "Hydrocracker Vessel",
                inspectionDate: "2026-09-30",
                defectDescription: "General corrosion",
                measuredValue: "6.50 mm",
                allowableLimit: "4.50 mm",
                severity: "NORMAL",
                recommendedAction: "Routine inspection",
                sopReference: "SOP-Y",
                measuredNumeric: 6.50,
                allowableNumeric: 4.50
            }],
            evidence: [{ sourceFile: "sop-Y.txt", sectionOrPage: "SECTION 1", matchedContent: "T-min is 6.00 mm", score: 0.9 }],
            calculationOutput: "SAFE MARGIN: 2.00 mm",
            verificationStatus: "SUPPORTED",
            isHazard: false,
            outputDirectory: outDir2,
            runId: runId2,
            sourceFile: "report-Y.txt"
        });

        expect(fs.existsSync(res1.docx)).toBe(true);
        expect(fs.existsSync(res2.docx)).toBe(true);
        expect(res1.docx).toContain(runId1);
        expect(res2.docx).toContain(runId2);
        expect(res1.docx).not.toBe(res2.docx);

        // Cleanup test deliverable directories
        fs.rmSync(outDir1, { recursive: true, force: true });
        fs.rmSync(outDir2, { recursive: true, force: true });
    });
});
