# LexForge: AI-Powered Legal Contract Review

LexForge is a high-performance, deterministic AI system designed for automated legal contract review, risk discovery, and redlining. It combines a **Hybrid Deterministic + Agentic** architecture to ensure legal accuracy while leveraging the reasoning capabilities of Large Language Models.

## 🚀 Key Features

*   **Clause Classification**: Structural interpretation of legal clauses into normalized JSON attributes.
*   **Deterministic Rule Engine**: Playbook-based compliance checking (Liability, Indemnity, Governing Law, etc.).
*   **AI Risk Discovery**: Identification of advisory risks (e.g., auto-renewal, vendor assignment) not covered by the playbook.
*   **Risk Scoring**: Quantitative risk assessment (0-100) based on severity of violations.
*   **Template-Based Redlining**: Context-aware redline suggestions grounded in legal playbook templates.
*   **Negotiation Tracking**: Long-term memory of accepted redlines and negotiated positions using Vector Search (ChromaDB).

## 🛠 Architecture

The pipeline follows a strict, modular flow:
1. **ContractLoader**: Section-based document processing.
2. **ClauseClassifier**: Extraction and attribute mapping.
3. **PlaybookRuleEngine**: Deterministic compliance evaluation.
4. **RiskScorer**: Quantitative scoring logic.
5. **AIRiskDiscovery**: Advisory risk detection.
6. **CrewAI Reasoning**: Agentic synthesis and redline generation.
7. **ContractMemory**: Persistent storage and historical retrieval.

## 💻 Tech Stack

*   **Backend**: FastAPI, LiteLLM (Gemini 2.5 Flash), CrewAI
*   **Database**: ChromaDB (Vector Search), Local JSON Storage (Metadata)
*   **Frontend**: Next.js (Planned) / Streamlit (Verification UI)
*   **Intelligence**: Gemini 2.5 Flash

## 🛠 Getting Started

### Prerequisites
*   Python 3.11+
*   Gemini API Key

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/MuhibAlMuntakim/LexForge.git
   cd LexForge
   ```
2. Set up a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   Create a `.env` file based on `.env.example`:
   ```env
   GEMINI_API_KEY=your_api_key_here
   CHROMA_DB_PATH=data/chroma_db
   ```

### Running the System
**Backend:**
```bash
uvicorn src.legal_contract_ai.api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Streamlit UI (Verification):**
```bash
streamlit run frontend/streamlit_app.py
```

## ⚖️ License
Internal Use / Proprietary (Update as needed)
