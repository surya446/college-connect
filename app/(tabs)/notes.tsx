import { Ionicons } from "@expo/vector-icons";
import { type Href, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Protected } from "@/components/auth/Protected";
import {
    DashboardError,
    DashboardLoading,
} from "@/components/dashboard/dashboard-state";
import { DASHBOARD_COLORS } from "@/constants/dashboard";
import { useAuth } from "@/context/auth-context";
import { db } from "@/firebase/config";
import { useRole } from "@/hooks/use-role";
import { useUserProfile } from "@/hooks/use-user-profile";
import { deleteNote } from "@/services/notes-upload";
import type { NoteDocument } from "@/types/note";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 64;
const PRIMARY = DASHBOARD_COLORS.primary;

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile, isLoading, error, retry } = useUserProfile();

  const [notes, setNotes] = useState<NoteDocument[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  const scrollBottomPadding = TAB_BAR_HEIGHT + insets.bottom + 16;
  const { isLoading: roleLoading, isFaculty, isAdmin } = useRole();
  const isUploader = isFaculty || isAdmin;

  // Important: Files in Supabase storage do not contain the app's display
  // metadata (title, subject, uploadedBy, createdAt) nor are they indexed
  // for queries inside Firestore. The app relies on Firestore `notes`
  // documents to list notes with user-friendly metadata and to generate
  // stable PDF URLs stored alongside that metadata. If Firestore documents
  // are missing for files in the Supabase bucket, those PDFs won't appear
  // in the app's Notes feed — both metadata and an indexable collection
  // are required.

  const unsubscribeRef = useRef<(() => void) | null>(null);

  function fetchNotes(): void {
    setNotesLoading(true);
    setNotesError(null);

    // Unsubscribe existing listener if any
    if (unsubscribeRef.current) {
      try {
        unsubscribeRef.current();
      } catch (e) {
        // ignore
      }
      unsubscribeRef.current = null;
    }

    const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));

    // Realtime listener — updates on add/update/delete
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs: NoteDocument[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const createdAt =
            data.createdAt && typeof data.createdAt.toDate === "function"
              ? data.createdAt.toDate()
              : new Date();

          return {
            id: d.id,
            title: data.title ?? "Untitled",
            subject: data.subject ?? data.subjectId ?? "",
            subjectId: data.subjectId ?? null,
            classId: data.classId ?? null,
            sectionId: data.sectionId ?? null,
            assignmentId: data.assignmentId ?? null,
            pdfUrl: data.pdfUrl ?? "",
            uploadedBy: data.uploadedBy ?? "",
            createdAt,
          } as any;
        });

        console.log(
          "[notes] realtime snapshot documents count:",
          docs.length,
          snap.docs.map((d) => d.id),
        );
        if (docs.length === 0)
          console.log("[notes] Firestore query returned no documents");
        docs.forEach((n) => console.log("[notes] pdfUrl:", n.pdfUrl));

        setNotes(docs);
        setNotesLoading(false);
      },
      (err) => {
        console.error("[notes] realtime listener error", err);
        setNotesError("Failed to load notes. Pull to retry.");
        setNotesLoading(false);
      },
    );

    unsubscribeRef.current = unsub;
  }

  useEffect(() => {
    fetchNotes();
    return () => {
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current();
        } catch (e) {
          // ignore
        }
        unsubscribeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openPdf(url: string) {
    console.log("[notes] opening PDF URL:", url);
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        console.warn("[notes] cannot open URL:", url);
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      console.error("[notes] open URL error", err);
    }
  }

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // TODO: Add role-based delete permission checks at backend (Firestore rules).
  function canDelete(): boolean {
    return isFaculty || isAdmin;
  }

  function confirmAndDelete(noteId: string, pdfUrl: string) {
    Alert.alert(
      "Delete note?",
      "This will remove the PDF and the note record.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(noteId);
            try {
              await deleteNote(noteId, pdfUrl);
              console.log("[notes] deleted note", noteId);
            } catch (err: any) {
              console.error("[notes] delete failed", err);
              Alert.alert(
                "Delete failed",
                err?.message ?? "Could not delete note.",
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <DashboardLoading message="Loading…" />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <DashboardError
          message={error ?? "Could not load your profile."}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Notes</Text>
          <Text style={styles.subtitle}>
            {isUploader
              ? "Upload and manage PDF study materials"
              : "Access notes shared by your faculty"}
          </Text>
        </View>

        {user?.uid ? (
          <Protected
            roles={["faculty", "admin"]}
            fallback={
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Faculty uploads</Text>
                <Text style={styles.infoMessage}>
                  Notes published by your instructors will appear here. Check
                  back soon.
                </Text>
              </View>
            }
          >
            <Pressable
              style={({ pressed }) => [
                styles.uploadCard,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push("/upload-note" as Href)}
            >
              <View style={styles.uploadIcon}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={24}
                  color={PRIMARY}
                />
              </View>
              <View style={styles.uploadTextWrap}>
                <Text style={styles.uploadTitle}>Upload PDF</Text>
                <Text style={styles.uploadMeta}>
                  Add a new note to storage & Firestore
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          </Protected>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Faculty uploads</Text>
            <Text style={styles.infoMessage}>
              Notes published by your instructors will appear here. Check back
              soon.
            </Text>
          </View>
        )}

        {/* Notes list: fetch from Firestore `notes` collection. */}
        {notesLoading ? (
          <View style={{ marginTop: 20 }}>
            <DashboardLoading message="Loading notes…" />
          </View>
        ) : notesError ? (
          <View style={{ marginTop: 20 }}>
            <DashboardError message={notesError} onRetry={() => fetchNotes()} />
          </View>
        ) : notes.length === 0 ? (
          <View style={[styles.infoCard, { marginTop: 20 }]}>
            <Text style={styles.infoTitle}>No notes yet</Text>
            <Text style={styles.infoMessage}>
              No notes found in Firestore. Check back later.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 20, gap: 12 }}>
            {notes.map((note) => (
              <View key={note.id} style={styles.noteCard}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.noteTitle}>{note.title}</Text>
                  <Text style={styles.noteSubject}>{note.subject}</Text>
                  <Text style={styles.noteMeta}>
                    Class: {note.classId ?? "—"} · Section:{" "}
                    {note.sectionId ?? "—"}
                  </Text>
                  <Text style={styles.noteMeta}>
                    Faculty: {note.uploadedBy}
                  </Text>
                  <Text style={styles.noteDate}>
                    {note.createdAt.toLocaleString()}
                  </Text>
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Pressable
                    onPress={() => openPdf(note.pdfUrl)}
                    style={({ pressed }) => [
                      styles.openButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.openButtonText}>Open</Text>
                  </Pressable>

                  {canDelete() ? (
                    deletingId === note.id ? (
                      <View style={{ paddingHorizontal: 12 }}>
                        <ActivityIndicator size="small" />
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => confirmAndDelete(note.id, note.pdfUrl)}
                        style={({ pressed }) => [
                          styles.deleteButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#DC2626"
                        />
                      </Pressable>
                    )
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
  },
  uploadCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 16,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: DASHBOARD_COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  uploadMeta: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 8,
  },
  infoMessage: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 21,
  },
  pressed: {
    opacity: 0.9,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 12,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  noteSubject: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  noteMeta: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  openButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: DASHBOARD_COLORS.primaryLight,
  },
  openButtonText: {
    color: PRIMARY,
    fontWeight: "700",
  },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
});
