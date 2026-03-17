"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ChevronRight, 
  MessageSquare, 
  ShieldAlert, 
  Zap, 
  Send,
  FileText,
  AlertCircle,
  CheckCircle2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Mock Data ---

const MOCK_CONTRACT = {
  id: "MSA_V3",
  title: "Master Services Agreement",
  filename: "MSA_V3.pdf",
  vendor: "GLOBAL LOGISTICS",
  status: "AI SYNCED",
  clauses: [
    {
      id: "sec-1",
      title: "1. Term and Termination",
      content: "This Agreement shall commence on the Effective Date and shall continue for a period of three (3) years unless sooner terminated as provided herein. Either party may terminate this Agreement for convenience upon sixty (60) days' prior written notice."
    },
    {
      id: "sec-2",
      title: "2. Services",
      content: "Service Provider shall provide the services described in Exhibit A (the \"Services\"). All Services shall be performed in a professional and workmanlike manner, consistent with industry standards."
    },
    {
      id: "sec-3",
      title: "3. Fees and Payment",
      content: "Client shall pay Service Provider the fees set forth in Exhibit B. All invoices are due Net 30 from the date of receipt. Late payments shall accrue interest at the lesser of 1.5% per month or the maximum rate permitted by law."
    },
    {
      id: "sec-4",
      title: "4. Indemnification",
      isFlagged: true,
      riskTitle: "One-Sided Indemnification",
      content: "Client shall indemnify, defend and hold harmless Service Provider and its officers, directors, and employees from and against any and all claims, losses, damages, liabilities, costs and expenses (including reasonable attorneys' fees) arising out of or relating to Client's breach of this Agreement, regardless of Service Provider's negligence.",
      proposedFix: "Each party shall indemnify, defend and hold harmless the other party from and against any third-party claims arising out of the indemnifying party's gross negligence or willful misconduct in the performance of its obligations under this Agreement."
    },
    {
      id: "sec-5",
      title: "5. Limitation of Liability",
      content: "In no event shall either party be liable for any special, incidental, indirect, or consequential damages. Service Provider's total liability under this Agreement shall not exceed the total fees paid by Client in the twelve (12) months preceding the claim."
    }
  ]
};

const MOCK_CHAT = [
  {
    role: "ai",
    content: "I've analyzed the MSA. The primary risk identified is in Section 4 (Indemnification), which is currently heavily skewed in favor of the Service Provider. Would you like me to explain the implications or proceed with the protocol fix?",
    source: "AiRiskDiscovery"
  },
  {
    role: "user",
    content: "What are the specific risks in Sec 4.2 regarding liability?"
  },
  {
    role: "ai",
    content: "In Section 4.2, the current language requires the Client to indemnify the Service Provider 'regardless of Service Provider's negligence.' This is a high-risk clause as it essentially forces you to pay for their mistakes. My suggested fix converts this to a mutual indemnification limited to gross negligence.",
    source: "Sec 4.2 Liability"
  }
];

// --- Sub-components (Local Implementation) ---

const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase", className)}>
    {children}
  </span>
);

const Button = ({ 
  children, 
  className, 
  variant = "primary", 
  disabled,
  onClick 
}: { 
  children: React.ReactNode, 
  className?: string, 
  variant?: "primary" | "secondary" | "ghost",
  disabled?: boolean,
  onClick?: () => void
}) => {
  const variants = {
    primary: "bg-[#FF7043] text-white hover:bg-[#EA580C]",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    ghost: "hover:bg-slate-100 text-slate-600"
  };
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-2 text-sm",
        variants[variant],
        disabled && "opacity-50 cursor-not-allowed grayscale",
        className
      )}
    >
      {children}
    </button>
  );
};

