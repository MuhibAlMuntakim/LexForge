"use client"

import React from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export default function PlaybookPage() {
  const [selectedRule, setSelectedRule] = React.useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [config, setConfig] = React.useState({
    max_cap: "1x",
    require_mutual: false,
    prohibit_consequential: true
  });

  const handleSave = () => {
    toast.success(
      <span className="text-[#FF7043] font-bold uppercase tracking-widest text-[10px]">
        {selectedRule} Protocol Saved
      </span>, 
      {
        description: "Institutional benchmarks updated successfully.",
        duration: 3000,
        classNames: {
          description: "text-slate-500 text-[11px]",
        }
      }
    );
    setIsSheetOpen(false);
  };

  const categories = [
    'Liability', 
    'Indemnity', 
    'Governing Law', 
    'Term & Termination', 
    'Payment', 
    'Confidentiality'
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <PageHeader 
          title="Institutional Playbook" 
          description="Define benchmarks for automated review" 
        />
        {selectedRule && (
          <button 
            onClick={() => {
              setSelectedRule(null);
              setIsSheetOpen(false);
            }}
            className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
          >
            ← Back to Rules list
          </button>
        )}
      </div>

      <Sheet 
        open={isSheetOpen} 
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) setSelectedRule(null);
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map(rule => (
            <SheetTrigger asChild key={rule}>
              <div 
                onClick={() => {
                  setSelectedRule(rule);
                  setIsSheetOpen(true);
                }}
                className="p-6 bg-white border border-slate-200 rounded-lg hover:border-primary transition-all cursor-pointer group shadow-sm hover:shadow-md"
              >

                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">{rule}</h3>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">settings_applications</span>
                </div>
                <p className="text-[11px] text-slate-500">Standard institutional ruleset applied to all incoming {rule} clauses.</p>
                <div className="mt-6 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-widest font-mono">Status: Locked</span>
                  <span className="material-symbols-outlined text-sm text-primary">arrow_forward</span>
                </div>
              </div>
            </SheetTrigger>
          ))}
        </div>

        <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full border-l border-slate-200 p-0">
          <div className="flex-1 overflow-y-auto p-8">
            <SheetHeader className="mb-12">
              <SheetTitle className="text-xs tracking-widest text-slate-500 uppercase font-bold text-left">
                {selectedRule?.toUpperCase()} PROTOCOLS
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-12">
              {/* Rule 1: Maximum Liability Cap */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maximum Acceptable Cap</label>
                  <p className="text-[11px] text-slate-500 italic">Define the standard ceiling for liability exposure.</p>
                </div>
                <Select 
                  value={config.max_cap} 
                  onValueChange={(val) => setConfig(prev => ({ ...prev, max_cap: val }))}
                >
                  <SelectTrigger className="w-full h-12 border-slate-200 focus:ring-primary/20">
                    <SelectValue placeholder="Select multiplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1x">1x Contract Value</SelectItem>
                    <SelectItem value="2x">2x Contract Value</SelectItem>
                    <SelectItem value="unlimited" className="text-red-600 font-bold">
                      Unlimited (Flag as Critical)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* AI Logic Code Block (Removed for cleaner UI) */}

              {/* Rule 2: Mutual Indemnification */}
              <div className="flex items-center justify-between group pt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Require Mutual Indemnification</label>
                  <p className="text-[11px] text-slate-500">Flags non-reciprocal protection clauses.</p>
                </div>
                <Switch 
                  checked={config.require_mutual}
                  onCheckedChange={(val) => setConfig(prev => ({ ...prev, require_mutual: val }))}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Rule 3: Excluded Damages */}
              <div className="flex items-center justify-between group">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prohibit Consequential Damages</label>
                  <p className="text-[11px] text-slate-500">Standard exclusion for non-direct losses.</p>
                </div>
                <Switch 
                  checked={config.prohibit_consequential}
                  onCheckedChange={(val) => setConfig(prev => ({ ...prev, prohibit_consequential: val }))}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>

          </div>

          <SheetFooter className="p-8 border-t border-slate-100 bg-white sticky bottom-0 sm:flex-col sm:space-x-0">
            <Button 
              onClick={handleSave}
              className="w-full h-14 bg-[#FF7043] hover:bg-[#E65B2E] text-white rounded-none font-bold uppercase tracking-[0.2em] text-xs transition-all duration-300 shadow-lg hover:shadow-[#FF7043]/20"
            >
              Save Protocol
            </Button>
          </SheetFooter>

        </SheetContent>
      </Sheet>
    </div>
  )
}

