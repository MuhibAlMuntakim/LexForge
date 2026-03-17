"use client"

import React from "react"
import { motion } from "framer-motion"
import { dashboardRightColumnData } from "@/data/mockData"

export function AgentTelemetryFeed() {
  const telemetry = dashboardRightColumnData.agentTelemetry

  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl p-6 shadow-2xl relative overflow-hidden group flex-1">
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mb-16 blur-2xl pointer-events-none" />
      
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex flex-col mb-6">
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-1">
            Live Agent Telemetry
          </span>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            CrewAI Execution Log
          </span>
        </div>

        <div className="flex-1 space-y-6">
          {telemetry.map((item, i) => (
            <motion.div 
              key={`${item.agent}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-4"
            >
              <div className="mt-1 shrink-0">
                {item.status === 'processing' ? (
                  <div className="relative flex items-center justify-center">
                    <span className="absolute size-2 bg-primary rounded-full animate-ping opacity-75" />
                    <span className="relative size-1.5 bg-primary rounded-full" />
                  </div>
                ) : (
                  <div className="size-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <span className="text-[10px] font-bold text-white tracking-tight truncate">
                    {item.agent}
                  </span>
                  <span className="text-[8px] font-mono text-slate-600 shrink-0 mt-0.5">
                    {item.time}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
                  {item.action}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-1 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">System Active</span>
          </div>
          <span className="text-[8px] font-mono text-slate-500">v2.4.0-CORE</span>
        </div>
      </div>
    </div>
  )
}
