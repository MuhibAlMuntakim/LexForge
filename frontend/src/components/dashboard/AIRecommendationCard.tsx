import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, CheckCircle2, AlertCircle } from 'lucide-react';

export const AIRecommendationCard: React.FC = () => {
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleUpdate = () => {
    setIsUpdating(true);
    setTimeout(() => setIsUpdating(false), 2000);
  };

  return (
    <div className="bg-slate-900 p-8 rounded shadow-premium border border-slate-800 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
         <Cpu size={80} className="text-primary" />
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="size-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
          <span className="material-symbols-outlined text-xl">auto_awesome</span>
        </div>
        <div>
          <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">Compliance Engine</h4>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Instance ID: LF-99-AI</p>
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Playbook Alignment</span>
            <span className="text-lg font-serif font-bold text-white">94.2%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "94.2%" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-primary"
            />
          </div>
        </div>

        <div className="p-4 bg-white/5 rounded border border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span className="text-[10px] text-slate-300 font-medium">EU Data Privacy V2 Sync: <span className="text-white">Active</span></span>
          </div>
          <div className="flex items-center gap-3">
            <AlertCircle size={12} className="text-primary" />
            <span className="text-[10px] text-slate-300 font-medium">Arbitration Threshold: <span className="text-white">Needs Adjustment</span></span>
          </div>
        </div>

        <button 
          onClick={handleUpdate}
          disabled={isUpdating}
          className="w-full py-3 bg-white text-slate-900 text-[10px] font-bold rounded hover:bg-slate-100 transition-all uppercase tracking-[0.2em] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-[1.02]"
        >
          {isUpdating ? 'Synchronizing...' : 'Execute Protocol Fix'}
        </button>
      </div>
    </div>
  );
};
