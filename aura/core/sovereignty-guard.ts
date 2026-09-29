export interface AuditLedgerEntry {
    id: string;
    timestamp: string;
    targetUrl: string;
    provider: string;
    allowed: boolean;
    reason: string;
}

export class SovereigntyGuard {
    private static instance: SovereigntyGuard;
    private sovereignMode: boolean = true;
    private auditLedger: AuditLedgerEntry[] = [];
    private originalFetch: typeof globalThis.fetch;
    private isHooked: boolean = false;

    private constructor() {
        this.originalFetch = globalThis.fetch;
        const envVal = process.env.SOVEREIGN_MODE;
        if (envVal !== undefined) {
            this.sovereignMode = envVal === "true" || envVal === "1";
        }
        this.enableGlobalInterceptor();
    }

    public static getInstance(): SovereigntyGuard {
        if (!SovereigntyGuard.instance) {
            SovereigntyGuard.instance = new SovereigntyGuard();
        }
        return SovereigntyGuard.instance;
    }

    public isSovereign(): boolean {
        return this.sovereignMode;
    }

    public setSovereignMode(enabled: boolean): void {
        this.sovereignMode = enabled;
        this.recordAudit("SYSTEM_CONFIG", "SYSTEM", true, `Sovereign mode state changed to ${enabled}`);
    }

    public recordAudit(targetUrl: string, provider: string, allowed: boolean, reason: string): void {
        this.auditLedger.push({
            id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            targetUrl,
            provider,
            allowed,
            reason
        });
    }

    private enableGlobalInterceptor(): void {
        if (this.isHooked) return;
        this.isHooked = true;

        const self = this;
        const nativeFetch = globalThis.fetch;

        globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
            const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

            const isCloudAI = self.isCloudAIUrl(urlString);

            if (self.sovereignMode && isCloudAI) {
                const provider = self.detectProvider(urlString);
                self.recordAudit(urlString, provider, false, "BLOCKED: Sovereign Mode ACTIVE. External cloud AI access prohibited.");
                console.error(`\n🛑 [SOVEREIGNTY GUARD HARD BLOCK] Prevented outbound request to ${urlString}`);
                throw new Error(`Sovereignty Violation: Outbound request to cloud AI endpoint '${urlString}' blocked by SovereignGuard.`);
            }

            if (isCloudAI) {
                self.recordAudit(urlString, self.detectProvider(urlString), true, "Allowed (Sovereign Mode OFF)");
            } else if (urlString.includes("127.0.0.1") || urlString.includes("localhost") || urlString.includes("ollama")) {
                self.recordAudit(urlString, "LOCAL_OLLAMA", true, "Local on-premise inference permitted");
            }

            return nativeFetch(input, init);
        };
    }

    private isCloudAIUrl(url: string): boolean {
        const lower = url.toLowerCase();
        return (
            lower.includes("openrouter.ai") ||
            lower.includes("api.openai.com") ||
            lower.includes("api.anthropic.com") ||
            lower.includes("generativelanguage.googleapis.com") ||
            lower.includes("api.groq.com") ||
            lower.includes("api.mistral.ai") ||
            lower.includes("api.cohere.ai")
        );
    }

    private detectProvider(url: string): string {
        const lower = url.toLowerCase();
        if (lower.includes("openrouter")) return "OpenRouter";
        if (lower.includes("openai")) return "OpenAI";
        if (lower.includes("anthropic")) return "Anthropic";
        if (lower.includes("google")) return "Google Gemini";
        if (lower.includes("groq")) return "Groq";
        if (lower.includes("127.0.0.1") || lower.includes("localhost")) return "Local Ollama";
        return "External API";
    }

    public getLedgerSummary() {
        return {
            sovereignMode: this.sovereignMode,
            totalAuditEvents: this.auditLedger.length,
            blockedCloudAttempts: this.auditLedger.filter(e => !e.allowed).length,
            localInferenceCalls: this.auditLedger.filter(e => e.allowed && e.provider === "LOCAL_OLLAMA").length,
            auditLedger: [...this.auditLedger]
        };
    }
}
