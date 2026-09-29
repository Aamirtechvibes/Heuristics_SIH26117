import fs from "node:fs";
import path from "node:path";
import { 
    Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType 
} from "docx";
import ExcelJS from "exceljs";
import pptxgen from "pptxgenjs";
import type { EquipmentFinding } from "../document/industrial-doc";
import type { EvidenceSnippet } from "../knowledge/local-retriever";

export interface DeliverablesInput {
    taskDescription: string;
    equipmentId: string;
    findings: EquipmentFinding[];
    evidence: EvidenceSnippet[];
    calculationOutput: string;
    verificationStatus: "SUPPORTED" | "UNCERTAIN";
    isHazard: boolean;
    outputDirectory: string;
}

export class DeliverableTools {
    public async generateAll(input: DeliverablesInput): Promise<{ docx: string; xlsx: string; pptx: string }> {
        if (!fs.existsSync(input.outputDirectory)) {
            fs.mkdirSync(input.outputDirectory, { recursive: true });
        }

        const docxPath = path.join(input.outputDirectory, input.isHazard ? "MRPL_Confidential_Approval_Note.docx" : "MRPL_Inspection_Certificate.docx");
        const xlsxPath = path.join(input.outputDirectory, "MRPL_Inspection_Findings_Analysis.xlsx");
        const pptxPath = path.join(input.outputDirectory, "MRPL_Management_Inspection_Summary.pptx");

        await Promise.all([
            this.generateDocx(input, docxPath),
            this.generateXlsx(input, xlsxPath),
            this.generatePptx(input, pptxPath)
        ]);

        return { docx: docxPath, xlsx: xlsxPath, pptx: pptxPath };
    }

