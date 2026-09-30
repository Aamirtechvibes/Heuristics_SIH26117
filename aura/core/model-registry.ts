import { OllamaLocalProvider, DEFAULT_VISION_MODEL, DEFAULT_REASONING_MODEL, DEFAULT_CODING_MODEL } from "./ollama-provider";
import { SovereigntyGuard } from "./sovereignty-guard";

export type IndustrialTaskType =
    | "vision_ocr"
    | "document_reasoning"
    | "knowledge_retrieval"
    | "coding_calculation"
    | "summary_report";

export interface ModelRegistration {
    id: string;
    displayName: string;
    provider: "ollama";
    supportedTasks: IndustrialTaskType[];
    description: string;
    isLocal: true;
    fallbackId: string;
}

export const LOCAL_MODEL_REGISTRY: Record<string, ModelRegistration> = {
    "vision": {
        id: DEFAULT_VISION_MODEL,
        displayName: `Multimodal Vision (${DEFAULT_VISION_MODEL})`,
        provider: "ollama",
        supportedTasks: ["vision_ocr"],
        description: "Multimodal visual model for reading scanned inspection reports and engineering drawing frames.",
        isLocal: true,
        fallbackId: "reasoning"
    },
    "reasoning": {
        id: DEFAULT_REASONING_MODEL,
        displayName: `Engineering Reasoning (${DEFAULT_REASONING_MODEL})`,
        provider: "ollama",
        supportedTasks: ["document_reasoning", "knowledge_retrieval"],
        description: "Primary local open-weight model for industrial logic, SOP cross-checking & reasoning.",
        isLocal: true,
        fallbackId: "coding"
    },
    "coding": {
        id: DEFAULT_CODING_MODEL,
        displayName: `Code Execution & Math (${DEFAULT_CODING_MODEL})`,
        provider: "ollama",
        supportedTasks: ["coding_calculation"],
        description: "Specialized model for python script generation and deterministic engineering math.",
        isLocal: true,
        fallbackId: "reasoning"
    }
};

export interface RouteSelectionResult {
    taskType: IndustrialTaskType;
    selectedModel: ModelRegistration;
    reason: string;
    fallbackModel: ModelRegistration;
    isLocal: true;
    status: "LIVE LOCAL INFERENCE" | "LOCAL FALLBACK (MODEL NOT INSTALLED)" | "LOCAL FALLBACK (OLLAMA OFFLINE)";
    timestamp: string;
}

export class ModelRegistryRouter {
    private provider: OllamaLocalProvider;
    private guard: SovereigntyGuard;

    constructor() {
        this.provider = new OllamaLocalProvider();
        this.guard = SovereigntyGuard.getInstance();
    }

    public async routeTask(taskType: IndustrialTaskType, taskContext?: string): Promise<RouteSelectionResult> {
        let selectedKey = "reasoning";
        let reason = "Routed for engineering reasoning & document cross-checking.";
        let fallbackKey = "coding";

        switch (taskType) {
            case "vision_ocr":
                selectedKey = "vision";
                reason = "Task involves reading scanned inspection report page images / visual OCR.";
                fallbackKey = "reasoning";
                break;

            case "coding_calculation":
                selectedKey = "coding";
                reason = "Task involves executing sandboxed Python scripts for wall thickness T-min calculation.";
                fallbackKey = "reasoning";
                break;

            case "summary_report":
                selectedKey = "reasoning";
                reason = "Task involves generating executive presentation deck and management summaries.";
                fallbackKey = "coding";
                break;

            case "document_reasoning":
            case "knowledge_retrieval":
            default:
                selectedKey = "reasoning";
                reason = "Task involves multi-step engineering logic and SOP safety rule evaluation.";
                fallbackKey = "coding";
                break;
        }

        const selectedModel = LOCAL_MODEL_REGISTRY[selectedKey] || LOCAL_MODEL_REGISTRY["reasoning"];
        const fallbackModel = LOCAL_MODEL_REGISTRY[fallbackKey] || LOCAL_MODEL_REGISTRY["coding"];

        const health = await this.provider.getHealthStatus();
        const isModelAvailable = await this.provider.isAvailable(selectedModel.id);

        let status: RouteSelectionResult["status"] = "LOCAL FALLBACK (OLLAMA OFFLINE)";
        if (health.ollamaOnline) {
            status = isModelAvailable ? "LIVE LOCAL INFERENCE" : "LOCAL FALLBACK (MODEL NOT INSTALLED)";
        }

        return {
            taskType,
            selectedModel,
            reason: `${reason} [Sovereignty Guard: 100% LOCAL INFERENCE ENFORCED]`,
            fallbackModel,
            isLocal: true,
            status,
            timestamp: new Date().toISOString()
        };
    }

    public getProvider(): OllamaLocalProvider {
        return this.provider;
    }
}
