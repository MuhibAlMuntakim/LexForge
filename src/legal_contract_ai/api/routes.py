from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
import logging
from typing import List, Dict, Any
from src.legal_contract_ai.api.schemas import ReviewResponse, ReviewRequest, ContractHistoryItem, ChatRequest, ChatResponse
from src.legal_contract_ai.core.contract_pipeline import ContractPipeline
from src.legal_contract_ai.core.contract_memory import ContractMemory
from src.legal_contract_ai.core.contract_rag import ContractRAG

logger = logging.getLogger(__name__)

router = APIRouter()
pipeline = ContractPipeline()
memory = ContractMemory()
rag = ContractRAG()

UPLOAD_DIR = "data/uploaded_contracts"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/contracts/analyze", response_model=ReviewResponse)
async def analyze_contract(file: UploadFile = File(...), company_id: str = "default_co"):
    # Save uploaded file
    uploaded_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(uploaded_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        result = pipeline.run_review(uploaded_path, company_id=company_id)
        return result
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Backward compatibility alias
@router.post("/review", response_model=ReviewResponse)
async def review_contract_alias(file: UploadFile = File(...), company_id: str = "default_co"):
    return await analyze_contract(file, company_id)

@router.get("/history", response_model=List[ContractHistoryItem])
async def get_history():
    if not os.path.exists("data/contracts"):
        return []
    files = os.listdir("data/contracts")
    history = []
    for f in files:
        if f.endswith(".json"):
            data = memory.get_analysis(f.replace(".json", ""))
            if data:
                history.append({
                    "contract_id": data["contract_id"],
                    "company_id": data["company_id"],
                    "timestamp": data["timestamp"]
                })
    return history

@router.get("/contracts/{contract_id}", response_model=ReviewResponse)
async def get_contract_analysis(contract_id: str):
    data = memory.get_analysis(contract_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return data

@router.get("/contracts/{contract_id}/summary")
async def get_contract_summary(contract_id: str):
    data = memory.get_analysis(contract_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"summary": data.get("summary")}

@router.get("/contracts/{contract_id}/risks")
async def get_contract_risks(contract_id: str):
    data = memory.get_analysis(contract_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {
        "risk_assessment": data.get("risk_assessment"),
        "violations": data.get("violations"),
        "ai_observations": data.get("ai_observations")
    }

@router.get("/contracts/{contract_id}/redlines")
async def get_contract_redlines(contract_id: str):
    data = memory.get_analysis(contract_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"redlines": data.get("redlines")}

@router.post("/contracts/{contract_id}/chat", response_model=ChatResponse)
async def chat_with_contract(contract_id: str, request: ChatRequest):
    # Verify contract exists
    data = memory.get_analysis(contract_id)
    if not data:
        raise HTTPException(status_code=404, detail="Contract analysis not found. Please analyze the contract first.")
    
    # Convert history to simple list of dicts for RAG tool
    history = [{"role": item.role, "content": item.content} for item in request.history]
    
    try:
        result = rag.generate_chat_response(contract_id, request.query, history)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
