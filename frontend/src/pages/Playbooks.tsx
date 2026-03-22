import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, BookOpen, Save, RefreshCcw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import {
  createPlaybook,
  deletePlaybook,
  listPlaybooks,
  PlaybookResponse,
  PlaybookRule,
  updatePlaybook,
} from "@/lib/api";

const defaultRuleDraft = (): PlaybookRule => ({
  clause: "liability",
  attribute: "cap_type",
  expected: "annual_value",
  policy: "Liability must be capped at annual contract value.",
  severity: "high",
  required: true,
  type: "violation",
  template: "LIMITATION OF LIABILITY. Total aggregate liability shall not exceed 100% of annual contract value.",
});

const ruleTemplates: Array<{ id: string; label: string; rule: PlaybookRule }> = [
  {
    id: "liability_cap",
    label: "Liability Cap",
    rule: {
      clause: "liability",
      attribute: "cap_type",
      expected: "annual_value",
      allowed: ["annual_value", "12_months_fees"],
      policy: "Liability must be capped at annual value or 12-month fees.",
      severity: "high",
      required: true,
      type: "violation",
      template:
        "LIMITATION OF LIABILITY. Total aggregate liability of either party shall not exceed the annual contract value paid or payable under this Agreement.",
    },
  },
  {
    id: "mutual_indemnity",
    label: "Mutual Indemnity",
    rule: {
      clause: "indemnity",
      attribute: "type",
      expected: "mutual",
      policy: "Indemnity must be mutual to avoid one-sided risk allocation.",
      severity: "high",
      required: true,
      type: "violation",
      template:
        "MUTUAL INDEMNIFICATION. Each party shall indemnify, defend and hold harmless the other party from third-party claims arising from its own negligence or willful misconduct.",
    },
  },
  {
    id: "termination_convenience",
    label: "Customer Termination for Convenience",
    rule: {
      clause: "termination",
      attribute: "customer_convenience",
      expected: true,
      policy: "Customer must have termination-for-convenience rights.",
      severity: "medium",
      required: true,
      type: "violation",
      template:
        "TERMINATION FOR CONVENIENCE. Customer may terminate this Agreement at any time upon thirty (30) days written notice.",
    },
  },
  {
    id: "confidentiality_survival",
    label: "Confidentiality Survival",
    rule: {
      clause: "confidentiality",
      attribute: "survival_years",
      expected: 3,
      min_val: 3,
      policy: "Confidentiality obligations should survive at least three years.",
      severity: "medium",
      required: false,
      type: "violation",
    },
  },
];

