export const DASHBOARD_COLORS = {
  primary: '#4F46E5',
  primaryLight: '#EEF2FF',
  background: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  success: '#059669',
  successLight: '#ECFDF5',
  violet: '#7C3AED',
  violetLight: '#F5F3FF',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  shadow: '#111827',
} as const;

export const TIMETABLE_MOCK = [
  { id: '1', time: '09:00', end: '10:00', subject: 'Data Structures', room: 'Lab 204' },
  { id: '2', time: '10:15', end: '11:15', subject: 'Operating Systems', room: 'C-301' },
  { id: '3', time: '11:30', end: '12:30', subject: 'Database Management', room: 'A-105' },
  { id: '4', time: '14:00', end: '15:00', subject: 'Software Engineering', room: 'B-210' },
] as const;

export const ANNOUNCEMENTS_MOCK = [
  {
    id: '1',
    title: 'Mid-semester exam schedule',
    body: 'Exam timetable for CSE Year 3 is published on the portal.',
    time: '2h ago',
  },
  {
    id: '2',
    title: 'Library extended hours',
    body: 'Central library open until 10 PM during exam week.',
    time: 'Yesterday',
  },
] as const;

export const ASSIGNMENTS_MOCK = [
  {
    id: '1',
    subject: 'DBMS Lab',
    title: 'Normalization assignment',
    due: 'May 20, 2026',
    urgent: true,
  },
  {
    id: '2',
    subject: 'Software Engineering',
    title: 'SRS document submission',
    due: 'May 22, 2026',
    urgent: false,
  },
  {
    id: '3',
    subject: 'Operating Systems',
    title: 'Process scheduling report',
    due: 'May 25, 2026',
    urgent: false,
  },
] as const;
