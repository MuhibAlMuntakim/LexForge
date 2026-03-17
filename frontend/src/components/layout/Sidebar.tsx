"use client"

import React from "react"
import { 
  FileText, 
  Settings, 
  Shield, 
  Upload, 
  MessageSquare,
  LayoutDashboard,
  Scale,
  BookOpen,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SidebarProps {
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Shield, label: "Compliance", href: "/compliance" },
  { icon: FileText, label: "Inventory", href: "/contracts" },
  { icon: MessageSquare, label: "Co-Pilot", href: "/chat" },
  { icon: BookOpen, label: "Playbook", href: "/playbook" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

export function Sidebar({ isHovered, onMouseEnter, onMouseLeave }: SidebarProps) {
  const pathname = usePathname()

  return (
    <motion.aside 
      className="bg-slate-900 text-white z-[70] flex flex-col items-center py-6 overflow-hidden"
      animate={{ width: isHovered ? 240 : 64 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Logo Section */}
      <div className="flex items-center gap-4 px-5 mb-12 w-full overflow-hidden shrink-0">
        <div className="size-9 rounded bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
          <Scale className="text-white w-5 h-5" />
        </div>
        <motion.span 
          animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
          className="text-xl font-serif font-bold tracking-tight whitespace-nowrap text-primary"
        >
          LexForge
        </motion.span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 w-full px-3 space-y-1 overflow-y-auto no-scrollbar py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.label} href={item.href}>
              <div 
                className={cn(
                  "flex items-center gap-4 px-3 py-2 rounded-lg transition-all relative group h-10",
                  isActive 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-primary")} />
                <motion.span 
                  animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-primary"
                  )}
                >
                  {item.label}
                </motion.span>
                
                {/* Active Indicator Pipe */}
                {isActive && (
                  <motion.div 
                    layoutId="activePipe"
                    className="absolute left-[-12px] w-1 h-5 bg-primary rounded-r-full shadow-[0_0_15px_rgba(255,112,67,0.8)]"
                  />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Account / Support Section */}
      <div className="mt-auto w-full px-3 py-4 space-y-1 overflow-hidden shrink-0">
        <button className="flex items-center gap-4 px-3 py-2 w-full rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all group h-10">
          <LogOut className="w-4 h-4 shrink-0 group-hover:-translate-x-1 transition-transform" />
          <motion.span 
            animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
            className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
          >
            Logout
          </motion.span>
        </button>
        
        <div className="flex items-center gap-3 px-3 py-3 overflow-hidden mt-2">
           <div className="size-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[9px] font-bold shrink-0">JD</div>
           <motion.div 
             animate={{ opacity: isHovered ? 1 : 0 }}
             className="flex flex-col whitespace-nowrap overflow-hidden"
           >
             <span className="text-[9px] font-bold">John Doe</span>
             <span className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Enterprise Tier</span>
           </motion.div>
        </div>
      </div>
    </motion.aside>
  )
}
