import { type ReactNode } from "react";

interface VisualizationCardProps {
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function VisualizationCard({
  title,
  description,
  meta,
  actions,
  footer,
  children,
}: VisualizationCardProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            {meta && <div className="text-xs text-slate-400">{meta}</div>}
          </div>
          {description && <div className="mt-1 text-sm text-slate-400">{description}</div>}
        </div>
        {actions && (
          <div className="flex flex-col gap-3 text-right lg:flex-row lg:items-center lg:gap-4">
            {actions}
          </div>
        )}
      </div>
      <div>{children}</div>
      {footer && <div className="text-sm text-slate-500">{footer}</div>}
    </section>
  );
}