const parseCsv = (value: string): Array<string | number | boolean> => {
  if (!value.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((item) => {
      const lowered = item.toLowerCase();
      if (lowered === "true") return true;
      if (lowered === "false") return false;
      const asNum = Number(item);
      if (!Number.isNaN(asNum) && item !== "") return asNum;
      return item;
    });
};

const parseExpected = (value: string): string | number | boolean | null => {
  if (!value.trim()) return null;
  const lowered = value.trim().toLowerCase();
  if (lowered === "true") return true;
  if (lowered === "false") return false;
  const asNum = Number(value);
  if (!Number.isNaN(asNum)) return asNum;
  return value.trim();
};

const formatListForInput = (values?: Array<string | number | boolean>) =>
  values && values.length ? values.join(", ") : "";

const Playbooks = () => {
  const [companyId, setCompanyId] = useState(localStorage.getItem("company_id") || "default_co");
  const [playbooks, setPlaybooks] = useState<PlaybookResponse[]>([]);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState("default");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState("Custom Playbook");
  const [newDescription, setNewDescription] = useState("");

  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [ruleDraft, setRuleDraft] = useState<PlaybookRule>(defaultRuleDraft());
  const [ruleExpectedInput, setRuleExpectedInput] = useState("annual_value");
  const [ruleAllowedInput, setRuleAllowedInput] = useState("annual_value, 12_months_fees");
  const [rulePreferredInput, setRulePreferredInput] = useState("");
  const [ruleDisallowedInput, setRuleDisallowedInput] = useState("");
  const [selectedRuleTemplateId, setSelectedRuleTemplateId] = useState("custom");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listPlaybooks(companyId || "default_co");
      setPlaybooks(data);
      if (!data.some((p) => p.playbook_id === selectedPlaybookId)) {
        setSelectedPlaybookId(data[0]?.playbook_id || "default");
      }
    } catch (e) {
      toast.error(`Failed to load playbooks: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedPlaybookId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    localStorage.setItem("company_id", companyId || "default_co");
  }, [companyId]);

  const selectedPlaybook = useMemo(
    () => playbooks.find((p) => p.playbook_id === selectedPlaybookId) || null,
    [playbooks, selectedPlaybookId]
  );

  const openCreateDialog = () => {
    setNewName("Custom Playbook");
    setNewDescription("");
    setShowCreateDialog(true);
  };

  const handleCreatePlaybook = async () => {
    try {
      setSaving(true);
      const created = await createPlaybook(companyId, {
        name: newName.trim() || "Custom Playbook",
        description: newDescription.trim(),
        rules: [],
        playbook_version: "1.0",
      });
      toast("Playbook created");
      setShowCreateDialog(false);
      await loadData();
      setSelectedPlaybookId(created.playbook_id);
    } catch (e) {
      toast.error(`Failed to create playbook: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlaybook = async (playbookId: string) => {
    try {
      setSaving(true);
      await deletePlaybook(companyId, playbookId);
      toast("Playbook deleted");
      if (selectedPlaybookId === playbookId) {
        setSelectedPlaybookId("default");
      }
      await loadData();
    } catch (e) {
      toast.error(`Failed to delete playbook: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const cloneSelectedPlaybook = async () => {
    if (!selectedPlaybook) return;
    try {
      setSaving(true);
      const created = await createPlaybook(companyId, {
        name: `${selectedPlaybook.name} (Copy)`,
        description: selectedPlaybook.description || "",
        rules: selectedPlaybook.rules,
        playbook_version: selectedPlaybook.playbook_version || "1.0",
      });
      toast("Playbook duplicated");
      await loadData();
      setSelectedPlaybookId(created.playbook_id);
    } catch (e) {
      toast.error(`Failed to duplicate playbook: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const savePlaybookMetadata = async () => {
    if (!selectedPlaybook || selectedPlaybook.is_default) return;
    try {
      setSaving(true);
      const updated = await updatePlaybook(companyId, selectedPlaybook.playbook_id, {
        name: selectedPlaybook.name,
        description: selectedPlaybook.description,
        playbook_version: selectedPlaybook.playbook_version,
      });
      setPlaybooks((prev) => prev.map((p) => (p.playbook_id === updated.playbook_id ? updated : p)));
      toast("Playbook metadata saved");
    } catch (e) {
      toast.error(`Failed to save playbook: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const saveRules = async (nextRules: PlaybookRule[]) => {
    if (!selectedPlaybook || selectedPlaybook.is_default) return;
    try {
      setSaving(true);
      const updated = await updatePlaybook(companyId, selectedPlaybook.playbook_id, {
        rules: nextRules,
      });
      setPlaybooks((prev) => prev.map((p) => (p.playbook_id === updated.playbook_id ? updated : p)));
      toast("Playbook rules updated");
    } catch (e) {
      toast.error(`Failed to update rules: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const openNewRuleDialog = () => {
    setEditingRuleIndex(null);
    setSelectedRuleTemplateId("custom");
    const seed = defaultRuleDraft();
    setRuleDraft(seed);
    setRuleExpectedInput(String(seed.expected ?? ""));
    setRuleAllowedInput(formatListForInput(seed.allowed));
    setRulePreferredInput(formatListForInput(seed.preferred));
    setRuleDisallowedInput(formatListForInput(seed.disallowed_overlap));
    setShowRuleDialog(true);
  };

  const openEditRuleDialog = (rule: PlaybookRule, index: number) => {
    setEditingRuleIndex(index);
    setSelectedRuleTemplateId("custom");
    setRuleDraft(rule);
    setRuleExpectedInput(rule.expected === undefined || rule.expected === null ? "" : String(rule.expected));
    setRuleAllowedInput(formatListForInput(rule.allowed));
    setRulePreferredInput(formatListForInput(rule.preferred));
    setRuleDisallowedInput(formatListForInput(rule.disallowed_overlap));
    setShowRuleDialog(true);
  };

  const submitRuleDialog = async () => {
    if (!selectedPlaybook || selectedPlaybook.is_default) return;

    if (!ruleDraft.clause?.trim()) {
      toast.error("Clause is required.");
      return;
    }
    if (!ruleDraft.attribute?.trim()) {
      toast.error("Attribute is required.");
      return;
    }
    if (!ruleDraft.policy?.trim()) {
      toast.error("Policy is required.");
      return;
    }
    if (!["high", "medium", "low"].includes(ruleDraft.severity)) {
      toast.error("Severity must be high, medium, or low.");
      return;
    }

    const nextRule: PlaybookRule = {
      ...ruleDraft,
      expected: parseExpected(ruleExpectedInput),
      allowed: parseCsv(ruleAllowedInput),
      preferred: parseCsv(rulePreferredInput),
      disallowed_overlap: parseCsv(ruleDisallowedInput),
      max_val: ruleDraft.max_val === undefined ? undefined : Number(ruleDraft.max_val),
      min_val: ruleDraft.min_val === undefined ? undefined : Number(ruleDraft.min_val),
    };

    if (
      nextRule.min_val !== undefined &&
      nextRule.max_val !== undefined &&
      nextRule.min_val > nextRule.max_val
    ) {
      toast.error("Min value cannot be greater than max value.");
      return;
    }

    const nextRules = [...selectedPlaybook.rules];
    if (editingRuleIndex === null) {
      nextRules.push(nextRule);
    } else {
      nextRules[editingRuleIndex] = nextRule;
    }

    await saveRules(nextRules);
    setShowRuleDialog(false);
  };

  const removeRule = async (index: number) => {
    if (!selectedPlaybook || selectedPlaybook.is_default) return;
    const nextRules = selectedPlaybook.rules.filter((_, idx) => idx !== index);
    await saveRules(nextRules);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Playbooks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each company can maintain unlimited custom playbooks and run reviews against any selected one.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            placeholder="Company ID"
            className="w-52"
          />
          <Button variant="outline" className="gap-2" onClick={loadData} disabled={loading}>
            <RefreshCcw size={14} /> Refresh
          </Button>
          <Button className="gap-2" onClick={openCreateDialog}>
            <Plus size={14} /> New Playbook
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6">
        <div className="bg-card border border-border rounded-xl p-3 space-y-2 h-fit">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-2 pt-1">
            Available Playbooks
          </div>
          {loading && <div className="text-sm text-muted-foreground px-2 py-3">Loading playbooks...</div>}
          {!loading && playbooks.length === 0 && (
            <div className="text-sm text-muted-foreground px-2 py-3">No playbooks found.</div>
          )}
          {playbooks.map((playbook) => (
            <div
              key={playbook.playbook_id}
              className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                playbook.playbook_id === selectedPlaybookId
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              }`}
              onClick={() => setSelectedPlaybookId(playbook.playbook_id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm line-clamp-1">{playbook.name}</div>
                {playbook.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">default</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{playbook.description || "No description"}</div>
              <div className="text-[11px] text-muted-foreground mt-2">{playbook.rule_count} rules</div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-5 min-h-[420px]">
          {!selectedPlaybook && <div className="text-sm text-muted-foreground">Select a playbook to manage it.</div>}

          {selectedPlaybook && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[260px] flex-1 space-y-3">
                  <div>
                    <Label htmlFor="pb-name">Playbook Name</Label>
                    <Input
                      id="pb-name"
                      value={selectedPlaybook.name}
                      onChange={(e) =>
                        setPlaybooks((prev) =>
                          prev.map((p) =>
                            p.playbook_id === selectedPlaybook.playbook_id ? { ...p, name: e.target.value } : p
                          )
                        )
                      }
                      disabled={selectedPlaybook.is_default || saving}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pb-description">Description</Label>
                    <Textarea
                      id="pb-description"
                      value={selectedPlaybook.description || ""}
                      onChange={(e) =>
                        setPlaybooks((prev) =>
                          prev.map((p) =>
                            p.playbook_id === selectedPlaybook.playbook_id
                              ? { ...p, description: e.target.value }
                              : p
                          )
                        )
                      }
                      disabled={selectedPlaybook.is_default || saving}
                      className="min-h-[84px]"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={cloneSelectedPlaybook}
                    disabled={saving}
                  >
                    <Copy size={14} /> Duplicate
                  </Button>
                  {!selectedPlaybook.is_default && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleDeletePlaybook(selectedPlaybook.playbook_id)}
                      disabled={saving}
                    >
                      <Trash2 size={14} /> Delete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={savePlaybookMetadata}
                    disabled={selectedPlaybook.is_default || saving}
                  >
                    <Save size={14} /> Save
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen size={15} className="text-primary" /> Rules
                </div>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={openNewRuleDialog}
                  disabled={selectedPlaybook.is_default || saving}
                >
                  <Plus size={14} /> Add Rule
                </Button>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clause</TableHead>
                      <TableHead>Attribute</TableHead>
                      <TableHead>Policy</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPlaybook.rules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No rules yet. Add your first rule to this playbook.
                        </TableCell>
                      </TableRow>
                    )}
                    {selectedPlaybook.rules.map((rule, index) => (
                      <TableRow key={`${rule.clause}-${index}`}>
                        <TableCell className="font-medium">{rule.clause}</TableCell>
                        <TableCell>{rule.attribute || "-"}</TableCell>
                        <TableCell className="max-w-[320px]">
                          <span className="line-clamp-2 text-muted-foreground">{rule.policy}</span>
                        </TableCell>
                        <TableCell className="capitalize">{rule.severity}</TableCell>
                        <TableCell>{rule.type || "violation"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                              onClick={() => openEditRuleDialog(rule, index)}
                              disabled={selectedPlaybook.is_default || saving}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              onClick={() => removeRule(index)}
                              disabled={selectedPlaybook.is_default || saving}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playbook</DialogTitle>
            <DialogDescription>
              Create a company-scoped playbook. You can add and edit unlimited rules after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-playbook-name">Name</Label>
              <Input
                id="new-playbook-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Vendor MSA Strict Policy"
              />
            </div>
            <div>
              <Label htmlFor="new-playbook-description">Description</Label>
              <Textarea
                id="new-playbook-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Rules for procurement contracts with strict liability controls"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlaybook} disabled={saving}>
              {saving ? "Creating..." : "Create Playbook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRuleIndex === null ? "Add Rule" : "Edit Rule"}</DialogTitle>
            <DialogDescription>
              Configure deterministic logic for this playbook rule.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label htmlFor="rule-template-preset">Rule Template Preset</Label>
              <Select
                value={selectedRuleTemplateId}
                onValueChange={(value) => {
                  setSelectedRuleTemplateId(value);
                  if (value === "custom") {
                    return;
                  }
                  const preset = ruleTemplates.find((template) => template.id === value);
                  if (!preset) {
                    return;
                  }
                  const next = preset.rule;
                  setRuleDraft(next);
                  setRuleExpectedInput(next.expected === undefined || next.expected === null ? "" : String(next.expected));
                  setRuleAllowedInput(formatListForInput(next.allowed));
                  setRulePreferredInput(formatListForInput(next.preferred));
                  setRuleDisallowedInput(formatListForInput(next.disallowed_overlap));
                }}
              >
                <SelectTrigger id="rule-template-preset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  {ruleTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rule-clause">Clause</Label>
              <Input
                id="rule-clause"
                value={ruleDraft.clause}
                onChange={(e) => setRuleDraft((prev) => ({ ...prev, clause: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="rule-attribute">Attribute</Label>
              <Input
                id="rule-attribute"
                value={ruleDraft.attribute || ""}
                onChange={(e) => setRuleDraft((prev) => ({ ...prev, attribute: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="rule-severity">Severity</Label>
              <Select
                value={ruleDraft.severity}
                onValueChange={(value) =>
                  setRuleDraft((prev) => ({ ...prev, severity: value as "high" | "medium" | "low" }))
                }
              >
                <SelectTrigger id="rule-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">high</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="low">low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rule-type">Type</Label>
              <Input
                id="rule-type"
                value={ruleDraft.type || "violation"}
                onChange={(e) => setRuleDraft((prev) => ({ ...prev, type: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="rule-expected">Expected Value</Label>
              <Input
                id="rule-expected"
                value={ruleExpectedInput}
                onChange={(e) => setRuleExpectedInput(e.target.value)}
                placeholder="true, annual_value, 3"
              />
            </div>
            <div>
              <Label htmlFor="rule-required">Required</Label>
              <Select
                value={String(ruleDraft.required ?? false)}
                onValueChange={(value) => setRuleDraft((prev) => ({ ...prev, required: value === "true" }))}
              >
                <SelectTrigger id="rule-required">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rule-allowed">Allowed (CSV)</Label>
              <Input
                id="rule-allowed"
                value={ruleAllowedInput}
                onChange={(e) => setRuleAllowedInput(e.target.value)}
                placeholder="annual_value, 12_months_fees"
              />
            </div>
            <div>
              <Label htmlFor="rule-preferred">Preferred (CSV)</Label>
              <Input
                id="rule-preferred"
                value={rulePreferredInput}
                onChange={(e) => setRulePreferredInput(e.target.value)}
                placeholder="Delaware, New York"
              />
            </div>
            <div>
              <Label htmlFor="rule-disallowed">Disallowed Overlap (CSV)</Label>
              <Input
                id="rule-disallowed"
                value={ruleDisallowedInput}
                onChange={(e) => setRuleDisallowedInput(e.target.value)}
                placeholder="consequential, punitive"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="rule-min-val">Min Value</Label>
                <Input
                  id="rule-min-val"
                  value={ruleDraft.min_val ?? ""}
                  onChange={(e) =>
                    setRuleDraft((prev) => ({
                      ...prev,
                      min_val: e.target.value.trim() ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="rule-max-val">Max Value</Label>
                <Input
                  id="rule-max-val"
                  value={ruleDraft.max_val ?? ""}
                  onChange={(e) =>
                    setRuleDraft((prev) => ({
                      ...prev,
                      max_val: e.target.value.trim() ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="rule-policy">Policy</Label>
              <Textarea
                id="rule-policy"
                value={ruleDraft.policy}
                onChange={(e) => setRuleDraft((prev) => ({ ...prev, policy: e.target.value }))}
                className="min-h-[84px]"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="rule-template">Template (Optional)</Label>
              <Textarea
                id="rule-template"
                value={ruleDraft.template || ""}
                onChange={(e) => setRuleDraft((prev) => ({ ...prev, template: e.target.value }))}
                className="min-h-[84px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitRuleDialog} disabled={saving}>
              {saving ? "Saving..." : editingRuleIndex === null ? "Add Rule" : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Playbooks;
