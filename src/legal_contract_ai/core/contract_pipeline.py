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
        self.playbook = PlaybookRuleEngine()
        self.scorer = RiskScorer()
        self.risk_discovery = AiRiskDiscovery()
        self.memory = ContractMemory()

    def _chunk_text(self, text: str, chunk_size: int = 25000) -> List[str]:
        """Splits contract into sections to avoid context limits or for parallel processing."""
        if not text:
            return []
        # Primitive chunking for now, can be improved to split by section headers
        return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

    def run_review(self, file_path: str, company_id: str = "default_co") -> Dict[str, Any]:
        """Runs the full E2E contract review pipeline."""
        start_time = datetime.datetime.now()
        contract_id = str(uuid.uuid4())
        
        logger.info(f"[{contract_id}] Starting review for {file_path}")
        
        # 1. Load Document
        logger.info(f"[{contract_id}] Loading contract...")
        text = self.loader.load(file_path)
        
        # 2. Chunking (if needed)
        chunks = self._chunk_text(text)
        logger.info(f"[{contract_id}] Processing {len(chunks)} chunks...")
        
        # 3. Clause Classification (Call #1)
        # For MVP, we use the first 30k chars as implemented in ClauseClassifier
        # For large contracts, we could aggregate results from multiple chunks
        full_classification = self.classifier.classify_clauses(text)
        raw_clauses = full_classification.get("raw_clauses", {})
        structured_clauses = full_classification.get("clauses", {})
        
        # 4. Check Playbook (Deterministic Rule Engine)
        logger.info(f"[{contract_id}] Checking playbook compliance...")
        compliance = self.playbook.check_compliance(full_classification, raw_clauses)
        violations = compliance["violations"]
        
        # 5. Risk Scoring
        logger.info(f"[{contract_id}] Generating risk score...")
        risk_data = self.scorer.calculate_score(violations)
        
        # 6. AI Risk Discovery (Call #2)
        logger.info(f"[{contract_id}] Identifying AI observations...")
        ai_risks = self.risk_discovery.discover_risks(text)
        observations = ai_risks.get("ai_observations", [])
        
        # 7. Kickoff AI Agents (Call #3)
        logger.info(f"[{contract_id}] Kicking off CrewAI agents for reasoning and redlines...")
        crew_inputs = {
            "contract_text": text[:20000], # Context for agents
            "extracted_clauses": raw_clauses,
            "playbook_rules": self.playbook.rules,
            "violations": violations,
            "structured_classification": structured_clauses
        }
        
        crew_result = None
        try:
            crew_result = LegalContractCrew().crew().kickoff(inputs=crew_inputs)
        except Exception as e:
            logger.error(f"[{contract_id}] CrewAI execution failed: {e}")

        # 8/9. Format Output & Save to Memory
        summary = "Analysis complete."
        redlines = []
        
        if crew_result:
            # Extract summary and redlines from crew result
            # Based on previous implementation logic
            for res in crew_result.tasks_output:
                desc = str(res.description).lower()
                if "summary" in desc:
                    summary = res.raw
                elif "redline" in desc:
                    redlines_data = res.json_dict or self._parse_json_fuzzy(res.raw)
                    if redlines_data:
                        if isinstance(redlines_data, dict) and "suggestions" in redlines_data:
                            redlines = redlines_data["suggestions"]
                        elif isinstance(redlines_data, list):
                            redlines = redlines_data
        
        # Fallback for redlines if crew failed but we have violations with templates
        if not redlines and violations:
            logger.info(f"[{contract_id}] Using deterministic fallback for redlines.")
            for v in violations:
                if v.get("playbook_template"):
                    redlines.append({
                        "violation": v["clause"],
                        "original_clause": v["original_clause"],
                        "suggested_redline": v["playbook_template"],
                        "rationale": f"Playbook requirement: {v['policy']}"
                    })

        end_time = datetime.datetime.now()
        duration = (end_time - start_time).total_seconds()

        analysis_result = {
            "contract_id": contract_id,
            "company_id": company_id,
            "timestamp": start_time.isoformat(),
            "duration_seconds": duration,
            "summary": summary,
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
            "playbook_version": self.playbook.version,
            "requires_manual_review": full_classification.get("requires_manual_review", False)
        }
        
        # Save to Memory
        logger.info(f"[{contract_id}] Saving to memory...")
        self.memory.save_analysis(contract_id, company_id, analysis_result)
        
        # Log structured JSON as requested
        self._log_structured_event(contract_id, company_id, analysis_result)
        
        return analysis_result

    def _log_structured_event(self, contract_id: str, company_id: str, result: Dict[str, Any]):
        """Logs event as structured JSON."""
        log_entry = {
            "event": "contract_analysis_complete",
            "contract_id": contract_id,
            "company_id": company_id,
            "timestamp": datetime.datetime.now().isoformat(),
            "risk_score": result["risk_assessment"]["risk_score"],
            "violation_count": len(result["violations"]),
            "ai_observation_count": len(result["ai_observations"]),
            "duration": result["duration_seconds"]
        }
        logger.info(f"STRUCTURED_LOG: {json.dumps(log_entry)}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Contract Pipeline initialized.")
