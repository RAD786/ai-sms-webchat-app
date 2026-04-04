import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type SectionCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
};

export function SectionCard({
  title,
  description,
  icon: Icon,
  children
}: SectionCardProps) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-950">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{description}</p>
        </div>
        <div className="rounded-2xl bg-slate-950 p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
