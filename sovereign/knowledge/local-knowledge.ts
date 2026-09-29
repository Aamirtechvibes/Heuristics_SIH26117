import fs from "node:fs";
import path from "node:path";
import { DocumentParser } from "../document/document-parser";

export interface EvidenceSnippet {
    sourceFile: string;
    sourcePath: string;
    sectionOrPage: string;
    matchedContent: string;
    relevanceScore: number;
    sopCode?: string;
}

export class LocalKnowledgeBase {
    private documents: Array<{
        fileName: string;
        filePath: string;
        sections: Array<{ sectionTitle: string; content: string; pageNumber: number }>;
    }> = [];
    private parser: DocumentParser;

    constructor() {
        this.parser = new DocumentParser();
    }

    public async indexDirectory(dirPath: string): Promise<number> {
        if (!fs.existsSync(dirPath)) return 0;

        const files = fs.readdirSync(dirPath);
        let count = 0;

        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);

            if (stat.isFile() && (file.endsWith(".pdf") || file.endsWith(".txt") || file.endsWith(".md") || file.endsWith(".json"))) {
                try {
                    const parsed = await this.parser.parseDocument(fullPath);
                    this.addParsedDocument(parsed.fileName, parsed.filePath, parsed.fullText);
                    count++;
                } catch (e) {
                    // Ignore unparseable test files gracefully
                }
            }
        }
        return count;
    }

    public addParsedDocument(fileName: string, filePath: string, fullText: string) {
        const lines = fullText.split("\n");
        const sections: Array<{ sectionTitle: string; content: string; pageNumber: number }> = [];

        let currentTitle = "General Specs & Operating Limits";
        let currentChunk: string[] = [];
        let pageNum = 1;

        for (const line of lines) {
            if (line.includes("Page ") || line.includes("PAGE ")) {
                const match = line.match(/Page\s+(\d+)/i);
                if (match) pageNum = parseInt(match[1], 10);
            }

            if (line.trim().startsWith("#") || line.trim().startsWith("SECTION") || line.toUpperCase() === line.trim() && line.length > 5 && line.length < 50) {
                if (currentChunk.length > 0) {
                    sections.push({
                        sectionTitle: currentTitle,
                        content: currentChunk.join("\n").trim(),
                        pageNumber: pageNum
                    });
                    currentChunk = [];
                }
                currentTitle = line.trim().replace(/^#+\s*/, "");
            } else {
                currentChunk.push(line);
            }
        }

        if (currentChunk.length > 0) {
            sections.push({
                sectionTitle: currentTitle,
                content: currentChunk.join("\n").trim(),
                pageNumber: pageNum
            });
        }

        this.documents.push({
            fileName,
            filePath,
            sections
        });
    }

    public searchKnowledge(query: string, limit: number = 3): EvidenceSnippet[] {
        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        const results: EvidenceSnippet[] = [];

        for (const doc of this.documents) {
            for (const sec of doc.sections) {
                const contentLower = sec.content.toLowerCase();
                let score = 0;

                for (const term of terms) {
                    if (contentLower.includes(term)) score += 1;
                }

                if (score > 0) {
                    // Extract SOP Code if present
                    const sopMatch = sec.content.match(/\b(SOP-[A-Z0-9-]+|MRPL-SOP-\d+)\b/i);
                    results.push({
                        sourceFile: doc.fileName,
                        sourcePath: doc.filePath,
                        sectionOrPage: `${sec.sectionTitle} (Page ${sec.pageNumber})`,
                        matchedContent: sec.content.slice(0, 300) + (sec.content.length > 300 ? "..." : ""),
                        relevanceScore: score,
                        sopCode: sopMatch ? sopMatch[1] : undefined
                    });
                }
            }
        }

        results.sort((a, b) => b.relevanceScore - a.relevanceScore);
        return results.slice(0, limit);
    }
}
