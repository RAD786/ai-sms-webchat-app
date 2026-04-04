import Link from "next/link";
import { ArrowRight, MessageSquareText, PanelsTopLeft, PhoneCall } from "lucide-react";

const features = [
  {
    title: "Shared dashboard",
    description: "One place for locations, leads, calls, messages, settings, and every channel."
  },
  {
    title: "Missed-call SMS",
    description: "Capture missed inbound calls and route them into lead and messaging workflows."
  },
  {
    title: "Chatbot-ready",
    description: "Prepared for a future website popup without splitting the app into separate systems."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
      <header className="flex items-center justify-between rounded-full border border-white/70 bg-white/70 px-5 py-3 shadow-soft backdrop-blur">
        <div>
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Revnex
          </p>
        </div>
        <nav className="flex items-center gap-3 text-sm font-medium">
          <Link href="/sign-in" className="rounded-full px-4 py-2 text-slate-600 transition hover:bg-slate-100">
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full bg-brand-700 px-4 py-2 text-white transition hover:bg-brand-800"
          >
            Open dashboard
          </Link>
        </nav>
      </header>

      <section className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-800">
            <PanelsTopLeft className="h-4 w-4" />
            Unified lead capture for service businesses
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              Revnex Lead Capture Platform
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              A shared SaaS foundation for med spas, dentists, roofers, plumbers, and law offices.
              Start with missed-call SMS now and layer in chatbot capture later without rebuilding the stack.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Go to dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Create account
            </Link>
          </div>
        </div>

        <div className="grid gap-4 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur">
          <div className="rounded-3xl bg-slate-950 p-6 text-white">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Primary channel</p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
                  Missed-call-to-SMS
                </p>
              </div>
              <PhoneCall className="h-10 w-10 text-brand-300" />
            </div>
            <p className="max-w-sm text-sm leading-7 text-slate-300">
              Twilio webhooks, lead creation, message automation, business-hours checks, and dashboard visibility all inside one modular app.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-3xl border border-slate-200 bg-sand p-5"
              >
                <MessageSquareText className="mb-4 h-5 w-5 text-brand-700" />
                <h2 className="font-semibold text-slate-900">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

