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
    stage_timings: Dict[str, float] = Field(default_factory=dict)
    summary: str
    key_terms: Optional[Dict[str, Optional[str]]] = None
    document_text: Optional[str] = None
    risk_assessment: RiskAssessment
    violations: List[Violation]
    ai_observations: List[AiObservation]
    clause_classification: Dict[str, Any]
    redlines: List[RedlineSuggestion]
    playbook_id: str = "default"
    playbook_name: str = "Default Playbook"
    playbook_version: str
    requires_manual_review: bool
    accepted_redline_indexes: List[int] = Field(default_factory=list)
    rejected_redline_indexes: List[int] = Field(default_factory=list)
    revised_document: Optional[str] = None
    negotiation_status: str = "reviewed"
    negotiation_queue_at: Optional[str] = None

class ContractHistoryItem(BaseModel):
    contract_id: str
    company_id: str
    timestamp: str


class ContractSummaryItem(BaseModel):
    contract_id: str
    company_id: str
    timestamp: str
    risk_score: int
    risk_level: str
    violations: int
    negotiation_status: str


class ContractDeleteResponse(BaseModel):
    deleted: bool
    contract_id: str
    permanent: bool = False


class DeletedContractItem(BaseModel):
    contract_id: str
    company_id: str
    timestamp: str
    deleted_at: str
    risk_score: int
    risk_level: str
    negotiation_status: str


class ContractRestoreResponse(BaseModel):
    restored: bool
    contract_id: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatQueryRequest(BaseModel):
    question: str
    company_id: str = "default_co"
    contract_id: Optional[str] = None
    doc_id: Optional[str] = None
    top_k: int = 6
    chat_history: List[ChatMessage] = Field(default_factory=list)


class ChatCitation(BaseModel):
    chunk_id: str
    doc_id: Optional[str] = None
    filename: Optional[str] = None
    contract_id: Optional[str] = None
    score: Optional[float] = None
    excerpt: str


class ChatQueryResponse(BaseModel):
    question: str
    answer: str
    citations: List[ChatCitation]
    grounded: bool


class ChatIndexResponse(BaseModel):
    doc_id: str
    company_id: str
    contract_id: Optional[str] = None
    filename: str
    chunk_count: int
    indexed_at: str


class LabelCount(BaseModel):
    type: str
    count: int


class MonthScore(BaseModel):
    month: str
    score: float


class RecentContractItem(BaseModel):
    id: str
    vendor: str
    name: str
    risk: int
    risk_level: str
    violations: int
    status: str
    updated: str


class HealthMetrics(BaseModel):
    low: int
    medium: int
    high: int

class WeaknessItem(BaseModel):
    category: str
    count: int

class AttentionItem(BaseModel):
    id: str
    vendor: str
    risk_score: int
    risk_level: str
    status: str
    updated: str

class DashboardMetricsResponse(BaseModel):
    pending_tasks: int
    hours_saved: int
    avg_portfolio_risk: float
    mitigation_rate: float
    portfolio_health: HealthMetrics
    top_weaknesses: List[WeaknessItem]
    attention_required: List[AttentionItem]


class RiskDistributionItem(BaseModel):
    name: str
    value: int


class VendorRiskItem(BaseModel):
    vendor: str
    score: float


class ContractVolumeItem(BaseModel):
    month: str
    count: int


class AnalyticsMetricsResponse(BaseModel):
    risk_distribution: List[RiskDistributionItem]
    violation_frequency: List[LabelCount]
    vendor_risk_rankings: List[VendorRiskItem]
    contract_volume: List[ContractVolumeItem]


class NegotiationItem(BaseModel):
    id: str
    vendor: str
    contract: str
    status: str
    issues: int
    last_activity: str


class NegotiationStatusUpdateRequest(BaseModel):
    negotiation_status: str


class NegotiationStatusUpdateResponse(BaseModel):
    contract_id: str
    negotiation_status: str
    updated_at: str


class RedlineAcceptRequest(BaseModel):
    accepted: bool = True
    decision: Optional[str] = None  # accept | reject | clear


class RedlineAcceptResponse(BaseModel):
    contract_id: str
    redline_index: int
    accepted: bool
    accepted_redline_indexes: List[int]
    rejected_redline_indexes: List[int]
    negotiation_status: str
    revised_document: Optional[str] = None
    risk_assessment: Optional[RiskAssessment] = None


class RedlineSuggestionUpdateRequest(BaseModel):
    suggested_redline: str


class RedlineSuggestionUpdateResponse(BaseModel):
    contract_id: str
    redline_index: int
    suggested_redline: str
    revised_document: Optional[str] = None


class PlaybookBase(BaseModel):
    name: str
    description: Optional[str] = ""
    rules: List[Dict[str, Any]] = Field(default_factory=list)
    playbook_version: str = "1.0"


class PlaybookCreateRequest(PlaybookBase):
    pass


class PlaybookUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[List[Dict[str, Any]]] = None
    playbook_version: Optional[str] = None


class PlaybookResponse(PlaybookBase):
    playbook_id: str
    company_id: str
    is_default: bool = False
    rule_count: int = 0
    created_at: str
    updated_at: str
