"use client"

import React from "react"
import { motion } from "framer-motion"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { dashboardRightColumnData } from "@/data/mockData"

export function PortfolioRiskTaxonomy() {
  const data = dashboardRightColumnData.riskTaxonomy
  const totalViolations = 57 // As per spec

  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl p-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-primary/10" />
      
      <div className="relative z-10">
        <div className="flex flex-col mb-6">
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-1">
            Portfolio Risk Taxonomy
          </span>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Top Playbook Violations
          </span>
        </div>

        <div className="h-48 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0F172A', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '10px',
                  color: '#fff'
                }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-4xl font-serif font-light text-white leading-none">{totalViolations}</span>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
          {data.map((item) => (
            <div key={item.category} className="flex items-center justify-between group/item">
              <div className="flex items-center gap-2">
                <div 
                  className="size-1.5 rounded-full" 
                  style={{ backgroundColor: item.color }} 
                />
                <span className="text-[10px] font-medium text-slate-400 group-hover/item:text-slate-200 transition-colors">
                  {item.category}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-500 group-hover/item:text-white transition-colors">
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
