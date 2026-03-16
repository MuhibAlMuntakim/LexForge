from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime

class RedlineSuggestion(BaseModel):
    violation: Optional[str] = None
    original_clause: str
    suggested_redline: Optional[str] = None
    rationale: str

class RedlineList(BaseModel):
    suggestions: List[RedlineSuggestion]

class RiskAssessment(BaseModel):
    risk_score: int
    risk_level: str
    violation_counts: Dict[str, int]

class Violation(BaseModel):
    clause: str
    attribute: Optional[str] = None
    issue: str
    severity: str
    violation_reason: str
    policy: str
    original_clause: str
    playbook_template: Optional[str] = None

class AiObservation(BaseModel):
    risk: str
    severity: str
    explanation: str

class ReviewRequest(BaseModel):
    company_id: Optional[str] = "default_co"

class ReviewResponse(BaseModel):
    contract_id: str
    company_id: str
    timestamp: str
    duration_seconds: float
    summary: str
    risk_assessment: RiskAssessment
    violations: List[Violation]
    ai_observations: List[AiObservation]
    clause_classification: Dict[str, Any]
    redlines: List[RedlineSuggestion]
    playbook_version: str
    requires_manual_review: bool

class ContractHistoryItem(BaseModel):
    contract_id: str
    company_id: str
    timestamp: str
