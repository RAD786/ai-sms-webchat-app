"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ChevronRight } from "lucide-react";
import { dashboardNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils/cn";

type SidebarProps = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-soft">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-brand-500/20 p-3 text-brand-200">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <p className="font-[family-name:var(--font-display)] text-xl font-semibold">Revnex</p>
          <p className="text-sm text-slate-400">Lead Capture Platform</p>
        </div>
      </div>

      <nav className="mt-10 space-y-2">
        {dashboardNavigation.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-white text-slate-950"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </span>
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              />
            </Link>
          );
        })}
      </nav>

      <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">Channel strategy</p>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          The dashboard stays platform-first while feature modules handle the differences between voice, SMS, and future chatbot capture.
        </p>
      </div>

      <div className="mt-4 rounded-3xl border border-brand-500/20 bg-brand-500/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-100">Current focus</p>
        <p className="mt-3 text-sm leading-6 text-brand-50">
          Missed-call-to-SMS is the first production feature. The shell is already prepared for chatbot configuration and reporting.
        </p>
      </div>
    </aside>
  );
}
