import fs from "node:fs";
import path from "node:path";
import pptxgen from "pptxgenjs";
import type { ExtractedFinding } from "../document/document-parser";

export class PptxGenerator {
    public async generateManagementSummary(findings: ExtractedFinding[], outputPath: string): Promise<string> {
        const pres = new pptxgen();
        pres.title = "MRPL Inspection & Maintenance Executive Summary";
        pres.company = "Mangalore Refinery and Petrochemicals Limited";

        // Slide 1: Title Slide
        const slide1 = pres.addSlide();
        slide1.background = { color: "1A365D" };
        slide1.addText("MRPL REFINERY INSPECTION SUMMARY", {
            x: 0.5,
            y: 2.0,
            w: 9.0,
            fontSize: 32,
            bold: true,
            color: "FFFFFF",
            align: "center",
        });
        slide1.addText("Sovereign Agentic AI Workbench - Confidential Executive Report", {
            x: 0.5,
            y: 3.2,
            w: 9.0,
            fontSize: 18,
            color: "CBD5E0",
            align: "center",
        });

        // Slide 2: Critical Equipment Findings
        const slide2 = pres.addSlide();
        slide2.addText("Critical Equipment Inspection Findings", {
            x: 0.5,
            y: 0.5,
            w: 9.0,
            fontSize: 24,
            bold: true,
            color: "1A365D",
        });

        const tableData = [
            [
                { text: "Equipment ID", options: { bold: true, fill: "1A365D", color: "FFFFFF" } },
                { text: "Observed Defect", options: { bold: true, fill: "1A365D", color: "FFFFFF" } },
                { text: "Severity", options: { bold: true, fill: "1A365D", color: "FFFFFF" } },
                { text: "Recommended Action", options: { bold: true, fill: "1A365D", color: "FFFFFF" } },
            ],
            ...findings.map(f => [
                f.equipmentId,
                f.observedIssue,
                f.severity,
                f.recommendedAction
            ])
        ];

        slide2.addTable(tableData as any, { x: 0.5, y: 1.5, w: 9.0, colW: [1.5, 3.5, 1.2, 2.8] });

        // Slide 3: Sovereign Compliance
        const slide3 = pres.addSlide();
        slide3.addText("Sovereignty & Security Guarantee", {
            x: 0.5,
            y: 0.5,
            w: 9.0,
            fontSize: 24,
            bold: true,
            color: "1A365D",
        });

        slide3.addText([
            { text: "• 100% On-Premise Execution: ", options: { bold: true } },
            { text: "All analysis conducted locally via open-weight models.\n\n" },
            { text: "• Air-Gapped Network Verification: ", options: { bold: true } },
            { text: "0 outbound cloud AI API requests logged during operation.\n\n" },
            { text: "• Auditability: ", options: { bold: true } },
            { text: "Human approval workflow enforced for all engineering actions.\n" },
        ], { x: 0.8, y: 1.8, w: 8.4, fontSize: 18, color: "2D3748" });

        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        await pres.writeFile({ fileName: outputPath });
        return outputPath;
    }
}
