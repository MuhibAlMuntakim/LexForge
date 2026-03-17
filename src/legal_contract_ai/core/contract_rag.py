import os
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableParallel
from langchain_core.messages import HumanMessage, AIMessage

from src.legal_contract_ai.tools.clause_vector_search import ClauseVectorSearch

load_dotenv()

logger = logging.getLogger(__name__)

class ContractRAG:
    """Handles context-aware RAG chat for legal contracts using LangChain and LCEL."""
    
    def __init__(self):
        self.vector_search = ClauseVectorSearch()
        # Using gemini-2.5-flash as discovered via API list
        self.model_name = "gemini-2.5-flash" 
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            os.environ["GOOGLE_API_KEY"] = self.api_key
        
        self.llm = ChatGoogleGenerativeAI(
            model=self.model_name,
            google_api_key=self.api_key,
            temperature=0,
            convert_system_message_to_human=True 
        )

    def _format_docs(self, docs):
        """Standardized document formatter for the RAG prompt."""
        return "\n\n".join([
            f"Clause [{doc.metadata.get('clause_type', 'unknown')}]: {doc.page_content}"
            for doc in docs
        ])

    def generate_chat_response(
        self, 
        contract_id: str, 
        query: str, 
        history: List[Dict[str, str]] = []
    ) -> Dict[str, Any]:
        """Generates an answer based on contract context using LangChain LCEL."""
        
        # 1. Setup Retriever with contract_id filter
        retriever = self.vector_search.vectorstore.as_retriever(
            search_kwargs={
                "k": 5,
                "filter": {"contract_id": contract_id}
            }
        )
        
        # 2. Build Prompt Template
        # Note: LexForge uses a strict system persona
        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are LexForge AI, a specialized legal analysis assistant. "
                "Your goal is to answer questions based ONLY on the provided contract context. "
                "If the information is not in the context, state that clearly. "
                "Be professional, precise, and objective."
            )),
            MessagesPlaceholder(variable_name="chat_history"),
            ("system", "Context from the contract:\n---\n{context}\n---"),
            ("human", "{query}")
        ])

        # 3. Format history for LangChain
        langchain_history = []
        for item in history:
            if item["role"] == "user":
                langchain_history.append(HumanMessage(content=item["content"]))
            elif item["role"] == "assistant":
                langchain_history.append(AIMessage(content=item["content"]))

        # 4. Define LCEL Chain with Context Extraction
        # We use a parallel chain to get both the answer and the source docs
        setup_and_retrieval = RunnableParallel(
            {"context": retriever | self._format_docs, "query": RunnablePassthrough(), "chat_history": lambda x: langchain_history, "raw_docs": retriever}
        )
        
        output_parser = StrOutputParser()

        try:
            # Execute retrieval and generation
            # We first run the retrieval to get raw docs for the response object
            raw_docs = retriever.invoke(query)
            context_text = self._format_docs(raw_docs)
            
            # Run the generation chain
            chain = prompt | self.llm | output_parser
            
            answer = chain.invoke({
                "context": context_text,
                "chat_history": langchain_history,
                "query": query
            })
            
            # Format context hits for the API response
            context_used = []
            for doc in raw_docs:
                context_used.append({
                    "text": doc.page_content,
                    "metadata": doc.metadata
                })

            return {
                "answer": answer,
                "context_used": context_used
            }
            
        except Exception as e:
            logger.error(f"LangChain RAG Chat failed: {e}")
            return {
                "answer": f"I encountered an error while analyzing the contract for your query using the LangChain framework: {str(e)}",
                "context_used": []
            }

if __name__ == "__main__":
    # Internal test check
    rag = ContractRAG()
    print("ContractRAG (LangChain) initialized.")
