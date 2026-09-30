import path from "node:path";
import fs from "node:fs";
import { SovereigntyGuard } from "../core/sovereignty-guard";
import { ModelRegistryRouter } from "../core/model-registry";
import { AuraAgentGraph } from "../core/state-graph";
import { IndustrialDocumentParser } from "../document/industrial-doc";
import { LocalKnowledgeRetriever } from "../knowledge/local-retriever";
import { PythonSandboxTool } from "../tools/sandbox-tool";
import { VerifierTool } from "../tools/verifier-tool";
import { DeliverableTools } from "../tools/deliverable-tools";

const PORT = 3001;

export function startAuraApiServer(port: number = PORT) {
    const guard = SovereigntyGuard.getInstance();
    guard.setSovereignMode(true);

    const router = new ModelRegistryRouter();
    const graph = new AuraAgentGraph();
    const parser = new IndustrialDocumentParser();
    const retriever = new LocalKnowledgeRetriever();
    const sandbox = new PythonSandboxTool();
    const verifier = new VerifierTool();
    const deliverableGen = new DeliverableTools();

    const uploadsDir = path.join(process.cwd(), "demo-data", "uploads");
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    console.log(`\n🛡️ [AURA API SERVER] Starting Sovereign AI Workbench API on http://localhost:${port}...`);

    const server = Bun.serve({
        port,
        async fetch(req) {
            const url = new URL(req.url);
            const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/$/, "") : url.pathname;

            // Enable CORS for OPTIONS preflight
            if (req.method === "OPTIONS") {
                return new Response(null, {
                    status: 204,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
                        "Access-Control-Allow-Headers": "*",
                    },
                });
            }

            const headers = {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
                "Access-Control-Allow-Headers": "*",
                "Content-Type": "application/json",
            };

            // Serve static output deliverable files for download
            if (pathname.startsWith("/output_deliverables/")) {
                const relativePath = pathname.replace("/output_deliverables/", "");
                const filePath = path.join(process.cwd(), "output_deliverables", relativePath);
                if (fs.existsSync(filePath)) {
                    const fileBuffer = fs.readFileSync(filePath);
                    const ext = path.extname(filePath).toLowerCase();
                    let contentType = "application/octet-stream";
                    if (ext === ".docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                    if (ext === ".xlsx") contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                    if (ext === ".pptx") contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

                    return new Response(fileBuffer, {
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Content-Type": contentType,
                            "Content-Disposition": `attachment; filename="${path.basename(filePath)}"`,
                        },
                    });
                }
            }

            // GET /api/ollama-health
            if (pathname === "/api/ollama-health") {
                if (req.method !== "GET") {
                    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { headers, status: 405 });
                }
                const health = await router.getProvider().getHealthStatus();
                return new Response(JSON.stringify(health), { headers });
            }

            // GET /api/sovereignty
            if (pathname === "/api/sovereignty") {
                if (req.method !== "GET") {
                    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { headers, status: 405 });
                }
                return new Response(JSON.stringify(guard.getLedgerSummary()), { headers });
            }

            // POST /api/test-sovereignty
            if (pathname === "/api/test-sovereignty") {
                if (req.method !== "POST") {
                    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { headers, status: 405 });
                }
                try {
                    await fetch("https://openrouter.ai/api/v1/chat/completions");
                } catch (e: any) {
                    // Intentionally trapped by SovereigntyGuard
                }
                return new Response(JSON.stringify(guard.getLedgerSummary()), { headers });
            }

            // /api/upload (POST for file upload, GET for status check)
            if (pathname === "/api/upload") {
                if (req.method === "GET") {
                    return new Response(JSON.stringify({
                        status: "active",
                        endpoint: "/api/upload",
                        message: "Upload endpoint is active. Send POST with multipart/form-data to upload files."
                    }), { headers, status: 200 });
                }
                if (req.method !== "POST") {
                    return new Response(JSON.stringify({ error: "Method Not Allowed. Use POST." }), { headers, status: 405 });
                }
                try {
                    const formData = await req.formData();
                    const file = formData.get("file") as File | null;
                    const category = (formData.get("category") as string) || "report";
                    let runId = (formData.get("runId") as string) || "";

                    if (!file) {
                        return new Response(JSON.stringify({ error: "No file provided" }), { headers, status: 400 });
                    }

                    if (!runId) {
                        runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                    }

                    const runUploadsDir = path.join(uploadsDir, runId);
                    if (!fs.existsSync(runUploadsDir)) {
                        fs.mkdirSync(runUploadsDir, { recursive: true });
                    }

                    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
                    const targetPath = path.join(runUploadsDir, safeName);

                    const arrayBuffer = await file.arrayBuffer();
                    fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));

                    return new Response(JSON.stringify({
                        success: true,
                        runId,
                        filePath: targetPath,
                        fileName: file.name,
                        savedName: safeName,
                        category
                    }), { headers });
                } catch (e: any) {
                    return new Response(JSON.stringify({ error: e.message }), { headers, status: 500 });
                }
            }

            // POST /api/run-task
            if (pathname === "/api/run-task") {
                if (req.method !== "POST") {
                    return new Response(JSON.stringify({ error: "Method Not Allowed. Use POST." }), { headers, status: 405 });
                }
                try {
                    const body = await req.json() as {
                        runId?: string;
                        taskPrompt?: string;
                        reportFile?: string;
                        sopFiles?: string[];
                        isLiveUpload?: boolean;
                    };

                    const runId = body.runId || `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                    const isLiveUpload = Boolean(body.isLiveUpload);
                    const mode = isLiveUpload ? "LIVE UPLOAD" : "DEMO PRESET";

                    const taskDescription = body.taskPrompt || "Analyze inspection report, cross-check against refinery maintenance SOP, calculate safe operating life deficit, and prepare formal DOCX approval note.";

                    let reportPath: string;
                    if (isLiveUpload) {
                        if (body.reportFile && fs.existsSync(body.reportFile)) {
                            reportPath = body.reportFile;
                        } else if (body.reportFile && fs.existsSync(path.join(uploadsDir, runId, body.reportFile))) {
                            reportPath = path.join(uploadsDir, runId, body.reportFile);
                        } else if (body.reportFile && fs.existsSync(path.join(uploadsDir, body.reportFile))) {
                            reportPath = path.join(uploadsDir, body.reportFile);
                        } else {
                            return new Response(JSON.stringify({
                                error: `LIVE UPLOAD error: No uploaded report file found for run ${runId}. Silently defaulting to demo reports is disabled.`,
                                success: false
                            }), { headers, status: 400 });
                        }
                    } else {
                        // DEMO PRESET mode
                        if (body.reportFile && fs.existsSync(body.reportFile)) {
                            reportPath = body.reportFile;
                        } else if (body.reportFile && fs.existsSync(path.join(process.cwd(), "demo-data", body.reportFile))) {
                            reportPath = path.join(process.cwd(), "demo-data", body.reportFile);
                        } else {
                            reportPath = path.join(process.cwd(), "demo-data", "inspection-report-A.txt");
                        }
                    }

                    const outputDirectory = path.join(process.cwd(), "output_deliverables", runId);
                    if (!fs.existsSync(outputDirectory)) {
                        fs.mkdirSync(outputDirectory, { recursive: true });
                    }

                    let state = graph.createInitialState({
                        taskDescription,
                        documentPath: reportPath,
                        sopDirectoryPath: path.join(process.cwd(), "demo-data"),
                        outputDirectory
                    });

                    // 1. UNDERSTAND
                    state = graph.transition(state, "UNDERSTAND", `[${mode} - Run: ${runId}] Inspected industrial request for input document (${path.basename(reportPath)}).`);

                    // 2. ROUTE
                    const visionRoute = await router.routeTask("vision_ocr", taskDescription);
                    const reasoningRoute = await router.routeTask("document_reasoning", taskDescription);
                    state.routesSelected.push(visionRoute, reasoningRoute);
                    state = graph.transition(state, "ROUTE", `Selected Vision Model: ${visionRoute.selectedModel.displayName} & Reasoning Model: ${reasoningRoute.selectedModel.displayName}`);

                    // 3. PROCESS_DOCUMENT
                    const parsedDoc = await parser.parse(reportPath);
                    state.parsedDocument = parsedDoc;

                    // Trigger vision logging with actual document payload size
                    const fileBuffer = fs.readFileSync(reportPath);
                    const docBase64 = fileBuffer.toString("base64");
                    await router.getProvider().generateVision(
                        visionRoute.selectedModel.id,
                        "Extract equipment ID and wall thickness measurements from page 1.",
                        docBase64,
                        parsedDoc.fileName,
                        1,
                        850,
                        1100
                    );

                    const targetFinding = parsedDoc.findings[0] || {
                        equipmentId: "UNKNOWN-001",
                        equipmentName: "Process Vessel",
                        inspectionDate: new Date().toISOString().split("T")[0],
                        defectDescription: "Wall thickness loss",
                        measuredValue: "3.50 mm",
                        allowableLimit: "4.50 mm",
                        severity: "CRITICAL",
                        recommendedAction: "Inspect equipment immediately",
                        sopReference: "SOP-MNT-2024",
                        measuredNumeric: 3.50,
                        allowableNumeric: 4.50
                    };
                    state = graph.transition(state, "PROCESS_DOCUMENT", `Parsed ${parsedDoc.fileName}. Extracted equipment ID ${targetFinding.equipmentId} (Measured: ${targetFinding.measuredValue} vs Allowable T-min: ${targetFinding.allowableLimit}).`);

                    // 4. RETRIEVE_KNOWLEDGE - ISOLATE SOP ONLY (No Report B / Previous Runs)
                    retriever.reset();
                    const sopFilesToIndex: string[] = [];

                    if (isLiveUpload && body.sopFiles && body.sopFiles.length > 0) {
                        for (const sopFile of body.sopFiles) {
                            if (fs.existsSync(sopFile)) sopFilesToIndex.push(sopFile);
                            else if (fs.existsSync(path.join(uploadsDir, runId, sopFile))) sopFilesToIndex.push(path.join(uploadsDir, runId, sopFile));
                            else if (fs.existsSync(path.join(uploadsDir, sopFile))) sopFilesToIndex.push(path.join(uploadsDir, sopFile));
                        }
                    }

                    // Default SOP if no specific SOP provided
                    if (sopFilesToIndex.length === 0) {
                        const defaultSop = path.join(process.cwd(), "demo-data", "sop-maintenance.txt");
                        if (fs.existsSync(defaultSop)) {
                            sopFilesToIndex.push(defaultSop);
                        }
                    }

                    await retriever.indexKnowledgeFiles(sopFilesToIndex);

                    const evidence = retriever.retrieveEvidence(`${targetFinding.equipmentId} ${targetFinding.defectDescription}`, 5);
                    state.retrievedEvidence = evidence;
                    state = graph.transition(state, "RETRIEVE_KNOWLEDGE", `Indexed ${sopFilesToIndex.length} SOP knowledge files. Retrieved ${evidence.length} evidence snippets.`);

                    // 5. CALCULATE
                    const calcCode = `
t_measured = ${targetFinding.measuredNumeric}
t_min = ${targetFinding.allowableNumeric}
CR = 0.45

t_deficit = t_min - t_measured
if t_measured < t_min:
    print(f"CRITICAL DEFICIT: Wall thickness is {t_deficit:.2f} mm below minimum allowable limit (T-min).")
    print("IMMEDIATE ISOLATION AND WELD OVERLAY / SHELL REPLACEMENT REQUIRED.")
else:
    rem_life = (t_measured - t_min) / CR
    print(f"SAFE OPERATING MARGIN: Wall thickness is {abs(t_deficit):.2f} mm above T-min limit.")
    print(f"Calculated Remaining Safe Life: {rem_life:.2f} Years. Continue routine monitoring.")
                    `;
                    const calcRes = await sandbox.executeCalculation(calcCode);
                    const isCritical = targetFinding.measuredNumeric < targetFinding.allowableNumeric;
                    state.calculationOutput = { 
                        stdout: calcRes.stdout, 
                        executionTimeMs: calcRes.executionTimeMs, 
                        isCritical,
                        deltaMm: Math.abs(targetFinding.allowableNumeric - targetFinding.measuredNumeric)
                    };
                    state = graph.transition(state, "CALCULATE", `Python Sandbox execution completed in ${calcRes.executionTimeMs}ms.`);

                    // Trigger reasoning telemetry
                    await router.getProvider().generate(
                        reasoningRoute.selectedModel.id,
                        `Evaluate SOP repair recommendation for equipment ${targetFinding.equipmentId} with calculated wall thickness deficit.`
                    );

                    // 6. VERIFY & CONDITIONAL BRANCH
                    const verifications = verifier.verify(parsedDoc.findings, evidence);
                    state.verificationStatus = verifications.every(v => v.status === "SUPPORTED") ? "SUPPORTED" : "UNCERTAIN";
                    
                    if (isCritical) {
                        state.conditionalBranchTaken = "CRITICAL_HAZARD_ISOLATION";
                        state = graph.transition(state, "BRANCH_CRITICAL_HAZARD", `CONDITIONAL BRANCH TAKEN: Measured ${targetFinding.measuredValue} < T-min ${targetFinding.allowableLimit} -> Branching to CRITICAL_HAZARD_ISOLATION.`);
                    } else {
                        state.conditionalBranchTaken = "NORMAL_MAINTENANCE_MONITORING";
                        state = graph.transition(state, "BRANCH_NORMAL_MAINTENANCE", `CONDITIONAL BRANCH TAKEN: Measured ${targetFinding.measuredValue} >= T-min ${targetFinding.allowableLimit} -> Branching to NORMAL_MAINTENANCE_MONITORING.`);
                    }

                    // 7. GENERATE_DELIVERABLES IN PER-RUN DIRECTORY
                    const deliverables = await deliverableGen.generateAll({
                        taskDescription,
                        equipmentId: targetFinding.equipmentId,
                        findings: parsedDoc.findings,
                        evidence,
                        calculationOutput: calcRes.stdout,
                        verificationStatus: state.verificationStatus,
                        isHazard: isCritical,
                        outputDirectory,
                        runId,
                        sourceFile: path.basename(reportPath)
                    });
                    
                    const deliverableUrls = {
                        docx: `/output_deliverables/${runId}/${path.basename(deliverables.docx)}`,
                        xlsx: `/output_deliverables/${runId}/${path.basename(deliverables.xlsx)}`,
                        pptx: `/output_deliverables/${runId}/${path.basename(deliverables.pptx)}`
                    };

                    state.deliverables = deliverableUrls;
                    state = graph.transition(state, "GENERATE_DELIVERABLES", `Created DOCX, XLSX Sheet, and PPTX Deck in output_deliverables/${runId}/.`);

                    // 8. AWAIT_APPROVAL
                    state = graph.transition(state, "AWAIT_APPROVAL", "Staged deliverables ready. Engineering signoff requested.");

                    const telemetry = guard.getLedgerSummary();
                    const healthStatus = await router.getProvider().getHealthStatus();

                    return new Response(JSON.stringify({
                        runId,
                        state,
                        telemetry,
                        healthStatus,
                        deliverableUrls,
                        mode,
                        success: true
                    }), { headers });
                } catch (err: any) {
                    return new Response(JSON.stringify({
                        error: err.message || "Execution error",
                        success: false
                    }), { headers, status: 500 });
                }
            }

            return new Response(JSON.stringify({ error: "Not Found" }), { headers, status: 404 });
        },
    });
}

if (import.meta.main) {
    startAuraApiServer();
}

