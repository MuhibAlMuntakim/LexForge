const DEFAULT_API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

const API_BASE_FALLBACK_URL = "http://127.0.0.1:8001/api/v1";
const API_BASE_URLS = Array.from(
  new Set([API_BASE_URL, API_BASE_FALLBACK_URL].filter(Boolean))
);
const API_KEY = (import.meta.env.VITE_API_KEY || "").trim();

export type RiskLevel = "low" | "medium" | "high";

export interface Violation {
  clause: string;
  issue: string;
  severity: RiskLevel;
  policy: string;
  original_clause: string;
}

export interface AiObservation {
  risk: string;
  severity: string;
  explanation: string;
}

export interface RedlineSuggestion {
  violation?: string;
  original_clause: string;
  suggested_redline?: string;
  rationale: string;
}

export interface ReviewResponse {
  contract_id: string;
  company_id: string;
  timestamp: string;
  duration_seconds: number;
  stage_timings?: Record<string, number>;
  summary: string;
  risk_assessment: {
    risk_score: number;
    risk_level: string;
    violation_counts: Record<string, number>;
  };
  violations: Violation[];
  ai_observations: AiObservation[];
  redlines: RedlineSuggestion[];
  playbook_id?: string;
  playbook_name?: string;
  key_terms?: Record<string, unknown>;
  document_text?: string;
  accepted_redline_indexes?: number[];
  rejected_redline_indexes?: number[];
  revised_document?: string;
  negotiation_status?: string;
  negotiation_queue_at?: string;
}

export interface ContractHistoryItem {
  contract_id: string;
  company_id: string;
  timestamp: string;
}

export interface ContractSummaryItem {
  contract_id: string;
  company_id: string;
  timestamp: string;
  risk_score: number;
  risk_level: RiskLevel | string;
  violations: number;
  negotiation_status: string;
}

export interface ContractDeleteResponse {
  deleted: boolean;
  contract_id: string;
  permanent: boolean;
}

export interface DeletedContractItem {
  contract_id: string;
  company_id: string;
  timestamp: string;
  deleted_at: string;
  risk_score: number;
  risk_level: RiskLevel | string;
  negotiation_status: string;
}

export interface ContractRestoreResponse {
  restored: boolean;
  contract_id: string;
}

export interface ChatCitation {
  chunk_id: string;
  doc_id?: string;
  filename?: string;
  contract_id?: string;
  score?: number;
  excerpt: string;
}

export interface ChatQueryResponse {
  question: string;
  answer: string;
  citations: ChatCitation[];
  grounded: boolean;
}

export interface DashboardMetricsResponse {
  pending_tasks: number;
  hours_saved: number;
  avg_portfolio_risk: number;
  mitigation_rate: number;
  portfolio_health: { low: number; medium: number; high: number };
  top_weaknesses: Array<{ category: string; count: number }>;
  attention_required: Array<{
    id: string;
    vendor: string;
    risk_score: number;
    risk_level: string;
    status: string;
    updated: string;
  }>;
}

export interface AnalyticsMetricsResponse {
  risk_distribution: Array<{ name: string; value: number }>;
  violation_frequency: Array<{ type: string; count: number }>;
  vendor_risk_rankings: Array<{ vendor: string; score: number }>;
  contract_volume: Array<{ month: string; count: number }>;
}

export interface RedlineAcceptRequest {
  accepted: boolean;
}

export interface RedlineAcceptResponse {
  contract_id: string;
  redline_index: number;
  accepted: boolean;
  accepted_redline_indexes: number[];
  rejected_redline_indexes: number[];
  negotiation_status: string;
  revised_document: string;
  risk_assessment?: {
    risk_score: number;
    risk_level: string;
    violation_counts: Record<string, number>;
  };
}

export type RedlineDecision = "accept" | "reject" | "clear";

export type RevisedDownloadFormat = "docx" | "txt";

export interface RedlineSuggestionUpdateResponse {
  contract_id: string;
  redline_index: number;
  suggested_redline: string;
  revised_document?: string;
}

export interface NegotiationItem {
  id: string;
  vendor: string;
  contract: string;
  status: string;
  issues: number;
  last_activity: string;
}

export interface NegotiationStatusUpdateResponse {
  contract_id: string;
  negotiation_status: string;
  updated_at: string;
}

export interface PlaybookRule {
  clause: string;
  attribute?: string;
  expected?: string | number | boolean | null;
  allowed?: Array<string | number | boolean>;
  preferred?: Array<string | number | boolean>;
  disallowed_overlap?: Array<string | number | boolean>;
  forbidden_values?: Array<string | number | boolean>;
  max_val?: number;
  min_val?: number;
  policy: string;
  severity: "high" | "medium" | "low";
  required?: boolean;
  type?: string;
  template?: string;
}

export interface PlaybookResponse {
  playbook_id: string;
  name: string;
  description?: string;
  company_id: string;
  is_default: boolean;
  playbook_version: string;
  rules: PlaybookRule[];
  rule_count: number;
  created_at: string;
  updated_at: string;
}

