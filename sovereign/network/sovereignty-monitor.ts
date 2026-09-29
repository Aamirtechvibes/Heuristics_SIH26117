export interface NetworkAuditLog {
    timestamp: string;
    target: string;
    provider: string;
    allowed: boolean;
    reason: string;
}

export class SovereigntyMonitor {
    private static instance: SovereigntyMonitor;
    private sovereignMode: boolean = true;
    private externalCallsCount: number = 0;
    private blockedCallsCount: number = 0;
    private auditLogs: NetworkAuditLog[] = [];

    private constructor() {
        // Default to sovereign mode unless explicitly set to false
        const envVal = process.env.SOVEREIGN_MODE;
        if (envVal !== undefined) {
            this.sovereignMode = envVal === "true" || envVal === "1";
        }
    }

    public static getInstance(): SovereigntyMonitor {
        if (!SovereigntyMonitor.instance) {
            SovereigntyMonitor.instance = new SovereigntyMonitor();
        }
        return SovereigntyMonitor.instance;
    }

    public isSovereign(): boolean {
        return this.sovereignMode;
    }

    public setSovereignMode(enabled: boolean): void {
        this.sovereignMode = enabled;
        this.logAudit("SYSTEM", "CONFIG", true, `Sovereign mode set to ${enabled}`);
    }

    public guardCall(targetUrlOrProvider: string): void {
        const isExternalCloudAI = this.isCloudAIEndpoint(targetUrlOrProvider);

        if (this.sovereignMode && isExternalCloudAI) {
            this.blockedCallsCount++;
            const log: NetworkAuditLog = {
                timestamp: new Date().toISOString(),
                target: targetUrlOrProvider,
                provider: this.extractProviderName(targetUrlOrProvider),
                allowed: false,
                reason: "BLOCKED: Sovereign mode enabled. External cloud AI call prohibited."
            };
            this.auditLogs.push(log);
            console.error(`\n🛑 [SOVEREIGNTY GUARD] Blocked attempt to call external AI service: ${targetUrlOrProvider}`);
            throw new Error(`Sovereignty Violation: Blocked external call to ${targetUrlOrProvider} in Sovereign Mode.`);
        }

        if (isExternalCloudAI) {
            this.externalCallsCount++;
            this.logAudit(targetUrlOrProvider, this.extractProviderName(targetUrlOrProvider), true, "External cloud AI call allowed (Sovereign mode OFF)");
        } else {
            this.logAudit(targetUrlOrProvider, "LOCAL_OLLAMA", true, "Local on-premise inference approved");
        }
    }

    private logAudit(target: string, provider: string, allowed: boolean, reason: string): void {
        this.auditLogs.push({
            timestamp: new Date().toISOString(),
            target,
            provider,
            allowed,
            reason
        });
    }

    private isCloudAIEndpoint(target: string): boolean {
        const lower = target.toLowerCase();
        return (
            lower.includes("openrouter.ai") ||
            lower.includes("api.openai.com") ||
            lower.includes("api.anthropic.com") ||
            lower.includes("generativelanguage.googleapis.com") ||
            lower.includes("groq.com")
        );
    }

    private extractProviderName(target: string): string {
        const lower = target.toLowerCase();
        if (lower.includes("openrouter")) return "OpenRouter";
        if (lower.includes("openai")) return "OpenAI";
        if (lower.includes("anthropic")) return "Anthropic";
        if (lower.includes("google")) return "Google Gemini";
        if (lower.includes("localhost") || lower.includes("127.0.0.1") || lower.includes("ollama")) return "Local Ollama";
        return "Unknown";
    }

    public getTelemetry() {
        return {
            sovereignMode: this.sovereignMode,
            externalCallsCount: this.externalCallsCount,
            blockedCallsCount: this.blockedCallsCount,
            localCallsCount: this.auditLogs.filter(l => l.allowed && l.provider === "LOCAL_OLLAMA").length,
            auditLogs: [...this.auditLogs]
        };
    }
}
