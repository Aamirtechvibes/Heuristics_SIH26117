import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { startAuraApiServer } from "../api/server";

describe("AURA API Server Routes & Upload Smoke Test", () => {
    let server: ReturnType<typeof Bun.serve>;
    const TEST_PORT = 3099;
    const BASE_URL = `http://localhost:${TEST_PORT}`;

    beforeAll(() => {
        server = startAuraApiServer(TEST_PORT);
    });

    afterAll(() => {
        if (server) server.stop(true);
    });

    test("GET /api/ollama-health is reachable and returns 200 OK", async () => {
        const res = await fetch(`${BASE_URL}/api/ollama-health`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("ollamaOnline");
        expect(data).toHaveProperty("inferenceMode");
    });

    test("GET /api/upload returns 200 OK active endpoint message", async () => {
        const res = await fetch(`${BASE_URL}/api/upload`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.status).toBe("active");
        expect(data.endpoint).toBe("/api/upload");
    });

    test("OPTIONS /api/upload returns 204 with CORS preflight headers", async () => {
        const res = await fetch(`${BASE_URL}/api/upload`, { method: "OPTIONS" });
        expect(res.status).toBe(204);
        expect(res.headers.get("access-control-allow-origin")).toBe("*");
        expect(res.headers.get("access-control-allow-headers")).toBe("*");
    });

    test("POST /api/upload accepts multipart form data and saves uploaded file", async () => {
        const formData = new FormData();
        const testFile = new File(["MANGALORE REFINERY INSPECTION REPORT CONTENT"], "test-inspection.txt", { type: "text/plain" });
        formData.append("file", testFile);
        formData.append("category", "report");

        const res = await fetch(`${BASE_URL}/api/upload`, {
            method: "POST",
            body: formData,
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data).toHaveProperty("runId");
        expect(data.fileName).toBe("test-inspection.txt");
        expect(data.filePath).toContain("demo-data/uploads/");
    });

    test("POST /api/run-task returns 200 OK with run context and deliverables", async () => {
        const res = await fetch(`${BASE_URL}/api/run-task`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                isLiveUpload: false,
                taskPrompt: "Smoke test task execution"
            })
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data).toHaveProperty("runId");
        expect(data).toHaveProperty("deliverableUrls");
    }, 60000);
});
