import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { SovereigntyMonitor } from "../network/sovereignty-monitor";
import type { LanguageModel } from "ai";

export type TaskType = 
    | "vision_ocr" 
    | "document_reasoning" 
    | "knowledge_search" 
    | "coding_calculation" 
    | "summary_report";

export interface ModelSpec {
    id: string;
    displayName: string;
    provider: "ollama" | "openrouter";
    taskTypes: TaskType[];
    description: string;
    isLocal: boolean;
    fallbackId?: string;
}

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1";

export const REGISTERED_MODELS: Record<string, ModelSpec> = {
    "qwen2.5-coder": {
        id: process.env.LOCAL_REASONING_MODEL || "qwen2.5-coder:7b",
        displayName: "Qwen 2.5 Coder (7B Local)",
        provider: "ollama",
        taskTypes: ["document_reasoning", "coding_calculation", "knowledge_search"],
        description: "High performance local open-weight model for logic, code & industrial documentation reasoning.",
        isLocal: true,
        fallbackId: "llama3.2"
    },
    "llama3.2": {
        id: process.env.LOCAL_GENERAL_MODEL || "llama3.2:3b",
        displayName: "Llama 3.2 (3B Local)",
        provider: "ollama",
        taskTypes: ["summary_report", "knowledge_search", "document_reasoning"],
        description: "Fast local model for summarization, report drafting, and general language tasks.",
        isLocal: true,
        fallbackId: "qwen2.5-coder"
    },
    "llava": {
        id: process.env.LOCAL_VISION_MODEL || "llava:latest",
        displayName: "LLaVA / Qwen2-VL Multimodal (Local)",
        provider: "ollama",
        taskTypes: ["vision_ocr"],
        description: "Local open-weight multimodal vision model for reading scanned inspection reports and drawings.",
        isLocal: true,
        fallbackId: "qwen2.5-coder"
    },
    "openrouter-default": {
        id: process.env.OPENROUTER_DEFAULT_MODEL || "anthropic/claude-3.5-sonnet",
        displayName: "Cloud Model (OpenRouter - Non-Sovereign Fallback)",
        provider: "openrouter",
        taskTypes: ["document_reasoning", "coding_calculation"],
        description: "External cloud model used ONLY when Sovereign Mode is explicitly disabled.",
        isLocal: false,
        fallbackId: "qwen2.5-coder"
    }
};

export function getModelForId(modelId: string): LanguageModel {
    const monitor = SovereigntyMonitor.getInstance();
    const spec = Object.values(REGISTERED_MODELS).find(m => m.id === modelId) || {
        id: modelId,
        displayName: modelId,
        provider: modelId.includes("/") ? "openrouter" : "ollama",
        taskTypes: ["document_reasoning"],
        description: "Dynamic Model",
        isLocal: !modelId.includes("/")
    };

    if (spec.provider === "openrouter" || !spec.isLocal) {
        monitor.guardCall("https://openrouter.ai/api/v1");
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            throw new Error("OPENROUTER_API_KEY is missing for cloud fallback");
        }
        const openrouter = createOpenRouter({ apiKey });
        return openrouter(spec.id);
    }

    // Local Ollama provider using OpenAI-compatible endpoint
    monitor.guardCall(`${OLLAMA_BASE_URL}/chat/completions`);
    const ollama = createOpenAI({
        baseURL: OLLAMA_BASE_URL,
        apiKey: "ollama", // Ollama doesn't require an actual API key
    });

    return ollama(spec.id);
}
