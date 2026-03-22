import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
}

const MetricCard = ({ title, value, change, icon: Icon, iconColor }: MetricCardProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow duration-150">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", iconColor || "bg-primary/10 text-primary")}>
          <Icon size={18} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold font-mincho text-foreground">{value}</span>
        {change !== undefined && (
          <span className={cn("text-xs font-medium mb-1", change >= 0 ? "text-success" : "text-destructive")}>
            {change >= 0 ? "+" : ""}{change}%
          </span>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
