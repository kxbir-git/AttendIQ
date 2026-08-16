import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, X, Download, Plus, Pencil, Trash2, Clock } from "lucide-react";
import {
  attendance,
  downloadCSV,
  getSession,
  percentageFor,
  teachers,
  type AttendanceRecord,
  type Student,
  type Subject,
} from "@/lib/attendance-data";
import { createItem, deleteItem, logAudit, nextId, updateItem, useStore } from "@/lib/admin-store";
import { AppShell, StatCard } from "@/components/app-shell";

export const Route = createFileRoute("/teacher")({
  component: TeacherDashboard,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const input =
  "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary";

const emptySubject = (faculty: string): Subject => ({
  id: "",
  code: "",
  name: "",
  faculty,
  semester: 3,
  branch: "CSE",
  credits: 3,
  day: "Mon",
  period: 1,
  startTime: "09:00",
  endTime: "09:50",
});

const emptyStudent = (): Student => ({
  id: "",
  name: "",
  roll: "",
  email: "",
  branch: "CSE",
  semester: 3,
  course: "B.Tech",
  department: "CSE",
});

function TeacherDashboard() {
  const navigate = useNavigate();
  const store = useStore();
  const [session, setSessionState] = useState<ReturnType<typeof getSession>>(null);
  useEffect(() => {
    const s = getSession();
    setSessionState(s);
    if (!s) navigate({ to: "/login" });
  }, [navigate]);

  const teacher = store.teachers.find((t) => t.id === session?.id) ?? teachers[0];
  const students = store.students;
  const mySubjects = useMemo(
    () =>
      store.subjects.filter(
        (s) => teacher.subjects.includes(s.code) || s.faculty === teacher.name,
      ),
    [store.subjects, teacher],
  );

  const [tab, setTab] = useState<"attendance" | "subjects" | "students">("attendance");

  // ---------- attendance ----------
  const [selected, setSelected] = useState("");
  const [date, setDate] = useState("");
  const [period, setPeriod] = useState(1);
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => setDate(new Date().toISOString().slice(0, 10)), []);
  useEffect(() => {
    if (!selected && mySubjects[0]) setSelected(mySubjects[0].code);
  }, [mySubjects, selected]);

  useEffect(() => {
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
  }, [selected, date, period, students]);

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
    Object.entries(marks).forEach(([studentId, isPresent]) => {
      const idx = attendance.findIndex(
        (r) =>
          r.subjectCode === selected &&
          r.date === date &&
          r.period === period &&
          r.studentId === studentId,
      );
      const rec: AttendanceRecord = { subjectCode: selected, studentId, date, period, present: isPresent };
      if (idx >= 0) attendance[idx] = rec;
      else attendance.push(rec);
    });
    setSaved(true);
    const presentCount = Object.values(marks).filter(Boolean).length;
    logAudit({
      actor: teacher.name,
      role: "teacher",
      action: "attendance",
      entity: `${selected} · Period ${period}`,
      detail: `Marked attendance for ${total} students (${presentCount} present, ${total - presentCount} absent)`,
    });
  }

  function exportSubject() {
    downloadCSV(`${selected}-attendance.csv`, [
      ["Roll", "Name", "Course", "Department", "Overall %", `${selected} %`],
      ...students.map((s) => [
        s.roll,
        s.name,
        s.course ?? "—",
        s.department ?? s.branch,
        `${percentageFor(s.id)}%`,
        `${percentageFor(s.id, selected)}%`,
      ]),
    ]);
  }

  // ---------- subject form ----------
  const [subForm, setSubForm] = useState<Subject | null>(null);
  function saveSubject() {
    if (!subForm || !subForm.code.trim() || !subForm.name.trim()) return;
    const label = `subject ${subForm.code} — ${subForm.name}`;
    if (subForm.id) updateItem("subjects", subForm, teacher.name, label, "teacher");
    else createItem("subjects", { ...subForm, id: nextId("sub") }, teacher.name, label, "teacher");
    setSubForm(null);
  }

  // ---------- student form ----------
  const [stuForm, setStuForm] = useState<Student | null>(null);
  function saveStudent() {
    if (!stuForm || !stuForm.name.trim() || !stuForm.roll.trim()) return;
    const label = `student ${stuForm.roll} — ${stuForm.name}`;
    if (stuForm.id) updateItem("students", stuForm, teacher.name, label, "teacher");
    else createItem("students", { ...stuForm, id: nextId("s") }, teacher.name, label, "teacher");
    setStuForm(null);
  }

  const tabs = [
    { key: "attendance", label: "Mark attendance" },
    { key: "subjects", label: "Subjects & schedule" },
    { key: "students", label: "Students" },
  ] as const;

  return (
    <AppShell title={`Welcome, ${teacher.name}`} subtitle="Manage subjects, class schedule, students and attendance.">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Your Subjects" value={mySubjects.length} />
        <StatCard label="Total Students" value={students.length} accent="chart-2" />
        <StatCard
          label="Marked Present"
          value={`${present}/${total}`}
          accent="success"
          hint={`for ${selected || "—"} · P${period}`}
        />
        <StatCard
          label="Subject Avg"
          value={`${subjectStats.find((s) => s.code === selected)?.pct ?? 0}%`}
          accent="warning"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "attendance" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
            <h3 className="font-display text-lg font-semibold">Your subjects</h3>
            <div className="mt-3 space-y-2">
              {subjectStats.map((s) => (
                <button
                  key={s.code}
                  onClick={() => setSelected(s.code)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selected === s.code ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.code}</span>
                  </div>
                  {s.startTime && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {s.day} · P{s.period} · {s.startTime}–{s.endTime}
                    </div>
                  )}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${s.pct}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.pct}% avg attendance</div>
                </button>
              ))}
              {!subjectStats.length && (
                <p className="text-sm text-muted-foreground">
                  No subjects yet — add one in “Subjects & schedule”.
                </p>
              )}
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
                    <th className="px-3 py-2">Course</th>
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
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {s.course ?? "—"} · {s.department ?? s.branch}
                        </td>
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
                disabled={!selected}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saved ? "Saved ✓" : "Save attendance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "subjects" && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold">Subjects & class schedule</h3>
              <p className="text-xs text-muted-foreground">
                Add a subject with its code and schedule the class day, period and time.
              </p>
            </div>
            <button
              onClick={() => setSubForm(emptySubject(teacher.name))}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Add subject
            </button>
          </div>

          {subForm && (
            <div className="mt-4 grid gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 md:grid-cols-4">
              <label className="text-xs font-medium">
                Subject code
                <input
                  className={input}
                  value={subForm.code}
                  onChange={(e) => setSubForm({ ...subForm, code: e.target.value.toUpperCase() })}
                  placeholder="CS206"
                />
              </label>
              <label className="text-xs font-medium md:col-span-2">
                Subject name
                <input
                  className={input}
                  value={subForm.name}
                  onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                  placeholder="Machine Learning"
                />
              </label>
              <label className="text-xs font-medium">
                Credits
                <input
                  type="number"
                  className={input}
                  value={subForm.credits}
                  onChange={(e) => setSubForm({ ...subForm, credits: Number(e.target.value) })}
                />
              </label>
              <label className="text-xs font-medium">
                Day
                <select
                  className={input}
                  value={subForm.day}
                  onChange={(e) => setSubForm({ ...subForm, day: e.target.value })}
                >
                  {DAYS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium">
                Period
                <select
                  className={input}
                  value={subForm.period}
                  onChange={(e) => setSubForm({ ...subForm, period: Number(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                    <option key={p} value={p}>
                      Period {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium">
                Start time
                <input
                  type="time"
                  className={input}
                  value={subForm.startTime}
                  onChange={(e) => setSubForm({ ...subForm, startTime: e.target.value })}
                />
              </label>
              <label className="text-xs font-medium">
                End time
                <input
                  type="time"
                  className={input}
                  value={subForm.endTime}
                  onChange={(e) => setSubForm({ ...subForm, endTime: e.target.value })}
                />
              </label>
              <div className="flex items-end gap-2 md:col-span-4">
                <button
                  onClick={saveSubject}
                  className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {subForm.id ? "Update subject" : "Create subject"}
                </button>
                <button
                  onClick={() => setSubForm(null)}
                  className="rounded-md border border-border px-4 py-1.5 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/80 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Schedule</th>
                  <th className="px-3 py-2">Credits</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mySubjects.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{s.code}</td>
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {s.startTime ? `${s.day ?? "—"} · P${s.period} · ${s.startTime}–${s.endTime}` : "Not scheduled"}
                    </td>
                    <td className="px-3 py-2">{s.credits}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setSubForm({ ...emptySubject(teacher.name), ...s })}
                          className="rounded-md border border-border p-1.5 hover:bg-accent"
                          aria-label={`Edit ${s.code}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            deleteItem("subjects", s.id, teacher.name, `subject ${s.code}`, "teacher")
                          }
                          className="rounded-md border border-border p-1.5 text-destructive hover:bg-destructive/10"
                          aria-label={`Delete ${s.code}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "students" && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold">Students</h3>
              <p className="text-xs text-muted-foreground">
                Add a student with name, course and department — they appear instantly in the attendance sheet.
              </p>
            </div>
            <button
              onClick={() => setStuForm(emptyStudent())}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Add student
            </button>
          </div>

          {stuForm && (
            <div className="mt-4 grid gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 md:grid-cols-4">
              <label className="text-xs font-medium">
                Name
                <input
                  className={input}
                  value={stuForm.name}
                  onChange={(e) => setStuForm({ ...stuForm, name: e.target.value })}
                  placeholder="Aarav Sharma"
                />
              </label>
              <label className="text-xs font-medium">
                Roll no.
                <input
                  className={input}
                  value={stuForm.roll}
                  onChange={(e) => setStuForm({ ...stuForm, roll: e.target.value.toUpperCase() })}
                  placeholder="CSE24025"
                />
              </label>
              <label className="text-xs font-medium">
                Course
                <input
                  className={input}
                  value={stuForm.course ?? ""}
                  onChange={(e) => setStuForm({ ...stuForm, course: e.target.value })}
                  placeholder="B.Tech"
                />
              </label>
              <label className="text-xs font-medium">
                Department
                <select
                  className={input}
                  value={stuForm.department ?? ""}
                  onChange={(e) =>
                    setStuForm({ ...stuForm, department: e.target.value, branch: e.target.value })
                  }
                >
                  {store.departments.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium">
                Email
                <input
                  className={input}
                  value={stuForm.email}
                  onChange={(e) => setStuForm({ ...stuForm, email: e.target.value })}
                  placeholder="student@univ.edu"
                />
              </label>
              <label className="text-xs font-medium">
                Semester
                <input
                  type="number"
                  className={input}
                  value={stuForm.semester}
                  onChange={(e) => setStuForm({ ...stuForm, semester: Number(e.target.value) })}
                />
              </label>
              <div className="flex items-end gap-2 md:col-span-2">
                <button
                  onClick={saveStudent}
                  className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {stuForm.id ? "Update student" : "Add student"}
                </button>
                <button
                  onClick={() => setStuForm(null)}
                  className="rounded-md border border-border px-4 py-1.5 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 max-h-[480px] overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Roll</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Department</th>
                  <th className="px-3 py-2">Sem</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{s.roll}</td>
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-3 py-2">{s.course ?? "—"}</td>
                    <td className="px-3 py-2">{s.department ?? s.branch}</td>
                    <td className="px-3 py-2">{s.semester}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setStuForm({ ...emptyStudent(), ...s })}
                          className="rounded-md border border-border p-1.5 hover:bg-accent"
                          aria-label={`Edit ${s.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            deleteItem("students", s.id, teacher.name, `student ${s.roll}`, "teacher")
                          }
                          className="rounded-md border border-border p-1.5 text-destructive hover:bg-destructive/10"
                          aria-label={`Delete ${s.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
