import { REGISTERED_MODELS, TaskType, ModelSpec } from "../config/models.config";
import { SovereigntyMonitor } from "../network/sovereignty-monitor";

export interface RouteDecision {
    taskType: TaskType;
    selectedModel: ModelSpec;
    reason: string;
    fallbackModel: ModelSpec;
    isLocal: boolean;
    timestamp: string;
}

export class ModelRouter {
    private monitor: SovereigntyMonitor;

    constructor() {
        this.monitor = SovereigntyMonitor.getInstance();
    }

    public routeTask(taskType: TaskType, taskDescription?: string): RouteDecision {
        const isSovereign = this.monitor.isSovereign();
        let selectedKey: string;
        let reason: string;
        let fallbackKey: string;

        switch (taskType) {
            case "vision_ocr":
                selectedKey = "llava";
                reason = "Task requires multimodal analysis / OCR on scanned inspection document.";
                fallbackKey = "qwen2.5-coder";
                break;

            case "coding_calculation":
                selectedKey = "qwen2.5-coder";
                reason = "Task requires precise industrial calculations and code sandbox execution.";
                fallbackKey = "llama3.2";
                break;

            case "knowledge_search":
                selectedKey = "qwen2.5-coder";
                reason = "Task requires retrieving and cross-referencing SOP manuals and engineering specs.";
                fallbackKey = "llama3.2";
                break;

            case "summary_report":
                selectedKey = "llama3.2";
                reason = "Task requires generating executive summary notes and presentation slides.";
                fallbackKey = "qwen2.5-coder";
                break;

            case "document_reasoning":
            default:
                selectedKey = "qwen2.5-coder";
                reason = "Task requires multi-step engineering reasoning and findings validation.";
                fallbackKey = "llama3.2";
                break;
        }

        const selectedModel = REGISTERED_MODELS[selectedKey] || REGISTERED_MODELS["qwen2.5-coder"];
        const fallbackModel = REGISTERED_MODELS[fallbackKey] || REGISTERED_MODELS["llama3.2"];

        // Guarantee sovereignty constraint
        if (isSovereign && !selectedModel.isLocal) {
            throw new Error(`Sovereignty Violation: Router selected non-local model ${selectedModel.displayName} in Sovereign Mode.`);
        }

        return {
            taskType,
            selectedModel,
            reason: `${reason} [Sovereign Mode: ${isSovereign ? "ENABLED (100% Local)" : "DISABLED"}]`,
            fallbackModel,
            isLocal: selectedModel.isLocal,
            timestamp: new Date().toISOString()
        };
    }
}
