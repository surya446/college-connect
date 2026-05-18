import type { AttendanceFirestore, AttendanceRecord, AttendanceSummary } from '@/types/attendance';

function toNumber(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error(`Invalid ${field} in attendance record`);
}

function toString(value: unknown, field: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  throw new Error(`Invalid ${field} in attendance record`);
}

export function parseAttendanceRecord(
  id: string,
  data: AttendanceFirestore,
): AttendanceRecord {
  const subject = data.subject
    ? toString(data.subject, 'subject')
    : toString(data.subjectName, 'subjectName');

  const attended = data.attended != null
    ? toNumber(data.attended, 'attended')
    : toNumber(data.attendedClasses, 'attendedClasses');

  const total = data.total != null
    ? toNumber(data.total, 'total')
    : toNumber(data.totalClasses, 'totalClasses');

  if (total <= 0) {
    throw new Error('Total classes must be greater than zero');
  }

  if (attended < 0 || attended > total) {
    throw new Error('Attended classes must be between 0 and total classes');
  }

  const percentage =
    data.percentage != null
      ? Math.min(100, Math.max(0, toNumber(data.percentage, 'percentage')))
      : Math.round((attended / total) * 1000) / 10;

  const studentId = toString(data.studentId, 'studentId');

  return {
    id,
    studentId,
    subject,
    attended,
    total,
    percentage,
  };
}

export function computeAttendanceSummary(records: AttendanceRecord[]): AttendanceSummary {
  if (records.length === 0) {
    return { attended: 0, total: 0, percentage: 0, subjectCount: 0 };
  }

  const attended = records.reduce((sum, record) => sum + record.attended, 0);
  const total = records.reduce((sum, record) => sum + record.total, 0);
  const percentage = total > 0 ? Math.round((attended / total) * 1000) / 10 : 0;

  return {
    attended,
    total,
    percentage,
    subjectCount: records.length,
  };
}

export function getAttendanceErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: string }).code);
    switch (code) {
      case 'permission-denied':
        return 'You do not have permission to view attendance records.';
      case 'failed-precondition':
        return 'A Firestore index is required for this query. Check the Firebase console.';
      case 'unavailable':
        return 'Firestore is temporarily unavailable. Check your connection.';
      default:
        break;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to load attendance records. Please try again.';
}
