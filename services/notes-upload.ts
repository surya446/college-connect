import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    query,
    serverTimestamp,
    where
} from "firebase/firestore";

import { db } from "@/firebase/config";
import * as assignmentsService from "@/services/faculty-assignments";
import { supabase } from "@/services/supabase";
import type { NoteMetadata } from "@/types/note";
import { isPdfFile } from "@/utils/note-upload-validation";
import { logAudit } from "./audit";
import { safeGetDocs } from "./firestore-safe";

const NOTES_BUCKET = "notes";
const NOTES_COLLECTION = "notes";

export type PickedPdfFile = {
  uri: string;
  name: string;
  mimeType: string | null;
};

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function buildStoragePath(uploadedBy: string, fileName: string): string {
  const safeName = sanitizeFileName(fileName) || "document.pdf";
  const timestamp = Date.now();
  return `${uploadedBy}/${timestamp}-${safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`}`;
}

export async function uploadPdfToStorage(
  file: PickedPdfFile,
  uploadedBy: string,
): Promise<string> {
  if (!isPdfFile(file)) {
    throw new Error("Only PDF files are allowed.");
  }

  const storagePath = buildStoragePath(uploadedBy, file.name);

  const response = await fetch(file.uri);
  if (!response.ok) {
    throw new Error("Could not read the selected PDF file.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = file.mimeType ?? "application/pdf";

  const { data, error } = await supabase.storage
    .from(NOTES_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error("[notes-upload] Supabase storage error:", error);
    throw new Error(error.message || "Failed to upload PDF to storage.");
  }

  const { data: publicUrlData } = supabase.storage
    .from(NOTES_BUCKET)
    .getPublicUrl(data.path);

  if (!publicUrlData.publicUrl) {
    throw new Error("Upload succeeded but public URL could not be generated.");
  }

  return publicUrlData.publicUrl;
}

export async function saveNoteMetadata(
  metadata: NoteMetadata,
): Promise<string> {
  const payload: any = {
    title: metadata.title,
    pdfUrl: metadata.pdfUrl,
    uploadedBy: metadata.uploadedBy,
    createdAt: serverTimestamp(),
  };

  if (metadata.assignmentId) payload.assignmentId = metadata.assignmentId;
  if (metadata.classId) payload.classId = metadata.classId;
  if (metadata.sectionId) payload.sectionId = metadata.sectionId;
  if (metadata.subjectId) payload.subjectId = metadata.subjectId;
  if (metadata.subject) payload.subject = metadata.subject;

  // TODO: add note versioning fields, download analytics placeholder, access logs

  const docRef = await addDoc(collection(db, NOTES_COLLECTION), payload);
  // Audit: note metadata created
  try {
    await logAudit({
      actorUid: metadata.uploadedBy,
      actionType: "notes_upload",
      targetCollection: NOTES_COLLECTION,
      targetDocumentId: docRef.id,
      newState: payload,
      clientGenerated: true,
    });
  } catch (e) {
    console.warn("[notes-upload.saveNoteMetadata] audit failed", e);
  }
  return docRef.id;
}

export async function fetchNotesCountByUploader(uploaderUid: string) {
  const q = query(
    collection(db, "notes"),
    where("uploadedBy", "==", uploaderUid),
  );
  const snap = await safeGetDocs(q as any);
  return snap?.size ?? 0;
}

export async function uploadNote(
  file: PickedPdfFile,
  input: {
    title: string;
    subject?: string;
    subjectId?: string | null;
    assignmentId?: string | null;
    classId?: string | null;
    sectionId?: string | null;
    uploadedBy: string;
  },
): Promise<{ noteId: string; pdfUrl: string }> {
  // If assignmentId is provided, verify the faculty owns that assignment
  if (input.assignmentId) {
    const assignments = await assignmentsService.fetchAssignmentsForFaculty(
      input.uploadedBy,
    );
    const ok = assignments.some((a) => a.id === input.assignmentId);
    if (!ok)
      throw new Error("You are not assigned to the selected class/subject.");
  }

  const pdfUrl = await uploadPdfToStorage(file, input.uploadedBy);

  const noteId = await saveNoteMetadata({
    title: input.title.trim(),
    subject: input.subject?.trim(),
    subjectId: input.subjectId ?? null,
    assignmentId: input.assignmentId ?? null,
    classId: input.classId ?? null,
    sectionId: input.sectionId ?? null,
    pdfUrl,
    uploadedBy: input.uploadedBy,
  });

  return { noteId, pdfUrl };
}

/**
 * Extracts the storage path for a file from a Supabase public URL.
 * Example URL: https://<project>.supabase.co/storage/v1/object/public/notes/user/123-name.pdf
 * This returns: "user/123-name.pdf"
 */
function getStoragePathFromPublicUrl(publicUrl: string): string {
  try {
    const NOTES_BUCKET = "notes";
    const idx = publicUrl.indexOf(`/${NOTES_BUCKET}/`);
    if (idx === -1) {
      throw new Error("Could not locate bucket path in public URL");
    }
    const path = publicUrl.substring(idx + NOTES_BUCKET.length + 2);
    return decodeURIComponent(path.split("?")[0]);
  } catch (err) {
    console.error(
      "[notes-upload] failed to parse storage path from URL",
      publicUrl,
      err,
    );
    throw err;
  }
}

/**
 * Delete the PDF file from Supabase storage and remove the Firestore document.
 * Throws an error if either deletion fails.
 */
export async function deleteNote(
  noteId: string,
  pdfUrl: string,
): Promise<void> {
  // First delete the storage object
  try {
    const storagePath = getStoragePathFromPublicUrl(pdfUrl);
    const { error } = await supabase.storage
      .from(NOTES_BUCKET)
      .remove([storagePath]);
    if (error) {
      console.error("[notes-upload] Supabase delete error:", error);
      throw new Error(error.message || "Failed to delete file from storage.");
    }
  } catch (err) {
    console.error("[notes-upload] storage deletion failed", err);
    throw err;
  }

  // Then delete the Firestore document
  try {
    await deleteDoc(doc(db, "notes", noteId));
    // Audit: note deleted
    try {
      await logAudit({
        actorUid: "system",
        actionType: "notes_delete",
        targetCollection: "notes",
        targetDocumentId: noteId,
        metadata: { action: "delete" },
        clientGenerated: true,
      });
    } catch (e) {
      console.warn("[notes-upload.deleteNote] audit failed", e);
    }
  } catch (err) {
    console.error("[notes-upload] firestore delete failed", err);
    throw err;
  }
}

export function getNotesUploadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Failed to upload note. Please try again.";
}
