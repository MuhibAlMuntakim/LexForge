import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3, Binary } from 'lucide-react';
import { RiskData } from '@/data/mockData';

export interface RiskDistributionCardProps {
  data: RiskData[];
}

export const RiskDistributionCard: React.FC<Readonly<RiskDistributionCardProps>> = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 p-8 rounded shadow-premium flex flex-col items-center relative overflow-hidden h-[580px] group">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-50"></div>
      
      <div className="w-full flex items-center gap-3 mb-10 relative z-10">
        <div className="size-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
          <Binary size={20} />
        </div>
        <div>
          <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">Variance Discovery</h4>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Differential Risk Analysis</p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
        <div className="relative size-72 flex items-center justify-center">
          {/* Orbital Ticks */}
          {[...Array(24)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-full h-full flex items-start justify-center opacity-10"
              style={{ transform: `rotate(${i * 15}deg)` }}
            >
              <div className="w-[1px] h-2 bg-slate-400"></div>
            </div>
          ))}

          <svg className="size-full -rotate-90 relative z-10 drop-shadow-[0_20px_50px_rgba(255,112,67,0.1)]" viewBox="0 0 100 100">
            {/* Outer Orbit */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
            <motion.circle 
              cx="50" cy="50" r="45" 
              fill="none" 
              stroke="#FF7043" 
              strokeWidth="2.5" 
              strokeDasharray="180 300"
              strokeLinecap="round"
              initial={{ strokeDashoffset: 510 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
            
            {/* Secondary Ring */}
            <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(255,255,255,0.01)" strokeWidth="0.5" />
            <motion.circle 
              cx="50" cy="50" r="32" 
              fill="none" 
              stroke="#475569" 
              strokeWidth="1.5" 
              strokeDasharray="100 300"
              strokeLinecap="round"
              initial={{ strokeDashoffset: 510 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="flex flex-col items-center"
            >
              <div className="flex items-baseline gap-1">
                <span className="text-7xl font-serif font-light text-white tracking-tighter leading-none">84</span>
                <span className="text-xl font-serif text-primary">%</span>
              </div>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Variance Index</span>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="mt-10 w-full grid grid-cols-2 gap-4 shrink-0 relative z-10">
        <div className="p-5 rounded border border-white/5 bg-white/[0.02] flex flex-col gap-1.5 group/box hover:bg-white/[0.04] transition-all">
           <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
             <TrendingUp size={10} className="text-primary" /> Drift Velocity
           </span>
           <span className="text-xl font-serif font-bold text-white tracking-tight">+1.2% <span className="text-xs text-primary font-sans">/hr</span></span>
        </div>
        <div className="p-5 rounded border border-white/5 bg-white/[0.02] flex flex-col gap-1.5 group/box hover:bg-white/[0.04] transition-all">
           <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
             <BarChart3 size={10} className="text-slate-600" /> Sector Health
           </span>
           <span className="text-xl font-serif font-bold text-white tracking-tight">Stable</span>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
    </div>
  );
};
