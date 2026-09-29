#!/usr/bin/env bun

import { Command } from "commander";
import { runWakeUp } from "./terminalUserInterface/wakeUp.ts";

const program = new Command();

program
    .name("agent-build")
    .description(" AUTONOMOUS ARTIFICIAL MOBILE INTELLIGENCE & RECONNAISSANCE")
    .version("0.0.1");

program
    .command("wakeup")
    .description("Show the banner and pick mode")
    .action(async () => {
        await runWakeUp()
    });

program
    .command("demo")
    .description("Run AURA Sovereign AI Workbench Industrial Demo (MRPL SIH26117)")
    .action(async () => {
        const { runAuraSovereignDemo } = await import("./aura/demo/run-aura-demo.ts");
        await runAuraSovereignDemo();
    });

await program.parseAsync(process.argv);