import fs from "node:fs";
import path from "node:path";
import pptxgen from "pptxgenjs";

export interface SlideContent {
    title: string;
    subtitle?: string;
    layoutType: "TITLE" | "EXECUTIVE_SUMMARY" | "BULLETS" | "METRICS" | "COMPARISON";
    bulletPoints?: string[];
    metrics?: Array<{ label: string; value: string }>;
    comparison?: { titleA: string; pointsA: string[]; titleB: string; pointsB: string[] };
}

export interface PresentationInput {
    topic: string;
    author?: string;
    slides: SlideContent[];
    outputPath: string;
}

export class PresentationSkill {
    public async generatePresentation(input: PresentationInput): Promise<string> {
        const pres = new pptxgen();
        pres.title = input.topic;

        const outDir = path.dirname(input.outputPath);
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        // 1. Title Slide
        const titleSlide = pres.addSlide();
        titleSlide.background = { color: "0F172A" }; // Deep Navy Slate
        titleSlide.addText(input.topic.toUpperCase(), {
            x: 0.8, y: 2.2, w: 8.4, fontSize: 30, bold: true, color: "FFFFFF", align: "center",
        });
        titleSlide.addText(`AURA Sovereign Agentic AI Workbench | ${input.author || "Confidential Presentation"}`, {
            x: 0.8, y: 3.4, w: 8.4, fontSize: 14, color: "94A3B8", align: "center",
        });

        // 2. Body Slides
        for (const s of input.slides) {
            const slide = pres.addSlide();
            slide.background = { color: "F8FAFC" }; // Crisp light background

            // Header
            slide.addText(s.title, {
                x: 0.6, y: 0.5, w: 8.8, fontSize: 22, bold: true, color: "0F172A",
            });
            if (s.subtitle) {
                slide.addText(s.subtitle, {
                    x: 0.6, y: 1.0, w: 8.8, fontSize: 13, color: "64748B",
                });
            }

            if (s.layoutType === "METRICS" && s.metrics) {
                const metricWidth = 8.8 / Math.min(s.metrics.length, 3);
                s.metrics.slice(0, 3).forEach((m, idx) => {
                    slide.addShape(pres.ShapeType.rect, {
                        x: 0.6 + idx * metricWidth, y: 1.8, w: metricWidth - 0.2, h: 2.2,
                        fill: { color: "1E293B" }, line: { color: "334155", width: 1 }
                    });
                    slide.addText(m.value, {
                        x: 0.6 + idx * metricWidth, y: 2.1, w: metricWidth - 0.2, fontSize: 28, bold: true, color: "38BDF8", align: "center"
                    });
                    slide.addText(m.label, {
                        x: 0.6 + idx * metricWidth, y: 3.0, w: metricWidth - 0.2, fontSize: 12, color: "94A3B8", align: "center"
                    });
                });
            } else if (s.layoutType === "COMPARISON" && s.comparison) {
                // Left Box A
                slide.addShape(pres.ShapeType.rect, {
                    x: 0.6, y: 1.6, w: 4.2, h: 3.4, fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 }
                });
                slide.addText(s.comparison.titleA, { x: 0.8, y: 1.8, w: 3.8, fontSize: 16, bold: true, color: "0F172A" });
                s.comparison.pointsA.forEach((pt, idx) => {
                    slide.addText(`• ${pt}`, { x: 0.8, y: 2.3 + idx * 0.45, w: 3.8, fontSize: 12, color: "334155" });
                });

                // Right Box B
                slide.addShape(pres.ShapeType.rect, {
                    x: 5.2, y: 1.6, w: 4.2, h: 3.4, fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 }
                });
                slide.addText(s.comparison.titleB, { x: 5.4, y: 1.8, w: 3.8, fontSize: 16, bold: true, color: "0F172A" });
                s.comparison.pointsB.forEach((pt, idx) => {
                    slide.addText(`• ${pt}`, { x: 5.4, y: 2.3 + idx * 0.45, w: 3.8, fontSize: 12, color: "334155" });
                });
            } else {
                // Bullet List Layout
                const bullets = s.bulletPoints || ["Key finding or insight summary point."];
                bullets.forEach((b, idx) => {
                    slide.addText(`• ${b}`, {
                        x: 0.8, y: 1.7 + idx * 0.55, w: 8.4, fontSize: 14, color: "1E293B", lineSpacing: 1.2
                    });
                });
            }
        }

        await pres.writeFile({ fileName: input.outputPath });
        return input.outputPath;
    }
}
