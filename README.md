# Lexforge: Institutional Legal Operations Hub

Lexforge is a high-fidelity, deterministic AI system designed for automated legal contract review, risk discovery, and redlining. It combines a **Hybrid Deterministic + Agentic** architecture to ensure legal accuracy while leveraging the reasoning capabilities of Large Language Models, all wrapped in a premium **Institutional Trust** design system.

## 🚀 Key Features

*   **Intelligent Document Registry**: High-density contract inventory with multi-dimensional risk filtering.
*   **AI Redlining Workbench**: Split-pane interface for side-by-side comparison of original clauses and AI-generated redlines.
*   **Deterministic Rule Engine**: Playbook-based compliance checking grounded in institutional standards.
*   **Advisory Risk Discovery**: Identification of subtle legal risks (auto-renewals, non-competes, etc.) beyond standard playbooks.
*   **RAG-Powered Legal Assistant**: Context-aware chat interface for querying the entire contract corpus.
*   **Compliance Engine**: Real-time visual tracking of portfolio health and alignment with legal protocols.

## 🛠 Architecture

The pipeline follows a modular, integrated flow:
1. **Ingestion Engine**: Multi-format document processing with simulated AI latency for high-precision extraction.
2. **Clause Classification**: Semantic mapping of legal language into structured metadata.
3. **Protocol Engine**: Deterministic rule application for automated violation detection.
4. **Agentic Synthesis**: CrewAI-driven reasoning for complex redline generation.
5. **Contract Memory**: Long-term historical context using ChromaDB Vector Search.

## 💻 Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **State Management**: TanStack Query (React Query)
- **UI Architecture**: Tailwind CSS + Shadcn UI
- **Design System**: "Institutional Trust" (Navy/Slate/Gold palette)

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **LLM Orchestration**: LiteLLM + Gemini 1.5 Pro/Flash
- **Agentic Logic**: CrewAI
- **Storage**: ChromaDB (Vector) + Local Persistent Storage

## 🛠 Getting Started

### Prerequisites
*   Python 3.11+
*   Node.js 20+
*   Gemini API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MuhibAlMuntakim/Lexforge.git
   cd Lexforge
   ```

2. **Backend Setup**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   ```

4. **Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key
   CHROMA_DB_PATH=data/chroma_db
   ```

### Running the System

**Development Mode (Full Stack):**

1. **Start Backend**:
   ```bash
   # From root
   uvicorn src.legal_contract_ai.api.main:app --reload --port 8000
   ```

2. **Start Frontend**:
   ```bash
   # From frontend directory
   npm run dev
   ```

## ⚖️ License
Internal Use / Proprietary
