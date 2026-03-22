import { useEffect, useMemo, useState } from "react";
import { Clock, Hourglass, BarChart3, ShieldCheck, AlertTriangle, ArrowRight, Activity, ChevronRight } from "lucide-react";
import MetricCard from "@/components/shared/MetricCard";
import RiskBadge from "@/components/shared/RiskBadge";
import StatusBadge, { Status } from "@/components/shared/StatusBadge";
import { useNavigate } from "react-router-dom";
import { useGlobalContext } from "@/contexts/GlobalContext";
import { Button } from "@/components/ui/button";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DashboardMetricsResponse, getDashboardMetrics, RiskLevel } from "@/lib/api";

const toRiskLevel = (value: string): RiskLevel => {
  const normalized = (value || "").toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "medium";
};

const toStatus = (value: string): Status => {
  const allowed: Status[] = [
    "reviewed",
    "pending",
    "in_review",
    "approved",
    "rejected",
    "negotiating",
    "under_review",
  ];
  const normalized = (value || "reviewed").toLowerCase() as Status;
  return allowed.includes(normalized) ? normalized : "reviewed";
};

const COLORS = {
  high: "hsl(0, 84%, 60%)",  
  medium: "hsl(38, 92%, 50%)",
  low: "hsl(142, 71%, 45%)"   
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { timeframe } = useGlobalContext();
  const [data, setData] = useState<DashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getDashboardMetrics(timeframe);
        setData(response);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [timeframe]);

  const healthData = useMemo(() => {
    if (!data?.portfolio_health) return [];
    return [
      { name: "Safe (Low Risk)", value: data.portfolio_health.low || 0, color: COLORS.low },
      { name: "Monitor (Medium Risk)", value: data.portfolio_health.medium || 0, color: COLORS.medium },
      { name: "Danger (High Risk)", value: data.portfolio_health.high || 0, color: COLORS.high },
    ].filter(i => i.value > 0);
  }, [data]);

  const weaknessesData = useMemo(() => data?.top_weaknesses || [], [data]);
  const attentionRequired = useMemo(() => data?.attention_required || [], [data]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Overview</h1>
      </div>

      {error && <div className="text-sm border border-destructive/50 bg-destructive/10 text-destructive p-3 rounded-md">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Pending Reviews"
          value={data?.pending_tasks ?? 0}
          icon={Clock}
          iconColor="bg-primary/20 text-primary"
        />
        <MetricCard
          title="Hours Saved"
          value={data?.hours_saved ?? 0}
          icon={Hourglass}
          iconColor="bg-success/20 text-success"
        />
        <MetricCard
          title="Avg. Portfolio Risk"
          value={data?.avg_portfolio_risk ?? 0}
          icon={BarChart3}
          iconColor={data && data.avg_portfolio_risk > 60 ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}
        />
        <MetricCard
          title="Mitigation Rate"
          value={`${data?.mitigation_rate ?? 0}%`}
          icon={ShieldCheck}
          iconColor="bg-success/20 text-success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 col-span-1 flex flex-col">
          <h3 className="text-sm font-semibold text-foreground mb-1">Portfolio Health</h3>
          <p className="text-xs text-muted-foreground mb-4">Current risk distribution across all contracts</p>
          <div className="flex-1 min-h-[160px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
            ) : healthData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {healthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {!loading && healthData.length > 0 && (
             <div className="flex justify-center gap-4 mt-2 text-xs">
                {healthData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                ))}
             </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 col-span-1 lg:col-span-2 flex flex-col">
          <h3 className="text-sm font-semibold text-foreground mb-1">Top Vulnerabilities</h3>
          <p className="text-xs text-muted-foreground mb-4">Most frequent disadvantageous clauses injected by vendors</p>
          <div className="flex-1 min-h-[160px]">
             {loading ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
            ) : weaknessesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weaknessesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 91%)" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="category" type="category" width={140} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 col-span-1 lg:col-span-2">
           <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-destructive" />
              <h3 className="text-sm font-semibold text-foreground">Needs Immediate Attention</h3>
           </div>
           
           <div className="space-y-3">
             {loading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Loading list...</div>
             ) : attentionRequired.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center flex flex-col items-center">
                  <ShieldCheck size={32} className="text-success mb-2 opacity-50" />
                  All caught up! No urgent contracts pending.
                </div>
             ) : (
                <ul className="space-y-3">
                  {attentionRequired.map((item) => (
                    <li key={item.id} className="group flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer" onClick={() => navigate('/contracts/' + item.id)}>
                      <div className="flex items-center gap-4">
                         <RiskBadge level={toRiskLevel(item.risk_level)} score={item.risk_score} />
                         <div>
                           <p className="text-sm font-medium text-foreground">{item.vendor} Deal</p>
                           <p className="text-xs text-muted-foreground">ID: {item.id.slice(0, 8)} • <StatusBadge status={toStatus(item.status)} /></p>
                         </div>
                      </div>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                         Review Now <ArrowRight size={14} className="ml-1" />
                      </Button>
                    </li>
                  ))}
                </ul>
             )}
           </div>
           
           {attentionRequired.length > 0 && (
             <div className="mt-4 pt-4 border-t border-border flex justify-end">
               <Button variant="link" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => navigate('/contracts')}>
                 View all contracts <ChevronRight size={14} className="ml-1" />
               </Button>
             </div>
           )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 col-span-1">
          <div className="flex items-center gap-2 mb-6">
              <Activity size={18} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Recent Pipeline</h3>
          </div>
          
          <div className="relative pl-4 space-y-6 before:absolute before:inset-0 before:ml-[5px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
             {attentionRequired.length > 0 ? (
               attentionRequired.slice(0, 3).map((item, i) => (
                 <div key={`act-${i}`} className="relative flex items-start justify-between">
                    <div className="absolute left-[-21px] w-3 h-3 bg-card border-2 border-primary rounded-full mt-1.5" />
                    <div>
                      <p className="text-sm text-foreground">AI flagged high risk in <span className="font-semibold">{item.vendor}</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(item.updated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                 </div>
               ))
             ) : (
                <>
                  <div className="relative flex items-start justify-between">
                      <div className="absolute left-[-21px] w-3 h-3 bg-card border-2 border-primary rounded-full mt-1.5" />
                      <div>
                        <p className="text-sm text-foreground">AI analyzed Master Services Agreement</p>
                        <p className="text-xs text-muted-foreground mt-0.5">2 mins ago</p>
                      </div>
                  </div>
                  <div className="relative flex items-start justify-between">
                      <div className="absolute left-[-21px] w-3 h-3 bg-card border-2 border-muted-foreground rounded-full mt-1.5" />
                      <div>
                        <p className="text-sm text-foreground">John accepted 4 redlines directly</p>
                        <p className="text-xs text-muted-foreground mt-0.5">1 hr ago</p>
                      </div>
                  </div>
                </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;