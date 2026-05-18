export type AttendanceStatus = 'good' | 'warning' | 'critical';

export type AttendanceStatusColors = {
  main: string;
  light: string;
  label: string;
};

const STATUS_COLORS: Record<AttendanceStatus, AttendanceStatusColors> = {
  good: {
    main: '#059669',
    light: '#ECFDF5',
    label: 'Good standing',
  },
  warning: {
    main: '#D97706',
    light: '#FFFBEB',
    label: 'Needs attention',
  },
  critical: {
    main: '#DC2626',
    light: '#FEF2F2',
    label: 'At risk',
  },
};

export function getAttendanceStatus(percentage: number): AttendanceStatus {
  if (percentage > 75) return 'good';
  if (percentage >= 60) return 'warning';
  return 'critical';
}

export function getAttendanceStatusColors(percentage: number): AttendanceStatusColors {
  return STATUS_COLORS[getAttendanceStatus(percentage)];
}
