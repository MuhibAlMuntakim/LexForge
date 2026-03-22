import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalContext } from "@/contexts/GlobalContext";
import { Pencil, Trash2 } from "lucide-react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import StatusBadge, { Status } from "@/components/shared/StatusBadge";
import { deleteContract, getNegotiationsMetrics, NegotiationItem, updateNegotiationStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const PENDING_REVIEW_KEY = "pending_review_contract_ids";
const DELETE_UNDO_MS = 6000;

type PendingDeleteEntry = {
  row: NegotiationItem;
  wasPending: boolean;
  timeoutId: number;
};

const toStatus = (value: string): Status => {
  const normalized = (value || "negotiating").toLowerCase();
  if (normalized === "approved") return "approved";
  return "negotiating";
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

const Negotiations = () => {
  const { timeframe } = useGlobalContext();
  const navigate = useNavigate();
  const [data, setData] = useState<NegotiationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const [deleteContractId, setDeleteContractId] = useState<string | null>(null);
  const itemsPerPage = 8;
  const pendingDeleteRef = useRef<Map<string, PendingDeleteEntry>>(new Map());

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getNegotiationsMetrics(timeframe);
        setData(response);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load negotiations metrics");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [timeframe]);

  const negotiations = useMemo(
    () => data.filter((n) => {
      const status = String(n.status || "").toLowerCase();
      const visibleStatus = status === "negotiating" || status === "approved";
      const visibleTimeframe = isWithinTimeframe(n.last_activity, timeframe);
      return visibleStatus && visibleTimeframe;
    }),
    [data, timeframe]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const paginatedNegotiations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return negotiations.slice(startIndex, startIndex + itemsPerPage);
  }, [negotiations, currentPage]);

  const totalPages = Math.ceil(negotiations.length / itemsPerPage);

  const handleStatusChange = async (contractId: string, nextStatus: "approved" | "pending") => {
    try {
      setUpdatingId(contractId);
      await updateNegotiationStatus(contractId, nextStatus);

      const pendingIds = getPendingReviewIds();
      if (nextStatus === "pending") {
        pendingIds.add(contractId);
        setPendingReviewIds(pendingIds);
        setData((prev) => prev.filter((item) => item.id !== contractId));
        toast("Moved contract back to Contracts as Pending");
        return;
      }

      pendingIds.delete(contractId);
      setPendingReviewIds(pendingIds);
      setData((prev) =>
        prev.map((item) =>
          item.id === contractId
            ? { ...item, status: "approved", last_activity: new Date().toISOString() }
            : item
        )
      );
      toast("Negotiation marked as Approved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update negotiation status");
      toast.error(e instanceof Error ? e.message : "Failed to update negotiation status");
    } finally {
      setUpdatingId(null);
    }
  };

  const queueDeleteContract = async (contractId: string) => {
    if (pendingDeleteRef.current.has(contractId)) return;

    const row = data.find((item) => item.id === contractId);
    if (!row) return;

    const wasPending = getPendingReviewIds().has(contractId);

    setData((prev) => prev.filter((item) => item.id !== contractId));
    if (wasPending) {
      const pendingIds = getPendingReviewIds();
      pendingIds.delete(contractId);
      setPendingReviewIds(pendingIds);
    }

    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      next.add(contractId);
      return next;
    });

    const restoreRow = () => {
      setData((prev) => {
        if (prev.some((item) => item.id === contractId)) return prev;
        return [row, ...prev];
      });

      if (wasPending) {
        const pendingIds = getPendingReviewIds();
        pendingIds.add(contractId);
        setPendingReviewIds(pendingIds);
      }
    };

    const clearPending = () => {
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(contractId);
        return next;
      });
      pendingDeleteRef.current.delete(contractId);
    };

    const timeoutId = window.setTimeout(async () => {
      try {
        await deleteContract(contractId);
        toast("Contract deleted");
      } catch (e) {
        restoreRow();
        const message = e instanceof Error ? e.message : "Failed to delete contract";
        setError(message);
        toast.error(message);
      } finally {
        clearPending();
      }
    }, DELETE_UNDO_MS);

    pendingDeleteRef.current.set(contractId, { row, wasPending, timeoutId });

    const undo = () => {
      const entry = pendingDeleteRef.current.get(contractId);
      if (!entry) return;
      window.clearTimeout(entry.timeoutId);
      restoreRow();
      clearPending();
      toast("Deletion undone");
    };

    toast("Contract queued for deletion", {
      description: "Undo within 6 seconds.",
      action: {
        label: "Undo",
        onClick: undo,
      },
      duration: DELETE_UNDO_MS,
    });
  };

  const confirmDelete = async () => {
    if (!deleteContractId) return;
    await queueDeleteContract(deleteContractId);
    setDeleteContractId(null);
  };

  useEffect(() => {
    return () => {
      pendingDeleteRef.current.forEach((entry) => window.clearTimeout(entry.timeoutId));
      pendingDeleteRef.current.clear();
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Negotiations</h1>
        <p className="text-sm text-muted-foreground mt-1">Track contract negotiation progress</p>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <AlertDialog open={Boolean(deleteContractId)} onOpenChange={(open) => !open && setDeleteContractId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the row now and keeps Undo available for 6 seconds before deletion is committed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="bg-card border border-border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Contract</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Open Issues</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="w-52">Set Status</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Loading negotiations data...
                </TableCell>
              </TableRow>
            )}
            {!loading && negotiations.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No negotiation items available yet.
                </TableCell>
              </TableRow>
            )}
            {paginatedNegotiations.map((n) => (
              <TableRow
                key={n.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/contracts/${n.id}/revised-diff`)}
              >
                <TableCell className="font-medium">{n.vendor}</TableCell>
                <TableCell>{n.contract}</TableCell>
                <TableCell><StatusBadge status={toStatus(n.status)} /></TableCell>
                <TableCell>
                  <span className={n.issues > 0 ? "text-foreground" : "text-muted-foreground"}>{n.issues}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{new Date(n.last_activity).toLocaleString()}</TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value === "approved" || value === "pending") {
                        handleStatusChange(n.id, value);
                      }
                    }}
                    disabled={updatingId === n.id}
                  >
                    <SelectTrigger className="h-8" onClick={(event) => event.stopPropagation()}>
                      <SelectValue placeholder="Choose..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" disabled={pendingDeleteIds.has(n.id)}>
                        <Pencil size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setDeleteContractId(n.id)}
                        className="text-destructive focus:text-destructive"
                        disabled={pendingDeleteIds.has(n.id)}
                      >
                        <Trash2 size={14} className="mr-2" />
                        {pendingDeleteIds.has(n.id) ? "Delete pending..." : "Delete"}
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
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, negotiations.length)} of {negotiations.length} entries
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Negotiations;
