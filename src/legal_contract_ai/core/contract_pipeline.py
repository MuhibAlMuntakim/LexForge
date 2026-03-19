import os
import uuid
import datetime
import logging
import json
import re
import time
from typing import Dict, Any, List, Optional

from src.legal_contract_ai.tools.contract_loader import ContractLoader
from src.legal_contract_ai.analysis.clause_classifier import ClauseClassifier
from src.legal_contract_ai.analysis.ai_risk_discovery import AiRiskDiscovery
from src.legal_contract_ai.analysis.risk_scorer import RiskScorer
from src.legal_contract_ai.core.playbook_rule_engine import PlaybookRuleEngine
from src.legal_contract_ai.core.contract_memory import ContractMemory
from src.legal_contract_ai.crew.crew import LegalContractCrew

# Set up logging
logger = logging.getLogger(__name__)

class ContractPipeline:
    """The main automated legal review pipeline."""
    
    def __init__(self):
        self.loader = ContractLoader()
        self.classifier = ClauseClassifier()
        self.scorer = RiskScorer()
        self.risk_discovery = AiRiskDiscovery()
        self.memory = ContractMemory()

    def _chunk_text(self, text: str, chunk_size: int = 25000) -> List[str]:
        """Splits contract into sections to avoid context limits or for parallel processing."""
        if not text:
            return []
        # Primitive chunking for now, can be improved to split by section headers
        return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

    def run_review(
        self,
        file_path: str,
        company_id: str = "default_co",
        playbook_path: str = "data/playbooks/default_playbook.json",
        playbook_id: str = "default",
        playbook_name: str = "Default Playbook",
    ) -> Dict[str, Any]:
        """Runs the full E2E contract review pipeline."""
        playbook_engine = PlaybookRuleEngine(playbook_path=playbook_path)

        start_time = datetime.datetime.now()
        perf_start = time.perf_counter()
        stage_timings: Dict[str, float] = {}
        contract_id = str(uuid.uuid4())
        
        logger.info(f"[{contract_id}] Starting review for {file_path}")
        
        # 1. Load Document
        logger.info(f"[{contract_id}] Loading contract...")
        stage_start = time.perf_counter()
        text = self.loader.load(file_path)
        stage_timings["load_document"] = round(time.perf_counter() - stage_start, 4)
        
        # 2. Chunking (if needed)
        stage_start = time.perf_counter()
        chunks = self._chunk_text(text)
        stage_timings["chunk_text"] = round(time.perf_counter() - stage_start, 4)
        logger.info(f"[{contract_id}] Processing {len(chunks)} chunks...")
        
        # 3. Clause Classification (Call #1)
        # For MVP, we use the first 30k chars as implemented in ClauseClassifier
        # For large contracts, we could aggregate results from multiple chunks
        stage_start = time.perf_counter()
        full_classification = self.classifier.classify_clauses(text)
        stage_timings["clause_classification"] = round(time.perf_counter() - stage_start, 4)
        raw_clauses = full_classification.get("raw_clauses", {})
        structured_clauses = full_classification.get("clauses", {})
        
        # 4. Check Playbook (Deterministic Rule Engine)
        logger.info(f"[{contract_id}] Checking playbook compliance...")
        stage_start = time.perf_counter()
        compliance = playbook_engine.check_compliance(full_classification, raw_clauses)
        stage_timings["playbook_check"] = round(time.perf_counter() - stage_start, 4)
        violations = compliance["violations"]
        
        # 5. Risk Scoring
        logger.info(f"[{contract_id}] Generating risk score...")
        stage_start = time.perf_counter()
        risk_data = self.scorer.calculate_score(violations)
        stage_timings["risk_scoring"] = round(time.perf_counter() - stage_start, 4)
        
        # 6. AI Risk Discovery (Call #2)
        logger.info(f"[{contract_id}] Identifying AI observations...")
        stage_start = time.perf_counter()
        ai_risks = self.risk_discovery.discover_risks(text)
        stage_timings["ai_risk_discovery"] = round(time.perf_counter() - stage_start, 4)
        observations = ai_risks.get("ai_observations", [])
        
        # 7. Kickoff AI Agents (Call #3)
        logger.info(f"[{contract_id}] Kicking off CrewAI agents for reasoning and redlines...")
        crew_inputs = {
            "contract_text": text[:20000], # Context for agents
            "extracted_clauses": raw_clauses,
            "playbook_rules": playbook_engine.rules,
            "violations": violations,
            "structured_classification": structured_clauses
        }
        
        crew_result = None
        stage_start = time.perf_counter()
        try:
            crew_result = LegalContractCrew().crew().kickoff(inputs=crew_inputs)
        except Exception as e:
            logger.error(f"[{contract_id}] CrewAI execution failed: {e}")
        stage_timings["crew_reasoning"] = round(time.perf_counter() - stage_start, 4)

        # 8/9. Format Output & Save to Memory
        summary = "Analysis complete."
        redlines = []
        
        ai_summary_raw = None
        stage_start = time.perf_counter()
        if crew_result:
            for res in crew_result.tasks_output:
                desc = str(res.description).lower()
                if "summary" in desc:
                    ai_summary_raw = str(res.raw or "")
                elif "redline" in desc:
                    redlines_data = res.json_dict or self._parse_json_fuzzy(res.raw)
                    if redlines_data:
                        if isinstance(redlines_data, dict) and "suggestions" in redlines_data:
                            redlines = redlines_data["suggestions"]
                        elif isinstance(redlines_data, list):
                            redlines = redlines_data
        stage_timings["parse_crew_outputs"] = round(time.perf_counter() - stage_start, 4)
        
        # Fallback for redlines if crew failed but we have violations with templates
        stage_start = time.perf_counter()
        if not redlines and violations:
            logger.info(f"[{contract_id}] Using deterministic fallback for redlines.")
            for v in violations:
                redlines.append(
                    {
                        "violation": v.get("clause"),
                        "original_clause": v.get("original_clause", ""),
                        "suggested_redline": v.get("playbook_template")
                        or self._build_policy_fallback_suggestion(v),
                        "rationale": f"Playbook requirement: {v.get('policy', 'Policy alignment required.')}",
                    }
                )

        # Normalize crew/deterministic redlines and force a concrete suggestion for each.
        redlines = self._ensure_redline_suggestions(redlines, violations)
        stage_timings["fallback_redlines"] = round(time.perf_counter() - stage_start, 4)

        end_time = datetime.datetime.now()
        duration = (end_time - start_time).total_seconds()

        stage_start = time.perf_counter()
        summary = self._compose_deterministic_summary(
            risk_data=risk_data,
            violations=violations,
            observations=observations,
            ai_summary=ai_summary_raw,
        )
        stage_timings["summary_composition"] = round(time.perf_counter() - stage_start, 4)

        analysis_result = {
            "contract_id": contract_id,
            "company_id": company_id,
            "timestamp": start_time.isoformat(),
            "duration_seconds": duration,
            "stage_timings": stage_timings,
            "summary": summary,
            "key_terms": raw_clauses,
            "document_text": text,
            "risk_assessment": {
                "risk_score": risk_data["risk_score"],
                "risk_level": risk_data["risk_level"],
                "violation_counts": risk_data["violation_counts"]
            },
            "violations": violations,
            "ai_observations": observations,
            "clause_classification": structured_clauses,
            "raw_clauses": raw_clauses,
            "redlines": redlines,
            "playbook_id": playbook_id,
            "playbook_name": playbook_name,
            "playbook_version": playbook_engine.version,
            "requires_manual_review": full_classification.get("requires_manual_review", False),
            "accepted_redline_indexes": [],
            "rejected_redline_indexes": [],
            "revised_document": None,
            "negotiation_status": "reviewed",
            "negotiation_queue_at": None,
        }
        
        # Save to Memory
        logger.info(f"[{contract_id}] Saving to memory...")
        stage_start = time.perf_counter()
        self.memory.save_analysis(contract_id, company_id, analysis_result)
        stage_timings["save_memory"] = round(time.perf_counter() - stage_start, 4)
        stage_timings["total_pipeline"] = round(time.perf_counter() - perf_start, 4)
        analysis_result["stage_timings"] = stage_timings
        
        # Log structured JSON as requested
        self._log_structured_event(contract_id, company_id, analysis_result)
        
        return analysis_result

    def _strip_markdown(self, text: str) -> str:
        if not text:
            return ""
        cleaned = re.sub(r"```[\s\S]*?```", "", text)
        cleaned = re.sub(r"[*_`#>-]+", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    def _compose_deterministic_summary(
        self,
        risk_data: Dict[str, Any],
        violations: List[Dict[str, Any]],
        observations: List[Dict[str, Any]],
        ai_summary: Optional[str],
    ) -> str:
        score = int(risk_data.get("risk_score", 0))
        level = str(risk_data.get("risk_level", "Low Risk"))
        counts = risk_data.get("violation_counts", {"high": 0, "medium": 0, "low": 0})

        deterministic = (
            f"Deterministic assessment: {level} (score {score}/100) based strictly on playbook violations. "
            f"Violations found: {len(violations)} total "
            f"(high: {counts.get('high', 0)}, medium: {counts.get('medium', 0)}, low: {counts.get('low', 0)}). "
            f"Advisory AI observations: {len(observations)}."
        )

        ai_text = self._strip_markdown(ai_summary or "")
        if ai_text:
            return f"{deterministic} AI notes: {ai_text}"
        return deterministic

    def _log_structured_event(self, contract_id: str, company_id: str, result: Dict[str, Any]):
        """Logs event as structured JSON."""
        stage_timings = result.get("stage_timings", {})
        slowest_stage = None
        slowest_duration = 0.0
        if stage_timings:
            slowest_stage = max(stage_timings, key=stage_timings.get)
            slowest_duration = float(stage_timings.get(slowest_stage, 0.0))

        log_entry = {
            "event": "contract_analysis_complete",
            "contract_id": contract_id,
            "company_id": company_id,
            "timestamp": datetime.datetime.now().isoformat(),
            "risk_score": result["risk_assessment"]["risk_score"],
            "violation_count": len(result["violations"]),
            "ai_observation_count": len(result["ai_observations"]),
            "duration": result["duration_seconds"],
            "stage_timings": stage_timings,
            "slowest_stage": slowest_stage,
            "slowest_stage_seconds": slowest_duration,
        }
        logger.info(f"STRUCTURED_LOG: {json.dumps(log_entry)}")

    def _normalize_space(self, text: str) -> str:
        return re.sub(r"\s+", " ", str(text or "")).strip()

    def _build_policy_fallback_suggestion(self, violation: Dict[str, Any]) -> str:
        clause = self._normalize_space(violation.get("clause", "")).lower()
        policy = self._normalize_space(violation.get("policy", ""))

        defaults = {
            "indemnity": (
                "MUTUAL INDEMNIFICATION. Each party shall indemnify, defend, and hold harmless the other "
                "party from third-party claims to the extent arising from the indemnifying party's negligence, "
                "willful misconduct, or breach of this Agreement."
            ),
            "termination": (
                "TERMINATION FOR CONVENIENCE. Customer may terminate for convenience on thirty (30) days' written "
                "notice without early termination penalties. Vendor may terminate only for uncured material breach "
                "after a reasonable cure period."
            ),
            "liability": (
                "LIMITATION OF LIABILITY. Except for expressly stated carve-outs, each party's total aggregate "
                "liability shall not exceed 100% of annual contract value, and neither party shall be liable for "
                "indirect, special, incidental, or consequential damages."
            ),
            "confidentiality": (
                "CONFIDENTIALITY. Confidentiality obligations shall survive termination for at least three (3) years "
                "and apply mutually to each party's non-public information."
            ),
            "governing_law": (
                "GOVERNING LAW. This Agreement shall be governed by and construed in accordance with the laws of "
                "Delaware, excluding conflict-of-laws principles."
            ),
            "payment_terms": (
                "PAYMENT TERMS. Customer shall pay undisputed invoices within thirty (30) days of receipt of a valid invoice."
            ),
        }

        if clause in defaults:
            return defaults[clause]

        if policy:
            return f"Replace the clause to align with policy: {policy}"
        return "Replace the clause with language aligned to the selected playbook requirements."

    def _ensure_redline_suggestions(
        self,
        redlines: List[Dict[str, Any]],
        violations: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Ensure each redline has violation/original/rationale and a non-empty suggested_redline."""
        if not redlines:
            return []

        normalized_violations: List[Dict[str, Any]] = []
        for v in violations:
            normalized_violations.append(
                {
                    "clause": self._normalize_space(v.get("clause", "")).lower(),
                    "original_clause": self._normalize_space(v.get("original_clause", "")),
                    "playbook_template": self._normalize_space(v.get("playbook_template", "")),
                    "policy": self._normalize_space(v.get("policy", "")),
                }
            )

        result: List[Dict[str, Any]] = []
        for item in redlines:
            violation_clause = self._normalize_space(item.get("violation", "")).lower()
            original_clause = self._normalize_space(item.get("original_clause", ""))
            rationale = self._normalize_space(item.get("rationale", ""))
            suggested = self._normalize_space(
                item.get("suggested_redline") or item.get("suggested_clause") or ""
            )

            matched_violation: Optional[Dict[str, Any]] = None
            for v in normalized_violations:
                if violation_clause and v["clause"] == violation_clause:
                    if original_clause and v["original_clause"] and original_clause != v["original_clause"]:
                        continue
                    matched_violation = v
                    break

            if not matched_violation and violation_clause:
                for v in normalized_violations:
                    if v["clause"] == violation_clause:
                        matched_violation = v
                        break

            if not suggested:
                if matched_violation and matched_violation.get("playbook_template"):
                    suggested = matched_violation["playbook_template"]
                else:
                    fallback_violation = {
                        "clause": violation_clause,
                        "policy": matched_violation.get("policy", "") if matched_violation else "",
                    }
                    suggested = self._build_policy_fallback_suggestion(fallback_violation)

            if not rationale:
                if matched_violation and matched_violation.get("policy"):
                    rationale = f"Playbook requirement: {matched_violation['policy']}"
                else:
                    rationale = "Playbook policy alignment required."

            result.append(
                {
                    "violation": violation_clause or item.get("violation") or "general",
                    "original_clause": original_clause or "Original clause not captured.",
                    "suggested_redline": suggested,
                    "rationale": rationale,
                }
            )

        return result

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Contract Pipeline initialized.")
