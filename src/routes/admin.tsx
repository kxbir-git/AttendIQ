import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  downloadCSV,
  getSession,
  percentageFor,
  todayAttendanceRate,
  type Department,
  type Student,
  type Subject,
  type Teacher,
} from "@/lib/attendance-data";
import {
  clearAudit,
  createItem,
  deleteItem,
  nextId,
  updateItem,
  useStore,
} from "@/lib/admin-store";
import { AppShell, StatCard } from "@/components/app-shell";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

const tabs = [
  "Overview",
  "Departments",
  "Teachers",
  "Students",
  "Subjects",
  "Reports",
  "Audit Log",
] as const;
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
      {tab === "Audit Log" && <AuditView />}
    </AppShell>
  );
}

/* ------------------------------- primitives ------------------------------- */

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary";
const btnPrimary =
  "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90";
const btnGhost =
  "rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent";

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {action}
    </div>
  );
}

function FilterBar({
  search,
  onSearch,
  placeholder,
  children,
  onReset,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  children?: React.ReactNode;
  onReset: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} sm:w-64`}
      />
      {children}
      <button onClick={onReset} className={btnGhost}>
        Reset filters
      </button>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} sm:w-48`}>
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number";
}

function EntityForm({
  fields,
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  fields: FieldDef[];
  initial: Record<string, string>;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [values, setValues] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="mb-4 grid gap-3 rounded-xl border border-primary/30 bg-card p-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {fields.map((f) => (
        <label key={f.key} className="text-xs font-medium text-muted-foreground">
          {f.label}
          <input
            required
            type={f.type ?? "text"}
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            className={`${inputCls} mt-1`}
          />
        </label>
      ))}
      <div className="flex items-end gap-2">
        <button type="submit" className={btnPrimary}>
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={btnGhost}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DataTable({
  columns,
  rows,
  actions,
}: {
  columns: string[];
  rows: { id: string; cells: (string | number)[] }[];
  actions?: (id: string) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-semibold">
                {c}
              </th>
            ))}
            {actions && <th className="px-4 py-3 font-semibold">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + (actions ? 1 : 0)}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                No records match the current filters.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border hover:bg-accent/40">
              {r.cells.map((c, j) => (
                <td key={j} className="px-4 py-3">
                  {c}
                </td>
              ))}
              {actions && <td className="px-4 py-3">{actions(r.id)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-2">
      <button onClick={onEdit} className={btnGhost}>
        Edit
      </button>
      <button
        onClick={onDelete}
        className="rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
      >
        Delete
      </button>
    </div>
  );
}

function actorName() {
  return getSession()?.name ?? "Admin";
}

/* -------------------------------- overview -------------------------------- */

