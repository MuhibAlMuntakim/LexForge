"use client"

import React from "react"
import { complianceAuditData } from "@/data/mockData"

export function RegulatoryAlignmentCard() {
  const data = complianceAuditData.regulatoryAlignment

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl flex flex-col h-full">
      <div className="mb-6">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
          Framework Alignment
        </span>
      </div>

      <div className="space-y-6 flex-1">
        {data.map((item) => (
          <div key={item.framework} className="group">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-bold text-slate-700 group-hover:text-primary transition-colors">
                {item.framework}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {item.coverage}%
              </span>
            </div>
            
            {/* Custom Premium Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ease-out ${
                  item.coverage > 90 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "bg-primary shadow-[0_0_8px_rgba(255,112,67,0.3)]"
                }`}
                style={{ width: `${item.coverage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
