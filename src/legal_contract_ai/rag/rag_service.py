import datetime
import os
import uuid
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.legal_contract_ai.tools.contract_loader import ContractLoader


load_dotenv()


class RAGService:
    """Indexes uploaded docs and answers grounded questions over them."""

    def __init__(self) -> None:
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise RuntimeError("Missing GEMINI_API_KEY or GOOGLE_API_KEY for RAG service")

        self.embedding_model = os.getenv(
            "RAG_EMBEDDING_MODEL",
            "gemini-embeddings-2-preview",
        )
        self.chat_model = os.getenv("RAG_CHAT_MODEL", "gemini-2.5-flash")
        self.collection_name = os.getenv("RAG_COLLECTION", "contract_rag_docs")
        self.chunk_size = int(os.getenv("RAG_CHUNK_SIZE", "1500"))
        self.chunk_overlap = int(os.getenv("RAG_CHUNK_OVERLAP", "200"))

        base_db_path = os.getenv("CHROMA_DB_PATH", "./data/vector_store")
        self.persist_directory = os.path.join(base_db_path, "rag")
        os.makedirs(self.persist_directory, exist_ok=True)

        self.embeddings, self.active_embedding_model = self._init_embeddings()
        self.vector_store = Chroma(
            collection_name=self.collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory,
        )

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

        self.llm = ChatGoogleGenerativeAI(
            model=self.chat_model,
            temperature=0.1,
            google_api_key=self.api_key,
        )

        self.prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a legal document assistant. Answer only from the provided context. "
                    "If the answer is not in context, say that you cannot find enough evidence in the uploaded document.",
                ),
                (
                    "human",
                    "Question: {question}\n\n"
                    "Chat History:\n{chat_history}\n\n"
                    "Context:\n{context}\n\n"
                    "Return a concise answer and reference relevant source chunk numbers.",
                ),
            ]
        )

    def _init_embeddings(self) -> Tuple[GoogleGenerativeAIEmbeddings, str]:
        requested = self.embedding_model
        candidates = [
            requested,
            requested.replace("models/", "") if requested.startswith("models/") else f"models/{requested}",
            "models/gemini-embedding-001",
            "gemini-embedding-001",
        ]

        seen = set()
        ordered_candidates = []
        for name in candidates:
            if name and name not in seen:
                seen.add(name)
                ordered_candidates.append(name)

        last_error: Optional[Exception] = None
        for model_name in ordered_candidates:
            try:
                emb = GoogleGenerativeAIEmbeddings(
                    model=model_name,
                    google_api_key=self.api_key,
                )
                emb.embed_query("health check")
                return emb, model_name
            except Exception as exc:
                last_error = exc

        raise RuntimeError(
            "Could not initialize Gemini embeddings with available model names"
        ) from last_error

    def index_document(
        self,
        file_path: str,
        company_id: str,
        contract_id: Optional[str] = None,
        doc_id: Optional[str] = None,
        filename: Optional[str] = None,
    ) -> Dict[str, Any]:
        text = ContractLoader.load(file_path)
        if not text or text.startswith("Error reading"):
            raise ValueError("Unable to parse uploaded document text")

        doc_id = doc_id or str(uuid.uuid4())
        filename = filename or os.path.basename(file_path)

        base_metadata = {
            "doc_id": doc_id,
            "company_id": company_id,
            "contract_id": contract_id or "",
            "filename": filename,
            "indexed_at": datetime.datetime.utcnow().isoformat(),
        }

        chunks = self.text_splitter.split_text(text)
        if not chunks:
            raise ValueError("Document produced no indexable chunks")

        documents = []
        metadatas = []
        ids = []
        for idx, chunk in enumerate(chunks):
            metadata = dict(base_metadata)
            metadata["chunk_index"] = idx
            documents.append(chunk)
            metadatas.append({k: str(v) for k, v in metadata.items()})
            ids.append(f"{doc_id}:{idx}")

        self.vector_store.add_texts(texts=documents, metadatas=metadatas, ids=ids)

        return {
            "doc_id": doc_id,
            "company_id": company_id,
            "contract_id": contract_id,
            "filename": filename,
            "chunk_count": len(chunks),
            "indexed_at": base_metadata["indexed_at"],
        }

    def index_analysis_artifacts(
        self,
        company_id: str,
        contract_id: str,
        analysis: Dict[str, Any],
        doc_id: Optional[str] = None,
        filename: Optional[str] = None,
    ) -> Dict[str, int]:
        """Index AI review artifacts (summary, violations, redlines, observations) for enhanced RAG context."""
        doc_id = doc_id or str(uuid.uuid4())
        filename = filename or f"analysis_{contract_id}"
        
        base_metadata = {
            "doc_id": doc_id,
            "company_id": company_id,
            "contract_id": contract_id,
            "filename": filename,
            "source_type": "ai_analysis",
            "indexed_at": datetime.datetime.utcnow().isoformat(),
        }
        
        documents = []
        metadatas = []
        ids = []
        chunk_index = 0
        
        # Index executive summary
        summary = analysis.get("summary", "")
        if summary:
            documents.append(f"EXECUTIVE SUMMARY:\n{summary}")
            metadata = dict(base_metadata)
            metadata["chunk_index"] = chunk_index
            metadata["artifact_type"] = "summary"
            metadatas.append({k: str(v) for k, v in metadata.items()})
            ids.append(f"{doc_id}:summary")
            chunk_index += 1
        
        # Index violations and observations together
        violations = analysis.get("violations", [])
        observations = analysis.get("ai_observations", [])
        if violations or observations:
            violation_text_parts = []
            for v in violations:
                clause = v.get("clause", "Unknown")
                issue = v.get("issue", "")
                severity = v.get("severity", "unknown")
                violation_text_parts.append(f"• [{severity.upper()}] {clause}: {issue}")
            
            for obs in observations:
                risk = obs.get("risk", "")
                explanation = obs.get("explanation", "")
                violation_text_parts.append(f"• OBSERVATION: {risk} - {explanation}")
            
            if violation_text_parts:
                violation_text = "VIOLATIONS AND OBSERVATIONS:\n" + "\n".join(violation_text_parts)
                documents.append(violation_text)
                metadata = dict(base_metadata)
                metadata["chunk_index"] = chunk_index
                metadata["artifact_type"] = "violations_observations"
                metadatas.append({k: str(v) for k, v in metadata.items()})
                ids.append(f"{doc_id}:violations")
                chunk_index += 1
        
        # Index redline suggestions
        redlines = analysis.get("redlines", [])
        if redlines:
            redline_text_parts = []
            for i, r in enumerate(redlines, 1):
                original = r.get("original_clause", "")
                suggested = r.get("suggested_redline", r.get("suggested_clause", ""))
                rationale = r.get("rationale", "")
                redline_text_parts.append(
                    f"Redline {i}:\nOriginal: {original}\n"
                    f"Suggested: {suggested}\nRationale: {rationale}"
                )
            
            redline_text = "REDLINE SUGGESTIONS:\n" + "\n---\n".join(redline_text_parts)
            documents.append(redline_text)
            metadata = dict(base_metadata)
            metadata["chunk_index"] = chunk_index
            metadata["artifact_type"] = "redlines"
            metadatas.append({k: str(v) for k, v in metadata.items()})
            ids.append(f"{doc_id}:redlines")
            chunk_index += 1
        
        # Index risk assessment
        risk_assessment = analysis.get("risk_assessment", {})
        if risk_assessment:
            risk_score = risk_assessment.get("risk_score", 0)
            risk_level = risk_assessment.get("risk_level", "unknown")
            violation_counts = risk_assessment.get("violation_counts", {})
            
            risk_text = f"RISK ASSESSMENT:\nRisk Level: {risk_level}\nRisk Score: {risk_score}\n"
            if violation_counts:
                risk_text += "Violation Counts:\n" + "\n".join(
                    f"  {k}: {v}" for k, v in violation_counts.items()
                )
            
            documents.append(risk_text)
            metadata = dict(base_metadata)
            metadata["chunk_index"] = chunk_index
            metadata["artifact_type"] = "risk_assessment"
            metadatas.append({k: str(v) for k, v in metadata.items()})
            ids.append(f"{doc_id}:risk")
            chunk_index += 1
        
        # Add all artifacts to vector store if any were created
        if documents:
            self.vector_store.add_texts(texts=documents, metadatas=metadatas, ids=ids)
        
        return {
            "doc_id": doc_id,
            "company_id": company_id,
            "contract_id": contract_id,
            "filename": filename,
            "artifact_count": chunk_index,
            "indexed_at": base_metadata["indexed_at"],
        }

    def answer_question(
        self,
        question: str,
        company_id: str,
        contract_id: Optional[str] = None,
        doc_id: Optional[str] = None,
        top_k: int = 6,
        chat_history: Optional[List[Dict[str, str]]] = None,
        additional_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        docs_with_scores = self._retrieve(
            question=question,
            company_id=company_id,
            contract_id=contract_id,
            doc_id=doc_id,
            top_k=top_k,
        )

        history = chat_history or []
        history_str = "\n".join(
            f"{m.get('role', 'user')}: {m.get('content', '')}" for m in history[-8:]
        )

        if not docs_with_scores:
            if additional_context and additional_context.strip():
                chain = self.prompt | self.llm
                response = chain.invoke(
                    {
                        "question": question,
                        "chat_history": history_str or "(none)",
                        "context": additional_context,
                    }
                )

                return {
                    "question": question,
                    "answer": response.content,
                    "citations": [
                        {
                            "chunk_id": "live_review_state",
                            "doc_id": None,
                            "filename": "live_contract_state",
                            "contract_id": contract_id,
                            "score": None,
                            "excerpt": additional_context[:400],
                        }
                    ],
                    "grounded": False,
                }

            return {
                "question": question,
                "answer": "I could not find enough evidence in the indexed documents to answer that.",
                "citations": [],
                "grounded": False,
            }

        context_lines = []
        citations = []
        for i, (doc, score) in enumerate(docs_with_scores, start=1):
            chunk_id = f"{doc.metadata.get('doc_id', '')}:{doc.metadata.get('chunk_index', '')}"
            excerpt = doc.page_content[:400]
            context_lines.append(f"[Chunk {i}] {doc.page_content}")
            citations.append(
                {
                    "chunk_id": chunk_id,
                    "doc_id": doc.metadata.get("doc_id"),
                    "filename": doc.metadata.get("filename"),
                    "contract_id": doc.metadata.get("contract_id") or None,
                    "score": float(score),
                    "excerpt": excerpt,
                }
            )

        merged_context = "\n\n".join(context_lines)
        if additional_context and additional_context.strip():
            # Authoritative state from latest user actions should be considered first.
            merged_context = additional_context + "\n\n" + merged_context
            citations.insert(
                0,
                {
                    "chunk_id": "live_review_state",
                    "doc_id": None,
                    "filename": "live_contract_state",
                    "contract_id": contract_id,
                    "score": None,
                    "excerpt": additional_context[:400],
                },
            )

        chain = self.prompt | self.llm
        response = chain.invoke(
            {
                "question": question,
                "chat_history": history_str or "(none)",
                "context": merged_context,
            }
        )

        return {
            "question": question,
            "answer": response.content,
            "citations": citations,
            "grounded": True,
        }

    def _retrieve(
        self,
        question: str,
        company_id: str,
        contract_id: Optional[str],
        doc_id: Optional[str],
        top_k: int,
    ) -> List[Tuple[Any, float]]:
        filters: List[Dict[str, str]] = [{"company_id": company_id}]
        if contract_id:
            filters.append({"contract_id": contract_id})
        if doc_id:
            filters.append({"doc_id": doc_id})

        metadata_filter: Dict[str, Any]
        if len(filters) == 1:
            metadata_filter = filters[0]
        else:
            metadata_filter = {"$and": filters}

        try:
            return self.vector_store.similarity_search_with_relevance_scores(
                question,
                k=top_k,
                filter=metadata_filter,
            )
        except Exception:
            docs = self.vector_store.similarity_search(
                question,
                k=top_k,
                filter=metadata_filter,
            )
            return [(d, 0.0) for d in docs]