function Overview() {
  const { subjects, students } = useStore();
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

/* ------------------------------- departments ------------------------------ */

function DepartmentsView() {
  const { departments, teachers, students } = useStore();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<null | { id?: string }>(null);

  const filtered = departments.filter((d) =>
    `${d.code} ${d.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  const editing = departments.find((d) => d.id === mode?.id);

  return (
    <div>
      <SectionHeader
        title={`Departments (${filtered.length})`}
        action={
          <button onClick={() => setMode({})} className={btnPrimary}>
            + Add department
          </button>
        }
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search code or name…"
        onReset={() => setSearch("")}
      />
      {mode && (
        <EntityForm
          key={editing?.id ?? "new"}
          fields={[
            { key: "code", label: "Code" },
            { key: "name", label: "Name" },
          ]}
          initial={{ code: editing?.code ?? "", name: editing?.name ?? "" }}
          submitLabel={editing ? "Save changes" : "Create department"}
          onCancel={() => setMode(null)}
          onSubmit={(v) => {
            const item: Department = {
              id: editing?.id ?? nextId("d"),
              code: v.code,
              name: v.name,
            };
            editing
              ? updateItem("departments", item, actorName(), `department ${item.code}`)
              : createItem("departments", item, actorName(), `department ${item.code}`);
            setMode(null);
          }}
        />
      )}
      <DataTable
        columns={["Code", "Name", "Teachers", "Students"]}
        rows={filtered.map((d) => ({
          id: d.id,
          cells: [
            d.code,
            d.name,
            teachers.filter((t) => t.department === d.code).length,
            students.filter((s) => s.branch === d.code).length,
          ],
        }))}
        actions={(id) => {
          const d = departments.find((x) => x.id === id)!;
          return (
            <RowActions
              onEdit={() => setMode({ id })}
              onDelete={() => deleteItem("departments", id, actorName(), `department ${d.code}`)}
            />
          );
        }}
      />
    </div>
  );
}

/* --------------------------------- teachers -------------------------------- */

function TeachersView() {
  const { teachers, departments } = useStore();
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [mode, setMode] = useState<null | { id?: string }>(null);

  const filtered = teachers.filter(
    (t) =>
      `${t.name} ${t.email} ${t.subjects.join(" ")}`.toLowerCase().includes(search.toLowerCase()) &&
      (!dept || t.department === dept),
  );
  const editing = teachers.find((t) => t.id === mode?.id);

  return (
    <div>
      <SectionHeader
        title={`Teachers (${filtered.length})`}
        action={
          <button onClick={() => setMode({})} className={btnPrimary}>
            + Add teacher
          </button>
        }
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search name, email, subject…"
        onReset={() => {
          setSearch("");
          setDept("");
        }}
      >
        <Select
          value={dept}
          onChange={setDept}
          options={departments.map((d) => d.code)}
          allLabel="All departments"
        />
      </FilterBar>
      {mode && (
        <EntityForm
          key={editing?.id ?? "new"}
          fields={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "department", label: "Department code" },
            { key: "subjects", label: "Subjects (comma separated)" },
          ]}
          initial={{
            name: editing?.name ?? "",
            email: editing?.email ?? "",
            department: editing?.department ?? "CSE",
            subjects: editing?.subjects.join(", ") ?? "",
          }}
          submitLabel={editing ? "Save changes" : "Create teacher"}
          onCancel={() => setMode(null)}
          onSubmit={(v) => {
            const item: Teacher = {
              id: editing?.id ?? nextId("t"),
              name: v.name,
              email: v.email,
              department: v.department.toUpperCase(),
              subjects: v.subjects
                .split(",")
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean),
            };
            editing
              ? updateItem("teachers", item, actorName(), `teacher ${item.name}`)
              : createItem("teachers", item, actorName(), `teacher ${item.name}`);
            setMode(null);
          }}
        />
      )}
      <DataTable
        columns={["Name", "Email", "Department", "Subjects"]}
        rows={filtered.map((t) => ({
          id: t.id,
          cells: [t.name, t.email, t.department, t.subjects.join(", ")],
        }))}
        actions={(id) => {
          const t = teachers.find((x) => x.id === id)!;
          return (
            <RowActions
              onEdit={() => setMode({ id })}
              onDelete={() => deleteItem("teachers", id, actorName(), `teacher ${t.name}`)}
            />
          );
        }}
      />
    </div>
  );
}

/* --------------------------------- students -------------------------------- */

function StudentsView() {
  const { students, departments } = useStore();
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [sem, setSem] = useState("");
  const [band, setBand] = useState("");
  const [mode, setMode] = useState<null | { id?: string }>(null);

  const filtered = students.filter((s) => {
    const pct = percentageFor(s.id);
    const bandOk =
      !band ||
      (band === "Below 75%" && pct < 75) ||
      (band === "75% – 90%" && pct >= 75 && pct < 90) ||
      (band === "90% and above" && pct >= 90);
    return (
      `${s.name} ${s.roll} ${s.email}`.toLowerCase().includes(search.toLowerCase()) &&
      (!branch || s.branch === branch) &&
      (!sem || String(s.semester) === sem) &&
      bandOk
    );
  });
  const editing = students.find((s) => s.id === mode?.id);
  const semesters = [...new Set(students.map((s) => String(s.semester)))].sort();

  return (
    <div>
      <SectionHeader
        title={`Students (${filtered.length})`}
        action={
          <button onClick={() => setMode({})} className={btnPrimary}>
            + Add student
          </button>
        }
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search roll, name, email…"
        onReset={() => {
          setSearch("");
          setBranch("");
          setSem("");
          setBand("");
        }}
      >
        <Select
          value={branch}
          onChange={setBranch}
          options={departments.map((d) => d.code)}
          allLabel="All branches"
        />
        <Select value={sem} onChange={setSem} options={semesters} allLabel="All semesters" />
        <Select
          value={band}
          onChange={setBand}
          options={["Below 75%", "75% – 90%", "90% and above"]}
          allLabel="Any attendance"
        />
      </FilterBar>
      {mode && (
        <EntityForm
          key={editing?.id ?? "new"}
          fields={[
            { key: "roll", label: "Roll number" },
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "branch", label: "Branch" },
            { key: "semester", label: "Semester", type: "number" },
          ]}
          initial={{
            roll: editing?.roll ?? "",
            name: editing?.name ?? "",
            email: editing?.email ?? "",
            branch: editing?.branch ?? "CSE",
            semester: String(editing?.semester ?? 3),
          }}
          submitLabel={editing ? "Save changes" : "Create student"}
          onCancel={() => setMode(null)}
          onSubmit={(v) => {
            const item: Student = {
              id: editing?.id ?? nextId("s"),
              roll: v.roll,
              name: v.name,
              email: v.email,
              branch: v.branch.toUpperCase(),
              semester: Number(v.semester) || 1,
            };
            editing
              ? updateItem("students", item, actorName(), `student ${item.roll}`)
              : createItem("students", item, actorName(), `student ${item.roll}`);
            setMode(null);
          }}
        />
      )}
      <DataTable
        columns={["Roll", "Name", "Branch", "Semester", "Attendance %"]}
        rows={filtered.map((s) => ({
          id: s.id,
          cells: [s.roll, s.name, s.branch, s.semester, `${percentageFor(s.id)}%`],
        }))}
        actions={(id) => {
          const s = students.find((x) => x.id === id)!;
          return (
            <RowActions
              onEdit={() => setMode({ id })}
              onDelete={() => deleteItem("students", id, actorName(), `student ${s.roll}`)}
            />
          );
        }}
      />
    </div>
  );
}

/* --------------------------------- subjects -------------------------------- */

function SubjectsView() {
  const { subjects, teachers, departments } = useStore();
  const [search, setSearch] = useState("");
  const [faculty, setFaculty] = useState("");
  const [branch, setBranch] = useState("");
  const [mode, setMode] = useState<null | { id?: string }>(null);

  const filtered = subjects.filter(
    (s) =>
      `${s.code} ${s.name} ${s.faculty}`.toLowerCase().includes(search.toLowerCase()) &&
      (!faculty || s.faculty === faculty) &&
      (!branch || s.branch === branch),
  );
  const editing = subjects.find((s) => s.id === mode?.id);

  return (
    <div>
      <SectionHeader
        title={`Subjects (${filtered.length})`}
        action={
          <button onClick={() => setMode({})} className={btnPrimary}>
            + Add subject
          </button>
        }
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search code, name, faculty…"
        onReset={() => {
          setSearch("");
          setFaculty("");
          setBranch("");
        }}
      >
        <Select
          value={faculty}
          onChange={setFaculty}
          options={teachers.map((t) => t.name)}
          allLabel="All faculty"
        />
        <Select
          value={branch}
          onChange={setBranch}
          options={departments.map((d) => d.code)}
          allLabel="All branches"
        />
      </FilterBar>
      {mode && (
        <EntityForm
          key={editing?.id ?? "new"}
          fields={[
            { key: "code", label: "Code" },
            { key: "name", label: "Name" },
            { key: "faculty", label: "Faculty" },
            { key: "semester", label: "Semester", type: "number" },
            { key: "branch", label: "Branch" },
            { key: "credits", label: "Credits", type: "number" },
          ]}
          initial={{
            code: editing?.code ?? "",
            name: editing?.name ?? "",
            faculty: editing?.faculty ?? "",
            semester: String(editing?.semester ?? 3),
            branch: editing?.branch ?? "CSE",
            credits: String(editing?.credits ?? 3),
          }}
          submitLabel={editing ? "Save changes" : "Create subject"}
          onCancel={() => setMode(null)}
          onSubmit={(v) => {
            const item: Subject = {
              id: editing?.id ?? nextId("sub"),
              code: v.code.toUpperCase(),
              name: v.name,
              faculty: v.faculty,
              semester: Number(v.semester) || 1,
              branch: v.branch.toUpperCase(),
              credits: Number(v.credits) || 0,
            };
            editing
              ? updateItem("subjects", item, actorName(), `subject ${item.code}`)
              : createItem("subjects", item, actorName(), `subject ${item.code}`);
            setMode(null);
          }}
        />
      )}
      <DataTable
        columns={["Code", "Name", "Faculty", "Semester", "Branch", "Credits"]}
        rows={filtered.map((s) => ({
          id: s.id,
          cells: [s.code, s.name, s.faculty, s.semester, s.branch, s.credits],
        }))}
        actions={(id) => {
          const s = subjects.find((x) => x.id === id)!;
          return (
            <RowActions
              onEdit={() => setMode({ id })}
              onDelete={() => deleteItem("subjects", id, actorName(), `subject ${s.code}`)}
            />
          );
        }}
      />
    </div>
  );
}

/* --------------------------------- reports --------------------------------- */

function ReportsView() {
  const { students, subjects } = useStore();
  const [search, setSearch] = useState("");
  const [band, setBand] = useState("");

  const filtered = students.filter((s) => {
    const pct = percentageFor(s.id);
    const bandOk =
      !band ||
      (band === "Below 75%" && pct < 75) ||
      (band === "75% – 90%" && pct >= 75 && pct < 90) ||
      (band === "90% and above" && pct >= 90);
    return `${s.name} ${s.roll}`.toLowerCase().includes(search.toLowerCase()) && bandOk;
  });

  function exportAll() {
    const header = ["Roll", "Name", ...subjects.map((s) => s.code), "Overall %"];
    const rows = filtered.map((st) => [
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
        title={`Reports (${filtered.length})`}
        action={
          <button onClick={exportAll} className={btnPrimary}>
            Download filtered CSV
          </button>
        }
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search roll or name…"
        onReset={() => {
          setSearch("");
          setBand("");
        }}
      >
        <Select
          value={band}
          onChange={setBand}
          options={["Below 75%", "75% – 90%", "90% and above"]}
          allLabel="Any attendance"
        />
      </FilterBar>
      <DataTable
        columns={["Roll", "Name", ...subjects.map((s) => s.code), "Overall"]}
        rows={filtered.map((st) => ({
          id: st.id,
          cells: [
            st.roll,
            st.name,
            ...subjects.map((s) => `${percentageFor(st.id, s.code)}%`),
            `${percentageFor(st.id)}%`,
          ],
        }))}
      />
    </div>
  );
}

/* -------------------------------- audit log -------------------------------- */

function AuditView() {
  const { audit, teachers } = useStore();
  const [search, setSearch] = useState("");
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const actors = useMemo(
    () => [...new Set([...audit.map((a) => a.actor), ...teachers.map((t) => t.name)])],
    [audit, teachers],
  );

  const filtered = audit.filter((a) => {
    const day = a.at.slice(0, 10);
    return (
      `${a.actor} ${a.entity} ${a.detail}`.toLowerCase().includes(search.toLowerCase()) &&
      (!actor || a.actor === actor) &&
      (!action || a.action === action) &&
      (!from || day >= from) &&
      (!to || day <= to)
    );
  });

  function exportLog() {
    downloadCSV("teacher-audit-log.csv", [
      ["Timestamp", "Actor", "Role", "Action", "Entity", "Detail"],
      ...filtered.map((a) => [
        new Date(a.at).toLocaleString(),
        a.actor,
        a.role,
        a.action,
        a.entity,
        a.detail,
      ]),
    ]);
  }

  return (
    <div>
      <SectionHeader
        title={`Teacher & admin audit log (${filtered.length})`}
        action={
          <div className="flex gap-2">
            <button onClick={exportLog} className={btnPrimary}>
              Export log
            </button>
            <button onClick={clearAudit} className={btnGhost}>
              Clear log
            </button>
          </div>
        }
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search actor, subject, detail…"
        onReset={() => {
          setSearch("");
          setActor("");
          setAction("");
          setFrom("");
          setTo("");
        }}
      >
        <Select value={actor} onChange={setActor} options={actors} allLabel="All actors" />
        <Select
          value={action}
          onChange={setAction}
          options={["attendance", "create", "update", "delete"]}
          allLabel="All actions"
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={`${inputCls} sm:w-40`}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={`${inputCls} sm:w-40`}
        />
      </FilterBar>
      <DataTable
        columns={["When", "Actor", "Role", "Action", "Entity", "Detail"]}
        rows={filtered.map((a) => ({
          id: a.id,
          cells: [
            new Date(a.at).toLocaleString(undefined, {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            a.actor,
            a.role,
            a.action,
            a.entity,
            a.detail,
          ],
        }))}
      />
    </div>
  );
}
