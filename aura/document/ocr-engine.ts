import fs from "node:fs";
import path from "node:path";
import { OllamaLocalProvider } from "../core/ollama-provider";

export interface OcrResult {
    text: string;
    pageNumber: number;
    confidence: number;
    isVisual: boolean;
}

export class LocalOcrEngine {
    private provider: OllamaLocalProvider;

    constructor() {
        this.provider = new OllamaLocalProvider();
    }

    public async processImageFile(filePath: string): Promise<OcrResult> {
        if (!fs.existsSync(filePath)) {
            throw new Error(`OCR processing failed: Image file not found at ${filePath}`);
        }

        const buffer = fs.readFileSync(filePath);
        const base64 = buffer.toString("base64");

        const prompt = "Extract all text, equipment IDs, numbers, inspection findings, wall thickness measurements, and allowable limits from this industrial document page.";
        const visionText = await this.provider.generateVision("llava", prompt, base64);

        return {
            text: visionText,
            pageNumber: 1,
            confidence: 0.92,
            isVisual: true
        };
    }
}
