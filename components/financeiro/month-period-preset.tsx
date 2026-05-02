"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentMonthPrefix, getPreviousMonthPrefix } from "@/lib/month-period";

type Props = {
  value: string;
  onChange: (period: string) => void;
  className?: string;
};

export function MonthPeriodPresetButtons({ value, onChange, className }: Props) {
  const cur = getCurrentMonthPrefix();
  const prev = getPreviousMonthPrefix();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">Período (vencimento)</span>
      <Button size="sm" type="button" variant={value === "" ? "default" : "outline"} onClick={() => onChange("")}>
        Todos
      </Button>
      <Button size="sm" type="button" variant={value === cur ? "default" : "outline"} onClick={() => onChange(cur)}>
        Mês atual
      </Button>
      <Button size="sm" type="button" variant={value === prev ? "default" : "outline"} onClick={() => onChange(prev)}>
        Mês passado
      </Button>
    </div>
  );
}
