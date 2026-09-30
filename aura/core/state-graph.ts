import chalk from "chalk";
import { ModelRegistryRouter, RouteSelectionResult } from "./model-registry";
import { SovereigntyGuard } from "./sovereignty-guard";

export type AgentNodeName =
    | "UNDERSTAND"
    | "CLASSIFY_TASK"
    | "PLAN_EXECUTION"
    | "ROUTE_MODELS"
    | "SELECT_SKILL"
    | "EXECUTE_TOOL"
    | "PROCESS_DOCUMENT"
    | "RECOVERY_OCR_FALLBACK"
    | "RETRIEVE_KNOWLEDGE"
    | "EXECUTE_CODE"
    | "VERIFY"
    | "BRANCH_CRITICAL_HAZARD"
    | "BRANCH_NORMAL_MAINTENANCE"
    | "CALCULATE"
    | "GENERATE_ARTIFACT"
    | "AWAIT_APPROVAL"
    | "COMPLETED"
    | "ERROR";

export type TaskCategory =
    | "GENERAL_QA"
    | "CODE_GEN"
    | "CODE_DEBUG"
    | "CODE_TEST"
    | "DOCUMENT_ANALYSIS"
    | "DOCUMENT_QA"
    | "SPREADSHEET_ANALYSIS"
    | "MULTIMODAL_VISION"
    | "PRESENTATION_GEN"
    | "ARTIFACT_BUILD"
    | "KNOWLEDGE_SEARCH"
    | "INDUSTRIAL_INSPECTION";

export interface NodeTransitionRecord {
    stepNumber: number;
    node: AgentNodeName;
    status: "RUNNING" | "COMPLETED" | "FAILED" | "RETRYING";
    description: string;
    timestamp: string;
    modelUsed?: string;
}

export interface AuraState {
    runId: string;
    taskDescription: string;
    taskCategory: TaskCategory;
    documentPath?: string;
    sopDirectoryPath?: string;
    outputDirectory: string;
    currentNode: AgentNodeName;
    history: NodeTransitionRecord[];
    routesSelected: RouteSelectionResult[];
    selectedSkills: string[];
    toolsUsed: string[];
    parsedDocument?: any;
    retrievedEvidence: any[];
    calculationOutput?: { stdout: string; executionTimeMs: number; isCritical?: boolean; deltaMm?: number };
    verificationStatus: "SUPPORTED" | "UNCERTAIN" | "NOT_REQUIRED";
    conditionalBranchTaken?: string;
    recoveryTriggered: boolean;
    deliverables: { docx?: string; xlsx?: string; pptx?: string; pdf?: string };
    finalResponse?: string;
    approvalState: "PENDING" | "APPROVED" | "NOT_REQUIRED" | "REJECTED";
    errors: string[];
    startedAt: string;
    completedAt?: string;
}

export class AuraAgentGraph {
    private router: ModelRegistryRouter;
    private guard: SovereigntyGuard;

    constructor() {
        this.router = new ModelRegistryRouter();
        this.guard = SovereigntyGuard.getInstance();
    }

    public createInitialState(options: {
        taskDescription: string;
        taskCategory?: TaskCategory;
        documentPath?: string;
        sopDirectoryPath?: string;
        outputDirectory: string;
    }): AuraState {
        return {
            runId: `AURA-RUN-${Date.now()}`,
            taskDescription: options.taskDescription,
            taskCategory: options.taskCategory || "GENERAL_QA",
            documentPath: options.documentPath,
            sopDirectoryPath: options.sopDirectoryPath,
            outputDirectory: options.outputDirectory,
            currentNode: "UNDERSTAND",
            history: [],
            routesSelected: [],
            selectedSkills: [],
            toolsUsed: [],
            retrievedEvidence: [],
            verificationStatus: "NOT_REQUIRED",
            recoveryTriggered: false,
            deliverables: {},
            approvalState: "NOT_REQUIRED",
            errors: [],
            startedAt: new Date().toISOString()
        };
    }

    public transition(
        state: AuraState,
        newNode: AgentNodeName,
        description: string,
        modelUsed?: string
    ): AuraState {
        const stepNumber = state.history.length + 1;
        const record: NodeTransitionRecord = {
            stepNumber,
            node: newNode,
            status: "COMPLETED",
            description,
            timestamp: new Date().toISOString(),
            modelUsed
        };

        return {
            ...state,
            currentNode: newNode,
            history: [...state.history, record]
        };
    }

    public evaluateDecisionBranch(state: AuraState, measuredMm: number, allowableMm: number): { nextNode: AgentNodeName; branch: "CRITICAL_HAZARD_ISOLATION" | "NORMAL_MAINTENANCE_MONITORING" } {
        const isHazard = measuredMm < allowableMm;

        console.log(chalk.bold.yellow("\n  🔀 AGENT STATE MACHINE CONDITIONAL DECISION EVALUATION"));
        console.log(chalk.gray(`     INPUT OBSERVATION: `) + chalk.bold(`Measured Wall Thickness = ${measuredMm.toFixed(2)} mm vs Allowable T-min = ${allowableMm.toFixed(2)} mm`));

        if (isHazard) {
            console.log(chalk.gray(`     DECISION TAKEN: `) + chalk.bold.bgRed.white(` CRITICAL_HAZARD_ISOLATION `));
            console.log(chalk.gray(`     NEXT AGENT STATE: `) + chalk.bold(`BRANCH_CRITICAL_HAZARD -> VERIFY -> GENERATE`));
            return { nextNode: "BRANCH_CRITICAL_HAZARD", branch: "CRITICAL_HAZARD_ISOLATION" };
        } else {
            console.log(chalk.gray(`     DECISION TAKEN: `) + chalk.bold.bgGreen.black(` NORMAL_MAINTENANCE_MONITORING `));
            console.log(chalk.gray(`     NEXT AGENT STATE: `) + chalk.bold(`BRANCH_NORMAL_MAINTENANCE -> VERIFY -> GENERATE`));
            return { nextNode: "BRANCH_NORMAL_MAINTENANCE", branch: "NORMAL_MAINTENANCE_MONITORING" };
        }
    }
}
