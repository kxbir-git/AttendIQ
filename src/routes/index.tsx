import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { GraduationCap, BarChart3, Users, ClipboardCheck, ArrowRight } from "lucide-react";
import { getSession } from "@/lib/attendance-data";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    const s = getSession();
    if (s) navigate({ to: `/${s.role}` });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold">AttendIQ</span>
        </div>
        <Link
          to="/login"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              University attendance, reimagined
            </span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Period-wise attendance,
              <br />
              <span className="text-primary">without the paperwork.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              AttendIQ is a modern platform for admins, teachers, and students to record and track
              subject-wise attendance across every period — with automatic analytics and
              downloadable reports.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center rounded-md border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-accent"
              >
                See features
              </a>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-6 text-sm">
              <div>
                <div className="font-display text-2xl font-semibold">24×7</div>
                <div className="text-xs text-muted-foreground">Access anytime</div>
              </div>
              <div>
                <div className="font-display text-2xl font-semibold">98%</div>
                <div className="text-xs text-muted-foreground">Faster roll-call</div>
              </div>
              <div>
                <div className="font-display text-2xl font-semibold">3 roles</div>
                <div className="text-xs text-muted-foreground">Admin · Teacher · Student</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Today's snapshot
                </div>
                <div className="font-display text-xl font-semibold">CSE — Semester 3</div>
              </div>
              <span className="rounded-md bg-success/15 px-2 py-1 text-xs font-semibold text-success">
                82.4% present
              </span>
            </div>
            <div className="space-y-3">
              {[
                { s: "Data Structures", p: 88 },
                { s: "Operating Systems", p: 79 },
                { s: "DBMS", p: 91 },
                { s: "Computer Networks", p: 74 },
                { s: "Artificial Intelligence", p: 83 },
              ].map((r) => (
                <div key={r.s}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{r.s}</span>
                    <span className="text-muted-foreground">{r.p}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${r.p}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Users,
              title: "Manage everyone",
              body: "Admins run departments, teachers, students, subjects and timetables from one place.",
            },
            {
              icon: ClipboardCheck,
              title: "Mark period-wise",
              body: "Teachers mark attendance per period, per subject — with quick edits and bulk actions.",
            },
            {
              icon: BarChart3,
              title: "Live analytics",
              body: "Automatic percentages, subject-wise trends, and downloadable CSV reports.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
