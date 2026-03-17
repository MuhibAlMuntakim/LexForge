
"use client"

import React from "react"
import { Sidebar } from "./Sidebar"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState } from "react"

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

  return (
    <div className="flex bg-slate-900 text-slate-900 min-h-screen font-sans antialiased overflow-hidden">
      <Sidebar 
        isHovered={isSidebarExpanded} 
        onMouseEnter={() => setIsSidebarExpanded(true)} 
        onMouseLeave={() => setIsSidebarExpanded(false)} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-slate-900 border-b border-white/10 flex items-center justify-between px-8 shrink-0 z-[60] font-sans sticky top-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
              <input 
                className="pl-10 pr-4 py-2 bg-slate-800/50 border-slate-700 rounded text-xs w-80 text-white focus:ring-primary focus:border-primary border transition-all placeholder:text-slate-600" 
                placeholder="Search institutional database..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <Link 
            href="/upload"
            className="bg-primary text-white px-5 py-2 rounded text-xs font-bold hover:bg-primary-hover transition-all flex items-center gap-2 shadow-sm uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Contract
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
