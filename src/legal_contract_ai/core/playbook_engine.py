import json
import os
from typing import List, Dict, Any
from src.legal_contract_ai.tools.clause_vector_search import ClauseVectorSearch

class PlaybookEngine:
    """Deterministic and semantic rule engine for playbook compliance."""
    
    def __init__(self, playbook_path: str = "data/playbooks/default_playbook.json"):
        self.playbook_path = playbook_path
        self.rules = self._load_playbook()
        self.vector_search = ClauseVectorSearch(collection_name="playbook_rules")

    def _load_playbook(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.playbook_path):
            # Create default playbook if missing
            default = [
                {"clause": "liability", "policy": "liability cap must not exceed 12 months of fees", "severity": "high"},
                {"clause": "indemnity", "policy": "no unlimited indemnity. mutual indemnity preferred", "severity": "high"},
                {"clause": "governing_law", "policy": "must be Delaware or New York", "severity": "medium"},
                {"clause": "termination", "policy": "termination for convenience by both parties (30-60 days)", "severity": "medium"}
            ]
            os.makedirs(os.path.dirname(self.playbook_path), exist_ok=True)
            with open(self.playbook_path, 'w') as f:
                json.dump(default, f, indent=4)
            return default
            
        with open(self.playbook_path, 'r') as f:
            return json.load(f)

    def check_compliance(self, clauses: Dict[str, str]) -> Dict[str, Any]:
        """
        Evaluates clauses against the playbook.
        Returns violations.
        """
        violations = []
        
        for rule in self.rules:
            clause_type = rule["clause"]
            if clause_type in clauses:
                clause_text = clauses[clause_type]
                if clause_text == "Not specified":
                    violations.append({
                        "clause": clause_type,
                        "issue": f"Missing mandatory clause: {clause_type}",
                        "severity": rule["severity"]
                    })
                else:
                    # In a real SaaS, this would use an LLM or semantic match
                    # For MVP, we flag it for the Auditor agent to review deeply.
                    # This engine provides the "Context" for the auditor.
                    pass
        
        return {"violations": violations, "rules": self.rules}

if __name__ == "__main__":
    print("Playbook Engine initialized.")
