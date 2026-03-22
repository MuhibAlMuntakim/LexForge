import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGlobalContext } from "@/contexts/GlobalContext";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import RiskBadge from "@/components/shared/RiskBadge";
import StatusBadge from "@/components/shared/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import {
  analyzeContract,
  deleteContract,
  getContractSummaries,
  getDeletedContracts,
  listPlaybooks,
  PlaybookResponse,
  restoreDeletedContract,
  RiskLevel,
  type DeletedContractItem,
} from "@/lib/api";
import type { Status } from "@/components/shared/StatusBadge";

type ContractRow = {
  id: string;
  vendor: string;
  name: string;
  risk: number;
  riskLevel: RiskLevel;
  violations: number;
  status: Status;
  updatedAt: string;
  updated: string;
};

const PLAYBOOK_PREF_KEY = "preferred_playbook_by_company";
const PENDING_REVIEW_KEY = "pending_review_contract_ids";
const REVIEW_PROGRESS_KEY = "active_contract_review";
const DELETE_UNDO_MS = 6000;

type ReviewCompleteState = {
  contractId: string;
  companyId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  violationCount: number;
};

type ActiveReviewState = {
  reviewId: string;
  fileName: string;
  companyId: string;
  startedAt: number;
  source: "contracts" | "header";
};

type PendingDeleteEntry = {
  row: ContractRow;
  wasPending: boolean;
  timeoutId: number;
};

type DeleteIntent = {
  contractId: string;
  mode: "soft" | "permanent";
};

const formatElapsed = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
};

const toReviewErrorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : "Unknown error";
  const normalized = raw.toLowerCase();

  if (normalized.includes("timed out") || normalized.includes("timeout")) {
    return "AI review is taking longer than expected. Please keep backend running and retry in a few seconds.";
  }
  if (normalized.includes("failed to fetch") || normalized.includes("network") || normalized.includes("urlopen")) {
    return "Could not reach the backend during AI review. Verify a single backend instance is running on port 8000, then retry.";
  }

  return raw;
};

const isBackendBusyError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();
  return (
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("urlopen")
  );
};

const getPreferredPlaybook = (company: string): string | null => {
  try {
    const raw = localStorage.getItem(PLAYBOOK_PREF_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[company] || null;
  } catch {
    return null;
  }
};

const setPreferredPlaybook = (company: string, playbookId: string) => {
  try {
    const raw = localStorage.getItem(PLAYBOOK_PREF_KEY);
    const current = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    current[company] = playbookId;
    localStorage.setItem(PLAYBOOK_PREF_KEY, JSON.stringify(current));
  } catch {
    // ignore localStorage parse/write issues
  }
};

const getPendingReviewIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(PENDING_REVIEW_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((x) => String(x)));
  } catch {
    return new Set();
  }
};

const setPendingReviewIds = (ids: Set<string>) => {
  localStorage.setItem(PENDING_REVIEW_KEY, JSON.stringify(Array.from(ids)));
};

