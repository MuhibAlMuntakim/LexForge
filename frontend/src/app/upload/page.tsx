"use client"

import React, { useRef } from "react"
import { motion } from "framer-motion"
import { useUploadContract } from "@/hooks/useContracts"
import { PageHeader } from "@/components/layout/PageHeader"

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadContract()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadMutation.mutate(file)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader 
        title="Contract Ingestion" 
        description="Upload documents for institutional analysis" 
      />

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
        accept=".pdf,.docx"
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => fileInputRef.current?.click()}
        className={`aspect-[16/6] border-2 border-dashed rounded-xl bg-white flex flex-col items-center justify-center gap-4 group transition-colors cursor-pointer ${
          uploadMutation.isPending ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary'
        }`}
      >
        <div className={`size-16 rounded-full flex items-center justify-center transition-colors ${
          uploadMutation.isPending ? 'bg-primary text-white animate-pulse' : 'bg-slate-50 text-slate-400 group-hover:text-primary'
        }`}>
          <span className="material-symbols-outlined text-3xl">
            {uploadMutation.isPending ? 'sync' : 'upload_file'}
          </span>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-900">
            {uploadMutation.isPending ? 'Processing Institutional Analysis...' : 'Drop your MSA, Lease, or NDA here'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {uploadMutation.isSuccess ? 'Upload Successful!' : uploadMutation.isError ? 'Analysis Failed. Try again.' : 'PDF or DOCX (Max 25MB)'}
          </p>
        </div>
        {!uploadMutation.isPending && (
          <button className="mt-4 px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded uppercase tracking-widest hover:bg-slate-800 transition-all">
            Browse Files
          </button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-slate-200 rounded-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Batch Upload</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Uploading multiple files? Our batch processor will automatically classify and queue items for parallel analysis.
          </p>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Direct Connection</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Connect your Ironclad or Conga repository to automatically sync every new contract executed.
          </p>
        </div>
      </div>
    </div>
  )
}
