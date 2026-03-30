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
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: "up" | "down" | "neutral" | "none";
}) {
  const TrendIcon = trendIcon[trend];

  return (
    <Card className="surface-card border-none">
      <CardContent className="flex items-start justify-between p-6">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="space-y-3 text-right">
          <div className="ml-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(201,168,76,0.14)] text-[var(--color-gold-dark)] dark:text-[var(--color-gold-light)]">
            <Icon className="h-5 w-5" />
          </div>
          <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${trendStyles[trend]}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {trend === "up" ? "Crescendo" : trend === "down" ? "Atenção" : trend === "neutral" ? "Estável" : "Sem base"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
