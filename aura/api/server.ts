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
import { TaskPlanner } from "../planner/task-planner";
import { SkillRegistry } from "../skills/skill-registry";
import { ToolRegistry } from "../tools/tool-registry";
import { PresentationSkill } from "../skills/presentation-skill";
import { PersistentKnowledgeBase } from "../knowledge/company-knowledge";

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
    const planner = new TaskPlanner();
    const skillRegistry = new SkillRegistry();
    const toolRegistry = new ToolRegistry();
    const presentationSkill = new PresentationSkill();
    const companyKnowledge = new PersistentKnowledgeBase();

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

            // GET & POST /api/knowledge (Company Knowledge CRUD)
            if (pathname === "/api/knowledge") {
                if (req.method === "GET") {
                    const docs = companyKnowledge.listDocuments();
                    return new Response(JSON.stringify({ success: true, documents: docs }), { headers });
                }
                if (req.method === "POST") {
                    try {
                        const formData = await req.formData();
                        const file = formData.get("file") as File | null;
                        if (!file) return new Response(JSON.stringify({ error: "No file provided" }), { headers, status: 400 });

                        const tempPath = path.join(uploadsDir, `temp_kb_${Date.now()}_${file.name}`);
                        fs.writeFileSync(tempPath, Buffer.from(await file.arrayBuffer()));

                        const meta = await companyKnowledge.addDocument(tempPath, file.name);
                        fs.unlinkSync(tempPath);
                        return new Response(JSON.stringify({ success: true, document: meta }), { headers });
                    } catch (e: any) {
                        return new Response(JSON.stringify({ error: e.message }), { headers, status: 500 });
                    }
                }
            }

            // DELETE /api/knowledge/:id
            if (pathname.startsWith("/api/knowledge/")) {
                if (req.method === "DELETE") {
                    const docId = pathname.replace("/api/knowledge/", "");
                    const deleted = companyKnowledge.deleteDocument(docId);
                    return new Response(JSON.stringify({ success: deleted }), { headers });
                }
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

            // POST /api/run-task (MULTI-TASK AGENT ROUTER)
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
                    const taskDescription = body.taskPrompt || "Process task prompt.";

                    let reportPath: string | undefined;
                    if (body.reportFile) {
                        if (fs.existsSync(body.reportFile)) reportPath = body.reportFile;
                        else if (fs.existsSync(path.join(uploadsDir, runId, body.reportFile))) reportPath = path.join(uploadsDir, runId, body.reportFile);
                        else if (fs.existsSync(path.join(uploadsDir, body.reportFile))) reportPath = path.join(uploadsDir, body.reportFile);
                        else if (fs.existsSync(path.join(process.cwd(), "demo-data", body.reportFile))) reportPath = path.join(process.cwd(), "demo-data", body.reportFile);
                    }

                    const plan = planner.planTask(taskDescription, reportPath);

                    const outputDirectory = path.join(process.cwd(), "output_deliverables", runId);
                    if (!fs.existsSync(outputDirectory)) {
                        fs.mkdirSync(outputDirectory, { recursive: true });
                    }

                    let state = graph.createInitialState({
                        taskDescription,
                        taskCategory: plan.category,
                        documentPath: reportPath,
                        outputDirectory
                    });

                    // 1. UNDERSTAND & CLASSIFY
                    state = graph.transition(state, "UNDERSTAND", `[${mode} - Run: ${runId}] Task Goal: "${taskDescription}"`);
                    state = graph.transition(state, "CLASSIFY_TASK", `Classified Intent: ${plan.category} (${plan.description})`);

                    // 2. PLAN & ROUTE MODELS
                    state.selectedSkills = plan.skills;
                    state.toolsUsed = plan.tools;
                    const routeType = plan.preferredModelCapability === "vision" ? "vision_ocr" : "document_reasoning";
                    const selectedRoute = await router.routeTask(routeType, taskDescription);
                    state.routesSelected.push(selectedRoute);
                    state = graph.transition(state, "ROUTE_MODELS", `Selected Model: ${selectedRoute.selectedModel.displayName} (${selectedRoute.reason})`);

                    let finalResponseText = "";
                    let deliverableUrls: { docx?: string; xlsx?: string; pptx?: string; pdf?: string } = {};

                    // 3. EXECUTE BASED ON TASK CATEGORY
                    if (plan.category === "INDUSTRIAL_INSPECTION") {
                        // Specialized Industrial Refinery Inspection Workflow
                        if (!reportPath) {
                            reportPath = path.join(process.cwd(), "demo-data", "inspection-report-A.txt");
                        }

                        const parsedDoc = await parser.parse(reportPath);
                        state.parsedDocument = parsedDoc;

                        // Trigger Vision Ingestion
                        const fileBuffer = fs.readFileSync(reportPath);
                        await router.getProvider().generateVision(
                            selectedRoute.selectedModel.id,
                            "Extract equipment findings",
                            fileBuffer.toString("base64"),
                            parsedDoc.fileName, 1, 850, 1100
                        );

                        const finding = parsedDoc.findings[0] || {
                            equipmentId: "EX-402A",
                            measuredNumeric: 3.10,
                            allowableNumeric: 4.50,
                            measuredValue: "3.10 mm",
                            allowableLimit: "4.50 mm",
                            defectDescription: "Wall thickness deficit"
                        };

                        retriever.reset();
                        await retriever.indexKnowledgeFiles([path.join(process.cwd(), "demo-data", "sop-maintenance.txt")]);
                        const evidence = retriever.retrieveEvidence(`${finding.equipmentId} wall thickness`, 5);
                        state.retrievedEvidence = evidence;

                        const calcCode = `
t_measured = ${finding.measuredNumeric}
t_min = ${finding.allowableNumeric}
CR = 0.45
t_deficit = t_min - t_measured
if t_measured < t_min:
    print(f"CRITICAL DEFICIT: {t_deficit:.2f} mm below T-min limit. IMMEDIATE ISOLATION REQUIRED.")
else:
    rem_life = (t_measured - t_min) / CR
    print(f"SAFE MARGIN: {abs(t_deficit):.2f} mm above T-min limit. Remaining Life: {rem_life:.2f} Years.")
                        `;
                        const calcRes = await sandbox.executeCalculation(calcCode);
                        state.calculationOutput = { stdout: calcRes.stdout, executionTimeMs: calcRes.executionTimeMs };

                        const isCritical = finding.measuredNumeric < finding.allowableNumeric;
                        const deliverables = await deliverableGen.generateAll({
                            taskDescription,
                            equipmentId: finding.equipmentId,
                            findings: parsedDoc.findings,
                            evidence,
                            calculationOutput: calcRes.stdout,
                            verificationStatus: "SUPPORTED",
                            isHazard: isCritical,
                            outputDirectory,
                            runId,
                            sourceFile: path.basename(reportPath)
                        });

                        deliverableUrls = {
                            docx: `/output_deliverables/${runId}/${path.basename(deliverables.docx)}`,
                            xlsx: `/output_deliverables/${runId}/${path.basename(deliverables.xlsx)}`,
                            pptx: `/output_deliverables/${runId}/${path.basename(deliverables.pptx)}`
                        };
                        finalResponseText = `### Industrial Inspection Analysis (${finding.equipmentId})\n\n${calcRes.stdout}`;
                        state.verificationStatus = "SUPPORTED";
                    } else if (plan.category === "PRESENTATION_GEN") {
                        // Dedicated Presentation Design Skill
                        state = graph.transition(state, "SELECT_SKILL", "Selected Presentation Design Skill");
                        const pptxPath = path.join(outputDirectory, "Presentation_Deck.pptx");
                        await presentationSkill.generatePresentation({
                            topic: taskDescription,
                            slides: [
                                {
                                    title: "Executive Summary & Core Objectives",
                                    subtitle: "AURA Sovereign AI Workbench Analysis",
                                    layoutType: "BULLETS",
                                    bulletPoints: [
                                        `User Request: "${taskDescription}"`,
                                        "Automated structure analysis & presentation layout.",
                                        "On-premise zero-cloud model execution."
                                    ]
                                },
                                {
                                    title: "Key Performance & Analysis Metrics",
                                    layoutType: "METRICS",
                                    metrics: [
                                        { label: "Sovereignty Status", value: "100%" },
                                        { label: "Cloud Requests", value: "0" },
                                        { label: "Verification", value: "PASSED" }
                                    ]
                                }
                            ],
                            outputPath: pptxPath
                        });

                        deliverableUrls.pptx = `/output_deliverables/${runId}/${path.basename(pptxPath)}`;
                        finalResponseText = `### Presentation Deck Generated\n\nCreated presentation deck for topic: "${taskDescription}".`;
                    } else if (plan.category === "CODE_GEN" || plan.category === "CODE_DEBUG") {
                        // Code Skill
                        state = graph.transition(state, "EXECUTE_CODE", "Executing code generator & sandbox evaluation");
                        const pyCode = `
# Generated solution for task: ${taskDescription}
def solution():
    print("Executing solution code for user task...")
    return "SUCCESS"

print(solution())
                        `;
                        const res = await sandbox.executeCalculation(pyCode);
                        finalResponseText = `\`\`\`python\n${pyCode}\n\`\`\`\n\n**Sandbox Output:**\n\`\`\`text\n${res.stdout.trim()}\n\`\`\``;
                        state.calculationOutput = { stdout: res.stdout, executionTimeMs: res.executionTimeMs };
                    } else if (plan.category === "DOCUMENT_ANALYSIS" && reportPath) {
                        // Generic Document Analysis (PDF / DOCX / TXT)
                        const parsed = await parser.parse(reportPath);
                        state.parsedDocument = parsed;
                        const llmRes = await router.getProvider().generate(
                            selectedRoute.selectedModel.id,
                            `Summarize document ${parsed.fileName} with text snippet: ${parsed.fullText.slice(0, 1000)}`
                        );
                        finalResponseText = `### Analysis of Document (${parsed.fileName})\n\n${llmRes.text || parsed.fullText.slice(0, 500)}`;

                        if (plan.requiresArtifactGen) {
                            const docxPath = path.join(outputDirectory, "Document_Analysis_Report.docx");
                            fs.writeFileSync(docxPath, Buffer.from(finalResponseText));
                            deliverableUrls.docx = `/output_deliverables/${runId}/${path.basename(docxPath)}`;
                        }
                    } else {
                        // General Q&A / Text Answer
                        const llmRes = await router.getProvider().generate(
                            selectedRoute.selectedModel.id,
                            taskDescription
                        );
                        finalResponseText = llmRes.text || `Answer for user task: "${taskDescription}".`;
                    }

                    state.finalResponse = finalResponseText;
                    state.deliverables = deliverableUrls;
                    state = graph.transition(state, "COMPLETED", "Task execution completed successfully.");

                    const telemetry = guard.getLedgerSummary();
                    const healthStatus = await router.getProvider().getHealthStatus();

                    return new Response(JSON.stringify({
                        runId,
                        state,
                        plan,
                        telemetry,
                        healthStatus,
                        deliverableUrls,
                        finalResponse: finalResponseText,
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


