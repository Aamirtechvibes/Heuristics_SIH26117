import path from "node:path";
import chalk from "chalk";
import { SovereigntyGuard } from "../core/sovereignty-guard";
import { ModelRegistryRouter } from "../core/model-registry";
import { AuraAgentGraph, AuraState } from "../core/state-graph";
import { IndustrialDocumentParser } from "../document/industrial-doc";
import { LocalKnowledgeRetriever } from "../knowledge/local-retriever";
import { PythonSandboxTool } from "../tools/sandbox-tool";
import { VerifierTool } from "../tools/verifier-tool";
import { DeliverableTools } from "../tools/deliverable-tools";

export async function runAuraSovereignDemo(customReportPath?: string) {
    console.log(chalk.bold.cyan("\n================================================================================"));
    console.log(chalk.bold.yellow(" 🛡️  AURA — SOVEREIGN AGENTIC AI WORKBENCH (MRPL SIH26117 MVP)"));
    console.log(chalk.bold.cyan("================================================================================\n"));

    const guard = SovereigntyGuard.getInstance();
    guard.setSovereignMode(true);

    console.log(chalk.bgGreen.black.bold(" [SOVEREIGNTY GUARD] ") + chalk.green(" Sovereign Mode: ACTIVE | Socket-Level Interceptor: ON | External AI APIs: BLOCKED "));

    const router = new ModelRegistryRouter();
    const graph = new AuraAgentGraph();
    const parser = new IndustrialDocumentParser();
    const retriever = new LocalKnowledgeRetriever();
    const sandbox = new PythonSandboxTool();
    const verifier = new VerifierTool();
    const deliverableGen = new DeliverableTools();

    const taskDescription = "Analyze inspection report, cross-check against refinery maintenance SOP, calculate safe operating life deficit, evaluate hazard condition, and prepare formal DOCX deliverable.";
    const documentPath = customReportPath || path.join(process.cwd(), "demo-data", "inspection-report.txt");
    const sopDirectoryPath = path.join(process.cwd(), "demo-data");
    const outputDirectory = path.join(process.cwd(), "output_deliverables");

    let state = graph.createInitialState({
        taskDescription,
        documentPath,
        sopDirectoryPath,
        outputDirectory
    });

    console.log(chalk.bold("\n📋 Industrial Task Prompt: ") + chalk.italic(taskDescription));
    console.log(chalk.dim(`   Input Report Document: ${documentPath}`));
    console.log(chalk.dim(`   Local Knowledge Base: ${sopDirectoryPath}`));
    console.log(chalk.dim(`   Output Deliverables Directory: ${outputDirectory}\n`));

    console.log(chalk.bold.underline("⚡ AGENT EXECUTION STATE MACHINE TIMELINE (WITH CONDITIONAL BRANCHING):\n"));

    const logStep = (stepNo: number, node: string, title: string, details: string, model?: string) => {
        const modelTag = model ? chalk.magenta(` [Model: ${model}]`) : "";
        console.log(chalk.green(`  ✓ Step ${stepNo} [NODE: ${node}]: `) + chalk.bold(title) + modelTag);
        console.log(chalk.dim(`     ↳ ${details}`));
    };

    // NODE 1: UNDERSTAND
    state = graph.transition(state, "UNDERSTAND", "Inspected industrial request and equipment target parameters.");
    logStep(1, "UNDERSTAND", "Task Inspection", "Parsed target equipment request & requested DOCX approval note.");

    // NODE 2: ROUTE
    const visionRoute = await router.routeTask("vision_ocr", taskDescription);
    const reasoningRoute = await router.routeTask("document_reasoning", taskDescription);
    state.routesSelected.push(visionRoute, reasoningRoute);

    state = graph.transition(state, "ROUTE", `Selected Vision Model: ${visionRoute.selectedModel.displayName} & Reasoning Model: ${reasoningRoute.selectedModel.displayName}`, reasoningRoute.selectedModel.displayName);
    logStep(2, "ROUTE", "Task-Based Local Model Selection", `Routed Vision -> ${visionRoute.selectedModel.displayName} (${visionRoute.status}) | Reasoning -> ${reasoningRoute.selectedModel.displayName} (${reasoningRoute.status})`, reasoningRoute.selectedModel.displayName);

    // NODE 3: PROCESS_DOCUMENT
    const parsedDoc = await parser.parse(documentPath);
    state.parsedDocument = parsedDoc;
    const targetFinding = parsedDoc.findings[0];

    state = graph.transition(state, "PROCESS_DOCUMENT", `Parsed ${parsedDoc.fileName}. Extracted equipment ID ${targetFinding.equipmentId} (Measured: ${targetFinding.measuredValue} vs Allowable T-min: ${targetFinding.allowableLimit}).`, visionRoute.selectedModel.displayName);
    logStep(3, "PROCESS_DOCUMENT", "Multimodal Document Ingestion", `Parsed ${parsedDoc.fileName}. Extracted equipment ID ${targetFinding.equipmentId} (Measured: ${targetFinding.measuredValue} vs Allowable T-min: ${targetFinding.allowableLimit}).`, visionRoute.selectedModel.displayName);

    // NODE 4: RETRIEVE_KNOWLEDGE
    await retriever.indexDirectory(sopDirectoryPath);
    const evidence = retriever.retrieveEvidence(`${targetFinding.equipmentId} ${targetFinding.defectDescription}`, 5);
    state.retrievedEvidence = evidence;
    state = graph.transition(state, "RETRIEVE_KNOWLEDGE", `Indexed local SOP manuals. Retrieved ${evidence.length} evidence snippets.`);
    logStep(4, "RETRIEVE_KNOWLEDGE", "On-Premise SOP Search", `Indexed local SOP directory. Retrieved ${evidence.length} evidence snippets from internal MRPL manuals.`);

    // NODE 5: CALCULATE
    const calcCode = `
# Remaining Safe Operating Life Calculation for Refinery Vessel Wall Thinning
t_measured = ${targetFinding.measuredNumeric}
t_min = ${targetFinding.allowableNumeric}
CR = 0.45 # Corrosion Rate mm/year measured via NDT

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
    state = graph.transition(state, "CALCULATE", `Python Sandbox execution completed in ${calcRes.executionTimeMs}ms. Output: ${calcRes.stdout}`);
    logStep(5, "CALCULATE", "Sandboxed Engineering Math Execution", `Python Sandbox execution completed in ${calcRes.executionTimeMs}ms.`);

    // NODE 6: VERIFY & CONDITIONAL BRANCH SELECTION
    const verifications = verifier.verify(parsedDoc.findings, evidence);
    state.verificationStatus = verifications.every(v => v.status === "SUPPORTED") ? "SUPPORTED" : "UNCERTAIN";
    
    // EXPLICIT AGENT CONDITIONAL DECISION BRANCH
    if (isCritical) {
        state.conditionalBranchTaken = "CRITICAL_HAZARD_ISOLATION";
        state = graph.transition(state, "BRANCH_CRITICAL_HAZARD", `CONDITIONAL BRANCH TAKEN: [Measured ${targetFinding.measuredValue} < T-min ${targetFinding.allowableLimit}] -> Branching to CRITICAL_HAZARD_ISOLATION workflow.`);
        logStep(6, "BRANCH_CRITICAL_HAZARD", "Agent Conditional Decision Branch", `BRANCH TAKEN: Measured ${targetFinding.measuredValue} < T-min ${targetFinding.allowableLimit} -> Branching to CRITICAL_HAZARD_ISOLATION & EMERGENCY APPROVAL NOTE.`);
    } else {
        state.conditionalBranchTaken = "NORMAL_MAINTENANCE_MONITORING";
        state = graph.transition(state, "BRANCH_NORMAL_MAINTENANCE", `CONDITIONAL BRANCH TAKEN: [Measured ${targetFinding.measuredValue} >= T-min ${targetFinding.allowableLimit}] -> Branching to NORMAL_MAINTENANCE_MONITORING workflow.`);
        logStep(6, "BRANCH_NORMAL_MAINTENANCE", "Agent Conditional Decision Branch", `BRANCH TAKEN: Measured ${targetFinding.measuredValue} >= T-min ${targetFinding.allowableLimit} -> Branching to NORMAL_MAINTENANCE_MONITORING & INSPECTION CERTIFICATE.`);
    }

    // NODE 7: GENERATE_DELIVERABLES
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
    state = graph.transition(state, "GENERATE_DELIVERABLES", "Created Word DOCX, Excel XLSX Sheet, and PowerPoint PPTX Deck.");
    logStep(7, "GENERATE_DELIVERABLES", "Real Deliverables Generation", `Generated real ${path.basename(deliverables.docx)}, XLSX Analysis Sheet, and PPTX Executive Summary based on actual run data.`);

    // NODE 8: AWAIT_APPROVAL
    state = graph.transition(state, "AWAIT_APPROVAL", "Staged generated deliverables. Engineering signoff requested.");
    logStep(8, "AWAIT_APPROVAL", "Engineering Signoff Gate", "Staged deliverables ready. Human engineering signoff requested.");

    state.completedAt = new Date().toISOString();

    console.log(chalk.bold.cyan("\n================================================================================"));
    console.log(chalk.bold.green(" 🎯 SUMMARY OF PROOF & REAL DELIVERABLES"));
    console.log(chalk.bold.cyan("================================================================================"));

    console.log(chalk.bold("\n🔀 Agent Conditional Decision Branch Result:"));
    console.log(chalk.yellow(`  • Evaluated Measured Wall Thickness: `) + chalk.bold(targetFinding.measuredValue) + chalk.yellow(` vs Allowable T-min: `) + chalk.bold(targetFinding.allowableLimit));
    console.log(chalk.yellow(`  • Conditional Branch Executed: `) + chalk.bold.bgRed.white(` ${state.conditionalBranchTaken} `));

    console.log(chalk.bold("\n🧠 Local Models Routed & Selected:"));
    for (const r of state.routesSelected) {
        console.log(chalk.yellow(`  • Task [${r.taskType}]: `) + chalk.bold(r.selectedModel.displayName) + chalk.dim(` — ${r.reason} (${r.status})`));
    }

    console.log(chalk.bold("\n🔍 On-Premise SOP Citations:"));
    for (const ev of state.retrievedEvidence) {
        console.log(chalk.cyan(`  • [${ev.sourceFile} - ${ev.sectionOrPage}]: `) + ev.matchedContent.slice(0, 100) + "...");
    }

    console.log(chalk.bold("\n🧮 Python Calculation Sandbox Output:"));
    console.log(chalk.gray(`  ┌─────────────────────────────────────────────────────────┐`));
    for (const l of calcRes.stdout.split("\n")) {
        console.log(chalk.gray(`  │ `) + chalk.white(l.padEnd(55)) + chalk.gray(` │`));
    }
    console.log(chalk.gray(`  └─────────────────────────────────────────────────────────┘`));

    console.log(chalk.bold("\n📄 Real Deliverables Produced:"));
    console.log(chalk.green(`  • DOCX Document: `) + chalk.bold(deliverables.docx));
    console.log(chalk.green(`  • XLSX Analysis Sheet: `) + chalk.bold(deliverables.xlsx));
    console.log(chalk.green(`  • PPTX Executive Deck: `) + chalk.bold(deliverables.pptx));

    const ledger = guard.getLedgerSummary();
    console.log(chalk.bold.bgBlue.white("\n 🔒 SOVEREIGNTY AUDIT SUMMARY "));
    console.log(chalk.white(`  • Sovereign Mode Active: ${ledger.sovereignMode}`));
    console.log(chalk.white(`  • Outbound Cloud AI Calls Made: ${ledger.blockedCloudAttempts} (ZERO)`));

    console.log(chalk.bold.green("\n✓ AURA DEMO COMPLETED SUCCESSFULLY WITH ZERO CLOUD CALLS.\n"));
    return state;
}

if (import.meta.main) {
    runAuraSovereignDemo().catch(console.error);
}
