import React from 'react';
import { motion } from 'framer-motion';
import { Target, Activity } from 'lucide-react';

export const ComplianceMiniCard: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 p-8 rounded shadow-premium group relative overflow-hidden h-[340px]">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Target size={80} className="text-primary" />
      </div>
      
      <div className="flex items-center gap-3 mb-8 relative z-10">
        <div className="size-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
          <Activity size={20} />
        </div>
        <div>
          <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">Playbook Alignment</h4>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Velocity: +14.2%</p>
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] group-hover:text-slate-300 transition-colors">Institutional Precision</span>
            <span className="text-2xl font-serif font-bold text-white tracking-tight">82%</span>
        </div>
        
        <div className="flex items-end gap-2.5 h-24">
          {[40, 60, 55, 80, 70, 95, 82].map((h, i) => (
            <div 
              key={i}
              className="flex-1 relative group/bar"
            >
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 1, delay: i * 0.1 }}
                className={`w-full rounded-sm transition-all duration-300 ${
                  i === 6 ? 'bg-primary shadow-[0_0_15px_rgba(255,112,67,0.4)]' : 'bg-white/5 group-hover/bar:bg-white/10'
                }`}
              />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-600 uppercase tracking-tighter">
                M{i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
};
