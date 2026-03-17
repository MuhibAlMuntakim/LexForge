"use client"

import React from "react"
import { useContracts } from "@/hooks/useContracts"
import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { reviews as mockReviews, Review, ReviewResponse } from "@/data/mockData"

export default function InventoryPage() {
  const { data: contracts, isLoading } = useContracts()
  const displayContracts = contracts?.length > 0 ? contracts : (!isLoading ? mockReviews : [])

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <PageHeader 
          title="Contract Inventory" 
          description="Centralized institutional repository" 
        />
        <div className="flex gap-3 mb-8">
          <div className="relative">
             <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">filter_list</span>
             <select className="pl-10 pr-8 py-2 bg-white border border-slate-200 rounded text-xs font-bold uppercase tracking-widest focus:ring-primary appearance-none cursor-pointer">
               <option>All Types</option>
               <option>MSA</option>
               <option>NDA</option>
               <option>Lease</option>
             </select>
          </div>
        </div>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="text-left px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document</th>
                <th className="text-left px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entity</th>
                <th className="text-left px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Analyzed</th>
                <th className="text-right px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6"><div className="h-4 w-48 bg-slate-100 rounded"></div></td>
                    <td className="px-8 py-6"><div className="h-4 w-24 bg-slate-100 rounded"></div></td>
                    <td className="px-8 py-6"><div className="h-4 w-32 bg-slate-100 rounded"></div></td>
                    <td className="px-8 py-6"><div className="h-4 w-12 bg-slate-100 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : displayContracts.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                displayContracts.map((contract: any) => (
                  <tr key={contract.contract_id || contract.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors">
                          {contract.title || contract.contract_id}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">ID: {(contract.contract_id || contract.id).substring(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs text-slate-600">
                      {contract.company_id || 'Institutional'}
                    </td>
                    <td className="px-8 py-6 text-xs text-slate-400 font-mono">
                      {contract.timestamp ? new Date(contract.timestamp).toLocaleDateString() : '2024-03-17'}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Link 
                        href={`/registry/${contract.contract_id || contract.id}`}
                        className="text-primary text-[10px] font-bold uppercase tracking-widest hover:underline"
                      >
                        Open Review
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-400 text-sm italic">
                    No contracts found in the institutional repository.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