export interface PlaybookCreateRequest {
  name: string;
  description?: string;
  playbook_version?: string;
  rules: PlaybookRule[];
}

export interface PlaybookUpdateRequest {
  name?: string;
  description?: string;
  playbook_version?: string;
  rules?: PlaybookRule[];
}

const parseJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized: set VITE_API_KEY in frontend env and restart dev server.");
    }
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const externalSignal = init.signal;
  const onExternalAbort = () => controller.abort();

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", onExternalAbort);
    }
  }

  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { signal: _ignoredSignal, ...rest } = init;
    return await fetch(input, { ...rest, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      if (externalSignal?.aborted) {
        throw new Error("Review canceled by user.");
      }
      throw new Error("Request timed out. Please check backend status and try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }
};

const fetchApi = async (
  path: string,
  init: RequestInit = {},
  timeoutMs = 12000,
  retryOnNotFound = false
): Promise<Response> => {
  let lastError: unknown = null;
  let notFoundCount = 0;

  for (const baseUrl of API_BASE_URLS) {
    const url = `${baseUrl}${path}`;
    try {
      const mergedHeaders = new Headers(init.headers || {});
      if (API_KEY) {
        mergedHeaders.set("X-API-Key", API_KEY);
      }
      const response = await fetchWithTimeout(url, { ...init, headers: mergedHeaders }, timeoutMs);
      // Retry another backend only for server-side failures.
      if (response.status >= 500 && response.status <= 599) {
        lastError = new Error(`Server error ${response.status} from ${baseUrl}`);
        continue;
      }
      if (retryOnNotFound && response.status === 404) {
        notFoundCount += 1;
        lastError = new Error(`Not found from ${baseUrl}`);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  if (retryOnNotFound && notFoundCount === API_BASE_URLS.length) {
    throw new Error(
      "Playbooks API routes are not available on active backend instances. Restart backend so the latest routes are loaded."
    );
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to reach backend API endpoints.");
};

const parseDownloadFilename = (contentDisposition: string | null, fallback: string): string => {
  if (!contentDisposition) return fallback;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).replace(/"/g, "").trim() || fallback;
    } catch {
      return utf8Match[1].replace(/"/g, "").trim() || fallback;
    }
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1].trim() || fallback;
  }

  const plainMatch = contentDisposition.match(/filename=([^;]+)/i);
  if (plainMatch?.[1]) {
    return plainMatch[1].replace(/"/g, "").trim() || fallback;
  }

  return fallback;
};

export const getHistory = async (): Promise<ContractHistoryItem[]> => {
  const response = await fetchApi(`/history`, {}, 120000);
  return parseJson<ContractHistoryItem[]>(response);
};

export const getContractSummaries = async (
  timeframe: "24h" | "7d" | "30d" | "365d" | "all" = "all"
): Promise<ContractSummaryItem[]> => {
  const response = await fetchApi(`/contracts/summaries?timeframe=${encodeURIComponent(timeframe)}`, {}, 120000);
  return parseJson<ContractSummaryItem[]>(response);
};

export const getContract = async (contractId: string): Promise<ReviewResponse> => {
  const response = await fetchApi(`/contracts/${contractId}`, {}, 120000);
  return parseJson<ReviewResponse>(response);
};

export const deleteContract = async (
  contractId: string,
  permanent = false
): Promise<ContractDeleteResponse> => {
  const response = await fetchApi(
    `/contracts/${encodeURIComponent(contractId)}?permanent=${permanent ? "true" : "false"}`,
    {
      method: "DELETE",
    },
    120000
  );
  return parseJson<ContractDeleteResponse>(response);
};

export const getDeletedContracts = async (limit = 5): Promise<DeletedContractItem[]> => {
  const response = await fetchApi(`/contracts/deleted?limit=${limit}`, {}, 120000);
  return parseJson<DeletedContractItem[]>(response);
};

export const restoreDeletedContract = async (contractId: string): Promise<ContractRestoreResponse> => {
  const response = await fetchApi(
    `/contracts/${encodeURIComponent(contractId)}/restore`,
    {
      method: "POST",
    },
    120000
  );
  return parseJson<ContractRestoreResponse>(response);
};

export const analyzeContract = async (
  file: File,
  companyId: string,
  playbookId?: string,
  signal?: AbortSignal
): Promise<ReviewResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const query = new URLSearchParams({ company_id: companyId });
  if (playbookId) {
    query.set("playbook_id", playbookId);
  }

  const response = await fetchApi(
    `/contracts/analyze?${query.toString()}`,
    {
      method: "POST",
      body: formData,
      signal,
    },
    300000
  );

  return parseJson<ReviewResponse>(response);
};

export const indexChatDocument = async (
  file: File,
  companyId: string,
  contractId?: string
): Promise<{ doc_id: string; chunk_count: number }> => {
  const formData = new FormData();
  formData.append("file", file);

  const query = new URLSearchParams({ company_id: companyId });
  if (contractId) {
    query.set("contract_id", contractId);
  }

  const response = await fetchApi(`/chat/docs/upload?${query.toString()}`, {
    method: "POST",
    body: formData,
  });

  return parseJson<{ doc_id: string; chunk_count: number }>(response);
};

export const queryContractChat = async (payload: {
  question: string;
  company_id: string;
  contract_id?: string;
  top_k?: number;
  chat_history?: Array<{ role: string; content: string }>;
}): Promise<ChatQueryResponse> => {
  const response = await fetchApi(`/chat/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, 120000);

  return parseJson<ChatQueryResponse>(response);
};

export const getDashboardMetrics = async (
  timeframe: "24h" | "7d" | "30d" | "365d" | "all" = "all"
): Promise<DashboardMetricsResponse> => {
  const response = await fetchApi(`/metrics/dashboard?timeframe=${encodeURIComponent(timeframe)}`, {}, 15000);
  return parseJson<DashboardMetricsResponse>(response);
};

export const getAnalyticsMetrics = async (
  timeframe: "24h" | "7d" | "30d" | "365d" | "all" = "all"
): Promise<AnalyticsMetricsResponse> => {
  const response = await fetchApi(`/metrics/analytics?timeframe=${encodeURIComponent(timeframe)}`, {}, 15000);
  return parseJson<AnalyticsMetricsResponse>(response);
};

export const getNegotiationsMetrics = async (
  timeframe: "24h" | "7d" | "30d" | "365d" | "all" = "all"
): Promise<NegotiationItem[]> => {
  const response = await fetchApi(`/metrics/negotiations?timeframe=${encodeURIComponent(timeframe)}`, {}, 15000);
  return parseJson<NegotiationItem[]>(response);
};

export const updateNegotiationStatus = async (
  contractId: string,
  negotiationStatus: "pending" | "reviewed" | "negotiating" | "approved"
): Promise<NegotiationStatusUpdateResponse> => {
  const response = await fetchApi(`/contracts/${contractId}/negotiation-status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ negotiation_status: negotiationStatus }),
  });

  return parseJson<NegotiationStatusUpdateResponse>(response);
};

export const acceptRedline = async (
  contractId: string,
  redlineIndex: number,
  decision: RedlineDecision
): Promise<RedlineAcceptResponse> => {
  const response = await fetchApi(
    `/contracts/${contractId}/redlines/${redlineIndex}/accept`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    },
    30000
  );
  return parseJson<RedlineAcceptResponse>(response);
};

