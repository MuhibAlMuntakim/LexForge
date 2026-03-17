import React from 'react';
import { Review } from '@/data/mockData';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';

export interface ActiveReviewsTableProps {
  reviews: Review[];
}

const ReviewSummaryModal: React.FC<{ 
  review: Review | null; 
  onClose: () => void;
}> = ({ review, onClose }) => {
  if (!review) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-white rounded shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-10">
          <div className="flex justify-between items-start mb-10">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Institutional Audit</span>
              <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">{review.title}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="p-6 bg-slate-50/50 border border-slate-100 rounded">
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Risk Exposure</span>
               <span className={`text-4xl font-serif font-bold ${review.risk > 50 ? "text-primary" : "text-green-600"}`}>{review.risk}%</span>
            </div>
            <div className="p-6 bg-slate-50/50 border border-slate-100 rounded">
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Portfolio Type</span>
               <span className="text-base font-serif font-bold text-slate-700">{review.type}</span>
            </div>
          </div>

          <div className="space-y-4 mb-10">
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Institutional AI verification detected high-impact clauses deviating from <span className="text-slate-900 font-bold underline decoration-slate-200 underline-offset-4">Playbook 2026</span>. Manual oversight is mandated for weighted risk scores exceeding 75%.
            </p>
          </div>

          <div className="flex gap-4">
            <Link 
              href={`/registry/${review.id}`}
              className="flex-1 py-4 bg-slate-900 text-white rounded text-[10px] font-bold uppercase tracking-widest text-center hover:bg-slate-800 shadow-xl shadow-slate-900/10 transition-all"
            >
              Analyze Redlines
            </Link>
            <button 
              onClick={onClose}
              className="px-8 py-4 border border-slate-200 text-slate-600 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-sans"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ActiveReviewsTable: React.FC<Readonly<ActiveReviewsTableProps>> = ({
  reviews,
}) => {
  const [selectedReview, setSelectedReview] = React.useState<Review | null>(null);

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
        <div className="px-8 py-7 border-b border-slate-100 flex justify-between items-end bg-white">
          <div>
            <h3 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Active Portfolio Reviews</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1.5">Institutional Queue: 38 PENDING</p>
          </div>
          <Link href="/contracts" className="text-primary text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all mb-1 font-sans">
            Browse Registry <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="text-left px-8 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Document ID
                </th>
                <th className="text-left px-8 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Category
                </th>
                <th className="text-left px-8 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="text-left px-8 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Weighted Risk
                </th>
                <th className="text-right px-8 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Findings
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reviews.map((review) => (
                <tr
                  key={review.id}
                  onClick={() => setSelectedReview(review)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <td className="px-8 py-7">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors tracking-tight">
                        {review.title}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                        {review.uuid}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-7 text-xs text-slate-500 font-medium">
                    {review.type}
                  </td>
                  <td className="px-8 py-7">
                    <span
                      className={cn(
                        "px-3 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest whitespace-nowrap inline-flex items-center gap-2 border transition-all",
                        review.status === 'Needs Review' && "bg-red-50 text-red-700 border-red-200/50",
                        review.status === 'Processing' && "bg-blue-50/50 text-blue-700 border-blue-200/50",
                        review.status === 'Approved' && "bg-emerald-900 text-emerald-50 border-emerald-800 shadow-sm"
                      )}
                    >
                      {review.status === 'Processing' && <Activity size={10} className="animate-spin duration-[3000ms]" />}
                      {review.status}
                    </span>
                  </td>
                  <td className="px-8 py-7">
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`h-full transition-all duration-1000 ${
                            review.risk > 50 ? 'bg-primary' : 'bg-slate-900'
                          }`}
                          style={{ width: `${review.risk}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-900 min-w-[2rem]">
                        {review.risk}%
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-7 text-right">
                    <span className={`text-[10px] font-bold uppercase tracking-widest border-b pb-0.5 ${review.risk > 50 ? "text-primary border-primary/30" : "text-slate-900 border-slate-300"}`}>
                      {Math.floor(review.risk / 10)} Flagged
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ReviewSummaryModal 
        review={selectedReview} 
        onClose={() => setSelectedReview(null)} 
      />
    </>
  );
};
