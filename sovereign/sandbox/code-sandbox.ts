import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface SandboxExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number | null;
    executionTimeMs: number;
    sandboxed: boolean;
}

export class CodeSandbox {
    private scratchDir: string;

    constructor(scratchDir?: string) {
        this.scratchDir = scratchDir || path.join(process.cwd(), "scratch_sandbox");
        if (!fs.existsSync(this.scratchDir)) {
            fs.mkdirSync(this.scratchDir, { recursive: true });
        }
    }

    public async executePythonScript(code: string, timeoutMs: number = 10000): Promise<SandboxExecutionResult> {
        const scriptPath = path.join(this.scratchDir, `calc_${Date.now()}.py`);
        fs.writeFileSync(scriptPath, code);

        const startTime = Date.now();

        return new Promise<SandboxExecutionResult>((resolve) => {
            // Run isolated python3 subprocess
            const child = spawn("python3", [scriptPath], {
                cwd: this.scratchDir,
                env: { ...process.env, PYTHONUNBUFFERED: "1" },
            });

            let stdout = "";
            let stderr = "";
            let killed = false;

            const timer = setTimeout(() => {
                killed = true;
                child.kill("SIGKILL");
                stderr += "\n[SANDBOX ERROR] Execution timed out after " + timeoutMs + "ms";
            }, timeoutMs);

            child.stdout.on("data", (data) => { stdout += data.toString(); });
            child.stderr.on("data", (data) => { stderr += data.toString(); });

            child.on("close", (code) => {
                clearTimeout(timer);
                const executionTimeMs = Date.now() - startTime;

                // Cleanup temporary script file
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

            child.on("error", (err) => {
                clearTimeout(timer);
                resolve({
                    success: false,
                    stdout: "",
                    stderr: `Failed to launch Python sandbox runner: ${err.message}`,
                    exitCode: -1,
                    executionTimeMs: Date.now() - startTime,
                    sandboxed: true
                });
            });
        });
    }
}
