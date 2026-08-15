// Client-side CRUD store for the admin console + teacher audit log.
// Backed by localStorage so the prototype persists across reloads.
import { useSyncExternalStore } from "react";
import {
  departments as seedDepartments,
  students as seedStudents,
  subjects as seedSubjects,
  teachers as seedTeachers,
  type Department,
  type Student,
  type Subject,
  type Teacher,
} from "./attendance-data";

export type AuditAction = "create" | "update" | "delete" | "attendance";

export interface AuditEntry {
  id: string;
  at: string; // ISO timestamp
  actor: string;
  role: string;
  action: AuditAction;
  entity: string;
  detail: string;
}

export interface StoreState {
  departments: Department[];
  teachers: Teacher[];
  students: Student[];
  subjects: Subject[];
  audit: AuditEntry[];
}

const KEY = "sams.store.v1";

function seed(): StoreState {
  const now = Date.now();
  return {
    departments: [...seedDepartments],
    teachers: [...seedTeachers],
    students: [...seedStudents],
    subjects: [...seedSubjects],
    audit: [
      {
        id: "a3",
        at: new Date(now - 1000 * 60 * 45).toISOString(),
        actor: "Dr. Anita Rao",
        role: "teacher",
        action: "attendance",
        entity: "CS201 · Period 1",
        detail: "Marked attendance for 24 students (20 present, 4 absent)",
      },
      {
        id: "a2",
        at: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
        actor: "Prof. Rahul Menon",
        role: "teacher",
        action: "attendance",
        entity: "CS202 · Period 2",
        detail: "Marked attendance for 24 students (22 present, 2 absent)",
      },
      {
        id: "a1",
        at: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
        actor: "Dr. Sara Iqbal",
        role: "teacher",
        action: "attendance",
        entity: "CS203 · Period 3",
        detail: "Corrected attendance for 3 students",
      },
    ],
  };
}

let state: StoreState = seed();
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...seed(), ...(JSON.parse(raw) as StoreState) };
  } catch {
    /* keep seed */
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  hydrate();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(): StoreState {
  return useSyncExternalStore(
    subscribe,
    () => {
      hydrate();
      return state;
    },
    () => state,
  );
}

export function logAudit(entry: Omit<AuditEntry, "id" | "at">) {
  hydrate();
  state = {
    ...state,
    audit: [
      { ...entry, id: `a${Date.now()}${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString() },
      ...state.audit,
    ].slice(0, 200),
  };
  emit();
}

export function clearAudit() {
  state = { ...state, audit: [] };
  emit();
}

type Collection = "departments" | "teachers" | "students" | "subjects";
type Item = { id: string };

export function createItem<T extends Item>(
  collection: Collection,
  item: T,
  actor: string,
  label: string,
) {
  hydrate();
  state = { ...state, [collection]: [...(state[collection] as unknown as T[]), item] } as StoreState;
  emit();
  logAudit({ actor, role: "admin", action: "create", entity: collection, detail: `Created ${label}` });
}

export function updateItem<T extends Item>(
  collection: Collection,
  item: T,
  actor: string,
  label: string,
) {
  hydrate();
  state = {
    ...state,
    [collection]: (state[collection] as unknown as T[]).map((r) => (r.id === item.id ? item : r)),
  } as StoreState;
  emit();
  logAudit({ actor, role: "admin", action: "update", entity: collection, detail: `Updated ${label}` });
}

export function deleteItem(collection: Collection, id: string, actor: string, label: string) {
  hydrate();
  state = {
    ...state,
    [collection]: (state[collection] as unknown as Item[]).filter((r) => r.id !== id),
  } as StoreState;
  emit();
  logAudit({ actor, role: "admin", action: "delete", entity: collection, detail: `Deleted ${label}` });
}

export function nextId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}`;
}
