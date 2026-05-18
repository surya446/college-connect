import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import SelectModal from "@/components/attendance/SelectModal";
import { DASHBOARD_COLORS } from "@/constants/dashboard";
import { useAuth } from "@/context/auth-context";
import { useRole } from "@/hooks/use-role";
import { useUserProfile } from "@/hooks/use-user-profile";
import * as assignmentsService from "@/services/faculty-assignments";
import {
    getNotesUploadErrorMessage,
    uploadNote,
    type PickedPdfFile,
} from "@/services/notes-upload";
import {
    isPdfFile,
    validateNoteUploadInput,
} from "@/utils/note-upload-validation";

const PRIMARY = "#4F46E5";

export function NoteUploadForm() {
  const { user } = useAuth();
  const { isFaculty, isAdmin } = useRole();
  const { profile } = useUserProfile();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedFile, setSelectedFile] = useState<PickedPdfFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | null
  >(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const file: PickedPdfFile = {
        uri: asset.uri,
        name: asset.name ?? "document.pdf",
        mimeType: asset.mimeType ?? "application/pdf",
      };

      if (!isPdfFile(file)) {
        Alert.alert("Invalid file", "Only PDF files are allowed.");
        return;
      }

      setSelectedFile(file);
    } catch (error) {
      console.error("[NoteUploadForm] Document picker error:", error);
      Alert.alert(
        "Could not open files",
        "Please try selecting the PDF again.",
      );
    }
  };

  const handleUpload = async () => {
    // Basic validations
    if (!selectedFile) {
      Alert.alert("Validation error", "Please select a PDF to upload.");
      return;
    }

    if (!user?.uid) {
      Alert.alert("Not signed in", "You must be logged in to upload notes.");
      return;
    }

    // Faculty flow: require assignment selection unless admin override enabled
    if (isFaculty && !adminOverride) {
      if (!selectedAssignmentId) {
        Alert.alert(
          "Assignment required",
          "Select one of your assigned class/subject combinations before uploading.",
        );
        return;
      }
    } else {
      // For non-faculty or admin override, validate freeform subject
      const validation = validateNoteUploadInput(title, subject, selectedFile);
      if (!validation.valid) {
        Alert.alert("Validation error", validation.message);
        return;
      }
    }

    setLoading(true);
    try {
      if (isFaculty && !adminOverride) {
        const assignment = assignments.find(
          (a) => a.id === selectedAssignmentId,
        );
        if (!assignment) throw new Error("Selected assignment not found");

        await uploadNote(selectedFile!, {
          title: title.trim() || "Untitled",
          assignmentId: assignment.id,
          classId: assignment.classId ?? null,
          sectionId: assignment.sectionId ?? null,
          subjectId: assignment.subjectId ?? null,
          uploadedBy: user.uid,
        });
      } else {
        await uploadNote(selectedFile!, {
          title: title.trim(),
          subject: subject.trim(),
          uploadedBy: user.uid,
        });
      }

      Alert.alert("Upload successful", "Your PDF has been uploaded and saved.");
      setTitle("");
      setSubject("");
      setSelectedFile(null);
      setSelectedAssignmentId(null);
    } catch (error) {
      console.error("[NoteUploadForm] Upload error:", error);
      Alert.alert("Upload failed", getNotesUploadErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to assignments for faculty
  useEffect(() => {
    if (!isFaculty || !user?.uid) {
      setAssignments([]);
      setAssignmentsLoading(false);
      return;
    }

    setAssignmentsLoading(true);
    const unsub = assignmentsService.subscribeFacultyAssignments(
      user.uid,
      (items) => {
        setAssignments(items);
        setAssignmentsLoading(false);
        // preselect first assignment by default
        if (items.length > 0 && !selectedAssignmentId)
          setSelectedAssignmentId(items[0].id ?? null);
      },
    );

    return () => {
      try {
        unsub();
      } catch {}
    };
  }, [isFaculty, user?.uid]);

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Unit 3 — Trees & Graphs"
          placeholderTextColor="#9CA3AF"
          editable={!loading}
        />
      </View>

      {/* Assignment-driven selection for faculty; admins can override */}
      {isFaculty && !adminOverride ? (
        <View style={styles.field}>
          <Text style={styles.label}>Assigned Class · Section · Subject</Text>
          <Pressable
            style={styles.input}
            onPress={() => setShowAssignmentModal(true)}
            disabled={assignmentsLoading || loading}
          >
            {assignmentsLoading ? (
              <ActivityIndicator />
            ) : assignments.length === 0 ? (
              <Text style={{ color: "#6B7280" }}>No assignments found</Text>
            ) : (
              <Text>
                {assignments.find((a) => a.id === selectedAssignmentId)
                  ?.subjectId ?? "Select assignment"}
              </Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.field}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Data Structures"
            placeholderTextColor="#9CA3AF"
            editable={!loading}
          />
        </View>
      )}

      {isAdmin ? (
        <Pressable
          onPress={() => setAdminOverride((v) => !v)}
          style={{ paddingVertical: 8 }}
        >
          <Text style={{ color: "#6B7280" }}>
            {adminOverride ? "Admin override enabled" : "Enable admin override"}
          </Text>
        </Pressable>
      ) : null}

      <SelectModal
        visible={showAssignmentModal}
        title="Assignments"
        options={(assignments || []).map((a) => ({
          id: a.id ?? "",
          label: `${a.subjectId} · ${a.classId ?? ""}${a.sectionId ? " · " + a.sectionId : ""}`,
        }))}
        onClose={() => setShowAssignmentModal(false)}
        onSelect={(o) => {
          setSelectedAssignmentId(o.id);
          setShowAssignmentModal(false);
        }}
      />

      <Pressable
        style={({ pressed }) => [styles.fileButton, pressed && styles.pressed]}
        onPress={pickPdf}
        disabled={loading}
      >
        <Ionicons name="document-attach-outline" size={22} color={PRIMARY} />
        <View style={styles.fileTextWrap}>
          <Text style={styles.fileButtonTitle}>
            {selectedFile ? "Change PDF" : "Select PDF"}
          </Text>
          <Text style={styles.fileButtonMeta} numberOfLines={1}>
            {selectedFile ? selectedFile.name : "PDF files only"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.uploadButton,
          (pressed || loading) && styles.pressed,
          loading && styles.uploadDisabled,
        ]}
        onPress={handleUpload}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
            <Text style={styles.uploadText}>Upload PDF</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  fileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#F9FAFB",
  },
  fileTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  fileButtonTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  fileButtonMeta: {
    fontSize: 13,
    color: DASHBOARD_COLORS.textSecondary,
  },
  uploadButton: {
    flexDirection: "row",
    height: 52,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.9,
  },
  uploadDisabled: {
    opacity: 0.85,
  },
});
