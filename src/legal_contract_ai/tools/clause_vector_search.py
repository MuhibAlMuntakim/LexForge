import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

load_dotenv()

class ClauseVectorSearch:
    """Manages clause embeddings and semantic retrieval using LangChain's Chroma wrapper."""
    
    def __init__(self, collection_name: str = "contract_clauses"):
        self.db_path = os.getenv("CHROMA_DB_PATH", "./data/vector_store")
        
        # Consistent with original LiteLLM/Chroma setup
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        self.vectorstore = Chroma(
            collection_name=collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.db_path
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
            self.vectorstore.add_texts(
                texts=documents,
                metadatas=metadatas,
                ids=ids
            )

    def add_negotiation_history(self, company_id: str, clause_type: str, original: str, negotiated: str, accepted: bool, playbook_version: str):
        """Adds a negotiated clause to the history with embeddings."""
        import datetime
        timestamp = datetime.datetime.now().isoformat()
        
        doc_id = f"neg_{company_id}_{clause_type}_{timestamp}"
        
        self.vectorstore.add_texts(
            texts=[negotiated],
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

    def search_similar_clauses(self, query_text: str, contract_id: str = None, clause_type: str = None, n_results: int = 5) -> List[Dict[str, Any]]:
        """Searches for semantically similar clauses with filters using LangChain's Chroma query."""
        filter_dict = {}
        if contract_id:
            filter_dict["contract_id"] = contract_id
        if clause_type:
            filter_dict["clause_type"] = clause_type
            
        results = self.vectorstore.similarity_search_with_score(
            query=query_text,
            k=n_results,
            filter=filter_dict if filter_dict else None
        )
        
        # Format results to match previous interface
        hits = []
        for doc, score in results:
            hits.append({
                "text": doc.page_content,
                "metadata": doc.metadata,
                "distance": score # Chroma score is distance
            })
        return hits

    def search_negotiation_history(self, query_text: str, clause_type: str = None, n_results: int = 3) -> List[Dict[str, Any]]:
        """Searches for similar historical negotiated clauses."""
        # Note: in a real implementation, we'd filter by metadata 'type': 'negotiation_history'
        # but for simplicity we rely on the clause_type and similarity.
        return self.search_similar_clauses(query_text, clause_type=clause_type, n_results=n_results)

if __name__ == "__main__":
    print("Clause Vector Search initialized.")
