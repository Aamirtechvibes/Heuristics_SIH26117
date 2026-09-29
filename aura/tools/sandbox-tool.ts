import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface PythonSandboxResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number | null;
    executionTimeMs: number;
    sandboxed: true;
}

export class PythonSandboxTool {
    private scratchDir: string;

    constructor() {
        this.scratchDir = path.join(process.cwd(), "scratch_sandbox");
        if (!fs.existsSync(this.scratchDir)) {
            fs.mkdirSync(this.scratchDir, { recursive: true });
        }
    }

    public async executeCalculation(code: string, timeoutMs: number = 10000): Promise<PythonSandboxResult> {
        const scriptPath = path.join(this.scratchDir, `aura_calc_${Date.now()}.py`);
        fs.writeFileSync(scriptPath, code);

        const startTime = Date.now();

        return new Promise<PythonSandboxResult>((resolve) => {
            const child = spawn("python3", [scriptPath], {
                cwd: this.scratchDir,
                env: { ...process.env, PYTHONUNBUFFERED: "1" }
            });

            let stdout = "";
            let stderr = "";
            let killed = false;

            const timer = setTimeout(() => {
                killed = true;
                child.kill("SIGKILL");
                stderr += `\n[SANDBOX TIMEOUT] Subprocess killed after ${timeoutMs}ms`;
            }, timeoutMs);

            child.stdout.on("data", d => { stdout += d.toString(); });
            child.stderr.on("data", d => { stderr += d.toString(); });

            child.on("close", code => {
                clearTimeout(timer);
                const executionTimeMs = Date.now() - startTime;
                try { if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath); } catch (e) {}

                resolve({
                    success: code === 0 && !killed,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    exitCode: code,
                    executionTimeMs,
                    sandboxed: true
                });
            });

            child.on("error", err => {
                clearTimeout(timer);
                resolve({
                    success: false,
                    stdout: "",
                    stderr: `Sandbox error: ${err.message}`,
                    exitCode: -1,
                    executionTimeMs: Date.now() - startTime,
                    sandboxed: true
                });
            });
        });
    }
}
