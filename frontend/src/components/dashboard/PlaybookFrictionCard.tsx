"use client"

import React from "react"
import { complianceAuditData } from "@/data/mockData"

export function PlaybookFrictionCard() {
  const data = complianceAuditData.clauseDeviations
  const maxFreq = Math.max(...data.map(d => parseInt(d.frequency)))

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl flex flex-col h-full">
      <div className="mb-6">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
          Top Playbook Deviations
        </span>
      </div>

      <div className="space-y-4 flex-1">
        {data.map((item) => {
          const isHighest = parseInt(item.frequency) === maxFreq
          return (
            <div key={item.clause} className="flex items-center justify-between group cursor-default">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-700 group-hover:text-primary transition-colors">
                  {item.clause}
                </span>
                {isHighest && (
                  <span className="px-2 py-0.5 border border-primary text-[8px] font-bold text-primary uppercase tracking-tighter rounded-full leading-none animate-pulse">
                    Bottleneck
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                {item.frequency}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-8 pt-4 border-t border-slate-100 italic text-[9px] text-slate-400">
        Weighted average friction score: <span className="text-slate-900 font-bold">29.4%</span>
      </div>
    </div>
  )
}
