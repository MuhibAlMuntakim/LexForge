import React from 'react';
import { cn } from '@/lib/utils';
import { Scale, Shield, Box, Activity } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  sparklineData: string;
}

export const StatCard: React.FC<Readonly<StatCardProps>> = ({
  label,
  value,
  change,
  trend,
  sparklineData,
}) => {
  const Illustration = React.useMemo(() => {
    if (label.toLowerCase().includes('risk')) return Shield;
    if (label.toLowerCase().includes('contract')) return Box;
    if (label.toLowerCase().includes('latency')) return Activity;
    return Scale;
  }, [label]);

  return (
    <div className="bg-white border border-slate-200 p-6 h-48 rounded-xl shadow-lg flex flex-col justify-between group overflow-hidden relative cursor-pointer hover:-translate-y-1 transition-all duration-500 min-w-0">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      {/* Background Technical Illustration */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] transition-all duration-700 group-hover:opacity-[0.08] group-hover:scale-110 group-hover:rotate-6">
        <Illustration size={120} strokeWidth={1} className="text-slate-900" />
      </div>
      
      <div className="flex justify-between items-start relative z-10">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] group-hover:text-primary transition-colors">
          {label}
        </span>
        <div className="flex flex-col items-end">
          <div className="px-2 py-1 rounded-sm bg-slate-50 border border-slate-100 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
            <span
              className={cn(
                "text-[9px] font-bold tracking-tighter transition-all duration-300",
                label.toLowerCase().includes('critical violation')
                  ? (change.startsWith('-') ? "text-emerald-500" : "text-primary")
                  : (change.startsWith('+') ? "text-emerald-500" : "text-primary")
              )}
            >
              {change}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-end justify-between relative z-10">
        <div className="flex flex-col min-w-0">
          <span className="text-5xl xl:text-7xl font-serif font-light text-slate-900 leading-none tracking-tighter mb-2 drop-shadow-[0_4px_12px_rgba(0,0,0,0.05)] group-hover:scale-[1.02] transition-all duration-700 whitespace-nowrap">
            {value}
          </span>
          <div className="h-[1px] w-12 bg-primary/40 group-hover:w-full transition-all duration-1000 rounded-full" />
        </div>
        
        <div className="w-24 h-12 relative shrink-0">
          <svg className="w-full h-full drop-shadow-[0_2px_8px_rgba(255,112,67,0.2)]" viewBox="0 0 100 40" preserveAspectRatio="none">
            <path
              d={sparklineData}
              fill="none"
              stroke="url(#sparklineGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-premium-float"
            />
            <defs>
              <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF7043" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#FF7043" stopOpacity="1" />
                <stop offset="100%" stopColor="#FF7043" stopOpacity="0.5" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      
      {/* Interactive hover glow */}
      <div className="absolute -bottom-16 -left-16 size-48 bg-primary/25 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <div className="absolute -top-16 -right-16 size-48 bg-primary/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
    </div>
  );
};
