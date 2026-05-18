import type { PickedPdfFile } from '@/services/notes-upload';

export type ValidationResult = { valid: true } | { valid: false; message: string };

export function validateTitle(title: string): ValidationResult {
  if (!title.trim()) {
    return { valid: false, message: 'Title is required.' };
  }
  return { valid: true };
}

export function validateSubject(subject: string): ValidationResult {
  if (!subject.trim()) {
    return { valid: false, message: 'Subject is required.' };
  }
  return { valid: true };
}

export function isPdfFile(file: Pick<PickedPdfFile, 'name' | 'mimeType'>): boolean {
  const mime = file.mimeType?.toLowerCase() ?? '';
  const name = file.name.toLowerCase();
  return mime === 'application/pdf' || name.endsWith('.pdf');
}

export function validatePdfFile(file: PickedPdfFile | null): ValidationResult {
  if (!file) {
    return { valid: false, message: 'Please select a PDF file.' };
  }
  if (!isPdfFile(file)) {
    return { valid: false, message: 'Only PDF files are allowed.' };
  }
  return { valid: true };
}

export function validateNoteUploadInput(
  title: string,
  subject: string,
  file: PickedPdfFile | null,
): ValidationResult {
  const titleResult = validateTitle(title);
  if (!titleResult.valid) return titleResult;

  const subjectResult = validateSubject(subject);
  if (!subjectResult.valid) return subjectResult;

  return validatePdfFile(file);
}
