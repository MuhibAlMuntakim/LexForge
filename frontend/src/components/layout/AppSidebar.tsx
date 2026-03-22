import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Handshake,
  Bot,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const primaryNav = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: FileText, label: "Contracts", path: "/contracts" },
  { icon: BookOpen, label: "Playbooks", path: "/playbooks" },
  { icon: Handshake, label: "Negotiations", path: "/negotiations" },
  { icon: Bot, label: "AI Assistant", path: "/assistant" },
];

const AppSidebar = () => {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/" || location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        "fixed left-0 top-0 z-40 flex flex-col h-screen bg-card border-r border-border transition-all duration-200 ease-out",
        expanded ? "w-[220px]" : "w-[72px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-5 gap-3 border-b border-border flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">LA</span>
        </div>
        <span
          className={cn(
            "font-semibold text-foreground text-sm whitespace-nowrap transition-opacity duration-200",
            expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
          )}
        >
          LegalAgent
        </span>
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-hidden">
        {primaryNav.map((item) => {
          const active = isActive(item.path);
          const button = (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center gap-3 h-10 rounded-lg px-3 transition-colors duration-150 w-full",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon size={20} className="flex-shrink-0" />
              <span
                className={cn(
                  "text-sm font-medium whitespace-nowrap transition-opacity duration-200",
                  expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                )}
              >
                {item.label}
              </span>
              {active && expanded && (
                <ChevronRight size={14} className="ml-auto text-primary/50" />
              )}
            </button>
          );

          if (!expanded) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return button;
        })}
      </nav>

    </aside>
  );
};

export default AppSidebar;
