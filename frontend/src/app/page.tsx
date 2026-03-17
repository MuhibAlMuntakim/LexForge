"use client"

import React from "react"
import { motion } from "framer-motion"
import { stats, reviews, riskDistribution, ReviewResponse } from "@/data/mockData"
import { StatCard } from "@/components/dashboard/StatCard"
import { ActiveReviewsTable } from "@/components/dashboard/ActiveReviewsTable"
import { PortfolioRiskTaxonomy } from "@/components/dashboard/PortfolioRiskTaxonomy"
import { RagIntelligenceHub } from "@/components/dashboard/RagIntelligenceHub"
import { AgentTelemetryFeed } from "@/components/dashboard/AgentTelemetryFeed"
import { PageHeader } from "@/components/layout/PageHeader"
import { useContracts } from "@/hooks/useContracts"

export default function DashboardPage() {
  const { data: liveReviews, isLoading } = useContracts()
  
  // Minimal mapping for dashboard table
  const displayReviews = (liveReviews || []).slice(0, 5).map((r: ReviewResponse) => ({
    id: r.contract_id,
    title: r.contract_id, // Title not in history, use ID
    uuid: r.contract_id.substring(0, 8).toUpperCase(),
    type: 'CONTRACT',
    status: 'Approved', 
    risk: 15,
    latency: '00:00:00'
  }))

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 overflow-visible">
        <div className="max-w-7xl mx-auto space-y-12">
          <PageHeader 
            title="Portfolio Overview" 
            description="Institutional Legal Intelligence" 
          />

          {/* Metric Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <StatCard {...stat} />
              </motion.div>
            ))}
          </div>

          {/* Main Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <ActiveReviewsTable reviews={displayReviews.length > 0 ? displayReviews : (isLoading ? [] : reviews)} />
          </motion.div>
        </div>
      </div>

      {/* Intelligence Hub Rail */}
      <aside className="w-80 border-l border-slate-900 bg-slate-900 p-8 flex flex-col gap-8 overflow-y-auto no-scrollbar hidden xl:flex">
        <div className="mb-2 text-center">
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">
            Intelligence Hub
          </span>
        </div>
        <PortfolioRiskTaxonomy />
        <RagIntelligenceHub />
        <AgentTelemetryFeed />
      </aside>
    </div>
  )
}
