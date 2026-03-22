import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Upload, Calendar, LogOut, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { analyzeContract, listPlaybooks, PlaybookResponse } from "@/lib/api";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useGlobalContext } from "@/contexts/GlobalContext";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

const PLAYBOOK_PREF_KEY = "preferred_playbook_by_company";
const PENDING_REVIEW_KEY = "pending_review_contract_ids";
const USER_PROFILE_KEY = "user_profile";
const REVIEW_PROGRESS_KEY = "active_contract_review";

type UserProfile = {
  fullName: string;
  email: string;
  role: string;
};

type ReviewCompleteState = {
  contractId: string;
  companyId: string;
  riskScore: number;
  riskLevel: string;
  violationCount: number;
};

type ActiveReviewState = {
  reviewId: string;
  fileName: string;
  companyId: string;
  startedAt: number;
  source: "contracts" | "header";
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
    return "AI review is taking longer than expected. Keep backend running and retry in a few seconds.";
  }
  if (normalized.includes("failed to fetch") || normalized.includes("network") || normalized.includes("urlopen")) {
    return "Could not reach backend during AI review. Ensure a single backend instance is running on port 8000, then retry.";
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

const getStoredUserProfile = (): UserProfile => {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) {
      return {
        fullName: "John Doe",
        email: "john@acme.com",
        role: "General Counsel",
      };
    }

    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      fullName: parsed.fullName || "John Doe",
      email: parsed.email || "john@acme.com",
      role: parsed.role || "General Counsel",
    };
  } catch {
    return {
      fullName: "John Doe",
      email: "john@acme.com",
      role: "General Counsel",
    };
  }
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
    void 0;
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

const toRiskLevel = (value: string): string => {
  const normalized = (value || "").toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") return normalized;
  return "medium";
};