const getActiveReview = (): ActiveReviewState | null => {
  try {
    const raw = localStorage.getItem(REVIEW_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveReviewState;
    if (!parsed?.reviewId || !parsed?.startedAt) return null;
    return parsed;
  } catch {
    return null;
  }
};

const setActiveReview = (value: ActiveReviewState | null) => {
  if (!value) {
    localStorage.removeItem(REVIEW_PROGRESS_KEY);
  } else {
    localStorage.setItem(REVIEW_PROGRESS_KEY, JSON.stringify(value));
  }
  window.dispatchEvent(new Event("review-progress-updated"));
};

const toRiskLevel = (value: string): RiskLevel => {
  const normalized = (value || "").toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "medium";
};

const isWithinTimeframe = (timestamp: string, timeframe: "24h" | "7d" | "30d" | "365d" | "all"): boolean => {
  if (timeframe === "all") return true;
  const ts = new Date(timestamp).getTime();
  if (!Number.isFinite(ts)) return false;

  const now = Date.now();
  const maxAgeMs =
    timeframe === "24h"
      ? 24 * 60 * 60 * 1000
      : timeframe === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : timeframe === "30d"
          ? 30 * 24 * 60 * 60 * 1000
          : 365 * 24 * 60 * 60 * 1000;

  return now - ts <= maxAgeMs;
};

const Contracts = () => {
  const { timeframe, workspaceId: companyId, setWorkspaceId: setCompanyId } = useGlobalContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  const [playbooks, setPlaybooks] = useState<PlaybookResponse[]>([]);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState("default");
  const [reviewComplete, setReviewComplete] = useState<ReviewCompleteState | null>(null);
  const [reviewCompleteDialogOpen, setReviewCompleteDialogOpen] = useState(false);
  const [pendingReviewIds, setPendingReviewIdsState] = useState<Set<string>>(new Set());
  const [reviewCompanyId, setReviewCompanyId] = useState(companyId || "default_co");
  const [reviewElapsedSeconds, setReviewElapsedSeconds] = useState(0);
  const [activeReview, setActiveReviewState] = useState<ActiveReviewState | null>(() => getActiveReview());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const [recentlyDeleted, setRecentlyDeleted] = useState<DeletedContractItem[]>([]);
  const [deleteIntent, setDeleteIntent] = useState<DeleteIntent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingDeleteRef = useRef<Map<string, PendingDeleteEntry>>(new Map());

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const persistPendingReviewIds = (ids: Set<string>) => {
    setPendingReviewIdsState(new Set(ids));
    setPendingReviewIds(ids);
  };

  const loadPlaybooks = async (targetCompanyId: string) => {
    const normalizedCompany = (targetCompanyId || "default_co").trim() || "default_co";
    try {
      const all = await listPlaybooks(normalizedCompany);
      setPlaybooks(all);
      const preferred = getPreferredPlaybook(normalizedCompany);
      const nextId =
        (preferred && all.some((p) => p.playbook_id === preferred) && preferred) ||
        all[0]?.playbook_id ||
        "default";
      setSelectedPlaybookId(nextId);
    } catch (e) {
      setPlaybooks([]);
      setSelectedPlaybookId("default");
      toast(`Could not load playbooks: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  };

  const loadContracts = useCallback(async (pendingIdsOverride?: Set<string>) => {
    try {
      setLoading(true);
      setError(null);
      const pendingIds = pendingIdsOverride ?? pendingReviewIds;
      const summaries = await getContractSummaries(timeframe);

      const details: ContractRow[] = summaries.map((item) => {
        const normalizedViolations = Number(item.violations || 0);
        const isPending = pendingIds.has(item.contract_id);
        const isMitigated = Number(item.risk_score || 0) === 0 && normalizedViolations === 0;
        const backendStatus = String(item.negotiation_status || "").toLowerCase();
        const status: Status = isPending || backendStatus === "pending"
          ? "pending"
          : backendStatus === "approved"
            ? "approved"
            : backendStatus === "negotiating" || isMitigated
              ? "negotiating"
              : "reviewed";

        return {
          id: item.contract_id,
          vendor: item.company_id,
          name: `Contract ${item.contract_id.slice(0, 8)}`,
          risk: Number(item.risk_score || 0),
          riskLevel: toRiskLevel(String(item.risk_level || "medium")),
          violations: normalizedViolations,
          status,
          updatedAt: item.timestamp,
          updated: new Date(item.timestamp).toLocaleString(),
        };
      });

      details.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
      setContracts(details);
    } catch (e) {
      if (activeReview && isBackendBusyError(e)) {
        setError("AI review is still finalizing in backend. Contracts will refresh shortly.");
      } else {
        setError(e instanceof Error ? e.message : "Failed to load contracts");
      }
    } finally {
      setLoading(false);
    }
  }, [pendingReviewIds, timeframe, activeReview]);

  const loadRecentlyDeleted = useCallback(async () => {
    try {
      const items = await getDeletedContracts(5);
      setRecentlyDeleted(items);
    } catch {
      setRecentlyDeleted([]);
    }
  }, []);

  useEffect(() => {
    const stored = getPendingReviewIds();
    setPendingReviewIdsState(stored);
  }, []);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  useEffect(() => {
    void loadRecentlyDeleted();
  }, [loadRecentlyDeleted]);

  useEffect(() => {
    loadPlaybooks(companyId);
  }, [companyId]);

  useEffect(() => {
    if (reviewDialogOpen) {
      loadPlaybooks(reviewCompanyId);
    }
  }, [reviewCompanyId, reviewDialogOpen]);

  useEffect(() => {
    setReviewCompanyId(companyId || "default_co");
  }, [companyId]);

  useEffect(() => {
    localStorage.setItem("company_id", companyId || "default_co");
  }, [companyId]);

  useEffect(() => {
    if (!uploading) {
      setReviewElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    setReviewElapsedSeconds(0);

    const timerId = window.setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setReviewElapsedSeconds(elapsed);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [uploading]);

  useEffect(() => {
    const sync = () => setActiveReviewState(getActiveReview());
    window.addEventListener("storage", sync);
    window.addEventListener("review-progress-updated", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("review-progress-updated", sync as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!activeReview) return;
    setReviewElapsedSeconds(Math.max(0, Math.floor((Date.now() - activeReview.startedAt) / 1000)));

    const timerId = window.setInterval(() => {
      setReviewElapsedSeconds(Math.max(0, Math.floor((Date.now() - activeReview.startedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [activeReview]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setPendingFile(file);
    setReviewCompanyId(companyId || "default_co");
    loadPlaybooks(companyId || "default_co");
    setReviewDialogOpen(true);
    event.target.value = "";
  };

  const startReview = async () => {
    if (!pendingFile) {
      return;
    }

    try {
      const reviewId = crypto.randomUUID();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const progress: ActiveReviewState = {
        reviewId,
        fileName: pendingFile.name,
        companyId: reviewCompanyId || "default_co",
        startedAt: Date.now(),
        source: "contracts",
      };

      const normalizedCompanyId = (reviewCompanyId || "default_co").trim() || "default_co";
      setUploading(true);
      setError(null);
      setSuccessMessage(null);
      setActiveReview(progress);
      localStorage.setItem("company_id", normalizedCompanyId);
      setCompanyId(normalizedCompanyId);
      setPreferredPlaybook(normalizedCompanyId, selectedPlaybookId);
      toast(`Review started for ${pendingFile.name}`);

      const review = await analyzeContract(pendingFile, normalizedCompanyId, selectedPlaybookId, controller.signal);

      setReviewDialogOpen(false);
      setPendingFile(null);
      const updatedPending = new Set(pendingReviewIds);
      updatedPending.add(review.contract_id);
      persistPendingReviewIds(updatedPending);
      setSuccessMessage(`Upload successful: ${review.contract_id.slice(0, 8)} reviewed for ${normalizedCompanyId}.`);
      toast(`Review completed for ${pendingFile.name}`);

      const counts = review.risk_assessment?.violation_counts || {};
      const residualViolations = Number(counts.high || 0) + Number(counts.medium || 0) + Number(counts.low || 0);
      setReviewComplete({
        contractId: review.contract_id,
        companyId: normalizedCompanyId,
        riskScore: review.risk_assessment.risk_score,
        riskLevel: toRiskLevel(review.risk_assessment.risk_level),
        violationCount: Number.isFinite(residualViolations) ? residualViolations : review.violations.length,
      });
      navigate("/contracts", { replace: true });
      setReviewCompleteDialogOpen(true);

      await loadContracts(updatedPending);
    } catch (e) {
      if (e instanceof Error && e.message.toLowerCase().includes("canceled")) {
        setError("Review canceled");
        toast("AI review canceled");
        return;
      }
      const message = toReviewErrorMessage(e);
      setError(message);
      toast(`Upload failed: ${message}`);
    } finally {
      abortControllerRef.current = null;
      setActiveReview(null);
      setUploading(false);
    }
  };

  const cancelReview = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const markPendingDelete = (contractId: string, pending: boolean) => {
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      if (pending) {
        next.add(contractId);
      } else {
        next.delete(contractId);
      }
      return next;
    });
  };

  const restoreDeletedRow = (contractId: string, entry: PendingDeleteEntry) => {
    setContracts((prev) => {
      if (prev.some((row) => row.id === contractId)) return prev;
      const next = [...prev, entry.row];
      next.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
      return next;
    });

    if (entry.wasPending) {
      const updatedPending = new Set(pendingReviewIds);
      updatedPending.add(contractId);
      persistPendingReviewIds(updatedPending);
    }
  };

  const commitDelete = async (contractId: string, entry: PendingDeleteEntry) => {
    try {
      await deleteContract(contractId, false);
      toast("Contract deleted");
      await loadRecentlyDeleted();
    } catch (e) {
      restoreDeletedRow(contractId, entry);
      const message = e instanceof Error ? e.message : "Failed to delete contract";
      toast.error(message);
    } finally {
      markPendingDelete(contractId, false);
      pendingDeleteRef.current.delete(contractId);
    }
  };

  const undoDelete = (contractId: string) => {
    const entry = pendingDeleteRef.current.get(contractId);
    if (!entry) return;

    window.clearTimeout(entry.timeoutId);
    restoreDeletedRow(contractId, entry);
    pendingDeleteRef.current.delete(contractId);
    markPendingDelete(contractId, false);
    toast("Deletion undone");
  };

  const queueDeleteContract = (contractId: string) => {
    if (pendingDeleteRef.current.has(contractId)) return;

    const row = contracts.find((item) => item.id === contractId);
    if (!row) return;

    const wasPending = pendingReviewIds.has(contractId);

    setContracts((prev) => prev.filter((item) => item.id !== contractId));
    if (wasPending) {
      const updatedPending = new Set(pendingReviewIds);
      updatedPending.delete(contractId);
      persistPendingReviewIds(updatedPending);
    }

    markPendingDelete(contractId, true);

    const timeoutId = window.setTimeout(() => {
      const entry = pendingDeleteRef.current.get(contractId);
      if (!entry) return;
      void commitDelete(contractId, entry);
    }, DELETE_UNDO_MS);

    pendingDeleteRef.current.set(contractId, { row, wasPending, timeoutId });

    toast("Contract queued for deletion", {
      description: "Undo within 6 seconds.",
      action: {
        label: "Undo",
        onClick: () => undoDelete(contractId),
      },
      duration: DELETE_UNDO_MS,
    });
  };

  const handleRestoreContract = async (contractId: string) => {
    try {
      await restoreDeletedContract(contractId);
      toast("Contract restored");
      await Promise.all([loadContracts(), loadRecentlyDeleted()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to restore contract");
    }
  };

  const handlePermanentDelete = async (contractId: string) => {
    try {
      await deleteContract(contractId, true);
      toast("Contract permanently deleted");
      await loadRecentlyDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to permanently delete contract");
    }
  };

  const confirmDeleteIntent = async () => {
    if (!deleteIntent) return;

    if (deleteIntent.mode === "soft") {
      queueDeleteContract(deleteIntent.contractId);
    } else {
      await handlePermanentDelete(deleteIntent.contractId);
    }

    setDeleteIntent(null);
  };

  useEffect(() => {
    return () => {
      pendingDeleteRef.current.forEach((entry) => window.clearTimeout(entry.timeoutId));
      pendingDeleteRef.current.clear();
    };
  }, []);

  const filtered = useMemo(
    () =>
      contracts.filter((c) => {
        const matchSearch =
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.vendor.toLowerCase().includes(search.toLowerCase());
        const matchRisk = riskFilter === "all" || c.riskLevel === riskFilter;
        return matchSearch && matchRisk;
      }),
    [contracts, riskFilter, search]
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, riskFilter, timeframe, companyId, contracts]);

  const paginatedContracts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Contracts</h1>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={handleFileSelected}
      />

      <Dialog
        open={reviewDialogOpen}
        onOpenChange={(open) => {
          setReviewDialogOpen(open);
          if (!open && !uploading) {
            setPendingFile(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Contract Review</DialogTitle>
            <DialogDescription>
              {pendingFile
                ? `Selected file: ${pendingFile.name}`
                : "Select a contract file to continue."}
            </DialogDescription>
          </DialogHeader>
          {uploading && pendingFile && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              AI review in progress for {pendingFile.name}. Elapsed: {formatElapsed(reviewElapsedSeconds)}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="review-company-id">
              Company Name / ID
            </label>
            <Input
              id="review-company-id"
              value={reviewCompanyId}
              onChange={(e) => setReviewCompanyId(e.target.value)}
              placeholder="default_co"
              disabled={uploading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="review-playbook-id">
              Playbook
            </label>
            <Select
              value={selectedPlaybookId}
              onValueChange={(value) => {
                setSelectedPlaybookId(value);
                const normalizedCompanyId = (reviewCompanyId || "default_co").trim() || "default_co";
                setPreferredPlaybook(normalizedCompanyId, value);
              }}
              disabled={uploading || playbooks.length === 0}
            >
              <SelectTrigger id="review-playbook-id">
                <SelectValue placeholder="Select playbook" />
              </SelectTrigger>
              <SelectContent>
                {playbooks.map((playbook) => (
                  <SelectItem key={playbook.playbook_id} value={playbook.playbook_id}>
                    {playbook.name} ({playbook.rule_count} rules)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (uploading) {
                  cancelReview();
                  return;
                }
                setReviewDialogOpen(false);
                setPendingFile(null);
              }}
            >
              {uploading ? "Cancel Review" : "Cancel"}
            </Button>
            <Button onClick={startReview} disabled={uploading || !pendingFile}>
              {uploading ? `Reviewing... ${formatElapsed(reviewElapsedSeconds)}` : "Start Review The Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeReview && !uploading && (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          AI review is still running for {activeReview.fileName} ({activeReview.companyId}). Elapsed: {formatElapsed(reviewElapsedSeconds)}
        </div>
      )}

      <Dialog open={reviewCompleteDialogOpen} onOpenChange={setReviewCompleteDialogOpen}>
        <DialogContent onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Review Complete</DialogTitle>
            <DialogDescription>
              Contract analysis has finished. You can open the review now or come back later.
            </DialogDescription>
          </DialogHeader>
          {reviewComplete && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Contract ID:</span> {reviewComplete.contractId.slice(0, 8)}</div>
              <div><span className="text-muted-foreground">Company:</span> {reviewComplete.companyId}</div>
              <div><span className="text-muted-foreground">Risk Score:</span> {reviewComplete.riskScore}</div>
              <div><span className="text-muted-foreground">Risk Level:</span> {reviewComplete.riskLevel}</div>
              <div><span className="text-muted-foreground">Residual Violations:</span> {reviewComplete.violationCount}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewCompleteDialogOpen(false)}>
              Later (Keep Pending)
            </Button>
            <Button
              onClick={() => {
                if (!reviewComplete) return;
                const updatedPending = new Set(pendingReviewIds);
                updatedPending.delete(reviewComplete.contractId);
                persistPendingReviewIds(updatedPending);
                setReviewCompleteDialogOpen(false);
                navigate(`/contracts/${reviewComplete.contractId}`);
              }}
            >
              Check Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteIntent)} onOpenChange={(open) => !open && setDeleteIntent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteIntent?.mode === "permanent" ? "Permanently delete contract?" : "Delete contract?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteIntent?.mode === "permanent"
                ? "This cannot be undone and the contract will be removed forever."
                : "This will remove the row now and move it to Recently deleted. You can undo for 6 seconds or restore it later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteIntent()}>
              {deleteIntent?.mode === "permanent" ? "Permanently Delete" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {successMessage && <div className="text-sm text-success">{successMessage}</div>}
      {error && <div className="text-sm text-destructive">{error}</div>}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contracts or vendors..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-40 h-9">
            <Filter size={14} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
            <SelectItem value="medium">Medium Risk</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Contract Name</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead>Violations</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Loading contracts...
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No contracts found.
                </TableCell>
              </TableRow>
            )}
            {paginatedContracts.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/contracts/${c.id}`)}
              >
                <TableCell className="font-medium">{c.vendor}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell><RiskBadge level={c.riskLevel} score={c.risk} /></TableCell>
                <TableCell>{c.violations}</TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className="text-muted-foreground">{c.updated}</TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" disabled={pendingDeleteIds.has(c.id)}>
                        <Pencil size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setDeleteIntent({ contractId: c.id, mode: "soft" })}
                        className="text-destructive focus:text-destructive"
                        disabled={pendingDeleteIds.has(c.id)}
                      >
                        <Trash2 size={14} className="mr-2" />
                        {pendingDeleteIds.has(c.id) ? "Delete pending..." : "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Recently deleted</h2>
          <span className="text-xs text-muted-foreground">Last 5</span>
        </div>
        {recentlyDeleted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recently deleted contracts.</p>
        ) : (
          <div className="space-y-2">
            {recentlyDeleted.map((item) => (
              <div
                key={item.contract_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="text-sm">
                  <div className="font-medium">Contract {item.contract_id.slice(0, 8)}</div>
                  <div className="text-muted-foreground">
                    {item.company_id} • Deleted {new Date(item.deleted_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => void handleRestoreContract(item.contract_id)}>
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteIntent({ contractId: item.contract_id, mode: "permanent" })}
                  >
                    Permanently Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Contracts;
