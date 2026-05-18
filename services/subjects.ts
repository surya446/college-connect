import { db } from "@/firebase/config";
import type { Subject } from "@/types/firestore";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    setDoc,
} from "firebase/firestore";
import { logAudit } from "./audit";
import { snapshotToList } from "./firestore-helpers";

const SUBJECTS = "subjects";

// Subscribe to global subjects registry (normalized)
export function subscribeSubjects(cb: (items: Subject[]) => void) {
  const unsub = onSnapshot(
    collection(db, SUBJECTS),
    (snap) => {
      const list = snapshotToList<Subject>(snap) as any[];
      console.debug(
        `[subjects.subscribeSubjects] snapshot size=${list.length}`,
      );
      const normalized = list.map((raw, i) => {
        console.debug(`[subjects.subscribeSubjects] doc[${i}] raw:`, raw);
        const out: any = { ...(raw as any) };
        // normalize name field
        if (!out.name && (out.subject || out.subjectName))
          out.name = out.subject ?? out.subjectName;
        // normalize optional department id (subjects are global)
        if (!out.departmentId && (out.department || out.dept))
          out.departmentId = out.department ?? out.dept;
        // normalize semester/term
        if (!out.semester && (out.term || out.termName || out.sem))
          out.semester = out.term ?? out.termName ?? out.sem;
        // normalize credits/category/electiveType (legacy fields may vary)
        if (!out.credits && (raw.credits || raw.credit))
          out.credits = raw.credits ?? raw.credit;
        if (!out.category && (raw.category || raw.type))
          out.category = raw.category ?? raw.type;
        if (!out.electiveType && (raw.electiveType || raw.elective))
          out.electiveType = raw.electiveType ?? raw.elective;
        if (!out.id && raw.id) out.id = raw.id;
        return out as Subject;
      });
      cb(normalized);
    },
    (err) => {
      console.error("[subjects.subscribeSubjects]", err);
      cb([]);
    },
  );

  return unsub;
}

// Fetch all subjects from the global registry
export async function fetchAllSubjects(): Promise<Subject[]> {
  console.debug("[subjects.fetchAllSubjects] fetching all subjects");
  const snap = await getDocs(collection(db, SUBJECTS));
  const raw = snapshotToList<Subject>(snap) as any[];
  if (!raw || raw.length === 0) return [];
  const normalized = raw.map((r, i) => {
    console.debug(`[subjects.fetchAllSubjects] doc[${i}] raw:`, r);
    const out: any = { ...r };
    if (!out.name && (out.subject || out.subjectName))
      out.name = out.subject ?? out.subjectName;
    if (!out.departmentId && (out.department || out.dept))
      out.departmentId = out.department ?? out.dept;
    if (!out.semester && (out.term || out.termName || out.sem))
      out.semester = out.term ?? out.termName ?? out.sem;
    if (!out.credits && (r.credits || r.credit))
      out.credits = r.credits ?? r.credit;
    if (!out.category && (r.category || r.type))
      out.category = r.category ?? r.type;
    if (!out.electiveType && (r.electiveType || r.elective))
      out.electiveType = r.electiveType ?? r.elective;
    if (!out.id && r.id) out.id = r.id;
    return out as Subject;
  });
  return normalized;
}

export async function addSubject(
  subject: Partial<Subject>,
  createdBy?: string,
) {
  const ref = collection(db, SUBJECTS);
  const docRef = await addDoc(ref, {
    ...subject,
    isActive: subject.isActive ?? true,
    createdAt: new Date(),
    createdBy: createdBy ?? null,
  } as any);
  try {
    await logAudit({
      actorUid: createdBy ?? "system",
      actionType: "other",
      targetCollection: SUBJECTS,
      targetDocumentId: docRef.id,
      newState: subject as any,
    });
  } catch (e) {
    console.warn("subjects.addSubject audit failed", e);
  }
  return docRef.id;
}

export async function updateSubject(
  id: string,
  updates: Partial<Subject>,
  updatedBy?: string,
) {
  await setDoc(
    doc(db, SUBJECTS, id),
    { ...updates, updatedAt: new Date() },
    { merge: true },
  );
  try {
    await logAudit({
      actorUid: updatedBy ?? "system",
      actionType: "other",
      targetCollection: SUBJECTS,
      targetDocumentId: id,
      newState: updates as any,
    });
  } catch (e) {
    console.warn("subjects.updateSubject audit failed", e);
  }
}

export async function deleteSubject(id: string, deletedBy?: string) {
  await deleteDoc(doc(db, SUBJECTS, id));
  try {
    await logAudit({
      actorUid: deletedBy ?? "system",
      actionType: "other",
      targetCollection: SUBJECTS,
      targetDocumentId: id,
    });
  } catch (e) {
    console.warn("subjects.deleteSubject audit failed", e);
  }
}

// TODO: elective subjects, interdisciplinary subjects, open electives,
// subject categories, credit-based curriculum systems, and migration tooling
