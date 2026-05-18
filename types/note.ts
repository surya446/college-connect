export type NoteMetadata = {
  title: string;
  pdfUrl: string;
  uploadedBy: string; // faculty uid
  // Assignment-driven fields (optional for admin override)
  assignmentId?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  subjectId?: string | null; // canonical subject id
  subject?: string; // human-readable subject name (optional)
  // TODO: add versioning metadata, download analytics, access logs
};

export type NoteDocument = NoteMetadata & {
  id: string;
  createdAt: Date;
};
