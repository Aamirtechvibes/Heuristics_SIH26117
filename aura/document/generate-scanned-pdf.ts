import fs from "node:fs";
import path from "node:path";

export function createScannedPdf(outputPath: string) {
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 560 >>
stream
BT
/F1 16 Tf
50 720 Td
(MANGALORE REFINERY AND PETROCHEMICALS LIMITED) Tj
0 -25 Td
/F1 14 Tf
(SCANNED NDT ULTRASONIC INSPECTION REPORT - CDU-1) Tj
0 -30 Td
/F1 11 Tf
(INSPECTION DATE: 2026-09-15) Tj
0 -20 Td
(EQUIPMENT IDENTIFIER: EX-402A) Tj
0 -20 Td
(EQUIPMENT NAME: Crude Pre-Heat Exchanger Shell) Tj
0 -20 Td
(MEASURED WALL THICKNESS: 3.10 mm) Tj
0 -20 Td
(ALLOWABLE MINIMUM LIMIT \(T-MIN\): 4.50 mm) Tj
0 -20 Td
(DEFECT FINDING: Severe localized pitting corrosion detected near nozzle N2.) Tj
0 -20 Td
(STATUS: CRITICAL SAFETY HAZARD) Tj
0 -30 Td
(RECOMMENDED ACTION:) Tj
0 -20 Td
(Immediate unit isolation & shell weld overlay per MRPL SOP-MNT-2024-04.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
00000000117 00000 n 
0000000244 00000 n 
0000000856 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
945
%%EOF`;

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(outputPath, pdfContent, "utf-8");
    return outputPath;
}

if (import.meta.main) {
    const out = path.join(process.cwd(), "demo-data", "inspection-report-scanned.pdf");
    createScannedPdf(out);
    console.log(`✓ Created genuine PDF at ${out}`);
}
