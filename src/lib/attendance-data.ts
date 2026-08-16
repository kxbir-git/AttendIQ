// Mock data + tiny session store for the attendance prototype.
// Wire this to Lovable Cloud (Postgres + auth) when moving beyond the UI prototype.

export type Role = "admin" | "teacher" | "student";

export interface Session {
  role: Role;
  name: string;
  id: string;
}

const SESSION_KEY = "sams.session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
  subjects: string[]; // subject codes
}

export interface Student {
  id: string;
  name: string;
  roll: string;
  email: string;
  branch: string;
  semester: number;
  course?: string;
  department?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  faculty: string;
  semester: number;
  branch: string;
  credits: number;
  /** Scheduled class day, e.g. "Mon" */
  day?: string;
  period?: number;
  startTime?: string;
  endTime?: string;
}

export interface AttendanceRecord {
  subjectCode: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  period: number; // 1..7
  present: boolean;
}

export const departments: Department[] = [
  { id: "d1", name: "Computer Science & Engineering", code: "CSE" },
  { id: "d2", name: "Electronics & Communication", code: "ECE" },
  { id: "d3", name: "Mechanical Engineering", code: "ME" },
];

export const teachers: Teacher[] = [
  { id: "t1", name: "Dr. Anita Rao", email: "anita.rao@univ.edu", department: "CSE", subjects: ["CS201", "CS204"] },
  { id: "t2", name: "Prof. Rahul Menon", email: "rahul.menon@univ.edu", department: "CSE", subjects: ["CS202", "CS205"] },
  { id: "t3", name: "Dr. Sara Iqbal", email: "sara.iqbal@univ.edu", department: "CSE", subjects: ["CS203"] },
];

export const students: Student[] = Array.from({ length: 24 }, (_, i) => ({
  id: `s${i + 1}`,
  name: [
    "Aarav Sharma","Diya Patel","Kabir Singh","Isha Verma","Rohan Gupta","Meera Nair","Vihaan Rao","Ananya Iyer",
    "Arjun Reddy","Saanvi Bose","Aditya Jain","Neha Kapoor","Vivaan Shah","Riya Malhotra","Advait Kumar","Kiara Menon",
    "Yuvraj Chawla","Aisha Khan","Dev Mehta","Tara Bhatia","Ishaan Joshi","Zara Sethi","Reyansh Pillai","Myra Das"
  ][i],
  roll: `CSE24${String(i + 1).padStart(3, "0")}`,
  email: `student${i + 1}@univ.edu`,
  branch: "CSE",
  semester: 3,
}));

export const subjects: Subject[] = [
  { id: "sub1", code: "CS201", name: "Data Structures", faculty: "Dr. Anita Rao", semester: 3, branch: "CSE", credits: 4 },
  { id: "sub2", code: "CS202", name: "Operating Systems", faculty: "Prof. Rahul Menon", semester: 3, branch: "CSE", credits: 4 },
  { id: "sub3", code: "CS203", name: "Database Management Systems", faculty: "Dr. Sara Iqbal", semester: 3, branch: "CSE", credits: 3 },
  { id: "sub4", code: "CS204", name: "Computer Networks", faculty: "Dr. Anita Rao", semester: 3, branch: "CSE", credits: 3 },
  { id: "sub5", code: "CS205", name: "Artificial Intelligence", faculty: "Prof. Rahul Menon", semester: 3, branch: "CSE", credits: 4 },
];

// Deterministic pseudo-random attendance so the demo is stable across reloads.
function seededPresent(seed: string): boolean {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 100 < 82; // ~82% attendance overall
}

export function generateAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  for (let d = 30; d >= 1; d--) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const iso = date.toISOString().slice(0, 10);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;
    subjects.forEach((sub, si) => {
      const period = (si % 6) + 1;
      students.forEach((st) => {
        records.push({
          subjectCode: sub.code,
          studentId: st.id,
          date: iso,
          period,
          present: seededPresent(`${sub.code}-${st.id}-${iso}`),
        });
      });
    });
  }
  return records;
}

export const attendance: AttendanceRecord[] = generateAttendance();

export function percentageFor(studentId: string, subjectCode?: string): number {
  const rows = attendance.filter(
    (r) => r.studentId === studentId && (!subjectCode || r.subjectCode === subjectCode),
  );
  if (!rows.length) return 0;
  const present = rows.filter((r) => r.present).length;
  return Math.round((present / rows.length) * 1000) / 10;
}

export interface ScheduleSlot {
  subjectCode: string;
  subjectName: string;
  faculty: string;
  period: number;
  startTime: string;
  endTime: string;
}

// Period-wise timetable (50-minute periods) scheduled by admin/teacher.
const PERIOD_TIMES: Record<number, [string, string]> = {
  1: ["09:00", "09:50"],
  2: ["09:55", "10:45"],
  3: ["11:00", "11:50"],
  4: ["11:55", "12:45"],
  5: ["13:30", "14:20"],
  6: ["14:25", "15:15"],
  7: ["15:20", "16:10"],
};

export function todaySchedule(): ScheduleSlot[] {
  return subjects
    .map((sub, si) => {
      const period = (si % 6) + 1;
      const [startTime, endTime] = PERIOD_TIMES[period];
      return {
        subjectCode: sub.code,
        subjectName: sub.name,
        faculty: sub.faculty,
        period,
        startTime,
        endTime,
      };
    })
    .sort((a, b) => a.period - b.period);
}

// Deterministic "teacher marked at" stamp derived from the latest record date.
export function lastMarkedAt(subjectCode: string): string | null {
  const rows = attendance.filter((r) => r.subjectCode === subjectCode);
  if (!rows.length) return null;
  const last = rows[rows.length - 1];
  const slot = todaySchedule().find((s) => s.subjectCode === subjectCode);
  const time = slot ? slot.endTime : "16:10";
  const d = new Date(`${last.date}T${time}:00`);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayAttendanceRate(): number {

  const today = attendance.length
    ? attendance[attendance.length - 1].date
    : new Date().toISOString().slice(0, 10);
  const rows = attendance.filter((r) => r.date === today);
  if (!rows.length) return 0;
  return Math.round((rows.filter((r) => r.present).length / rows.length) * 1000) / 10;
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
