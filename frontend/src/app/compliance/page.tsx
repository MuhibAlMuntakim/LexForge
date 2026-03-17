"use client"

import React from "react"
import { motion } from "framer-motion"
import { PageHeader } from "@/components/layout/PageHeader"
import { RegulatoryAlignmentCard } from "@/components/dashboard/RegulatoryAlignmentCard"
import { LiabilityExposureCard } from "@/components/dashboard/LiabilityExposureCard"
import { PlaybookFrictionCard } from "@/components/dashboard/PlaybookFrictionCard"

export default function CompliancePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex items-end justify-between">
          <PageHeader 
            title="Compliance & Exposure Audit" 
            description="Enterprise Legal Risk Intelligence & Mitigation" 
          />
          <div className="flex gap-4 mb-4 text-slate-900">
            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Global Health Index</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-light tracking-tight">89.4</span>
                <span className="text-sm font-bold text-slate-400">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Audit Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <RegulatoryAlignmentCard />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <LiabilityExposureCard />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <PlaybookFrictionCard />
          </motion.div>
        </div>

        {/* Audit Context Note */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-xl border border-slate-100 bg-slate-50/50 text-center"
        >
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Confidence Level: <span className="text-emerald-500">High (98.2%)</span> • 
            Last Intelligence Sync: <span className="text-slate-900">4 minutes ago</span> • 
            Reference: <span className="text-primary italic">Global Playbook v4.2</span>
          </p>
        </motion.div>
      </div>
  )
}
