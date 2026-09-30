import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { IndustrialDocumentParser } from "../document/industrial-doc";

export interface KnowledgeDocumentMetadata {
    id: string;
    filename: string;
    originalName: string;
    filePath: string;
    fileType: string;
    fileSizeBytes: number;
    checksum: string;
    uploadedAt: string;
    updatedAt: string;
    chunkCount: number;
    status: "INDEXED" | "ERROR";
    tags: string[];
}

export interface KnowledgeChunk {
    chunkId: string;
    documentId: string;
    filename: string;
    sectionTitle: string;
    pageNumber?: number;
    content: string;
}

export class PersistentKnowledgeBase {
    private static instance: PersistentKnowledgeBase;
    private kbDir: string;
    private metadataFile: string;
    private parser: IndustrialDocumentParser;
    private metadata: Map<string, KnowledgeDocumentMetadata> = new Map();
    private chunks: KnowledgeChunk[] = [];

    public static getInstance(): PersistentKnowledgeBase {
        if (!PersistentKnowledgeBase.instance) {
            PersistentKnowledgeBase.instance = new PersistentKnowledgeBase();
        }
        return PersistentKnowledgeBase.instance;
    }

    constructor() {
        this.kbDir = path.join(process.cwd(), "demo-data", "company-knowledge");
        this.metadataFile = path.join(this.kbDir, "index-metadata.json");
        this.parser = new IndustrialDocumentParser();

        if (!fs.existsSync(this.kbDir)) {
            fs.mkdirSync(this.kbDir, { recursive: true });
        }

        this.loadMetadata();
    }

    private loadMetadata() {
        if (fs.existsSync(this.metadataFile)) {
            try {
                const raw = fs.readFileSync(this.metadataFile, "utf-8");
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.documents)) {
                    for (const doc of parsed.documents) {
                        this.metadata.set(doc.id, doc);
                    }
                }
            } catch (e) {
                // Initial load fallback
            }
        }
    }

    private saveMetadata() {
        const payload = {
            updatedAt: new Date().toISOString(),
            documents: Array.from(this.metadata.values())
        };
        fs.writeFileSync(this.metadataFile, JSON.stringify(payload, null, 2));
    }

    public async addDocument(sourceFilePath: string, originalName?: string, tags: string[] = []): Promise<KnowledgeDocumentMetadata> {
        if (!fs.existsSync(sourceFilePath)) {
            throw new Error(`Source file not found: ${sourceFilePath}`);
        }

        const name = originalName || path.basename(sourceFilePath);
        const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const targetPath = path.join(this.kbDir, `${docId}_${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`);

        const fileBuffer = fs.readFileSync(sourceFilePath);
        fs.writeFileSync(targetPath, fileBuffer);

        const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");
        const ext = path.extname(name).toLowerCase().replace(".", "");

        const parsedDoc = await this.parser.parse(targetPath);
        const docChunks = this.createChunks(docId, name, parsedDoc.fullText);

        const docMeta: KnowledgeDocumentMetadata = {
            id: docId,
            filename: path.basename(targetPath),
            originalName: name,
            filePath: targetPath,
            fileType: ext,
            fileSizeBytes: fileBuffer.length,
            checksum,
            uploadedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            chunkCount: docChunks.length,
            status: "INDEXED",
            tags
        };

        this.metadata.set(docId, docMeta);
        this.chunks.push(...docChunks);
        this.saveMetadata();

        return docMeta;
    }

    public async updateDocument(documentId: string, newSourceFilePath: string): Promise<KnowledgeDocumentMetadata> {
        const existing = this.metadata.get(documentId);
        if (!existing) {
            throw new Error(`Knowledge document not found for ID: ${documentId}`);
        }

        // Purge old chunks
        this.chunks = this.chunks.filter(c => c.documentId !== documentId);

        // Replace file
        const fileBuffer = fs.readFileSync(newSourceFilePath);
        fs.writeFileSync(existing.filePath, fileBuffer);

        const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");
        const parsedDoc = await this.parser.parse(existing.filePath);
        const newChunks = this.createChunks(documentId, existing.originalName, parsedDoc.fullText);

        existing.checksum = checksum;
        existing.fileSizeBytes = fileBuffer.length;
        existing.updatedAt = new Date().toISOString();
        existing.chunkCount = newChunks.length;

        this.chunks.push(...newChunks);
        this.saveMetadata();

        return existing;
    }

    public deleteDocument(documentId: string): boolean {
        const existing = this.metadata.get(documentId);
        if (!existing) return false;

        if (fs.existsSync(existing.filePath)) {
            fs.unlinkSync(existing.filePath);
        }

        this.metadata.delete(documentId);
        this.chunks = this.chunks.filter(c => c.documentId !== documentId);
        this.saveMetadata();

        return true;
    }

    public listDocuments(): KnowledgeDocumentMetadata[] {
        return Array.from(this.metadata.values());
    }

    public searchKnowledge(query: string, limit: number = 5): Array<{ sourceFile: string; sectionTitle: string; content: string; score: number }> {
        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        const results: Array<{ sourceFile: string; sectionTitle: string; content: string; score: number }> = [];

        for (const c of this.chunks) {
            const haystack = `${c.sectionTitle} ${c.content}`.toLowerCase();
            let score = 0;
            for (const t of terms) {
                if (haystack.includes(t)) score += 1;
            }

            if (score > 0) {
                results.push({
                    sourceFile: c.filename,
                    sectionTitle: c.sectionTitle,
                    content: c.content.slice(0, 300) + (c.content.length > 300 ? "..." : ""),
                    score
                });
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, limit);
    }

    private createChunks(documentId: string, filename: string, fullText: string): KnowledgeChunk[] {
        const lines = fullText.split("\n");
        const chunks: KnowledgeChunk[] = [];
        let currentTitle = "General Knowledge Content";
        let buffer: string[] = [];

        for (const line of lines) {
            if (line.trim().startsWith("#") || line.trim().startsWith("SECTION") || (line.toUpperCase() === line.trim() && line.length > 5 && line.length < 50)) {
                if (buffer.length > 0) {
                    chunks.push({
                        chunkId: `chk_${Date.now()}_${chunks.length}`,
                        documentId,
                        filename,
                        sectionTitle: currentTitle,
                        content: buffer.join("\n").trim()
                    });
                    buffer = [];
                }
                currentTitle = line.trim().replace(/^#+\s*/, "");
            } else {
                buffer.push(line);
            }
        }

        if (buffer.length > 0) {
            chunks.push({
                chunkId: `chk_${Date.now()}_${chunks.length}`,
                documentId,
                filename,
                sectionTitle: currentTitle,
                content: buffer.join("\n").trim()
            });
        }

        return chunks;
    }
}
