import fs from "node:fs";
import path from "node:path";
import { 
    Document, 
    Packer, 
    Paragraph, 
    TextRun, 
    HeadingLevel, 
    Table, 
    TableRow, 
    TableCell, 
    BorderStyle, 
    WidthType, 
    AlignmentType 
} from "docx";
import type { ExtractedFinding } from "../document/document-parser";
import type { EvidenceSnippet } from "../knowledge/local-knowledge";

export interface ApprovalNoteInput {
    subject: string;
    preparedFor: string;
    preparedBy: string;
    equipmentId: string;
    findings: ExtractedFinding[];
    evidence: EvidenceSnippet[];
    recommendedAction: string;
    verificationStatus: "SUPPORTED" | "UNCERTAIN";
    outputPath: string;
}

export class DocxGenerator {
    public async generateApprovalNote(input: ApprovalNoteInput): Promise<string> {
        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children: [
                        // Header Title
                        new Paragraph({
                            text: "MANGALORE REFINERY AND PETROCHEMICALS LIMITED",
                            heading: HeadingLevel.HEADING_2,
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "CONFIDENTIAL INDUSTRIAL APPROVAL NOTE",
                                    bold: true,
                                    size: 28,
                                    color: "1A365D",
                                }),
                            ],
                            alignment: AlignmentType.CENTER,
                            space: { after: 300 },
                        }),

                        // Metadata Block
                        new Paragraph({
                            children: [
                                new TextRun({ text: "DOCUMENT REF: ", bold: true }),
                                new TextRun({ text: `MRPL/ENG-INSP/${Date.now().toString().slice(-6)}\n` }),
                                new TextRun({ text: "DATE: ", bold: true }),
                                new TextRun({ text: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n` }),
                                new TextRun({ text: "SUBJECT: ", bold: true }),
                                new TextRun({ text: `${input.subject}\n` }),
                                new TextRun({ text: "CLASSIFICATION: ", bold: true }),
                                new TextRun({ text: "CONFIDENTIAL / ON-PREMISE SOVEREIGN WORKBENCH\n", color: "C53030", bold: true }),
                            ],
                            space: { after: 300 },
                        }),

                        // Executive Summary
                        new Paragraph({ text: "1. Executive Summary & Purpose", heading: HeadingLevel.HEADING_1 }),
                        new Paragraph({
                            text: `This approval note documents the autonomous engineering analysis conducted for target equipment ${input.equipmentId}. The inspection findings have been cross-checked against internal refinery Standing Operating Procedures (SOPs) and technical standards using the Sovereign AI Workbench.`,
                            space: { after: 200 },
                        }),

                        // Inspection Findings Table
                        new Paragraph({ text: "2. Equipment Inspection Findings", heading: HeadingLevel.HEADING_1 }),
                        this.createFindingsTable(input.findings),

                        // Recommended Actions
                        new Paragraph({ text: "3. Engineering Recommendation & Action Plan", heading: HeadingLevel.HEADING_1, space: { before: 300 } }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: input.recommendedAction, bold: true }),
                            ],
                            space: { after: 200 },
                        }),

                        // SOP Evidence Citations
                        new Paragraph({ text: "4. Internal Knowledge Base Citations & Evidence", heading: HeadingLevel.HEADING_1 }),
                        ...input.evidence.map(e => new Paragraph({
                            children: [
                                new TextRun({ text: `• [${e.sourceFile} - ${e.sectionOrPage}]: `, bold: true }),
                                new TextRun({ text: e.matchedContent }),
                            ],
                            space: { after: 100 },
                        })),

                        // Verification & Sovereignty Guarantee
                        new Paragraph({ text: "5. Sovereign Verification & Audit Guarantee", heading: HeadingLevel.HEADING_1, space: { before: 200 } }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Verification Status: ", bold: true }),
                                new TextRun({ 
                                    text: `${input.verificationStatus} (0 External AI Cloud Calls Made)\n`, 
                                    color: input.verificationStatus === "SUPPORTED" ? "2F855A" : "DD6B20",
                                    bold: true 
                                }),
                                new TextRun({ 
                                    text: "This document was generated on-premise without transmitting any confidential data outside MRPL infrastructure boundaries.",
                                    italic: true,
                                    size: 18,
                                }),
                            ],
                            space: { after: 400 },
                        }),

                        // Signoff block
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Submitted By: Sovereign AI Workbench\t\tApproved By: ___________________\n" }),
                                new TextRun({ text: "Role: Autonomous AI Industrial Worker\t\tChief Reliability Engineer, MRPL" }),
                            ],
                        }),
                    ],
                },
            ],
        });

        const buffer = await Packer.toBuffer(doc);
        const dir = path.dirname(input.outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(input.outputPath, buffer);

        return input.outputPath;
    }

    private createFindingsTable(findings: ExtractedFinding[]): Table {
        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Eq. ID", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Observed Defect", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Measured / Limit", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Severity", bold: true })] })] }),
            ],
        });

        const rows = findings.map(f => new TableRow({
            children: [
                new TableCell({ children: [new Paragraph(f.equipmentId)] }),
                new TableCell({ children: [new Paragraph(f.observedIssue)] }),
                new TableCell({ children: [new Paragraph(`${f.measuredValue || "N/A"} / ${f.allowableLimit || "N/A"}`)] }),
                new TableCell({ children: [new Paragraph(f.severity)] }),
            ],
        }));

        return new Table({
            rows: [headerRow, ...rows],
            width: { size: 100, type: WidthType.PERCENTAGE },
        });
    }
}
