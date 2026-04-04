"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { cn } from "@/lib/utils/cn";

type AppShellProps = {
  children: ReactNode;
  user: {
    name: string;
    email: string;
  };
};

export function AppShell({ children, user }: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-4 py-4 lg:px-6">
        <div
          className={cn(
            "fixed inset-0 z-40 bg-slate-950/35 transition lg:hidden",
            isMobileNavOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setIsMobileNavOpen(false)}
        />

        <div
          className={cn(
            "fixed inset-y-4 left-4 z-50 w-[min(82vw,320px)] transition lg:static lg:w-[280px] lg:translate-x-0",
            isMobileNavOpen ? "translate-x-0" : "-translate-x-[115%]"
          )}
        >
          <Sidebar onNavigate={() => setIsMobileNavOpen(false)} />
        </div>

        <div className="min-w-0 flex-1 rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-soft backdrop-blur lg:p-6">
          <header className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen((current) => !current)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
                aria-label={isMobileNavOpen ? "Close navigation" : "Open navigation"}
              >
                {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
                  Unified dashboard
                </p>
                <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-slate-950">
                  Revnex Platform
                </h1>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:min-w-[320px] sm:justify-end">
              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              <UserButton afterSignOutUrl="/" />
            </div>
          </header>

          <div className="mb-6 rounded-[1.75rem] bg-slate-950 px-5 py-5 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">
                  Shared platform architecture
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Leads, calls, conversations, messages, and channel settings all live in one dashboard so SMS workflows and chatbot workflows can operate on the same tenant data.
                </p>
              </div>
              <Link
                href="/dashboard/channels"
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Manage channels
              </Link>
            </div>
          </div>

          <div className="pb-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
