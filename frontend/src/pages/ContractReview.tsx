import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Flag,
  Scale,
  Send,
  ShieldAlert,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RiskBadge from "@/components/shared/RiskBadge";
import { cn } from "@/lib/utils";
import {
  acceptRedline,
  downloadRevisedContract,
  getContract,
  queryContractChat,
  RedlineSuggestion,
  ReviewResponse,
  updateNegotiationStatus,
  updateRedlineSuggestion,
  Violation,
} from "@/lib/api";
import { toast } from "@/components/ui/sonner";

type RiskBand = "high" | "medium" | "low" | "informational";

type ReviewRedline = RedlineSuggestion & {
  suggested_clause?: string;
  reason?: string;
};

type SectionBlock = {
  id: string;
  title: string;
  text: string;
  risk: RiskBand;
  relatedViolationIndexes: number[];
  relatedRedlineIndexes: number[];
};

type DocVersion = "original" | "revised";

type DocumentHighlight = {
  start: number;
  end: number;
  className: string;
  anchorId: string;
};

type InlineAcceptedDiff = {
  start: number;
  end: number;
  anchorId: string;
  original: string;
  suggested: string;
};

const PENDING_REVIEW_KEY = "pending_review_contract_ids";

const clearPendingReview = (contractId: string) => {
  if (!contractId) return;
  try {
    const raw = localStorage.getItem(PENDING_REVIEW_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const next = parsed.filter((id) => String(id) !== contractId);
    localStorage.setItem(PENDING_REVIEW_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
};

const hasPendingReview = (contractId: string): boolean => {
  if (!contractId) return false;
  try {
    const raw = localStorage.getItem(PENDING_REVIEW_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;
    return parsed.some((id) => String(id) === contractId);
  } catch {
    return false;
  }
};

const riskWeight: Record<RiskBand, number> = {
  informational: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const riskCardClass: Record<RiskBand, string> = {
  high: "border-l-destructive bg-destructive/[0.06]",
  medium: "border-l-yellow-500 bg-yellow-500/[0.07]",
  low: "border-l-success bg-success/[0.08]",
  informational: "border-l-primary/40 bg-primary/[0.04]",
};

const toRiskLevel = (value: string): "low" | "medium" | "high" => {
  const normalized = (value || "").toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "medium";
};

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();

const normalizeClauseKey = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const titleFromKey = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const looksLikeHeading = (value: string) => {
  if (value.length > 100) return false;
  if (/^section\s+\d+/i.test(value)) return true;
  if (/^\d+(\.\d+)*[).]?\s+/.test(value)) return true;
  const alpha = value.replace(/[^A-Za-z\s]/g, "");
  return alpha.length >= 5 && alpha === alpha.toUpperCase();
};

const splitDocumentIntoSections = (docText: string): Array<{ title: string; text: string }> => {
  const blocks = docText
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return [];
  }

  const sections: Array<{ title: string; text: string }> = [];
  let currentTitle = "Opening Terms";
  let currentParts: string[] = [];

  const flush = () => {
    if (!currentParts.length) return;
    sections.push({ title: currentTitle, text: currentParts.join("\n\n").trim() });
    currentParts = [];
  };

  blocks.forEach((part) => {
    const heading = looksLikeHeading(part);

    if (heading && currentParts.length) {
      flush();
      currentTitle = titleFromKey(part);
      return;
    }

    if (heading && !currentParts.length) {
      currentTitle = titleFromKey(part);
      return;
    }

    const projected = (currentParts.join("\n\n") + "\n\n" + part).length;
    if (projected > 1700 && currentParts.length) {
      flush();
      currentTitle = sections.length ? `Section ${sections.length + 1}` : currentTitle;
    }

    currentParts.push(part);
  });

  flush();

  if (!sections.length) {
    return [{ title: "Full Contract", text: docText }];
  }

  return sections;
};

const pickHighestRisk = (levels: RiskBand[]): RiskBand =>
  levels.reduce((acc, current) => (riskWeight[current] > riskWeight[acc] ? current : acc), "informational");

const buildCompactDiff = (original: string, suggested: string) => {
  const src = original || "";
  const dst = suggested || "";

  if (!src && !dst) {
    return { before: "", removed: "", added: "", after: "" };
  }

  if (src === dst) {
    return { before: src, removed: "", added: "", after: "" };
  }

  let start = 0;
  while (start < src.length && start < dst.length && src[start] === dst[start]) {
    start += 1;
  }

  let srcEnd = src.length - 1;
  let dstEnd = dst.length - 1;
  while (srcEnd >= start && dstEnd >= start && src[srcEnd] === dst[dstEnd]) {
    srcEnd -= 1;
    dstEnd -= 1;
  }

  const beforeRaw = src.slice(0, start);
  const removed = src.slice(start, srcEnd + 1);
  const added = dst.slice(start, dstEnd + 1);
  const afterRaw = src.slice(srcEnd + 1);

  const before = beforeRaw.length > 80 ? `...${beforeRaw.slice(-80)}` : beforeRaw;
  const after = afterRaw.length > 80 ? `${afterRaw.slice(0, 80)}...` : afterRaw;

  return { before, removed, added, after };
};

const applyRedlineLocally = (documentText: string, original: string, suggested: string): string => {
  const source = String(documentText || "");
  const from = String(original || "").trim();
  const to = String(suggested || "").trim();

  if (!source || !from || !to) return source;

  if (source.includes(from)) {
    return source.replace(from, to);
  }

  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ciRegex = new RegExp(escaped, "i");
  if (ciRegex.test(source)) {
    return source.replace(ciRegex, to);
  }

  const flexiblePattern = from
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");

  if (!flexiblePattern) return source;

  const flexibleRegex = new RegExp(flexiblePattern, "i");
  if (flexibleRegex.test(source)) {
    return source.replace(flexibleRegex, to);
  }

  return `${source}\n\n[Accepted Revisions Pending Exact Placement]\n- Original: ${from}\n+ Suggested: ${to}`;
};

const isNoEvidenceChatResponse = (text: string): boolean => {
  const normalized = String(text || "").trim().toLowerCase();
  return normalized.includes("could not find enough evidence in the indexed documents");
};

const sanitizeRefinedSuggestion = (value: string): string => {
  let cleaned = String(value || "").trim();
  if (!cleaned) return "";

  cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "");
  cleaned = cleaned.replace(/\s*```$/, "");
  cleaned = cleaned.replace(/\n\s*(source|sources|citation|citations)\s*:[\s\S]*$/i, "");
  cleaned = cleaned.replace(/\s+(source|sources|citation|citations)\s*:\s*.*$/i, "");
  cleaned = cleaned.replace(/\s*(?:\(|\[)?\s*chunks?\s*\d+(?:\s*[-,]\s*\d+)*(?:\)|\])?\s*$/i, "");
  cleaned = cleaned.replace(/\s*\((?:chunk|chunks)\s*\d+(?:\s*[-,]\s*\d+)*\)\s*$/i, "");
  cleaned = cleaned.replace(/\n+\s*(?:\(|\[)?\s*(redline|chunk|remaining\s+violations?|executive\s+summary)\b[\s\S]*$/i, "");
  cleaned = cleaned.replace(/\s+(?:\(|\[)\s*(redline|chunk|remaining\s+violations?|executive\s+summary)\b[\s\S]*$/i, "");

  return cleaned.trim().replace(/^['"]+|['"]+$/g, "").trim();
};

const getRedlineSuggestionText = (redline: ReviewRedline, fallback = ""): string => {
  const raw = String(redline?.suggested_redline || redline?.suggested_clause || fallback || "");
  const sanitized = sanitizeRefinedSuggestion(raw);
  return sanitized || fallback;
};

const isPlaceholderSuggestion = (value: string): boolean => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return true;
  return ["null", "none", "n/a", "na", "nil", "undefined", "not available", "not applicable"].includes(normalized);
};

const ContractReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isRevisedDiffView = location.pathname.endsWith("/revised-diff");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<ReviewResponse | null>(null);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [hoverSectionId, setHoverSectionId] = useState<string | null>(null);

  const [acceptedRedlines, setAcceptedRedlines] = useState<Set<number>>(new Set());
  const [rejectedRedlines, setRejectedRedlines] = useState<Set<number>>(new Set());
  const [docVersion, setDocVersion] = useState<DocVersion>("original");
  const [decisionLoadingIndex, setDecisionLoadingIndex] = useState<number | null>(null);
  const [decisionLoadingType, setDecisionLoadingType] = useState<"accept" | "reject" | "clear" | null>(null);
  const [riskUpdatedPulse, setRiskUpdatedPulse] = useState(false);
  const [animatedRiskScore, setAnimatedRiskScore] = useState(0);
  const animatedRiskScoreRef = useRef(0);
  const [refinePrompts, setRefinePrompts] = useState<Record<number, string>>({});
  const [refiningRedlineIndex, setRefiningRedlineIndex] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "assistant" | "user"; content: string }>>([
    {
      role: "assistant",
      content:
        "I can answer questions about the agreement, risks, and suggested edits using contract-aware context.",
    },
  ]);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const clauseAnchorRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  useEffect(() => {
    if (id) {
      clearPendingReview(id);
    }

    const loadContract = async () => {
      if (!id) {
        setError("Missing contract id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        let data = await getContract(id);

        const pendingInLocalQueue = hasPendingReview(id);
        const currentStatus = String(data.negotiation_status || "").toLowerCase();
        const shouldNormalizePending = pendingInLocalQueue || currentStatus === "pending";

        if (shouldNormalizePending) {
          const nextStatus = Number(data.risk_assessment?.risk_score || 0) === 0 ? "negotiating" : "reviewed";
          if (currentStatus !== nextStatus) {
            try {
              await updateNegotiationStatus(id, nextStatus);
              data = { ...data, negotiation_status: nextStatus };
            } catch {
              // If status sync fails, still show the contract view rather than blocking users.
            }
          }
        }

        setContract(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load contract details");
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  }, [id]);

  const allViolations = useMemo<Violation[]>(() => contract?.violations || [], [contract]);
  const redlines = useMemo<ReviewRedline[]>(
    () => (contract?.redlines || []) as ReviewRedline[],
    [contract]
  );

  const resolvedViolationClauses = useMemo(() => {
    const resolved = new Set<string>();
    Array.from(acceptedRedlines).forEach((index) => {
      if (index < 0 || index >= redlines.length) return;
      const clause = normalizeClauseKey(String(redlines[index]?.violation || ""));
      if (clause) {
        resolved.add(clause);
      }
    });
    return resolved;
  }, [acceptedRedlines, redlines]);

  const violations = useMemo(() => {
    if (!resolvedViolationClauses.size) return allViolations;

    return allViolations.filter((violation) => {
      const clause = normalizeClauseKey(String(violation?.clause || ""));
      if (!clause) return true;
      return !resolvedViolationClauses.has(clause);
    });
  }, [allViolations, resolvedViolationClauses]);

  useEffect(() => {
    if (contract?.accepted_redline_indexes) {
      setAcceptedRedlines(new Set(contract.accepted_redline_indexes));
    }
    if (contract?.rejected_redline_indexes) {
      setRejectedRedlines(new Set(contract.rejected_redline_indexes));
    }
  }, [contract]);

  useEffect(() => {
    if (acceptedRedlines.size > 0) {
      setDocVersion("revised");
    }
  }, [acceptedRedlines]);

  useEffect(() => {
    if (!contract) return;

    const target = Number(contract.risk_assessment?.risk_score || 0);
    const start = Number(animatedRiskScoreRef.current || 0);
    if (start === target) return;

    const durationMs = 600;
    const startTs = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTs) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(start + (target - start) * eased);
      animatedRiskScoreRef.current = next;
      setAnimatedRiskScore(next);
      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [contract]);

  const originalDocumentText = useMemo(() => {
    if (!contract) return "";
    return String(contract.document_text || "").trim();
  }, [contract]);

  const revisedDocumentText = useMemo(() => {
    if (!contract) return "";
    return String(contract.revised_document || contract.document_text || "").trim();
  }, [contract]);

  const displayedDocumentText = docVersion === "revised" ? revisedDocumentText : originalDocumentText;

  const inlineAcceptedDiffs = useMemo(() => {
    if (docVersion !== "revised") return [] as InlineAcceptedDiff[];

    const text = revisedDocumentText || "";
    if (!text) return [] as InlineAcceptedDiff[];

    const lowerText = text.toLowerCase();
    const candidates: InlineAcceptedDiff[] = [];

    Array.from(acceptedRedlines)
      .sort((a, b) => a - b)
      .forEach((index) => {
        if (index < 0 || index >= redlines.length) return;
        const redline = redlines[index];
        const original = String(redline.original_clause || "").trim();
        const suggested = getRedlineSuggestionText(redline).trim();
        if (!original || !suggested) return;

        const pos = lowerText.indexOf(suggested.toLowerCase());
        if (pos < 0) return;

        candidates.push({
          start: pos,
          end: pos + suggested.length,
          anchorId: `red-${index}`,
          original,
          suggested,
        });
      });

    candidates.sort((a, b) => a.start - b.start);

    const nonOverlapping: InlineAcceptedDiff[] = [];
    let cursor = -1;
    for (const item of candidates) {
      if (item.start < cursor) continue;
      nonOverlapping.push(item);
      cursor = item.end;
    }

    return nonOverlapping;
  }, [acceptedRedlines, docVersion, redlines, revisedDocumentText]);

  const acceptedDiffs = useMemo(() => {
    const acceptedIndexes = Array.from(acceptedRedlines).sort((a, b) => a - b);
    return acceptedIndexes
      .filter((index) => index >= 0 && index < redlines.length)
      .map((index) => {
        const redline = redlines[index];
        const original = String(redline.original_clause || "").trim();
        const suggested = getRedlineSuggestionText(redline).trim();
        const diff = buildCompactDiff(original, suggested);
        return {
          index,
          title: String(redline.violation || `Suggestion ${index + 1}`),
          original,
          suggested,
          diff,
        };
      })
      .filter((item) => item.original || item.suggested);
  }, [acceptedRedlines, redlines]);

  const documentHighlights = useMemo(() => {
    const text = displayedDocumentText || "";
    if (!text) return [] as DocumentHighlight[];

    const lowerText = text.toLowerCase();
    const candidates: Array<DocumentHighlight & { priority: number }> = [];

    violations.forEach((violation, index) => {
      const clause = String(violation.original_clause || "").trim();
      if (!clause) return;
      const pos = lowerText.indexOf(clause.toLowerCase());
      if (pos < 0) return;

      const severity = toRiskLevel(String(violation.severity || "medium"));
      const className =
        severity === "high"
          ? "bg-destructive/20 ring-1 ring-destructive/30"
          : severity === "medium"
            ? "bg-yellow-500/20 ring-1 ring-yellow-500/30"
            : "bg-success/15 ring-1 ring-success/25";

      candidates.push({
        start: pos,
        end: pos + clause.length,
        className,
        anchorId: `vio-${index}`,
        priority: 1,
      });
    });

    redlines.forEach((redline, index) => {
      const accepted = acceptedRedlines.has(index);
      const base =
        docVersion === "original"
          ? String(redline.original_clause || "").trim()
          : accepted
            ? getRedlineSuggestionText(redline).trim()
            : String(redline.original_clause || "").trim();

      if (!base) return;
      const pos = lowerText.indexOf(base.toLowerCase());
      if (pos < 0) return;

      candidates.push({
        start: pos,
        end: pos + base.length,
        className:
          docVersion === "original" && accepted
            ? "bg-destructive/15 ring-1 ring-destructive/35"
            : "bg-success/25 ring-1 ring-success/40",
        anchorId: `red-${index}`,
        priority: 2,
      });
    });

    candidates.sort((a, b) => (a.start === b.start ? b.priority - a.priority : a.start - b.start));

    const merged: DocumentHighlight[] = [];
    let cursor = -1;
    for (const item of candidates) {
      if (item.start < cursor) {
        continue;
      }
      merged.push({
        start: item.start,
        end: item.end,
        className: item.className,
        anchorId: item.anchorId,
      });
      cursor = item.end;
    }

    return merged;
  }, [acceptedRedlines, displayedDocumentText, docVersion, redlines, violations]);

  const highlightedDocumentNodes = useMemo(() => {
    const text = displayedDocumentText || "";
    if (!text) {
      return [<span key="empty" className="text-muted-foreground">No document text available.</span>];
    }

    if (docVersion === "revised" && inlineAcceptedDiffs.length) {
      const nodes: React.ReactNode[] = [];
      let pointer = 0;

      inlineAcceptedDiffs.forEach((item, index) => {
        if (item.start > pointer) {
          nodes.push(
            <span key={`r-plain-${index}`} className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {text.slice(pointer, item.start)}
            </span>
          );
        }

        nodes.push(
          <span
            key={`r-diff-${index}`}
            ref={(el) => {
              clauseAnchorRefs.current[item.anchorId] = el;
            }}
            className="inline-flex flex-col gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-1 align-middle"
          >
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Accepted Change</span>
            <span className="text-[11px] text-destructive line-through whitespace-pre-wrap">{item.original}</span>
            <span className="text-sm leading-relaxed text-success whitespace-pre-wrap">{item.suggested}</span>
          </span>
        );

        pointer = item.end;
      });

      if (pointer < text.length) {
        nodes.push(
          <span key="r-plain-tail" className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {text.slice(pointer)}
          </span>
        );
      }

      return nodes;
    }

    if (!documentHighlights.length) {
      return [
        <span key="plain" className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {text}
        </span>,
      ];
    }

    const nodes: React.ReactNode[] = [];
    let pointer = 0;

    documentHighlights.forEach((highlight, index) => {
      if (highlight.start > pointer) {
        nodes.push(
          <span key={`plain-${index}`} className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {text.slice(pointer, highlight.start)}
          </span>
        );
      }

      nodes.push(
        <span
          key={`hl-${index}`}
          ref={(el) => {
            clauseAnchorRefs.current[highlight.anchorId] = el;
          }}
          className={cn("whitespace-pre-wrap rounded px-0.5 text-sm leading-relaxed text-foreground/95", highlight.className)}
        >
          {text.slice(highlight.start, highlight.end)}
        </span>
      );

      pointer = highlight.end;
    });

    if (pointer < text.length) {
      nodes.push(
        <span key="plain-tail" className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {text.slice(pointer)}
        </span>
      );
    }

    return nodes;
  }, [displayedDocumentText, docVersion, documentHighlights, inlineAcceptedDiffs]);

  const sections = useMemo(() => {
    if (!contract) return [] as SectionBlock[];

    const rawSections = splitDocumentIntoSections(displayedDocumentText);
    const lowerViolations = violations.map((violation) => ({
      text: normalizeText(String(violation.original_clause || "")),
      risk: toRiskLevel(String(violation.severity || "medium")) as RiskBand,
      clause: String(violation.clause || ""),
    }));

    const lowerRedlines = redlines.map((redline) => ({
      text: normalizeText(String(redline.original_clause || "")),
    }));

    return rawSections.map((section, index) => {
      const sectionLower = normalizeText(section.text);
      const relatedViolationIndexes: number[] = [];
      const relatedRedlineIndexes: number[] = [];
      const localLevels: RiskBand[] = [];

      lowerViolations.forEach((violation, violationIndex) => {
        if (!violation.text) return;
        if (sectionLower.includes(violation.text.slice(0, Math.min(120, violation.text.length)))) {
          relatedViolationIndexes.push(violationIndex);
          localLevels.push(violation.risk);
          return;
        }
        if (violation.clause && normalizeText(section.title).includes(normalizeText(violation.clause))) {
          relatedViolationIndexes.push(violationIndex);
          localLevels.push(violation.risk);
        }
      });

      lowerRedlines.forEach((redline, redlineIndex) => {
        if (!redline.text) return;
        if (sectionLower.includes(redline.text.slice(0, Math.min(90, redline.text.length)))) {
          relatedRedlineIndexes.push(redlineIndex);
        }
      });

      return {
        id: `sec-${index + 1}`,
        title: section.title || `Section ${index + 1}`,
        text: section.text,
        risk: localLevels.length ? pickHighestRisk(localLevels) : "informational",
        relatedViolationIndexes,
        relatedRedlineIndexes,
      };
    });
  }, [contract, displayedDocumentText, redlines, violations]);

  useEffect(() => {
    if (!activeSectionId && sections.length) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  const hoveredSection = useMemo(
    () => sections.find((section) => section.id === hoverSectionId) || null,
    [sections, hoverSectionId]
  );

  const focusSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const element = sectionRefs.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const focusViolation = (index: number) => {
    const element = clauseAnchorRefs.current[`vio-${index}`];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const target = sections.find((section) => section.relatedViolationIndexes.includes(index));
    if (target) {
      focusSection(target.id);
    }
  };

  const focusRedline = (index: number) => {
    const element = clauseAnchorRefs.current[`red-${index}`];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const target = sections.find((section) => section.relatedRedlineIndexes.includes(index));
    if (target) {
      focusSection(target.id);
    }
  };

  const setRedlineDecision = async (index: number, decision: "accept" | "reject" | "clear") => {
    if (!id) return;
    setDecisionLoadingIndex(index);
    setDecisionLoadingType(decision);
    try {
      const response = await acceptRedline(id, index, decision);

      setAcceptedRedlines(new Set(response.accepted_redline_indexes));
      setRejectedRedlines(new Set(response.rejected_redline_indexes));

      if (contract) {
        const previousRiskScore = Number(contract.risk_assessment?.risk_score || 0);
        const redline = redlines[index];
        const previousText = String(contract.revised_document || contract.document_text || "");
        let nextRevisedText = response.revised_document || previousText;

        if (decision === "accept" && redline) {
          const original = String(redline.original_clause || "").trim();
          const suggested = getRedlineSuggestionText(redline).trim();

          if (suggested && !String(nextRevisedText || "").toLowerCase().includes(suggested.toLowerCase())) {
            nextRevisedText = applyRedlineLocally(previousText, original, suggested);
          }
        }

        setContract({
          ...contract,
          revised_document: nextRevisedText,
          risk_assessment: response.risk_assessment || contract.risk_assessment,
          negotiation_status: response.negotiation_status,
          accepted_redline_indexes: response.accepted_redline_indexes,
          rejected_redline_indexes: response.rejected_redline_indexes,
        });

        const nextRiskScore = Number(response.risk_assessment?.risk_score ?? previousRiskScore);
        if (nextRiskScore < previousRiskScore) {
          setRiskUpdatedPulse(true);
          window.setTimeout(() => setRiskUpdatedPulse(false), 1200);
          toast(`Risk score improved: ${previousRiskScore} -> ${nextRiskScore}`);
        }
        if (nextRiskScore === 0 && response.accepted_redline_indexes.length === redlines.length && redlines.length > 0) {
          toast("All fixes applied. Contract risk is now low (0 score).");
        }
      }

      if (decision === "accept") {
        toast("Suggestion accepted and revised document updated");
      } else if (decision === "reject") {
        toast("Suggestion rejected");
      } else {
        toast("Suggestion decision cleared");
      }
    } catch (e) {
      const action = decision === "accept" ? "accept" : decision === "reject" ? "reject" : "clear";
      toast.error(`Failed to ${action} redline: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setDecisionLoadingIndex(null);
      setDecisionLoadingType(null);
    }
  };

  const askAiToRefineSuggestion = async (index: number) => {
    if (!contract || refiningRedlineIndex !== null) return;

    const redline = redlines[index];
    if (!redline) return;

    const prompt = (refinePrompts[index] || "").trim() || "Make this clause concise and customer-friendly while preserving legal clarity.";
    const original = String(redline.original_clause || "");
    const currentSuggestion = getRedlineSuggestionText(redline);
    const rationale = String(redline.rationale || "");

    setRefiningRedlineIndex(index);

    try {
      const question = [
        "Rewrite the suggested contract redline.",
        `Original clause: ${original}`,
        `Current suggested redline: ${currentSuggestion}`,
        `Rationale: ${rationale}`,
        `Instructions: ${prompt}`,
        "Return only the improved replacement clause text.",
      ].join("\n");

      const response = await queryContractChat({
        question,
        company_id: contract.company_id,
        contract_id: contract.contract_id,
        top_k: 4,
      });

      const refined = sanitizeRefinedSuggestion(String(response.answer || ""));
      if (!refined || isPlaceholderSuggestion(refined) || isNoEvidenceChatResponse(refined)) {
        toast("AI did not return a refined suggestion");
        return;
      }

      const updateResponse = await updateRedlineSuggestion(contract.contract_id, index, refined);
      const updatedRedlines = [...redlines];
      updatedRedlines[index] = {
        ...updatedRedlines[index],
        suggested_redline: updateResponse.suggested_redline,
      };

      setContract((prev) =>
        prev
          ? {
              ...prev,
              redlines: updatedRedlines,
              revised_document: updateResponse.revised_document || prev.revised_document,
            }
          : prev
      );

      toast("AI refined the suggestion and updated this redline");
    } catch (e) {
      toast.error(`Could not refine suggestion: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setRefiningRedlineIndex(null);
    }
  };

  const highlightSuggestion = (text: string, redline: ReviewRedline, accepted: boolean) => {
    const original = String(redline.original_clause || "").trim();
    const suggested = getRedlineSuggestionText(redline).trim();
    if (!original || !suggested) return text;

    if (accepted) {
      return text.replace(suggested, `[[GREEN_HIGHLIGHT]]${suggested}[[END_GREEN_HIGHLIGHT]]`);
    }
    if (text.includes(original)) {
      return text.replace(original, `${original}\n\n[[GREEN_HIGHLIGHT]]Suggested: ${suggested}[[END_GREEN_HIGHLIGHT]]`);
    }
    return text;
  };

  const copyRedline = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied suggestion to clipboard");
    } catch {
      toast("Could not copy to clipboard");
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadRevisedDocument = async () => {
    if (!contract) return;

    const content = String(revisedDocumentText || "").trim();
    if (!content) {
      toast("No revised document text available to download yet");
      return;
    }

    try {
      const { blob, filename } = await downloadRevisedContract(contract.contract_id, "docx");
      downloadBlob(blob, filename || `${contract.contract_id}_revised.docx`);
      toast("Revised DOCX downloaded");
      return;
    } catch (docxError) {
      try {
        const { blob, filename } = await downloadRevisedContract(contract.contract_id, "txt");
        downloadBlob(blob, filename || `${contract.contract_id}_revised.txt`);
        toast("DOCX export unavailable, downloaded TXT instead");
        return;
      } catch {
        const message = docxError instanceof Error ? docxError.message : "Unknown download error";
        toast.error(`Failed to download revised document: ${message}`);
      }
    }
  };

  const sendChat = async () => {
    if (!contract || !chatInput.trim() || chatLoading) return;

    const question = chatInput.trim();
    const historyForRequest = [...chatMessages, { role: "user" as const, content: question }];
    setChatInput("");
    setChatMessages(historyForRequest);
    setChatLoading(true);

    try {
      const response = await queryContractChat({
        question,
        company_id: contract.company_id,
        contract_id: contract.contract_id,
        top_k: 6,
        chat_history: historyForRequest.map((message) => ({ role: message.role, content: message.content })),
      });

      const citationSummary = response.citations.length
        ? `\n\nSources:\n${response.citations
            .slice(0, 3)
            .map((citation, idx) => `${idx + 1}. ${citation.filename || citation.chunk_id}`)
            .join("\n")}`
        : "";

      setChatMessages((prev) => [...prev, { role: "assistant", content: `${response.answer}${citationSummary}` }]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Chat failed";
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `I could not answer this right now: ${message}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading contract review...</div>;
  }

  if (error || !contract) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/contracts")} className="gap-2">
          <ArrowLeft size={16} /> Back to Contracts
        </Button>
        <div className="text-sm text-destructive">{error || "Contract not found"}</div>
      </div>
    );
  }

  const riskLevel = toRiskLevel(contract.risk_assessment.risk_level);

  if (isRevisedDiffView) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Revised Document Diff</h1>
            <p className="text-sm text-muted-foreground mt-1">Contract {contract.contract_id.slice(0, 8)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/negotiations")}>Back to Negotiations</Button>
            <Button onClick={() => navigate(`/contracts/${contract.contract_id}`)}>Review Contract</Button>
          </div>
        </div>

        <article className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Full Contract Document</h2>
            <span className="text-xs text-muted-foreground">Inline accepted/reviewed diff highlights</span>
          </div>
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
            {highlightedDocumentNodes}
          </div>
        </article>

        {acceptedDiffs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No accepted revised differences are available for this contract yet.
          </div>
        ) : (
          <div className="space-y-3">
            {acceptedDiffs.map((item) => (
              <div key={`revised-diff-${item.index}`} className="rounded-xl border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground mb-2">{item.title}</div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  <span>{item.diff.before}</span>
                  {item.diff.removed && (
                    <span className="bg-destructive/15 text-destructive px-0.5 rounded">{item.diff.removed}</span>
                  )}
                  {item.diff.added && (
                    <span className="bg-success/20 text-success px-0.5 rounded">{item.diff.added}</span>
                  )}
                  <span>{item.diff.after}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] bg-gradient-to-br from-background via-background to-muted/[0.2] p-4 overflow-y-auto">
      <div className="min-h-full rounded-2xl border border-border bg-card shadow-sm overflow-visible lg:overflow-hidden">
        <div className="grid min-h-full lg:h-full grid-cols-1 lg:grid-cols-[260px_minmax(0,2fr)_minmax(320px,1fr)]">
          <aside className="hidden lg:flex flex-col border-r border-border bg-muted/[0.28]">
            <div className="px-4 py-4 border-b border-border flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/contracts")}> 
                <ArrowLeft size={16} />
              </Button>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Contract ID</div>
                <div className="text-sm font-semibold truncate">{contract.contract_id}</div>
              </div>
            </div>

            <div className="p-4 border-b border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Document Risk</div>
              <RiskBadge level={riskLevel} score={contract.risk_assessment.risk_score} />
              <div className="mt-2 text-xs text-muted-foreground">
                {sections.length} sections • {violations.length} violations
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3 space-y-1.5">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => focusSection(section.id)}
                  className={cn(
                    "w-full rounded-xl border border-transparent px-3 py-2.5 text-left transition-all duration-150",
                    activeSectionId === section.id
                      ? "bg-primary/10 border-primary/20"
                      : "hover:bg-background/80 hover:border-border"
                  )}
                >
                  <div className="text-[11px] text-muted-foreground">Section {index + 1}</div>
                  <div className="text-xs font-medium text-foreground line-clamp-2">{section.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground capitalize">{section.risk}</div>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-w-0 border-r border-border flex flex-col min-h-[60vh] lg:min-h-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/90 backdrop-blur-sm">
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate">Contract Viewer</h2>
                <p className="text-xs text-muted-foreground truncate">
                  Full parsed document view (TXT / PDF / DOCX), synchronized with AI findings
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {contract.revised_document ? "Showing revised document" : "Showing original parsed document"}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-visible lg:overflow-auto px-5 py-4 space-y-4 scroll-smooth">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} className="text-primary" />
                  <h3 className="text-sm font-semibold">Executive Summary</h3>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{contract.summary}</p>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={docVersion === "original" ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => setDocVersion("original")}
                  >
                    Original Document
                  </Button>
                  <Button
                    size="sm"
                    variant={docVersion === "revised" ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => setDocVersion("revised")}
                    disabled={!revisedDocumentText}
                  >
                    Revised Document
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    {acceptedRedlines.size} accepted • {rejectedRedlines.size} rejected
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs ml-auto"
                    onClick={downloadRevisedDocument}
                    disabled={!revisedDocumentText}
                  >
                    <Download size={12} className="mr-1" /> Download Revised
                  </Button>
                </div>
              </div>

              {sections.length === 0 && (
                <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                  No parsed document text available for this contract.
                </div>
              )}

              <article className="border border-border rounded-xl p-4 bg-background">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Full Document View</h3>
                  <span className="text-[11px] text-muted-foreground">
                    Highlights: risk clauses + suggested revisions
                  </span>
                </div>
                <div className="whitespace-pre-wrap break-words">{highlightedDocumentNodes}</div>
              </article>

              {docVersion === "original" && acceptedDiffs.length > 0 && (
                <article className="border border-border rounded-xl p-4 bg-background space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Accepted Changes (Original to Revised)</h3>
                    <span className="text-[11px] text-muted-foreground">Visual diff for accepted suggestions</span>
                  </div>
                  {acceptedDiffs.map((item) => (
                    <button
                      key={`accepted-diff-${item.index}`}
                      onClick={() => focusRedline(item.index)}
                      className="w-full text-left rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="text-xs font-semibold text-primary mb-1">{item.title}</div>
                      <div className="text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/85">
                        <span>{item.diff.before}</span>
                        {item.diff.removed && (
                          <span className="bg-destructive/15 text-destructive px-0.5 rounded">{item.diff.removed}</span>
                        )}
                        {item.diff.added && (
                          <span className="bg-success/20 text-success px-0.5 rounded">{item.diff.added}</span>
                        )}
                        <span>{item.diff.after}</span>
                      </div>
                    </button>
                  ))}
                </article>
              )}

              {hoveredSection && (
                <div className="sticky bottom-3 ml-auto w-full max-w-md rounded-xl border border-border bg-card/95 p-3 shadow-md backdrop-blur-sm">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Section Preview</div>
                  <div className="text-sm font-semibold line-clamp-1">{hoveredSection.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{hoveredSection.text}</div>
                </div>
              )}
            </div>
          </section>

          <aside className="min-h-[60vh] lg:min-h-0 flex flex-col bg-muted/[0.16]">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert size={15} className="text-primary" />
                <h3 className="text-sm font-semibold">Risk Summary</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className={cn("rounded-lg border border-border bg-background p-2.5 transition-all", riskUpdatedPulse && "ring-2 ring-success/40 bg-success/5") }>
                  <div className="text-[11px] text-muted-foreground">Score</div>
                  <div className="text-lg font-semibold tabular-nums">{animatedRiskScore}</div>
                </div>
                <div className={cn("rounded-lg border border-border bg-background p-2.5 transition-all", riskUpdatedPulse && "ring-2 ring-success/40 bg-success/5") }>
                  <div className="text-[11px] text-muted-foreground">Level</div>
                  <div className="text-sm font-semibold capitalize">{contract.risk_assessment.risk_level}</div>
                </div>
                <div className="rounded-lg border border-border bg-background p-2.5">
                  <div className="text-[11px] text-muted-foreground">Violations</div>
                  <div className="text-lg font-semibold">{violations.length}</div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-visible lg:overflow-auto">
              <div className="p-4 border-b border-border">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Flag size={14} className="text-primary" /> Playbook Violations
                </h4>
                <div className="space-y-2">
                  {violations.length === 0 && <div className="text-xs text-muted-foreground">No violations found.</div>}
                  {violations.map((violation, index) => (
                    <button
                      key={`${violation.clause || "violation"}-${index}`}
                      onClick={() => focusViolation(index)}
                      className="w-full rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-muted"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold line-clamp-1">
                          {titleFromKey(String(violation.clause || `Violation ${index + 1}`))}
                        </span>
                        <RiskBadge level={toRiskLevel(String(violation.severity || "medium"))} />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {String(violation.issue || "No details")}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 border-b border-border">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Scale size={14} className="text-primary" /> Redline Suggestions
                </h4>
                <div className="space-y-3">
                  {redlines.length === 0 && <div className="text-xs text-muted-foreground">No redlines generated.</div>}
                  {redlines.map((redline, index) => {
                    const original = String(redline.original_clause || "No original clause provided");
                    const suggested = getRedlineSuggestionText(redline, "No suggested redline available");
                    const rationale = String(redline.rationale || redline.reason || "No rationale available");
                    const accepted = acceptedRedlines.has(index);
                    const rejected = rejectedRedlines.has(index);
                    const diff = buildCompactDiff(original, suggested);

                    return (
                      <div
                        key={`redline-${index}`}
                        className={cn(
                          "rounded-xl border bg-background p-3",
                          accepted ? "border-success/40" : rejected ? "border-destructive/40" : "border-border"
                        )}
                      >
                        <button
                          onClick={() => focusRedline(index)}
                          className="text-xs font-semibold text-primary text-left mb-2 hover:underline"
                        >
                          {String(redline.violation || `Suggestion ${index + 1}`)}
                        </button>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-1">Original: {original}</p>
                        <p className="text-[11px] text-success line-clamp-2 mb-1">Suggested: {suggested}</p>
                        <div className="mb-2 rounded-lg border border-border bg-muted/20 p-2">
                          <div className="text-[11px] font-medium text-foreground mb-1">Diff Preview</div>
                          <div className="text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/85">
                            <span>{diff.before}</span>
                            {diff.removed && <span className="bg-destructive/15 text-destructive px-0.5 rounded">{diff.removed}</span>}
                            {diff.added && <span className="bg-success/20 text-success px-0.5 rounded">{diff.added}</span>}
                            <span>{diff.after}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{rationale}</p>

                        <div className="mt-2 space-y-2">
                          <Input
                            value={refinePrompts[index] || ""}
                            onChange={(event) =>
                              setRefinePrompts((prev) => ({
                                ...prev,
                                [index]: event.target.value,
                              }))
                            }
                            placeholder="Tell AI how to refine this suggestion"
                            className="h-8 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => askAiToRefineSuggestion(index)}
                            disabled={refiningRedlineIndex !== null}
                          >
                            {refiningRedlineIndex === index ? "Refining..." : "Refine With AI"}
                          </Button>
                        </div>

                        <div className="mt-2.5 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={accepted ? "outline" : "default"}
                            className="h-7 text-xs"
                            onClick={() => setRedlineDecision(index, accepted ? "clear" : "accept")}
                            disabled={decisionLoadingIndex !== null}
                          >
                            <CheckCircle2 size={12} className="mr-1" />
                            {decisionLoadingIndex === index && decisionLoadingType === (accepted ? "clear" : "accept")
                              ? "Applying..."
                              : accepted
                                ? "Accepted"
                                : "Accept"}
                          </Button>
                          <Button
                            size="sm"
                            variant={rejected ? "outline" : "destructive"}
                            className="h-7 text-xs"
                            onClick={() => setRedlineDecision(index, rejected ? "clear" : "reject")}
                            disabled={decisionLoadingIndex !== null}
                          >
                            {decisionLoadingIndex === index && decisionLoadingType === (rejected ? "clear" : "reject")
                              ? "Applying..."
                              : rejected
                                ? "Rejected"
                                : "Reject"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => copyRedline(suggested)}
                          >
                            <Copy size={12} className="mr-1" /> Copy
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Bot size={14} className="text-primary" /> Ask AI About This Contract
                </h4>

                <div className="rounded-xl border border-border bg-background p-2.5 h-[270px] overflow-auto space-y-2">
                  {chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        "rounded-lg p-2.5 text-xs leading-relaxed whitespace-pre-line flex gap-2",
                        message.role === "assistant"
                          ? "bg-muted/35 border border-border"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      <span className="mt-0.5 shrink-0">{message.role === "assistant" ? <Bot size={12} /> : <User size={12} />}</span>
                      <span>{message.content}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <Input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && sendChat()}
                    placeholder="Ask a contract question..."
                    className="h-9 text-xs"
                  />
                  <Button size="icon" className="h-9 w-9" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
                    <Send size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ContractReview;