export default function RegistryPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = React.use(params);
  const [activeTab, setActiveTab] = useState<"redlines" | "rag">("redlines");
  const [fixedClauses, setFixedClauses] = useState<string[]>([]);
  const [activeContext, setActiveContext] = useState<string | null>(null);

  const handleExecuteFix = (id: string) => {
    setFixedClauses([...fixedClauses, id]);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white overflow-hidden text-slate-900">
      {/* Slim Sticky Header */}
      <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0 z-50">
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href="/registry" className="text-slate-500 hover:text-[#FF7043] transition-colors">REGISTRY</Link>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <span className="text-slate-500">{MOCK_CONTRACT.vendor}</span>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <span className="text-slate-900">{MOCK_CONTRACT.filename}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700 tracking-tight">AI SYNCED</span>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Pane: Document Viewer */}
        <section className="w-full lg:w-[60vw] bg-white border-r border-slate-200 overflow-y-auto p-12 custom-scrollbar">
          <div className="max-w-3xl mx-auto prose prose-slate">
            <h1 className="font-display text-4xl mb-8">{MOCK_CONTRACT.title}</h1>
            
            {MOCK_CONTRACT.clauses.map((clause) => (
              <div 
                key={clause.id} 
                className={cn(
                  "mb-8 transition-all duration-500 p-2 -m-2 rounded-lg cursor-pointer",
                  clause.isFlagged && !fixedClauses.includes(clause.id) && "bg-[#FF7043]/5 border-l-2 border-[#FF7043] pl-4",
                  fixedClauses.includes(clause.id) && "bg-emerald-50/50 border-l-2 border-emerald-400 pl-4",
                  activeContext === clause.title && "ring-1 ring-slate-100"
                )}
                onClick={() => setActiveContext(clause.title)}
              >
                <h3 className="text-lg font-bold mb-2">{clause.title}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {fixedClauses.includes(clause.id) ? (
                    <span className="bg-emerald-50 text-emerald-900 px-1 rounded">
                      {clause.proposedFix}
                    </span>
                  ) : clause.content}
                </p>
              </div>
            ))}
            
            <div className="h-20" /> {/* Bottom Spacer */}
          </div>
        </section>

        {/* Right Pane: AI Control Panel */}
        <section className="w-full lg:w-[40vw] bg-[#F8FAFC] flex flex-col overflow-hidden">
          
          {/* Tabs Header */}
          <div className="bg-white border-b border-slate-200 p-1 shrink-0">
            <div className="flex gap-1 bg-slate-100/50 p-1 rounded-md">
              <button 
                onClick={() => setActiveTab("redlines")}
                className={cn(
                  "flex-1 py-2 text-xs font-bold tracking-wider rounded transition-all",
                  activeTab === "redlines" 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                PROTOCOL REDLINES
              </button>
              <button 
                onClick={() => setActiveTab("rag")}
                className={cn(
                  "flex-1 py-2 text-xs font-bold tracking-wider rounded transition-all",
                  activeTab === "rag" 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                RAG INTELLIGENCE
              </button>
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {activeTab === "redlines" ? (
              <div className="space-y-6">
                {MOCK_CONTRACT.clauses.filter(c => c.isFlagged).map(clause => (
                  <div key={clause.id} className="bg-[#0F172A] rounded-xl overflow-hidden shadow-xl border border-slate-800">
                    <div className="p-5 border-b border-slate-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-3 h-3 text-[#FF7043]" />
                        <span className="text-[10px] font-bold text-[#FF7043] tracking-widest uppercase">AGENT: RISK ANALYST</span>
                      </div>
                      <h4 className="text-white font-bold text-lg">{clause.riskTitle}</h4>
                    </div>
                    
                    <div className="p-5 space-y-4">
                      <div className="bg-slate-900 p-4 rounded-lg font-mono text-sm leading-relaxed border border-slate-800">
                        <div className="text-slate-500 line-through mb-3">
                          {clause.content}
                        </div>
                        <div className="text-emerald-400">
                          {clause.proposedFix}
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => handleExecuteFix(clause.id)}
                        disabled={fixedClauses.includes(clause.id)}
                        className="w-full h-12"
                      >
                        {fixedClauses.includes(clause.id) ? (
                          <><CheckCircle2 className="w-4 h-4" /> FIX APPLIED</>
                        ) : (
                          "EXECUTE PROTOCOL FIX"
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex-1 space-y-6 pb-4">
                  {MOCK_CHAT.map((msg, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex flex-col gap-2 max-w-[85%]",
                        msg.role === "user" ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div className={cn(
                        "p-4 rounded-2xl text-sm leading-relaxed",
                        msg.role === "user" 
                          ? "bg-white border border-slate-200 text-slate-800 shadow-sm" 
                          : "bg-[#0F172A] text-white shadow-lg"
                      )}>
                        {msg.content}
                        
                        {msg.source && (
                          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3 text-[#FF7043]" />
                            <span className="text-[10px] font-bold text-[#FF7043] tracking-tight uppercase">Source: {msg.source}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Area (for RAG Intelligence) */}
          {activeTab === "rag" && (
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              {/* Context Chip */}
              {activeContext && (
                <div className="mb-3 flex items-center justify-between bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-md animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#FF7043]" />
                    <span className="text-xs font-medium text-slate-600">Context: <span className="text-slate-900">{activeContext}</span></span>
                  </div>
                  <button onClick={() => setActiveContext(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Ask the legal guardian..."
                  className="w-full h-12 pl-4 pr-12 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF7043] transition-all text-sm group-hover:border-slate-300"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#FF7043] hover:bg-[#FF7043]/10 rounded-md transition-colors">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
