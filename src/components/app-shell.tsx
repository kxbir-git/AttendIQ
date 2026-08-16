import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, GraduationCap } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { clearSession, getSession, type Session } from "@/lib/attendance-data";

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [session, setSessionState] = useState<Session | null>(null);
  useEffect(() => setSessionState(getSession()), []);

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const session = typeof window !== "undefined" ? getSession() : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <div className="font-display text-lg font-semibold leading-none">AttendIQ</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Attendance OS
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {session && (
              <div className="text-right text-sm">
                <div className="font-medium">{session.name}</div>
                <div className="text-xs capitalize text-muted-foreground">{session.role}</div>
              </div>
            )}
            <button
              onClick={() => {
                clearSession();
                navigate({ to: "/login" });
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "chart-2";
}) {
  const accentClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    "chart-2": "bg-chart-2/15 text-chart-2",
  }[accent];
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${accentClass}`}>
          LIVE
        </span>
      </div>
      <div className="mt-3 font-display text-3xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
