import { describe, expect, it } from "bun:test";
import { SovereigntyMonitor } from "./sovereignty-monitor";
import { ModelRouter } from "../router/model-router";

describe("Sovereignty Monitor & Model Router", () => {
    it("should enforce sovereign mode by default", () => {
        const monitor = SovereigntyMonitor.getInstance();
        expect(monitor.isSovereign()).toBe(true);
    });

    it("should block cloud AI endpoints when sovereign mode is enabled", () => {
        const monitor = SovereigntyMonitor.getInstance();
        monitor.setSovereignMode(true);
        expect(() => {
            monitor.guardCall("https://openrouter.ai/api/v1/chat/completions");
        }).toThrow();
    });

    it("should allow local Ollama endpoint calls in sovereign mode", () => {
        const monitor = SovereigntyMonitor.getInstance();
        monitor.setSovereignMode(true);
        expect(() => {
            monitor.guardCall("http://127.0.0.1:11434/v1/chat/completions");
        }).not.toThrow();
    });

    it("should route tasks to appropriate local open-weight models", () => {
        const router = new ModelRouter();
        const decisionDoc = router.routeTask("vision_ocr");
        expect(decisionDoc.selectedModel.provider).toBe("ollama");
        expect(decisionDoc.isLocal).toBe(true);

        const decisionCoding = router.routeTask("coding_calculation");
        expect(decisionCoding.selectedModel.id).toContain("coder");
        expect(decisionCoding.isLocal).toBe(true);
    });
});
