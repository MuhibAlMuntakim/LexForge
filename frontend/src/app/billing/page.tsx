"use client"

import React from "react"
import { CreditCard, CheckCircle2 } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"

const plans = [
  {
    name: "Associate",
    price: "499",
    description: "Ideal for boutique firms and individual consultants.",
    features: ["50 Contract Credits", "Standard Playbook", "Basic AI Insights", "Standard Security", "Email Support"],
    current: true
  },
  {
    name: "Partner",
    price: "1,299",
    description: "Enterprise-grade intelligence for high-volume legal teams.",
    features: ["Unlimited Contracts", "Custom Legal Playbooks", "Advanced AI RAG Context", "Priority Support", "Bulk Remediation"],
    featured: true
  }
]

export default function BillingPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <PageHeader 
        title="Institutional Subscription" 
        description="Manage your enterprise intelligence capacity" 
      />

      <div className="grid md:grid-cols-2 gap-8">
        {plans.map((plan) => (
          <div 
            key={plan.name} 
            className={`premium-card p-10 relative overflow-hidden group ${
              plan.featured ? 'border-primary/30 ring-1 ring-primary/10 bg-white/50' : ''
            }`}
          >
            {plan.featured && (
              <div className="absolute top-0 right-0 px-4 py-1 bg-primary text-white text-[9px] font-bold uppercase tracking-widest rounded-bl-lg">
                Recommended
              </div>
            )}
            
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-2xl font-light text-slate-900 mb-2 tracking-tight">{plan.name}</h3>
                <p className="text-slate-500 text-xs font-medium">{plan.description}</p>
              </div>
              <div className="text-right">
                <span className="text-4xl font-light text-slate-900 tracking-tight">${plan.price}</span>
                <span className="text-slate-400 text-[10px] font-bold block uppercase tracking-widest">/month</span>
              </div>
            </div>

            <ul className="space-y-4 mb-10">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <CheckCircle2 className={`w-4 h-4 ${plan.featured ? 'text-primary' : 'text-slate-300'}`} /> {f}
                </li>
              ))}
            </ul>

            <button className={`w-full py-3 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
              plan.current 
                ? 'border border-slate-200 text-slate-400 cursor-default' 
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10'
            }`}>
              {plan.current ? 'Current Plan' : 'Upgrade Workspace'}
            </button>
          </div>
        ))}
      </div>

      <div className="premium-card p-8 bg-slate-50/50 border-slate-200/60 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded bg-white flex items-center justify-center border border-slate-200">
            <CreditCard className="text-slate-400 w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Payment Repository</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Corporate Visa ending in 4242</p>
          </div>
        </div>
        <button className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">Update Source</button>
      </div>
    </div>
  )
}
