"use client"

import React from "react"
import { Shield, Key, Users, Mail, Plus, Database, Terminal } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  const [email, setEmail] = React.useState("")
  const [pendingInvites, setPendingInvites] = React.useState<string[]>([])
  const [success, setSuccess] = React.useState(false)

  const [purgeInput, setPurgeInput] = React.useState("")
  const [isPurging, setIsPurging] = React.useState(false)

  React.useEffect(() => {
    const saved = localStorage.getItem("pending_invites")
    if (saved) setPendingInvites(JSON.parse(saved))
  }, [])

  const handleInvite = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return alert("Please enter a valid institutional email.")
    
    const newList = [...pendingInvites, email]
    setPendingInvites(newList)
    localStorage.setItem("pending_invites", JSON.stringify(newList))
    setEmail("")
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <PageHeader 
        title="System Configuration" 
        description="Institutional Control Plane" 
      />

      <div className="grid gap-6">
        {[
          { name: "API & Webhooks", desc: "Manage programmatic access and CLM integrations.", icon: Terminal, customAction: "GENERATE KEY" },
          { name: "Authentication", desc: "Enterprise SSO and institutional access logs.", icon: Key, status: "Azure AD" },
          { name: "Team Governance", desc: "Manage reviewer permissions and audit cycles.", icon: Users, status: "Admin ONLY" },
        ].map((item) => (
          <div key={item.name} className="premium-card p-6 flex items-center justify-between group hover:border-primary transition-all cursor-pointer">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200 group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
                 <item.icon className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-0.5 tracking-tight">{item.name}</h4>
                <p className="text-[11px] text-slate-500 font-medium">{item.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {item.status && <span className="text-[10px] font-mono font-bold text-slate-400 px-2 py-1 bg-slate-50 rounded border border-slate-100">{item.status}</span>}
              {item.customAction ? (
                <button className="px-3 py-1.5 border border-slate-200 rounded text-[9px] font-bold text-slate-700 hover:bg-slate-50 uppercase tracking-widest transition-colors">
                  {item.customAction}
                </button>
              ) : (
                <button className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">Manage</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="premium-card p-10 bg-white/50 border-primary/20 shadow-lg shadow-primary/5">
        <div className="flex items-center gap-4 mb-8">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Invite Team Member</h3>
            <p className="text-[10px] text-slate-500 font-medium">Add review consultants to your institutional workspace.</p>
          </div>
        </div>

        <div className="flex gap-4">
          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@enterprise.com"
            className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-primary focus:border-primary transition-all"
          />
          <button 
            onClick={handleInvite}
            className="px-8 py-3 bg-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Send Invitation
          </button>
        </div>

        {success && (
          <p className="mt-4 text-[10px] font-bold text-green-600 uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
            ✓ Invitation dispatched successfully.
          </p>
        )}

        {pendingInvites.length > 0 && (
          <div className="mt-10 pt-8 border-t border-slate-100">
             <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pending Access Tokens</h4>
             <div className="space-y-3">
               {pendingInvites.map((inv, i) => (
                 <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
                   <span className="text-xs font-mono text-slate-600">{inv}</span>
                   <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Verification</span>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>

      <div className="pt-10 border-t border-slate-200">
         <h3 className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-6 px-2">Institutional Deletion Protocol</h3>
         <div className="premium-card p-8 border-red-100 bg-red-50/10 flex items-center justify-between">
            <div>
               <p className="text-sm font-bold text-slate-900 mb-1">Wipe Data Repository</p>
               <p className="text-xs text-slate-500">Permanently remove all enterprise contract data and analysis trails.</p>
            </div>
             <AlertDialog>
               <AlertDialogTrigger asChild>
                 <button className="px-6 py-3 bg-red-500 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">Purge Registry</button>
               </AlertDialogTrigger>
               <AlertDialogContent className="sm:max-w-[425px]">
                 <AlertDialogHeader>
                   <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                     <Shield className="w-5 h-5" />
                     Extreme Caution Required
                   </AlertDialogTitle>
                   <AlertDialogDescription className="text-slate-600 pt-2">
                     This action will <strong>permanently delete</strong> all metadata, contract vectors, and analysis logs. This process is irreversible.
                   </AlertDialogDescription>
                 </AlertDialogHeader>
                 <div className="py-6 space-y-4">
                   <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                     Type <span className="text-red-500">PURGE</span> to confirm
                   </p>
                   <Input 
                     value={purgeInput}
                     onChange={(e) => setPurgeInput(e.target.value)}
                     placeholder="Verification string"
                     className="uppercase font-mono text-center tracking-tighter"
                   />
                 </div>
                 <AlertDialogFooter>
                   <AlertDialogCancel onClick={() => setPurgeInput("")}>Cancel</AlertDialogCancel>
                   <AlertDialogAction 
                     disabled={purgeInput !== "PURGE"}
                     className="bg-red-500 hover:bg-red-600 text-white"
                     onClick={() => {
                       console.log("Registry purged.")
                       setPurgeInput("")
                     }}
                   >
                     Confirm Destruction
                   </AlertDialogAction>
                 </AlertDialogFooter>
               </AlertDialogContent>
             </AlertDialog>
         </div>
      </div>
    </div>
  )
}