export const updateRedlineSuggestion = async (
  contractId: string,
  redlineIndex: number,
  suggestedRedline: string
): Promise<RedlineSuggestionUpdateResponse> => {
  const response = await fetchApi(
    `/contracts/${contractId}/redlines/${redlineIndex}/suggestion`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggested_redline: suggestedRedline }),
    },
    30000
  );

  return parseJson<RedlineSuggestionUpdateResponse>(response);
};

export const downloadRevisedContract = async (
  contractId: string,
  format: RevisedDownloadFormat = "docx"
): Promise<{ blob: Blob; filename: string }> => {
  const response = await fetchApi(
    `/contracts/${encodeURIComponent(contractId)}/download?format=${encodeURIComponent(format)}`,
    {},
    15000
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to download revised document (${response.status})`);
  }

  const blob = await response.blob();
  const fallback = `${contractId}_revised.${format}`;
  const filename = parseDownloadFilename(response.headers.get("content-disposition"), fallback);

  return { blob, filename };
};

export const listPlaybooks = async (companyId: string): Promise<PlaybookResponse[]> => {
  const response = await fetchApi(
    `/playbooks?company_id=${encodeURIComponent(companyId)}`,
    {},
    120000,
    true
  );
  return parseJson<PlaybookResponse[]>(response);
};

export const getPlaybook = async (
  companyId: string,
  playbookId: string
): Promise<PlaybookResponse> => {
  const response = await fetchApi(
    `/playbooks/${encodeURIComponent(playbookId)}?company_id=${encodeURIComponent(companyId)}`,
    {},
    120000,
    true
  );
  return parseJson<PlaybookResponse>(response);
};

export const createPlaybook = async (
  companyId: string,
  payload: PlaybookCreateRequest
): Promise<PlaybookResponse> => {
  const response = await fetchApi(
    `/playbooks?company_id=${encodeURIComponent(companyId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    120000,
    true
  );
  return parseJson<PlaybookResponse>(response);
};

export const updatePlaybook = async (
  companyId: string,
  playbookId: string,
  payload: PlaybookUpdateRequest
): Promise<PlaybookResponse> => {
  const response = await fetchApi(
    `/playbooks/${encodeURIComponent(playbookId)}?company_id=${encodeURIComponent(companyId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    120000,
    true
  );
  return parseJson<PlaybookResponse>(response);
};

export const deletePlaybook = async (companyId: string, playbookId: string): Promise<void> => {
  const response = await fetchApi(
    `/playbooks/${encodeURIComponent(playbookId)}?company_id=${encodeURIComponent(companyId)}`,
    {
      method: "DELETE",
    },
    120000,
    true
  );
  await parseJson<{ deleted: boolean }>(response);
};
