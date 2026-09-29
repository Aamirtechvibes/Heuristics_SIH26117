import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import type { ExtractedFinding } from "../document/document-parser";

export class XlsxGenerator {
    public async generateInspectionSheet(findings: ExtractedFinding[], outputPath: string): Promise<string> {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Sovereign AI Workbench";
        workbook.created = new Date();

        const sheet = workbook.addWorksheet("Inspection Analysis & Findings");

        sheet.columns = [
            { header: "Equipment ID", key: "equipmentId", width: 15 },
            { header: "Equipment Name", key: "equipmentName", width: 25 },
            { header: "Inspection Date", key: "inspectionDate", width: 15 },
            { header: "Observed Issue", key: "observedIssue", width: 40 },
            { header: "Measured Value", key: "measuredValue", width: 20 },
            { header: "Allowable Limit", key: "allowableLimit", width: 25 },
            { header: "Severity", key: "severity", width: 15 },
            { header: "Recommended Action", key: "recommendedAction", width: 45 },
            { header: "SOP Reference", key: "sopReference", width: 25 },
        ];

        // Format header row
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
        headerRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "1A365D" },
        };

        for (const f of findings) {
            const row = sheet.addRow({
                equipmentId: f.equipmentId,
                equipmentName: f.equipmentName || "Refinery Equipment",
                inspectionDate: f.inspectionDate,
                observedIssue: f.observedIssue,
                measuredValue: f.measuredValue || "N/A",
                allowableLimit: f.allowableLimit || "N/A",
                severity: f.severity,
                recommendedAction: f.recommendedAction,
                sopReference: f.sopReference || "MRPL-SOP-MNT-2024",
            });

            // Highlight CRITICAL severity rows
            if (f.severity === "CRITICAL") {
                row.getCell("severity").fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FED7D7" },
                };
                row.getCell("severity").font = { color: { argb: "9B2C2C" }, bold: true };
            }
        }

        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        await workbook.xlsx.writeFile(outputPath);
        return outputPath;
    }
}