    private async generateDocx(input: DeliverablesInput, outputPath: string): Promise<string> {
        const docTitle = input.isHazard 
            ? "CONFIDENTIAL INDUSTRIAL APPROVAL NOTE (CRITICAL DEFICIT)"
            : "CONFIDENTIAL INSPECTION CERTIFICATE (SAFE OPERATING MARGIN)";

        const doc = new Document({
            sections: [
                {
                    children: [
                        new Paragraph({
                            text: "MANGALORE REFINERY AND PETROCHEMICALS LIMITED (MRPL)",
                            heading: HeadingLevel.HEADING_2,
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: docTitle,
                                    bold: true,
                                    size: 26,
                                    color: input.isHazard ? "C53030" : "2F855A",
                                }),
                            ],
                            alignment: AlignmentType.CENTER,
                            space: { after: 300 },
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({ text: "DOCUMENT REF: ", bold: true }),
                                new TextRun({ text: `MRPL/ENG-APPROVAL/${Date.now().toString().slice(-6)}\n` }),
                                new TextRun({ text: "DATE: ", bold: true }),
                                new TextRun({ text: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n` }),
                                new TextRun({ text: "TARGET EQUIPMENT: ", bold: true }),
                                new TextRun({ text: `${input.equipmentId}\n` }),
                                new TextRun({ text: "CLASSIFICATION: ", bold: true }),
                                new TextRun({ text: "CONFIDENTIAL / ON-PREMISE SOVEREIGN WORKBENCH\n", color: "C53030", bold: true }),
                            ],
                            space: { after: 300 },
                        }),

                        new Paragraph({ text: "1. Executive Summary & Problem Scope", heading: HeadingLevel.HEADING_1 }),
                        new Paragraph({
                            text: `This document records the autonomous engineering assessment performed for target equipment ${input.equipmentId}. Measured parameters were cross-referenced against MRPL maintenance SOPs using the Sovereign AI Workbench.`,
                            space: { after: 200 },
                        }),

                        new Paragraph({ text: "2. Equipment Findings Table", heading: HeadingLevel.HEADING_1 }),
                        this.createFindingsTable(input.findings),

                        new Paragraph({ text: "3. Sandboxed Engineering Calculation Output", heading: HeadingLevel.HEADING_1, space: { before: 300 } }),
                        new Paragraph({
                            children: [
                                new TextRun({ 
                                    text: input.calculationOutput, 
                                    bold: true, 
                                    color: input.isHazard ? "C53030" : "2F855A" 
                                }),
                            ],
                            space: { after: 200 },
                        }),

                        new Paragraph({ text: "4. SOP Evidence & Citations", heading: HeadingLevel.HEADING_1 }),
                        ...input.evidence.map(e => new Paragraph({
                            children: [
                                new TextRun({ text: `• [${e.sourceFile} - ${e.sectionOrPage}]: `, bold: true }),
                                new TextRun({ text: e.matchedContent }),
                            ],
                            space: { after: 100 },
                        })),

                        new Paragraph({ text: "5. Sovereign Data Protection & Signoff", heading: HeadingLevel.HEADING_1, space: { before: 200 } }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Verification Status: ", bold: true }),
                                new TextRun({ 
                                    text: `${input.verificationStatus} (0 Outbound Cloud AI Requests)\n`, 
                                    color: "2F855A",
                                    bold: true 
                                }),
                                new TextRun({ text: "Submitted By: AURA Sovereign AI Workbench\t\tApproved By: ___________________\n" }),
                                new TextRun({ text: "Role: Autonomous AI Industrial Worker\t\tChief Reliability Engineer, MRPL" }),
                            ],
                        }),
                    ],
                },
            ],
        });

        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(outputPath, buffer);
        return outputPath;
    }

    private async generateXlsx(input: DeliverablesInput, outputPath: string): Promise<string> {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "AURA Sovereign AI Workbench";
        const sheet = workbook.addWorksheet("Inspection Analysis");

        sheet.columns = [
            { header: "Equipment ID", key: "equipmentId", width: 15 },
            { header: "Equipment Name", key: "equipmentName", width: 25 },
            { header: "Inspection Date", key: "inspectionDate", width: 15 },
            { header: "Defect Description", key: "defectDescription", width: 40 },
            { header: "Measured Value", key: "measuredValue", width: 20 },
            { header: "Allowable Limit", key: "allowableLimit", width: 25 },
            { header: "Severity", key: "severity", width: 15 },
            { header: "Recommended Action", key: "recommendedAction", width: 45 },
            { header: "SOP Reference", key: "sopReference", width: 25 },
        ];

        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
        headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1A365D" } };

        for (const f of input.findings) {
            const row = sheet.addRow(f);
            if (f.severity === "CRITICAL") {
                row.getCell("severity").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FED7D7" } };
                row.getCell("severity").font = { color: { argb: "9B2C2C" }, bold: true };
            } else {
                row.getCell("severity").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "C6F6D5" } };
                row.getCell("severity").font = { color: { argb: "22543D" }, bold: true };
            }
        }

        await workbook.xlsx.writeFile(outputPath);
        return outputPath;
    }

    private async generatePptx(input: DeliverablesInput, outputPath: string): Promise<string> {
        const pres = new pptxgen();
        pres.title = "MRPL Inspection Executive Summary";

        const slide1 = pres.addSlide();
        slide1.background = { color: "1A365D" };
        slide1.addText("MRPL REFINERY INSPECTION SUMMARY", {
            x: 0.5, y: 2.0, w: 9.0, fontSize: 32, bold: true, color: "FFFFFF", align: "center",
        });
        slide1.addText(`Target Equipment: ${input.equipmentId} — Status: ${input.isHazard ? 'CRITICAL DEFICIT' : 'SAFE OPERATING MARGIN'}`, {
            x: 0.5, y: 3.2, w: 9.0, fontSize: 18, color: input.isHazard ? "FEB2B2" : "C6F6D5", align: "center",
        });

        const slide2 = pres.addSlide();
        slide2.addText("Equipment Inspection Findings", {
            x: 0.5, y: 0.5, w: 9.0, fontSize: 24, bold: true, color: "1A365D",
        });

        const tableData = [
            [
                { text: "Equipment ID", options: { bold: true, fill: "1A365D", color: "FFFFFF" } },
                { text: "Defect Description", options: { bold: true, fill: "1A365D", color: "FFFFFF" } },
                { text: "Severity", options: { bold: true, fill: "1A365D", color: "FFFFFF" } },
                { text: "Recommended Action", options: { bold: true, fill: "1A365D", color: "FFFFFF" } },
            ],
            ...input.findings.map(f => [f.equipmentId, f.defectDescription, f.severity, f.recommendedAction])
        ];

        slide2.addTable(tableData as any, { x: 0.5, y: 1.5, w: 9.0, colW: [1.5, 3.5, 1.2, 2.8] });

        await pres.writeFile({ fileName: outputPath });
        return outputPath;
    }

    private createFindingsTable(findings: EquipmentFinding[]): Table {
        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Eq. ID", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Defect Description", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Measured / T-min", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Severity", bold: true })] })] }),
            ],
        });

        const rows = findings.map(f => new TableRow({
            children: [
                new TableCell({ children: [new Paragraph(f.equipmentId)] }),
                new TableCell({ children: [new Paragraph(f.defectDescription)] }),
                new TableCell({ children: [new Paragraph(`${f.measuredValue} / ${f.allowableLimit}`)] }),
                new TableCell({ children: [new Paragraph(f.severity)] }),
            ],
        }));

        return new Table({
            rows: [headerRow, ...rows],
            width: { size: 100, type: WidthType.PERCENTAGE },
        });
    }
}
