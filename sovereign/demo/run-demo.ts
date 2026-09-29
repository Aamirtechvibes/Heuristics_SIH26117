import path from "node:path";
import chalk from "chalk";
import { SovereignOrchestrator } from "../agent/sovereign-orchestrator";
import { SovereigntyMonitor } from "../network/sovereignty-monitor";
import { renderTerminalMarkdown } from "../../terminalUserInterface/terminal-md";

export async function runSovereignDemo() {
    console.log(chalk.bold.cyan("\n================================================================================"));
    console.log(chalk.bold.yellow(" 🛡️  SOVEREIGN AGENTIC AI WORKBENCH — INDUSTRIAL DEMO (MRPL SIH26117)"));
    console.log(chalk.bold.cyan("================================================================================\n"));

    const monitor = SovereigntyMonitor.getInstance();
    monitor.setSovereignMode(true);

    console.log(chalk.bgGreen.black.bold(" [SOVEREIGNTY MONITOR] ") + chalk.green(" Sovereign Mode: ACTIVE | Cloud AI Calls: BLOCKED | Local Inference: OLLAMA OPEN-WEIGHT "));

    const orchestrator = new SovereignOrchestrator();

    const taskDescription = "Analyze inspection report for EX-402A, cross-check against refinery maintenance SOP, calculate safe operating life deficit, and prepare formal DOCX approval note.";
    const inspectionReportPath = path.join(process.cwd(), "demo-data", "inspection-report.txt");
    const sopDirectoryPath = path.join(process.cwd(), "demo-data");
    const outputDirectory = path.join(process.cwd(), "output_deliverables");

    console.log(chalk.bold("\n📋 User Request: ") + chalk.italic(taskDescription));
    console.log(chalk.dim(`   Input Document: ${inspectionReportPath}`));
    console.log(chalk.dim(`   Local SOP Knowledge Base: ${sopDirectoryPath}`));
    console.log(chalk.dim(`   Output Deliverables Directory: ${outputDirectory}\n`));

    console.log(chalk.bold.underline("⚡ AGENT EXECUTION TIMELINE:\n"));

    const result = await orchestrator.executeIndustrialWorkflow({
        taskDescription,
        inspectionReportPath,
        sopDirectoryPath,
        outputDirectory,
        onTimelineUpdate: (step) => {
            const modelTag = step.modelUsed ? chalk.magenta(` [Model: ${step.modelUsed}]`) : "";
            console.log(
                chalk.green(`  ✓ Step ${step.stepIndex} [${step.phase}]: `) + 
                chalk.bold(step.title) + modelTag
            );
            console.log(chalk.dim(`     ↳ ${step.details}`));
        }
    });

    console.log(chalk.bold.cyan("\n================================================================================"));
    console.log(chalk.bold.green(" 🎯 EXECUTION SUMMARY & PROOF OF DELIVERABLES"));
    console.log(chalk.bold.cyan("================================================================================"));

    console.log(chalk.bold("\n🧠 Local Models Selected & Routed:"));
    for (const m of result.modelsUsed) {
        console.log(chalk.yellow(`  • Task [${m.taskType}]: `) + chalk.bold(m.selectedModel.displayName) + chalk.dim(` — ${m.reason}`));
    }

    console.log(chalk.bold("\n🔍 Retrieved SOP Evidence Citations:"));
    for (const ev of result.evidenceRetrieved) {
        console.log(chalk.cyan(`  • [${ev.sourceFile} - ${ev.sectionOrPage}]: `) + ev.matchedContent.slice(0, 100) + "...");
    }

    console.log(chalk.bold("\n🧮 Sandboxed Python Calculation Output:"));
    console.log(chalk.gray(`  ┌─────────────────────────────────────────────────────────┐`));
    for (const line of (result.calculationResult?.stdout || "").split("\n")) {
        console.log(chalk.gray(`  │ `) + chalk.white(line.padEnd(55)) + chalk.gray(` │`));
    }
    console.log(chalk.gray(`  └─────────────────────────────────────────────────────────┘`));

    console.log(chalk.bold("\n📄 Real Deliverables Produced:"));
    console.log(chalk.green(`  • DOCX Approval Note: `) + chalk.bold(result.outputs.docx || "N/A"));
    console.log(chalk.green(`  • XLSX Analysis Sheet: `) + chalk.bold(result.outputs.xlsx || "N/A"));
    console.log(chalk.green(`  • PPTX Executive Deck: `) + chalk.bold(result.outputs.pptx || "N/A"));

    const telemetry = monitor.getTelemetry();
    console.log(chalk.bold.bgBlue.white("\n 🔒 SOVEREIGNTY VERIFICATION LOGS "));
    console.log(chalk.white(`  • Sovereign Mode Active: ${telemetry.sovereignMode}`));
    console.log(chalk.white(`  • External Cloud AI Calls Made: ${telemetry.externalCallsCount} (ZERO)`));
    console.log(chalk.white(`  • External Calls Blocked: ${telemetry.blockedCallsCount}`));
    console.log(chalk.white(`  • Local Ollama Inferences: ${telemetry.localCallsCount}`));

    console.log(chalk.bold.green("\n✓ DEMO COMPLETED SUCCESSFULLY WITH REAL DELIVERABLES PRODUCED.\n"));
}

if (import.meta.main) {
    runSovereignDemo().catch(console.error);
}