const AppHeader = () => {
  const navigate = useNavigate();
  const { timeframe, setTimeframe, workspaceId, profilePicture } = useGlobalContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [playbooks, setPlaybooks] = useState<PlaybookResponse[]>([]);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState("default");      
  const [reviewComplete, setReviewComplete] = useState<ReviewCompleteState | null>(null);
  const [reviewCompleteDialogOpen, setReviewCompleteDialogOpen] = useState(false);
  const [reviewElapsedSeconds, setReviewElapsedSeconds] = useState(0);
  const [activeReview, setActiveReviewState] = useState<ActiveReviewState | null>(() => getActiveReview());
  const [searchOpen, setSearchOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => getStoredUserProfile());
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const refreshProfile = () => setUserProfile(getStoredUserProfile());
    window.addEventListener("storage", refreshProfile);
    window.addEventListener("user-profile-updated", refreshProfile as EventListener);
    return () => {
      window.removeEventListener("storage", refreshProfile);
      window.removeEventListener("user-profile-updated", refreshProfile as EventListener);
    };
  }, []);

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
      if (!activeReview || !isBackendBusyError(e)) {
        toast("Could not load playbooks");
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    loadPlaybooks(workspaceId);
    setReviewDialogOpen(true);
    event.target.value = "";
  };

  const startReview = async () => {
    if (!pendingFile) return;

    try {
      const reviewId = crypto.randomUUID();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const progress: ActiveReviewState = {
        reviewId,
        fileName: pendingFile.name,
        companyId: workspaceId,
        startedAt: Date.now(),
        source: "header",
      };

      setUploading(true);
      setActiveReview(progress);
      setPreferredPlaybook(workspaceId, selectedPlaybookId);
      toast(`Review started for ${pendingFile.name}`);

      const review = await analyzeContract(pendingFile, workspaceId, selectedPlaybookId, controller.signal);
      toast(`Review completed for ${pendingFile.name}`);
      setReviewDialogOpen(false);
      setPendingFile(null);

      const pending = getPendingReviewIds();
      pending.add(review.contract_id);
      setPendingReviewIds(pending);

      const counts = review.risk_assessment?.violation_counts || {};
      const residualViolations = Number(counts.high || 0) + Number(counts.medium || 0) + Number(counts.low || 0);
      setReviewComplete({
        contractId: review.contract_id,
        companyId: workspaceId,
        riskScore: review.risk_assessment.risk_score,
        riskLevel: toRiskLevel(review.risk_assessment.risk_level),
        violationCount: Number.isFinite(residualViolations) ? residualViolations : review.violations.length,
      });
      setReviewCompleteDialogOpen(true);
    } catch (e) {
      if (e instanceof Error && e.message.toLowerCase().includes("canceled")) {
        toast("AI review canceled");
        return;
      }
      const message = toReviewErrorMessage(e);
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

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFileSelected} />

      {/* Upload Dialogs Omitted from snippet but kept in real code */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => { setReviewDialogOpen(open); if (!open && !uploading) setPendingFile(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Contract Review</DialogTitle>
            <DialogDescription>{pendingFile ? "Selected file: " : "Select a contract file to continue."}</DialogDescription>
          </DialogHeader>
          {uploading && pendingFile && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              AI review in progress for {pendingFile.name}. Elapsed: {formatElapsed(reviewElapsedSeconds)}
            </div>
          )}
          <div className="space-y-4 py-4">
             <div className="text-sm p-3 bg-muted/50 rounded-lg border border-border">
                Uploading to Workspace: <strong className="text-foreground">{workspaceId}</strong>
             </div>
             <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Select Playbook Playbook</label>
                <Select value={selectedPlaybookId} onValueChange={(value) => { setSelectedPlaybookId(value); setPreferredPlaybook(workspaceId, value); }} disabled={uploading || playbooks.length === 0}>
                  <SelectTrigger><SelectValue placeholder="Select playbook" /></SelectTrigger>
                  <SelectContent>
                    {playbooks.map((p) => <SelectItem key={p.playbook_id} value={p.playbook_id}>{p.name} ({p.rule_count} rules)</SelectItem>)}
                  </SelectContent>
                </Select>
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { if (uploading) { cancelReview(); return; } setReviewDialogOpen(false); setPendingFile(null); }}>{uploading ? "Cancel Review" : "Cancel"}</Button>
            <Button onClick={startReview} disabled={uploading || !pendingFile}>{uploading ? `Reviewing... ${formatElapsed(reviewElapsedSeconds)}` : "Start Review"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewCompleteDialogOpen} onOpenChange={setReviewCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Complete</DialogTitle></DialogHeader>
          {reviewComplete && (
            <div className="space-y-2">
              <p>Risk Score: {reviewComplete.riskScore}</p>
              <p>Risk Level: {reviewComplete.riskLevel}</p>
              <p>Violations: {reviewComplete.violationCount}</p>
            </div>
          )}
          <DialogFooter>
             <Button variant="outline" onClick={() => { setReviewCompleteDialogOpen(false); navigate("/contracts"); }}>Later</Button>
             <Button onClick={() => { if(!reviewComplete)return; const p = getPendingReviewIds(); p.delete(reviewComplete.contractId); setPendingReviewIds(p); setReviewCompleteDialogOpen(false); navigate(`/contracts/${reviewComplete.contractId}`); }}>Check Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem onSelect={() => { setSearchOpen(false); navigate("/contracts"); }}>Go to Contracts</CommandItem>
            <CommandItem onSelect={() => { setSearchOpen(false); navigate("/negotiations"); }}>Go to Negotiations</CommandItem>
            <CommandItem onSelect={() => { setSearchOpen(false); navigate("/playbooks"); }}>Go to Playbooks</CommandItem>
            <CommandItem onSelect={() => { setSearchOpen(false); navigate("/settings"); }}>Workspace Settings</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      {/* Global Omni-Search */}
      <div className="relative w-96">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search contracts, vendors, clauses... (Cmd+K)" className="pl-9 h-9 bg-muted/50 focus:bg-background cursor-pointer" onClick={() => setSearchOpen(true)} readOnly />
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-muted-foreground bg-muted/20 border-border/50">
              <Calendar size={14} />
              <span>
                {timeframe === "24h" ? "Last 24 Hours" : timeframe === "7d" ? "Last 7 Days" : timeframe === "30d" ? "Last 30 Days" : timeframe === "365d" ? "Last Year" : "All Time"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>Timeframe</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTimeframe("24h")}>Last 24 Hours</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimeframe("7d")}>Last 7 Days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimeframe("30d")}>Last 30 Days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimeframe("365d")}>Last Year</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimeframe("all")}>All Time</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" className="gap-2" onClick={handleUploadClick} disabled={uploading}>
          <Upload size={14} />
          <span>{uploading ? "Uploading..." : "Upload Contract"}</span>
        </Button>

        {activeReview && !uploading && (
          <span className="text-xs text-primary">
            Review running {formatElapsed(reviewElapsedSeconds)}
          </span>
        )}

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-4 text-center text-sm text-muted-foreground">All caught up! No active alerts.</div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile */}
        <DropdownMenu>
                    <DropdownMenuTrigger asChild>
             <button className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:ring-2 hover:ring-primary/20 transition-all overflow-hidden">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary text-xs font-semibold">{userProfile.fullName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "JD"}</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{userProfile.fullName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userProfile.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
               <Settings className="mr-2 h-4 w-4" />
               <span>Settings & Workspace</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
               <LogOut className="mr-2 h-4 w-4" />
               <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AppHeader;