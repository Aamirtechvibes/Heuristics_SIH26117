import fs from "node:fs";
import path from "node:path";
import { IndustrialDocumentParser } from "../document/industrial-doc";

export interface EvidenceSnippet {
    sourceFile: string;
    sourcePath: string;
    sectionOrPage: string;
    matchedContent: string;
    score: number;
    sopCode?: string;
}

export class LocalKnowledgeRetriever {
    private indexedSections: Array<{
        fileName: string;
        filePath: string;
        sectionTitle: string;
        content: string;
        pageNumber: number;
    }> = [];
    private parser: IndustrialDocumentParser;

    constructor() {
        this.parser = new IndustrialDocumentParser();
    }

    public async indexDirectory(dirPath: string): Promise<number> {
        if (!fs.existsSync(dirPath)) return 0;
        const files = fs.readdirSync(dirPath);
        let count = 0;

        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);
            if (stat.isFile() && (file.endsWith(".txt") || file.endsWith(".md") || file.endsWith(".pdf") || file.endsWith(".json"))) {
                try {
                    const doc = await this.parser.parse(fullPath);
                    this.indexDocumentText(doc.fileName, doc.filePath, doc.fullText);
                    count++;
                } catch (e) {
                    // Graceful fallback for unparseable files
                }
            }
        }
        return count;
    }

    public indexDocumentText(fileName: string, filePath: string, text: string) {
        const lines = text.split("\n");
        let currentTitle = "General SOP Standards & Operating Limits";
        let chunk: string[] = [];
        let pageNum = 1;

        for (const line of lines) {
            if (line.includes("Page ") || line.includes("PAGE ")) {
                const match = line.match(/Page\s+(\d+)/i);
                if (match) pageNum = parseInt(match[1], 10);
            }

            if (line.trim().startsWith("#") || line.trim().startsWith("SECTION") || (line.toUpperCase() === line.trim() && line.length > 5 && line.length < 50)) {
                if (chunk.length > 0) {
                    this.indexedSections.push({
                        fileName,
                        filePath,
                        sectionTitle: currentTitle,
                        content: chunk.join("\n").trim(),
                        pageNumber: pageNum
                    });
                    chunk = [];
                }
                currentTitle = line.trim().replace(/^#+\s*/, "");
            } else {
                chunk.push(line);
            }
        }

        if (chunk.length > 0) {
            this.indexedSections.push({
                fileName,
                filePath,
                sectionTitle: currentTitle,
                content: chunk.join("\n").trim(),
                pageNumber: pageNum
            });
        }
    }

    public retrieveEvidence(query: string, limit: number = 3): EvidenceSnippet[] {
        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        const results: EvidenceSnippet[] = [];

        for (const sec of this.indexedSections) {
            const lower = sec.content.toLowerCase();
            let score = 0;
            for (const t of terms) {
                if (lower.includes(t)) score += 1;
            }

            if (score > 0) {
                const sopMatch = sec.content.match(/\b(SOP-[A-Z0-9-]+|MRPL-SOP-\d+)\b/i);
                results.push({
                    sourceFile: sec.fileName,
                    sourcePath: sec.filePath,
                    sectionOrPage: `${sec.sectionTitle} (Page ${sec.pageNumber})`,
                    matchedContent: sec.content.slice(0, 300) + (sec.content.length > 300 ? "..." : ""),
                    score,
                    sopCode: sopMatch ? sopMatch[1] : undefined
                });
            }
        }

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, limit);
    }
}
