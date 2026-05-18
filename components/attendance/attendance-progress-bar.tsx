import { StyleSheet, View, type DimensionValue } from 'react-native';

import { getAttendanceStatusColors } from '@/utils/attendance-status';

type AttendanceProgressBarProps = {
  percentage: number;
  height?: number;
};

export function AttendanceProgressBar({ percentage, height = 8 }: AttendanceProgressBarProps) {
  const colors = getAttendanceStatusColors(percentage);
  const width = `${Math.min(100, Math.max(0, percentage))}%` as DimensionValue;

  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width, backgroundColor: colors.main, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 999,
  },
});
