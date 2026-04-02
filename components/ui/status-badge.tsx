import { Badge } from "@/components/ui/badge";

/** Classes de cor por rótulo de status (inclui chaves com encoding legado por dados antigos). */
export const serviceOrderStatusBadgeClasses: Record<string, string> = {
  Aberta: "bg-blue-500/18 text-blue-800 dark:text-blue-300",
  "Em andamento": "bg-amber-500/18 text-amber-800 dark:text-amber-300",
  "Aguardando peça": "bg-orange-500/18 text-orange-800 dark:text-orange-300",
  "Aguardando peÃ§a": "bg-orange-500/18 text-orange-800 dark:text-orange-300",
  Concluída: "bg-emerald-500/18 text-emerald-800 dark:text-emerald-300",
  "ConcluÃ­da": "bg-emerald-500/18 text-emerald-800 dark:text-emerald-300",
  Cancelada: "bg-rose-500/18 text-rose-800 dark:text-rose-300",
  Pago: "bg-emerald-500/18 text-emerald-800 dark:text-emerald-300",
  Pendente: "bg-sky-500/18 text-sky-800 dark:text-sky-300",
  Vencido: "bg-rose-500/18 text-rose-800 dark:text-rose-300",
  Ativo: "bg-emerald-500/18 text-emerald-800 dark:text-emerald-300",
  Inativo: "bg-slate-500/18 text-slate-800 dark:text-slate-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={`rounded-full px-3 py-1 font-medium shadow-none ${serviceOrderStatusBadgeClasses[status] ?? "bg-muted text-foreground"}`}
    >
      {status}
    </Badge>
  );
}
