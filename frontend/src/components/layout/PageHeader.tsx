"use client"

import React from "react"
import { motion } from "framer-motion"

interface PageHeaderProps {
  title: string
  description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="space-y-4 mb-12">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-4 block">
          Enterprise Hub
        </span>
        <h1 className="text-5xl font-serif font-bold text-gradient-primary tracking-tight pb-1">
          {title}
        </h1>
        {description && (
          <p className="text-slate-500 font-medium max-w-2xl leading-relaxed mt-2">
            {description}
          </p>
        )}
      </motion.div>
    </div>
  )
}
