
export interface StatMetric {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  sparklineData: string;
}

export interface RiskData {
  label: string;
  value: number;
  color: string;
  rawCount: number;
}

// Backend-aligned types
export interface RedlineSuggestion {
  violation?: string;
  original_clause: string;
  suggested_redline?: string;
  rationale: string;
}

export interface RiskAssessment {
  risk_score: number;
  risk_level: string;
  violation_counts: Record<string, number>;
}

export interface Violation {
  clause: string;
  attribute?: string;
  issue: string;
  severity: string;
  violation_reason: string;
  policy: string;
  original_clause: string;
  playbook_template?: string;
}

export interface AiObservation {
  risk: string;
  severity: string;
  explanation: string;
}

export interface ReviewResponse {
  contract_id: string;
  company_id: string;
  timestamp: string;
  duration_seconds: number;
  summary: string;
  risk_assessment: RiskAssessment;
  violations: Violation[];
  ai_observations: AiObservation[];
  clause_classification: Record<string, unknown>;
  redlines: RedlineSuggestion[];
  playbook_version: string;
  requires_manual_review: boolean;
}

export interface Review {
  id: string;
  title: string;
  uuid: string;
  type: string;
  status: 'Needs Review' | 'Processing' | 'Approved';
  risk: number;
  latency: string;
}

export const stats: StatMetric[] = [
  {
    label: 'Total Inventory',
    value: '124',
    change: '+8.2%',
    trend: 'up',
    sparklineData: 'M0 40 Q 25 30, 50 35 T 100 10',
  },
  {
    label: 'Active Analysis',
    value: '08',
    change: '+2.1%',
    trend: 'up',
    sparklineData: 'M0 20 L 20 25 L 40 15 L 60 30 L 80 10 L 100 25',
  },
  {
    label: 'Critical Violations',
    value: '14',
    change: '-12.3%',
    trend: 'down',
    sparklineData: 'M0 5 Q 30 40, 60 20 T 100 35',
  },
  {
    label: 'Compliance Rate',
    value: '92%',
    change: '+4.0%',
    trend: 'up',
    sparklineData: 'M0 35 Q 20 5, 50 25 T 100 5',
  },
];

export const reviews: Review[] = [
  {
    id: '1',
    title: 'Global Logistics Master Services Agreement',
    uuid: '9482-LEX-PRIME',
    type: 'MSA / MASTER',
    status: 'Needs Review',
    risk: 74,
    latency: '00:02:14',
  },
  {
    id: '2',
    title: 'Acme Corp Lease Amendment V2',
    uuid: '1102-LEX-CORE',
    type: 'LEASE / ADDENDUM',
    status: 'Processing',
    risk: 12,
    latency: '00:15:33',
  },
  {
    id: '3',
    title: 'Partner Referral Program NDA',
    uuid: '4492-LEX-SAFE',
    type: 'NDA / PRIVACY',
    status: 'Approved',
    risk: 0,
    latency: '01:04:12',
  },
];

export const riskDistribution: RiskData[] = [
  { label: 'High Risk', value: 42, color: '#FF7043', rawCount: 24 },
  { label: 'Moderate', value: 33, color: '#475569', rawCount: 33 },
  { label: 'Advisory', value: 25, color: '#B8860B', rawCount: 12 },
];

export const dashboardRightColumnData = {
  riskTaxonomy: [
    { category: "Indemnity", value: 45, color: "#FF7043" },
    { category: "Liability Caps", value: 35, color: "#FDBA74" },
    { category: "Termination", value: 20, color: "#475569" }
  ],
  recentChats: [
    { id: "1", doc: "Global Logistics MSA", time: "10 mins ago" },
    { id: "2", doc: "Acme Corp Lease V2", time: "1 hour ago" }
  ],
  agentTelemetry: [
    { agent: "Risk Analyst", action: "Flagged 2 high-risk clauses in Global Logistics MSA", status: "complete", time: "Just now" },
    { agent: "Structure Analyst", action: "Mapping definitions in Acme Corp Lease", status: "processing", time: "2m ago" },
    { agent: "Compliance Engine", action: "Verified EU Data Privacy thresholds", status: "complete", time: "15m ago" }
  ]
};

export const complianceAuditData = {
  regulatoryAlignment: [
    { framework: "GDPR (EU Data Privacy)", status: "Compliant", coverage: 98 },
    { framework: "CCPA (CA Privacy)", status: "Needs Review", coverage: 74 },
    { framework: "SOC 2 Type II", status: "Compliant", coverage: 100 }
  ],
  liabilityExposure: {
    criticalCount: 4,
    contracts: ["Acme Corp Lease V2", "Global Logistics MSA", "TechFlow NDA", "Apex Services"]
  },
  clauseDeviations: [
    { clause: "Governing Law (Delaware)", frequency: "42%" },
    { clause: "Payment Terms (Net-30)", frequency: "38%" },
    { clause: "Auto-Renewal", frequency: "21%" }
  ]
};
