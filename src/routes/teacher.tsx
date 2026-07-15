import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, X, Download } from "lucide-react";
import {
  attendance,
  downloadCSV,
  getSession,
  percentageFor,
  students,
  subjects,
  teachers,
  type AttendanceRecord,
} from "@/lib/attendance-data";
import { AppShell, StatCard } from "@/components/app-shell";

export const Route = createFileRoute("/teacher")({
  component: TeacherDashboard,
});

function TeacherDashboard() {
  const navigate = useNavigate();
  const session = typeof window !== "undefined" ? getSession() : null;
  const teacher = teachers.find((t) => t.id === session?.id) ?? teachers[0];
  const mySubjects = subjects.filter((s) => teacher.subjects.includes(s.code));

  const [selected, setSelected] = useState(mySubjects[0]?.code ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState(1);
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!session) navigate({ to: "/login" });
  }, [session, navigate]);

  useEffect(() => {
    // Prefill from any existing attendance for that date/period/subject
    const init: Record<string, boolean> = {};
    students.forEach((s) => {
      const existing = attendance.find(
        (r) =>
          r.subjectCode === selected &&
          r.date === date &&
          r.period === period &&
          r.studentId === s.id,
      );
      init[s.id] = existing ? existing.present : true;
    });
    setMarks(init);
    setSaved(false);
  }, [selected, date, period]);

  const present = Object.values(marks).filter(Boolean).length;
  const total = students.length;

  const subjectStats = useMemo(
    () =>
      mySubjects.map((s) => {
        const rows = attendance.filter((r) => r.subjectCode === s.code);
        const p = rows.filter((r) => r.present).length;
        return { ...s, pct: rows.length ? Math.round((p / rows.length) * 1000) / 10 : 0 };
      }),
    [mySubjects],
  );

  function save() {
    // Update in-memory attendance
    Object.entries(marks).forEach(([studentId, isPresent]) => {
      const idx = attendance.findIndex(
        (r) =>
          r.subjectCode === selected &&
          r.date === date &&
          r.period === period &&
          r.studentId === studentId,
      );
      const rec: AttendanceRecord = {
        subjectCode: selected,
        studentId,
        date,
        period,
        present: isPresent,
      };
      if (idx >= 0) attendance[idx] = rec;
      else attendance.push(rec);
    });
    setSaved(true);
  }

  function exportSubject() {
    const rows: (string | number)[][] = [
      ["Roll", "Name", "Overall %", `${selected} %`],
      ...students.map((s) => [
        s.roll,
        s.name,
        `${percentageFor(s.id)}%`,
        `${percentageFor(s.id, selected)}%`,
      ]),
    ];
    downloadCSV(`${selected}-attendance.csv`, rows);
  }

  return (
    <AppShell title={`Welcome, ${teacher.name}`} subtitle="Mark today's attendance, period-wise.">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Your Subjects" value={mySubjects.length} />
        <StatCard label="Total Students" value={students.length} accent="chart-2" />
        <StatCard
          label="Marked Present"
          value={`${present}/${total}`}
          accent="success"
          hint={`for ${selected} · P${period}`}
        />
        <StatCard
          label="Subject Avg"
          value={`${subjectStats.find((s) => s.code === selected)?.pct ?? 0}%`}
          accent="warning"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
          <h3 className="font-display text-lg font-semibold">Your subjects</h3>
          <div className="mt-3 space-y-2">
            {subjectStats.map((s) => (
              <button
                key={s.code}
                onClick={() => setSelected(s.code)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  selected === s.code
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.code}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${s.pct}%` }} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{s.pct}% avg attendance</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold">Mark attendance</h3>
              <p className="text-xs text-muted-foreground">
                {mySubjects.find((s) => s.code === selected)?.name ?? selected}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                  <option key={p} value={p}>
                    Period {p}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const all: Record<string, boolean> = {};
                  students.forEach((s) => (all[s.id] = true));
                  setMarks(all);
                }}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
              >
                Mark all present
              </button>
              <button
                onClick={exportSubject}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
            </div>
          </div>

          <div className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Roll</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const isPresent = marks[s.id];
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{s.roll}</td>
                      <td className="px-3 py-2">{s.name}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setMarks((m) => ({ ...m, [s.id]: true }))}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                              isPresent
                                ? "bg-success text-success-foreground"
                                : "bg-muted text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            <Check className="h-3 w-3" /> Present
                          </button>
                          <button
                            onClick={() => setMarks((m) => ({ ...m, [s.id]: false }))}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                              !isPresent
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-muted text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            <X className="h-3 w-3" /> Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {present} of {total} marked present
            </div>
            <button
              onClick={save}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {saved ? "Saved ✓" : "Save attendance"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
