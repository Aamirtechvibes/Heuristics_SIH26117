import path from "node:path";
import chalk from "chalk";
import { runAuraSovereignDemo } from "./run-aura-demo";

export async function runAntiHardcodingTest() {
    console.log(chalk.bold.cyan("\n================================================================================"));
    console.log(chalk.bold.magenta(" 🧪 AURA — ANTI-HARDCODING PROOF TEST (TWO-REPORT CONDITIONAL EVALUATION)"));
    console.log(chalk.bold.cyan("================================================================================\n"));

    const reportAPath = path.join(process.cwd(), "demo-data", "inspection-report-A.txt");
    const reportBPath = path.join(process.cwd(), "demo-data", "inspection-report-B.txt");

    console.log(chalk.bold.yellow("--- EXECUTING RUN 1: REPORT A (EX-402A: Measured 3.10mm vs T-min 4.50mm) ---"));
    const stateA = await runAuraSovereignDemo(reportAPath);

    console.log(chalk.bold.yellow("\n--- EXECUTING RUN 2: REPORT B (EX-402B: Measured 5.20mm vs T-min 4.50mm) ---"));
    const stateB = await runAuraSovereignDemo(reportBPath);

    console.log(chalk.bold.cyan("\n================================================================================"));
    console.log(chalk.bold.green(" 🔬 ANTI-HARDCODING COMPARISON PROOF RESULT"));
    console.log(chalk.bold.cyan("================================================================================"));

    console.log(chalk.bold("\nREPORT A (Critical Deficit Case):"));
    console.log(chalk.red(`  • Equipment Target: ${stateA.parsedDocument?.findings[0]?.equipmentId}`));
    console.log(chalk.red(`  • Measured Wall Thickness: ${stateA.parsedDocument?.findings[0]?.measuredValue}`));
    console.log(chalk.red(`  • Conditional Agent Branch Taken: ${stateA.conditionalBranchTaken}`));
    console.log(chalk.red(`  • Generated Word Document: ${path.basename(stateA.deliverables.docx || '')}`));

    console.log(chalk.bold("\nREPORT B (Safe Operating Margin Case):"));
    console.log(chalk.green(`  • Equipment Target: ${stateB.parsedDocument?.findings[0]?.equipmentId}`));
    console.log(chalk.green(`  • Measured Wall Thickness: ${stateB.parsedDocument?.findings[0]?.measuredValue}`));
    console.log(chalk.green(`  • Conditional Agent Branch Taken: ${stateB.conditionalBranchTaken}`));
    console.log(chalk.green(`  • Generated Word Document: ${path.basename(stateB.deliverables.docx || '')}`));

    if (stateA.conditionalBranchTaken !== stateB.conditionalBranchTaken && stateA.deliverables.docx !== stateB.deliverables.docx) {
        console.log(chalk.bold.bgGreen.black("\n ✓ ANTI-HARDCODING TEST PASSED: Outputs dynamically adapt to input report parameters. "));
    } else {
        console.error(chalk.bold.bgRed.white("\n ✖ ANTI-HARDCODING TEST FAILED: Outputs remained hardcoded. "));
        throw new Error("Anti-hardcoding test failed: Outputs did not change.");
    }
}

if (import.meta.main) {
    runAntiHardcodingTest().catch(console.error);
}
