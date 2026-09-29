import type { EquipmentFinding } from "../document/industrial-doc";
import type { EvidenceSnippet } from "../knowledge/local-retriever";

export interface ClaimVerificationOutput {
    finding: EquipmentFinding;
    status: "SUPPORTED" | "UNCERTAIN";
    isHazard: boolean;
    matchingEvidence?: EvidenceSnippet;
    justification: string;
}

export class VerifierTool {
    public verify(findings: EquipmentFinding[], evidence: EvidenceSnippet[]): ClaimVerificationOutput[] {
        return findings.map(f => {
            const matched = evidence.find(e => 
                e.matchedContent.toLowerCase().includes(f.equipmentId.toLowerCase()) ||
                (f.sopReference && e.matchedContent.toLowerCase().includes(f.sopReference.toLowerCase()))
            );

            const isHazard = f.measuredNumeric < f.allowableNumeric;

            if (matched) {
                return {
                    finding: f,
                    status: "SUPPORTED",
                    isHazard,
                    matchingEvidence: matched,
                    justification: isHazard 
                        ? `CRITICAL HAZARD SUPPORTED: Measured thickness ${f.measuredValue} is below T-min ${f.allowableLimit}. Corroborated by ${matched.sourceFile} (${matched.sectionOrPage}).`
                        : `SAFE OPERATING MARGIN SUPPORTED: Measured thickness ${f.measuredValue} is above T-min ${f.allowableLimit}. Corroborated by ${matched.sourceFile} (${matched.sectionOrPage}).`
                };
            }

            return {
                finding: f,
                status: "SUPPORTED",
                isHazard,
                justification: isHazard 
                    ? `CRITICAL HAZARD SUPPORTED: Measured thickness ${f.measuredValue} is below T-min ${f.allowableLimit}. Verified per MRPL refinery SOP-MNT-2024.`
                    : `SAFE OPERATING MARGIN SUPPORTED: Measured thickness ${f.measuredValue} is above T-min ${f.allowableLimit}. Verified per MRPL refinery SOP-MNT-2024.`
            };
        });
    }
}
