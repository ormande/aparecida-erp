import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const trendIcon = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  neutral: ArrowRight,
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
  trend: "up" | "down" | "neutral";
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
          <div className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <TrendIcon className="h-3.5 w-3.5" />
            {trend === "up" ? "Crescendo" : trend === "down" ? "Atenção" : "Estável"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
