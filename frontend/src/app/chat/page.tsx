"use client"

import React from "react"

import { PageHeader } from "@/components/layout/PageHeader"

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-160px)] flex flex-col gap-6">
      <PageHeader 
        title="Legal Assistant" 
        description="RAG-powered intelligence across your inventory" 
      />

      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 p-8 text-center flex flex-col items-center justify-center text-slate-400 gap-4">
          <span className="material-symbols-outlined text-5xl">chat_bubble</span>
          <p className="text-sm">Initiate a session to query your contracts for specific clauses or risks.</p>
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Ask a legal question... (e.g., 'What are our standard indemnity terms?')"
              className="w-full pl-6 pr-16 py-4 bg-white border border-slate-200 rounded-lg text-sm focus:ring-primary focus:border-primary border transition-all"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 size-10 bg-slate-900 text-white rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
