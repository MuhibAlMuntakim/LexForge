import json
import os
from typing import Dict, Any, List
from src.legal_contract_ai.tools.clause_vector_search import ClauseVectorSearch

class ContractMemory:
    """Stores and retrieves historical contract analysis results."""
    
    def __init__(self, storage_dir: str = "data/contracts"):
        self.storage_dir = storage_dir
        self.vector_search = ClauseVectorSearch(collection_name="contract_history")
        os.makedirs(self.storage_dir, exist_ok=True)

    def save_analysis(self, contract_id: str, company_id: str, analysis: Dict[str, Any]):
        """Saves analysis to local filesystem and vector store."""
        file_path = os.path.join(self.storage_dir, f"{contract_id}.json")
        with open(file_path, 'w') as f:
            json.dump(analysis, f, indent=4)
        
        # 1. Store extracted clauses for general context
        if "clause_classification" in analysis:
            self.vector_search.add_clauses(
                contract_id=contract_id,
                company_id=company_id,
                clauses=analysis.get("key_terms", {}) # raw text
            )
            
        # 2. Store redlines in negotiation history
        if "redlines" in analysis:
            playbook_version = analysis.get("playbook_version", "unknown")
            for redline in analysis["redlines"]:
                self.vector_search.add_negotiation_history(
                    company_id=company_id,
                    clause_type=redline.get("violation") or "unknown",
                    original=redline.get("original_clause", ""),
                    negotiated=redline.get("suggested_redline", ""),
                    accepted=True, # Default to true for historical "ideal" redlines
                    playbook_version=playbook_version
                )

    def get_analysis(self, contract_id: str) -> Dict[str, Any]:
        """Retrieves a previously saved analysis."""
        file_path = os.path.join(self.storage_dir, f"{contract_id}.json")
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                return json.load(f)
        return None

    def find_similar_risks(self, clause_text: str, clause_type: str) -> List[Dict[str, Any]]:
        """Retrieves historical risks for similar clauses."""
        return self.vector_search.search_similar_clauses(clause_text, clause_type=clause_type)

if __name__ == "__main__":
    print("Contract Memory initialized.")
