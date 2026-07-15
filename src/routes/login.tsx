import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Shield, BookOpen, User } from "lucide-react";
import { setSession, type Role, teachers, students } from "@/lib/attendance-data";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const roles: { id: Role; label: string; icon: typeof Shield; hint: string }[] = [
  { id: "admin", label: "Admin", icon: Shield, hint: "Manage everything" },
  { id: "teacher", label: "Teacher", icon: BookOpen, hint: "Mark attendance" },
  { id: "student", label: "Student", icon: User, hint: "View your attendance" },
];

function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("teacher");
  const [email, setEmail] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    let name = "Guest";
    let id = "guest";
    if (role === "admin") {
      name = "Registrar";
      id = "admin";
    } else if (role === "teacher") {
      const t = teachers.find((t) => t.email === email) ?? teachers[0];
      name = t.name;
      id = t.id;
    } else {
      const st = students.find((s) => s.email === email) ?? students[0];
      name = st.name;
      id = st.id;
    }
    setSession({ role, name, id });
    navigate({ to: `/${role}` });
  }

  return (
    <div className="min-h-screen bg-hero px-4 py-10">
      <div className="mx-auto max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold">AttendIQ</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <h1 className="font-display text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose your role. This prototype signs you in with mock data.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {roles.map((r) => {
              const active = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`rounded-lg border p-3 text-left transition ${
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                >
                  <r.icon
                    className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <div className="mt-2 text-sm font-medium">{r.label}</div>
                  <div className="text-[11px] text-muted-foreground">{r.hint}</div>
                </button>
              );
            })}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  role === "admin"
                    ? "registrar@univ.edu"
                    : role === "teacher"
                      ? "anita.rao@univ.edu"
                      : "student1@univ.edu"
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign in as {role}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Demo: leave email blank to sign in as the first {role} in the sample data.
          </p>
        </div>
      </div>
    </div>
  );
}
