"use client"

import React from "react"
import { complianceAuditData } from "@/data/mockData"

export function LiabilityExposureCard() {
  const { criticalCount, contracts } = complianceAuditData.liabilityExposure

  return (
    <div className="bg-white border-2 border-primary/20 rounded-xl p-6 shadow-xl flex flex-col h-full relative overflow-hidden group">
      {/* Decorative indicator */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-3xl group-hover:bg-primary/10 transition-all" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="mb-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
            Uncapped Liability Exposure
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-8xl font-serif font-light text-primary leading-none tracking-tighter">
            {criticalCount.toString().padStart(2, '0')}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Crucial</span>
        </div>

        <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-6">
          Contracts lacking standard liability caps, presenting significant institutional financial risk.
        </p>

        <div className="mt-auto space-y-2">
          {contracts.map((doc, i) => (
            <div key={doc} className="flex items-center gap-3 py-1 group/item">
              <div className="size-1 rounded-full bg-primary/40 group-hover/item:bg-primary transition-colors" />
              <span className="text-[10px] font-bold text-slate-600 group-hover/item:text-slate-900 transition-colors cursor-pointer">
                {doc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
