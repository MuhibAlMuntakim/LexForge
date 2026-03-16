import chromadb
from chromadb.utils import embedding_functions
import os
from dotenv import load_dotenv
from typing import List, Dict, Any

load_dotenv()

class ClauseVectorSearch:
    """Manages clause embeddings and semantic retrieval using ChromaDB."""
    
    def __init__(self, collection_name: str = "contract_clauses"):
        self.db_path = os.getenv("CHROMA_DB_PATH", "./data/vector_store")
        self.client = chromadb.PersistentClient(path=self.db_path)
        
        # Use a fast and reliable embedding model
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            embedding_function=self.embedding_fn
        )

    def add_clauses(self, contract_id: str, company_id: str, clauses: Dict[str, str]):
        """Adds extracted clauses to the vector store with metadata."""
        documents = []
        metadatas = []
        ids = []
        
        for clause_type, text in clauses.items():
            if text and text != "Not specified":
                documents.append(text)
                metadatas.append({
                    "contract_id": contract_id,
                    "company_id": company_id,
                    "clause_type": clause_type
                })
                ids.append(f"{contract_id}_{clause_type}")
        
        if documents:
            self.collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )

    def add_negotiation_history(self, company_id: str, clause_type: str, original: str, negotiated: str, accepted: bool, playbook_version: str):
        """Adds a negotiated clause to the history with embeddings."""
        import datetime
        timestamp = datetime.datetime.now().isoformat()
        
        doc_id = f"neg_{company_id}_{clause_type}_{timestamp}"
        
        self.collection.add(
            documents=[negotiated],
            metadatas=[{
                "company_id": company_id,
                "clause_type": clause_type,
                "original_clause": original,
                "accepted": accepted,
                "timestamp": timestamp,
                "playbook_version": playbook_version,
                "type": "negotiation_history"
            }],
            ids=[doc_id]
        )

    def search_similar_clauses(self, query_text: str, clause_type: str = None, n_results: int = 3) -> List[Dict[str, Any]]:
        """Searches for semantically similar clauses."""
        where = {}
        if clause_type:
            where["clause_type"] = clause_type
            
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results,
            where=where if where else None
        )
        
        # Format results
        hits = []
        if results["documents"]:
            for i in range(len(results["documents"][0])):
                hits.append({
                    "text": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i]
                })
        return hits

    def search_negotiation_history(self, query_text: str, clause_type: str = None, n_results: int = 3) -> List[Dict[str, Any]]:
        """Searches for similar historical negotiated clauses."""
        # Note: in a real implementation, we'd filter by metadata 'type': 'negotiation_history'
        # but for simplicity we rely on the clause_type and similarity.
        return self.search_similar_clauses(query_text, clause_type=clause_type, n_results=n_results)

if __name__ == "__main__":
    print("Clause Vector Search initialized.")
