import { COLORS, FONT_WEIGHT, RADIUS, SPACING } from "@/constants/theme";
import React from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

export interface AttendanceActionsProps {
  onSave: () => Promise<void>;
  saving: boolean;
}

export default function AttendanceActions({
  onSave,
  saving,
}: AttendanceActionsProps) {
  return (
    <View style={styles.actionsRow}>
      <Pressable style={styles.saveButton} onPress={onSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>Save Attendance</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsRow: { flexDirection: "row", justifyContent: "flex-end" },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
  },
  saveText: { color: "#fff", fontWeight: FONT_WEIGHT.bold as any },
});
