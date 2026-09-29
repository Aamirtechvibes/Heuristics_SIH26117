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

export function startAuraApiServer() {
    const guard = SovereigntyGuard.getInstance();
    guard.setSovereignMode(true);

    const router = new ModelRegistryRouter();
    const graph = new AuraAgentGraph();
    const parser = new IndustrialDocumentParser();
    const retriever = new LocalKnowledgeRetriever();
    const sandbox = new PythonSandboxTool();
    const verifier = new VerifierTool();
    const deliverableGen = new DeliverableTools();

    console.log(`\n🛡️ [AURA API SERVER] Starting Sovereign AI Workbench API on http://localhost:${PORT}...`);

    Bun.serve({
        port: PORT,
        async fetch(req) {
            const url = new URL(req.url);

            // Enable CORS
            if (req.method === "OPTIONS") {
                return new Response(null, {
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type",
                    },
                });
            }

            const headers = {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            };

            // Serve static output deliverable files for download
            if (url.pathname.startsWith("/output_deliverables/")) {
                const relativePath = url.pathname.replace("/output_deliverables/", "");
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

            // GET /api/sovereignty
            if (url.pathname === "/api/sovereignty" && req.method === "GET") {
                return new Response(JSON.stringify(guard.getLedgerSummary()), { headers });
            }

            // POST /api/test-sovereignty
            if (url.pathname === "/api/test-sovereignty" && req.method === "POST") {
                try {
                    await fetch("https://openrouter.ai/api/v1/chat/completions");
                } catch (e: any) {
                    // Intentionally trapped by SovereigntyGuard
                }
                return new Response(JSON.stringify(guard.getLedgerSummary()), { headers });
            }

            // POST /api/run-task
            if (url.pathname === "/api/run-task" && req.method === "POST") {
                try {
                    const body = await req.json() as {
                        taskPrompt?: string;
                        reportFile?: string;
                    };

                    const taskDescription = body.taskPrompt || "Analyze inspection report for EX-402A, cross-check against refinery maintenance SOP, calculate safe operating life deficit, and prepare formal DOCX approval note.";
                    const reportPath = body.reportFile 
                        ? path.join(process.cwd(), "demo-data", body.reportFile)
                        : path.join(process.cwd(), "demo-data", "inspection-report-A.txt");

                    const sopDirectoryPath = path.join(process.cwd(), "demo-data");
                    const outputDirectory = path.join(process.cwd(), "output_deliverables");

                    let state = graph.createInitialState({
                        taskDescription,
                        documentPath: reportPath,
                        sopDirectoryPath,
                        outputDirectory
                    });

                    // 1. UNDERSTAND
                    state = graph.transition(state, "UNDERSTAND", "Inspected industrial request and equipment target parameters.");

                    // 2. ROUTE
                    const visionRoute = await router.routeTask("vision_ocr", taskDescription);
                    const reasoningRoute = await router.routeTask("document_reasoning", taskDescription);
                    state.routesSelected.push(visionRoute, reasoningRoute);
                    state = graph.transition(state, "ROUTE", `Selected Vision Model: ${visionRoute.selectedModel.displayName} & Reasoning Model: ${reasoningRoute.selectedModel.displayName}`);

                    // 3. PROCESS_DOCUMENT
                    const parsedDoc = await parser.parse(reportPath);
                    state.parsedDocument = parsedDoc;
                    const targetFinding = parsedDoc.findings[0];
                    state = graph.transition(state, "PROCESS_DOCUMENT", `Parsed ${parsedDoc.fileName}. Extracted equipment ID ${targetFinding.equipmentId} (Measured: ${targetFinding.measuredValue} vs Allowable T-min: ${targetFinding.allowableLimit}).`);

                    // 4. RETRIEVE_KNOWLEDGE
                    await retriever.indexDirectory(sopDirectoryPath);
                    const evidence = retriever.retrieveEvidence(`${targetFinding.equipmentId} ${targetFinding.defectDescription}`, 5);
                    state.retrievedEvidence = evidence;
                    state = graph.transition(state, "RETRIEVE_KNOWLEDGE", `Indexed local SOP manuals. Retrieved ${evidence.length} evidence snippets.`);

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

                    // 7. GENERATE_DELIVERABLES
                    const deliverables = await deliverableGen.generateAll({
                        taskDescription,
                        equipmentId: targetFinding.equipmentId,
                        findings: parsedDoc.findings,
                        evidence,
                        calculationOutput: calcRes.stdout,
                        verificationStatus: state.verificationStatus,
                        isHazard: isCritical,
                        outputDirectory
                    });
                    state.deliverables = deliverables;
                    state = graph.transition(state, "GENERATE_DELIVERABLES", "Created DOCX, XLSX Sheet, and PPTX Executive Summary.");

                    // 8. AWAIT_APPROVAL
                    state = graph.transition(state, "AWAIT_APPROVAL", "Staged deliverables ready. Engineering signoff requested.");

                    const telemetry = guard.getLedgerSummary();

                    return new Response(JSON.stringify({
                        state,
                        telemetry,
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
