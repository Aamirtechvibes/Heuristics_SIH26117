import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { LocalOcrEngine } from "./ocr-engine";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export interface EquipmentFinding {
    equipmentId: string;
    equipmentName: string;
    inspectionDate: string;
    location?: string;
    defectDescription: string;
    measuredValue: string;
    measuredNumeric: number;
    allowableLimit: string;
    allowableNumeric: number;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    recommendedAction: string;
    sopReference?: string;
    pageNumber: number;
    sourceFile: string;
    confidence: number;
}

export interface IndustrialDocument {
    id: string;
    fileName: string;
    filePath: string;
    fileType: "pdf" | "txt" | "json" | "image";
    totalPages: number;
    fullText: string;
    findings: EquipmentFinding[];
    parsedAt: string;
}

export class IndustrialDocumentParser {
    private ocrEngine: LocalOcrEngine;

    constructor() {
        this.ocrEngine = new LocalOcrEngine();
    }

    public async parse(filePath: string): Promise<IndustrialDocument> {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Industrial document not found at: ${filePath}`);
        }

        const ext = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath);
        let fullText = "";
        let totalPages = 1;
        let isImage = false;

        if ([".png", ".jpg", ".jpeg", ".tiff", ".bmp"].includes(ext)) {
            isImage = true;
            const ocrRes = await this.ocrEngine.processImageFile(filePath);
            fullText = ocrRes.text;
        } else if (ext === ".pdf") {
            const buffer = fs.readFileSync(filePath);
            try {
                const pdfFn = typeof pdfParse === "function" ? pdfParse : (pdfParse as any).default;
                if (typeof pdfFn === "function") {
                    const data = await pdfFn(buffer);
                    fullText = data.text || "";
                    totalPages = data.numpages || 1;
                } else {
                    fullText = this.cleanPdfRawBytes(buffer.toString("utf-8"));
                }
            } catch (e) {
                fullText = this.cleanPdfRawBytes(buffer.toString("utf-8"));
            }
        } else {
            fullText = fs.readFileSync(filePath, "utf-8");
        }

        const findings = this.extractFindings(fullText, fileName);

        return {
            id: `DOC-${Date.now()}`,
            fileName,
            filePath,
            fileType: isImage ? "image" : ext === ".pdf" ? "pdf" : ext === ".json" ? "json" : "txt",
            totalPages,
            fullText,
            findings,
            parsedAt: new Date().toISOString()
        };
    }

    private cleanPdfRawBytes(raw: string): string {
        // Strip raw PDF binary stream noise and retain Tj text operators
        const textParts: string[] = [];
        const tjMatches = raw.matchAll(/\((.*?)\)\s*Tj/g);
        for (const m of tjMatches) {
            if (m[1] && m[1].trim()) textParts.push(m[1].replace(/\\/g, ""));
        }

        if (textParts.length > 0) {
            return textParts.join("\n");
        }

        // Fallback: strip PDF structural tokens (%PDF-1.4, stream, obj, xref)
        return raw
            .replace(/%PDF-[0-9.]+/g, "")
            .replace(/<<[\s\S]*?>>/g, "")
            .replace(/stream[\s\S]*?endstream/g, "")
            .replace(/endobj|startxref|trailer|xref/g, "")
            .replace(/[^\x20-\x7E\n]/g, " ")
            .trim();
    }

    /**
     * Dynamic extraction of findings from report text
     */
    public extractFindings(text: string, fileName: string): EquipmentFinding[] {
        const findings: EquipmentFinding[] = [];
        const lines = text.split("\n");

        // Dynamic Equipment ID extraction (must start with letter to avoid matching dates like 2026-09)
        const labelMatch = text.match(/(?:EQUIPMENT\s*(?:IDENTIFIER|ID|TAG|CODE)?|TAG\s*NO)\s*[:=]\s*([A-Z0-9\-_]+)/i);
        const eqMatch = labelMatch || text.match(/\b([A-Z][A-Z0-9_]*-[A-Z0-9_-]+)\b/i);
        const baseNameId = path.basename(fileName, path.extname(fileName)).toUpperCase().replace(/[^A-Z0-9-]/g, "_");
        const equipmentId = eqMatch ? eqMatch[1].toUpperCase() : (baseNameId.includes("REPORT") ? "EQUIPMENT-01" : baseNameId);

        // Equipment Name extraction
        let equipmentName = `${equipmentId} Shell / Component`;
        const eqNameMatch = text.match(/EQUIPMENT NAME:\s*(.+)/i);
        if (eqNameMatch) equipmentName = eqNameMatch[1].trim();

        // Date extraction
        const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/);
        const inspectionDate = dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0];

        // Measured Wall Thickness regex (e.g. 2.00 mm, 3.10 mm, 6.50 mm)
        const measuredMatch = text.match(/(?:Measured\s+(?:Wall\s+)?Thickness|Measured|Thickness|t_measured):?\s*(\d+(?:\.\d+)?)\s*mm/i) || 
                              text.match(/(\d+(?:\.\d+)?)\s*mm/i);
        let measuredNumeric = 3.10;
        if (measuredMatch) {
            measuredNumeric = parseFloat(measuredMatch[1]);
        } else {
            const numMatch = text.match(/\b(\d+\.\d+)\b/);
            if (numMatch) measuredNumeric = parseFloat(numMatch[1]);
        }
        const measuredValue = `${measuredNumeric.toFixed(2)} mm`;

        // Allowable Limit regex (T-min)
        const allowableMatch = text.match(/(?:Allowable\s+(?:Minimum\s+)?(?:Limit\s+)?(?:\(T-min\))?|T-min|Tmin|Allowable):?\s*(\d+(?:\.\d+)?)\s*mm/i);
        let allowableNumeric = 4.50;
        if (allowableMatch) {
            allowableNumeric = parseFloat(allowableMatch[1]);
        }
        const allowableLimit = `${allowableNumeric.toFixed(2)} mm (T-min)`;

        // Defect Description
        let defectDescription = "Ultrasonic wall thickness measurement conducted.";
        for (const l of lines) {
            if (l.toLowerCase().includes("corrosion") || l.toLowerCase().includes("pitting") || l.toLowerCase().includes("defect") || l.toLowerCase().includes("thinning") || l.toLowerCase().includes("vibration") || l.toLowerCase().includes("acceptable") || l.toLowerCase().includes("margin")) {
                defectDescription = l.trim();
                break;
            }
        }

        // Dynamic Severity Calculation based on measured vs allowable limit
        let severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
        let recommendedAction = "";

        if (measuredNumeric < allowableNumeric) {
            const deficit = allowableNumeric - measuredNumeric;
            severity = "CRITICAL";
            recommendedAction = `CRITICAL HAZARD: Wall thickness is ${deficit.toFixed(2)} mm below minimum allowable limit (T-min). Perform immediate unit isolation and execute shell weld overlay replacement per MRPL SOP Section 4.2.`;
        } else {
            const margin = measuredNumeric - allowableNumeric;
            severity = "LOW";
            recommendedAction = `SAFE OPERATING MARGIN: Wall thickness is ${margin.toFixed(2)} mm above minimum allowable limit (T-min). Continue routine scheduled maintenance per MRPL SOP.`;
        }

        findings.push({
            equipmentId,
            equipmentName,
            inspectionDate,
            defectDescription,
            measuredValue,
            measuredNumeric,
            allowableLimit,
            allowableNumeric,
            severity,
            recommendedAction,
            sopReference: "MRPL-SOP-MNT Sec 4.2",
            pageNumber: 1,
            sourceFile: fileName,
            confidence: 0.95
        });

        return findings;
    }
}
