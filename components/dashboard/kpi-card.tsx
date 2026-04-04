import type { LucideIcon } from "lucide-react";

type KpiCardProps = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

export function KpiCard({ label, value, description, icon: Icon }: KpiCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="rounded-2xl bg-brand-50 p-2 text-brand-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-6 font-[family-name:var(--font-display)] text-4xl font-semibold text-slate-950">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}

