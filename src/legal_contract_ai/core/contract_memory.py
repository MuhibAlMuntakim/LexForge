import json
import os
import logging
import datetime
from typing import Dict, Any, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from src.legal_contract_ai.tools.clause_vector_search import ClauseVectorSearch


logger = logging.getLogger(__name__)

class ContractMemory:
    """Stores and retrieves historical contract analysis results."""
    
    def __init__(self, storage_dir: str = "data/contracts"):
        self.storage_dir = storage_dir
        self.vector_search: Optional["ClauseVectorSearch"] = None
        self.vector_search_error: Optional[str] = None
        os.makedirs(self.storage_dir, exist_ok=True)

    def _get_vector_search(self) -> Optional["ClauseVectorSearch"]:
        if self.vector_search is not None:
            return self.vector_search
        if self.vector_search_error:
            return None

        try:
            from src.legal_contract_ai.tools.clause_vector_search import ClauseVectorSearch

            self.vector_search = ClauseVectorSearch(collection_name="contract_history")
            return self.vector_search
        except Exception as e:
            self.vector_search_error = str(e)
            logger.warning(f"Vector search unavailable: {e}")
            return None

    def save_analysis(self, contract_id: str, company_id: str, analysis: Dict[str, Any]):
        """Saves analysis to local filesystem and vector store."""
        file_path = os.path.join(self.storage_dir, f"{contract_id}.json")
        with open(file_path, 'w') as f:
            json.dump(analysis, f, indent=4)

        vector_search = self._get_vector_search()
        if vector_search is None:
            return
        
        # 1. Store extracted clauses for general context
        if "clause_classification" in analysis:
            vector_search.add_clauses(
                contract_id=contract_id,
                company_id=company_id,
                clauses=analysis.get("key_terms", {})
            )
            
        # 2. Store redlines in negotiation history
        if "redlines" in analysis:
            playbook_version = analysis.get("playbook_version", "unknown")
            for redline in analysis["redlines"]:
                vector_search.add_negotiation_history(
                    company_id=company_id,
                    clause_type=redline.get("violation") or "unknown",
                    original=redline.get("original_clause", ""),
                    negotiated=redline.get("suggested_redline", ""),
                    accepted=True, # Default to true for historical "ideal" redlines
                    playbook_version=playbook_version
                )

    def get_analysis(self, contract_id: str, include_deleted: bool = False) -> Dict[str, Any]:
        """Retrieves a previously saved analysis."""
        file_path = os.path.join(self.storage_dir, f"{contract_id}.json")
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                data = json.load(f)
                if data.get("deleted_at") and not include_deleted:
                    return None
                return data
        return None

    def update_analysis(self, contract_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Applies updates to an existing analysis and persists it."""
        current = self.get_analysis(contract_id, include_deleted=True)
        if not current:
            return None

        current.update(updates)
        file_path = os.path.join(self.storage_dir, f"{contract_id}.json")
        with open(file_path, 'w') as f:
            json.dump(current, f, indent=4)

        return current

    def delete_analysis(self, contract_id: str, permanent: bool = False) -> bool:
        """Soft-deletes or permanently deletes a stored analysis by contract id."""
        file_path = os.path.join(self.storage_dir, f"{contract_id}.json")
        if not os.path.exists(file_path):
            return False

        if permanent:
            os.remove(file_path)
            return True

        with open(file_path, 'r') as f:
            data = json.load(f)

        if data.get("deleted_at"):
            return True

        data["deleted_at"] = datetime.datetime.utcnow().isoformat()

        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4)

        return True

    def restore_analysis(self, contract_id: str) -> bool:
        """Restores a soft-deleted analysis."""
        file_path = os.path.join(self.storage_dir, f"{contract_id}.json")
        if not os.path.exists(file_path):
            return False

        with open(file_path, 'r') as f:
            data = json.load(f)

        if not data.get("deleted_at"):
            return True

        data.pop("deleted_at", None)

        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4)

        return True

    def list_deleted_analyses(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Returns soft-deleted analyses sorted by most recent deletion."""
        if not os.path.exists(self.storage_dir):
            return []

        deleted: List[Dict[str, Any]] = []
        for filename in os.listdir(self.storage_dir):
            if not filename.endswith(".json"):
                continue

            file_path = os.path.join(self.storage_dir, filename)
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
            except Exception:
                continue

            if not data.get("deleted_at"):
                continue

            deleted.append(data)

        deleted.sort(key=lambda item: str(item.get("deleted_at", "")), reverse=True)
        return deleted[: max(1, limit)]

    def find_similar_risks(self, clause_text: str, clause_type: str) -> List[Dict[str, Any]]:
        """Retrieves historical risks for similar clauses."""
        vector_search = self._get_vector_search()
        if vector_search is None:
            return []
        return vector_search.search_similar_clauses(clause_text, clause_type=clause_type)

if __name__ == "__main__":
    print("Contract Memory initialized.")
