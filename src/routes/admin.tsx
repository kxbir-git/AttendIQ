import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  attendance,
  departments,
  downloadCSV,
  getSession,
  percentageFor,
  students,
  subjects,
  teachers,
  todayAttendanceRate,
} from "@/lib/attendance-data";
import { AppShell, StatCard } from "@/components/app-shell";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

const tabs = ["Overview", "Departments", "Teachers", "Students", "Subjects", "Reports"] as const;
type Tab = (typeof tabs)[number];

function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Overview");

  useEffect(() => {
    const s = getSession();
    if (!s) navigate({ to: "/login" });
  }, [navigate]);

  return (
    <AppShell title="Admin Dashboard" subtitle="Manage the whole institution from one console.">
      <nav className="mb-6 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Overview" && <Overview />}
      {tab === "Departments" && <DepartmentsView />}
      {tab === "Teachers" && <TeachersView />}
      {tab === "Students" && <StudentsView />}
      {tab === "Subjects" && <SubjectsView />}
      {tab === "Reports" && <ReportsView />}
    </AppShell>
  );
}

function Overview() {
  const perSubject = subjects.map((s) => {
    const rows = attendance.filter((a) => a.subjectCode === s.code);
    const present = rows.filter((r) => r.present).length;
    const pct = rows.length ? Math.round((present / rows.length) * 1000) / 10 : 0;
    return { name: s.code, subject: s.name, percentage: pct };
  });

  const todayRate = todayAttendanceRate();
  const pie = [
    { name: "Present", value: todayRate },
    { name: "Absent", value: Math.round((100 - todayRate) * 10) / 10 },
  ];
  const pieColors = ["var(--color-chart-3)", "var(--color-chart-5)"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Students" value={students.length} hint="Enrolled in CSE" />
        <StatCard label="Total Subjects" value={subjects.length} accent="chart-2" />
        <StatCard label="Today's Attendance" value={`${todayRate}%`} accent="success" />
        <StatCard label="Active Classes" value={subjects.length} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold">Attendance by subject</h3>
          <p className="text-xs text-muted-foreground">Last 30 days, all students</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perSubject}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} unit="%" />
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
          <h3 className="font-display text-lg font-semibold">Today's split</h3>
          <p className="text-xs text-muted-foreground">Present vs absent across all periods</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {pie.map((_, i) => (
                    <Cell key={i} fill={pieColors[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border hover:bg-accent/40">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-3">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {action}
    </div>
  );
}

function DepartmentsView() {
  return (
    <div>
      <SectionHeader title="Departments" />
      <Table
        columns={["Code", "Name", "Teachers", "Students"]}
        rows={departments.map((d) => [
          d.code,
          d.name,
          teachers.filter((t) => t.department === d.code).length,
          students.filter((s) => s.branch === d.code).length,
        ])}
      />
    </div>
  );
}

function TeachersView() {
  return (
    <div>
      <SectionHeader title="Teachers" />
      <Table
        columns={["Name", "Email", "Department", "Subjects"]}
        rows={teachers.map((t) => [t.name, t.email, t.department, t.subjects.join(", ")])}
      />
    </div>
  );
}

function StudentsView() {
  return (
    <div>
      <SectionHeader title="Students" />
      <Table
        columns={["Roll", "Name", "Branch", "Semester", "Attendance %"]}
        rows={students.map((s) => [s.roll, s.name, s.branch, s.semester, `${percentageFor(s.id)}%`])}
      />
    </div>
  );
}

function SubjectsView() {
  return (
    <div>
      <SectionHeader title="Subjects" />
      <Table
        columns={["Code", "Name", "Faculty", "Semester", "Branch", "Credits"]}
        rows={subjects.map((s) => [s.code, s.name, s.faculty, s.semester, s.branch, s.credits])}
      />
    </div>
  );
}

function ReportsView() {
  function exportAll() {
    const header = ["Roll", "Name", ...subjects.map((s) => s.code), "Overall %"];
    const rows = students.map((st) => [
      st.roll,
      st.name,
      ...subjects.map((s) => `${percentageFor(st.id, s.code)}%`),
      `${percentageFor(st.id)}%`,
    ]);
    downloadCSV("attendance-report.csv", [header, ...rows]);
  }
  return (
    <div>
      <SectionHeader
        title="Reports"
        action={
          <button
            onClick={exportAll}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Download CSV
          </button>
        }
      />
      <Table
        columns={["Roll", "Name", ...subjects.map((s) => s.code), "Overall"]}
        rows={students.map((st) => [
          st.roll,
          st.name,
          ...subjects.map((s) => `${percentageFor(st.id, s.code)}%`),
          `${percentageFor(st.id)}%`,
        ])}
      />
    </div>
  );
}
