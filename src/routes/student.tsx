import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Info, Lock, Clock } from "lucide-react";
import {
  attendance,
  downloadCSV,
  getSession,
  lastMarkedAt,
  percentageFor,
  students,
  subjects,
  todaySchedule,
} from "@/lib/attendance-data";
import { AppShell, StatCard } from "@/components/app-shell";


export const Route = createFileRoute("/student")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const navigate = useNavigate();
  const session = typeof window !== "undefined" ? getSession() : null;
  const student = students.find((s) => s.id === session?.id) ?? students[0];

  useEffect(() => {
    if (!session) navigate({ to: "/login" });
  }, [session, navigate]);

  const overall = percentageFor(student.id);
  const perSubject = subjects.map((s) => ({
    name: s.code,
    subject: s.name,
    percentage: percentageFor(student.id, s.code),
    lastMarked: lastMarkedAt(s.code),
  }));
  const schedule = useMemo(() => todaySchedule(), []);


  const daily = useMemo(() => {
    const map = new Map<string, { total: number; present: number }>();
    attendance
      .filter((r) => r.studentId === student.id)
      .forEach((r) => {
        const cur = map.get(r.date) ?? { total: 0, present: 0 };
        cur.total += 1;
        if (r.present) cur.present += 1;
        map.set(r.date, cur);
      });
    return Array.from(map.entries())
      .sort()
      .slice(-14)
      .map(([date, v]) => ({
        date: date.slice(5),
        percentage: Math.round((v.present / v.total) * 100),
      }));
  }, [student.id]);

  function exportReport() {
    const rows: (string | number)[][] = [
      ["Subject Code", "Subject", "Attendance %"],
      ...perSubject.map((r) => [r.name, r.subject, `${r.percentage}%`]),
      ["", "", ""],
      ["Overall", "", `${overall}%`],
    ];
    downloadCSV(`${student.roll}-attendance.csv`, rows);
  }

  const status =
    overall >= 85 ? "Excellent" : overall >= 75 ? "On track" : "Below threshold";
  const statusAccent = overall >= 75 ? "success" : "warning";

  return (
    <AppShell
      title={`Hi, ${student.name.split(" ")[0]}`}
      subtitle={`${student.roll} · ${student.branch} · Semester ${student.semester}`}
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Overall %" value={`${overall}%`} accent={statusAccent} hint={status} />
        <StatCard label="Subjects" value={subjects.length} accent="chart-2" />
        <StatCard
          label="Best Subject"
          value={
            perSubject.reduce((a, b) => (a.percentage > b.percentage ? a : b)).name
          }
          accent="success"
        />
        <StatCard
          label="Lowest Subject"
          value={
            perSubject.reduce((a, b) => (a.percentage < b.percentage ? a : b)).name
          }
          accent="warning"
        />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold">Today's scheduled classes</h3>
            <p className="text-xs text-muted-foreground">
              Period-wise timetable set by admin · attendance marked by faculty
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Read-only
          </span>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            You cannot mark your own attendance. Classes are scheduled by the admin and
            attendance is recorded by the subject teacher during the period.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Period</th>
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Subject</th>
                <th className="py-2 pr-4 font-medium">Faculty</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((slot) => (
                <tr key={slot.subjectCode} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-4 font-medium">P{slot.period}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {slot.startTime}–{slot.endTime}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="font-medium">{slot.subjectName}</div>
                    <div className="text-xs text-muted-foreground">{slot.subjectCode}</div>
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{slot.faculty}</td>
                  <td className="py-2.5 text-xs text-muted-foreground">
                    Marked by teacher
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">

            <div>
              <h3 className="font-display text-lg font-semibold">Subject-wise attendance</h3>
              <p className="text-xs text-muted-foreground">Aggregated over last 30 days</p>
            </div>
            <button
              onClick={exportReport}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perSubject}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="percentage" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display text-lg font-semibold">Subjects</h3>
          <div className="mt-3 space-y-3">
            {perSubject.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.subject}</span>
                  <span
                    className={
                      s.percentage >= 75 ? "text-success" : "text-destructive"
                    }
                  >
                    {s.percentage}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      s.percentage >= 75 ? "bg-success" : "bg-destructive"
                    }`}
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {s.lastMarked
                    ? `Last marked by teacher at ${s.lastMarked}`
                    : "Not marked yet"}
                </div>
              </div>

            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h3 className="font-display text-lg font-semibold">Daily attendance (last 14 school days)</h3>
        <div className="mt-4 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                unit="%"
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="percentage" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppShell>
  );
}
