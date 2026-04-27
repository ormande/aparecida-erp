import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const trendIcon = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  neutral: ArrowRight,
  none: Minus,
} as const;

const trendStyles = {
  up: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  down: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  neutral: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  none: "bg-muted text-muted-foreground",
} as const;

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  compact = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend: "up" | "down" | "neutral" | "none";
  compact?: boolean;
}) {
  const TrendIcon = trendIcon[trend];

  return (
    <Card className="surface-card border-none">
      <CardContent className={`flex items-start justify-between ${compact ? "p-4" : "p-6"}`}>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`mt-3 font-semibold tracking-tight ${compact ? "text-2xl" : "text-3xl"}`}>{value}</p>
          {subtitle ? <p className={`text-muted-foreground ${compact ? "mt-1 text-xs" : "mt-2 text-sm"}`}>{subtitle}</p> : null}
        </div>
        <div className={`${compact ? "space-y-2" : "space-y-3"} text-right`}>
          <div
            className={`ml-auto flex items-center justify-center rounded-2xl bg-[rgba(201,168,76,0.14)] text-[var(--color-gold-dark)] dark:text-[var(--color-gold-light)] ${compact ? "h-10 w-10" : "h-12 w-12"}`}
          >
            <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </div>
          <div
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${compact ? "text-[10px]" : "text-xs"} ${trendStyles[trend]}`}
          >
            <TrendIcon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
            {trend === "up" ? "Crescendo" : trend === "down" ? "Atenção" : trend === "neutral" ? "Estável" : "Sem base"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
