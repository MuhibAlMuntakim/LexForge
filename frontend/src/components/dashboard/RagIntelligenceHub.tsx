"use client"

import React from "react"
import { motion } from "framer-motion"
import { dashboardRightColumnData } from "@/data/mockData"
import Link from "next/link"

export function RagIntelligenceHub() {
  const chats = dashboardRightColumnData.recentChats

  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl p-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex flex-col mb-6">
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-1">
            RAG Intelligence Hub
          </span>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Portfolio-Wide Query
          </span>
        </div>

        <div className="relative flex items-center gap-2 mb-8">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">psychology</span>
            <input 
              type="text"
              placeholder="Ask a question across your portfolio..."
              className="w-full pl-10 pr-4 py-3 bg-slate-800/40 border-white/5 rounded text-[10px] text-white placeholder:text-slate-600 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 border transition-all outline-none"
            />
          </div>
          <button className="size-10 bg-primary text-white rounded flex items-center justify-center hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all shrink-0">
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </div>

        <div>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-4">
            Recent Sessions
          </span>
          <div className="space-y-2">
            {chats.map((chat) => (
              <Link 
                key={chat.id}
                href="/chat"
                className="flex items-center justify-between p-3 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10 transition-all group/session"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-500 text-sm group-hover/session:text-primary transition-colors">chat_bubble</span>
                  <span className="text-[10px] font-medium text-slate-300 truncate max-w-[120px]">
                    {chat.doc}
                  </span>
                </div>
                <span className="text-[9px] text-slate-600 font-mono">
                  {chat.time}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
