import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div
        data-page-header-meta="true"
        data-page-title={title}
        className="hidden"
        aria-hidden="true"
      />
      {actions ? (
        <div className={cn("mb-[-0.75rem] flex flex-wrap items-center justify-end gap-3", className)}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}
