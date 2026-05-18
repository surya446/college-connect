import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/context/auth-context";
import { db } from "@/firebase/config";
import {
    fetchSectionsByDepartmentAndYear,
    fetchYearsByDepartment,
} from "@/services/academic-structure";
import { subscribeClasses } from "@/services/classes";
import { subscribeDepartments } from "@/services/departments";
import {
    createAssignment,
    deleteAssignment,
} from "@/services/faculty-assignments";
import { snapshotToList } from "@/services/firestore-helpers";
import { safeGetDocs, safeOnSnapshot } from "@/services/firestore-safe";
import { fetchSectionsByClass, subscribeSections } from "@/services/sections";
import { fetchAllSubjects, subscribeSubjects } from "@/services/subjects";
import type {
    ClassDoc,
    Department,
    FacultyAssignment,
    FacultyUser,
    Section,
    Subject,
} from "@/types/firestore";
import { collection, query, where } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
console.debug("[import] app/faculty-assignments.tsx");

export default function FacultyAssignmentsAdmin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [facultyList, setFacultyList] = useState<FacultyUser[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);

  // Step selections (human-friendly)
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassDoc | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [curriculumSubjects, setCurriculumSubjects] = useState<any[]>([]);
  const [selectedCurriculumSubject, setSelectedCurriculumSubject] = useState<
    any | null
  >(null);
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyUser | null>(
    null,
  );
  const [facultyQuery, setFacultyQuery] = useState("");
  const [subjectQuery, setSubjectQuery] = useState("");
  const [academicYear, setAcademicYear] = useState<string>(() =>
    new Date().getFullYear().toString(),
  );
  const [semester, setSemester] = useState("S1");

  // UI state
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [facultyLoading, setFacultyLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [curriculumLoading, setCurriculumLoading] = useState(false);

  const filteredFaculty = useMemo(() => {
    const q = facultyQuery?.toLowerCase?.() ?? "";
    return facultyList.filter((f) =>
      ((f as any).name ?? f.displayName ?? "").toLowerCase().includes(q),
    );
  }, [facultyList, facultyQuery]);
  const filteredSubjects = useMemo(() => {
    const q = subjectQuery?.toLowerCase?.() ?? "";
    return subjects.filter((s) =>
      ((s as any).name ?? "").toLowerCase().includes(q),
    );
  }, [subjects, subjectQuery]);
  const filteredAssignments = useMemo(() => {
    const q = searchQuery?.toLowerCase?.() ?? "";
    return assignments.filter((a) => {
      return (
        (a.subjectId ?? "").toLowerCase().includes(q) ||
        (a.classId ?? "").toLowerCase().includes(q) ||
        (a.facultyUid ?? "").toLowerCase().includes(q)
      );
    });
  }, [assignments, searchQuery]);

  async function handleCreate() {
    if (!selectedFaculty) return Alert.alert("Select faculty");
    if (!selectedDepartment) return Alert.alert("Select department");
    setLoading(true);
    try {
      await createAssignment({
        facultyUid: (selectedFaculty as any).uid ?? (selectedFaculty as any).id,
        departmentId: selectedDepartment.id as any,
        classId: selectedClass?.id ?? null,
        sectionId: selectedSection?.id ?? null,
        subjectId:
          selectedSubject?.id ?? selectedCurriculumSubject?.subjectId ?? null,
        curriculumSubjectId: selectedCurriculumSubject?.id ?? null,
        academicYear: academicYear,
        semester,
        createdBy: user?.uid ?? null,
      } as any);
      Alert.alert("Created");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAssignment(id);
      Alert.alert("Deleted");
    } catch (e: any) {
      Alert.alert("Delete failed", e?.message ?? String(e));
    }
  }

  useEffect(() => {
    setLoading(true);

    // Departments (live)
    const depUnsub = subscribeDepartments((list) => setDepartments(list));

    // Faculty realtime
    const facFilterDesc = "role == 'faculty'";
    console.debug(
      `[faculty-assignments] attaching faculty realtime with filter: ${facFilterDesc}`,
    );
    const facQ = query(collection(db, "users"), where("role", "==", "faculty"));
    const facUnsub = safeOnSnapshot(
      facQ as any,
      (snap: any) => {
        const list = snapshotToList<FacultyUser>(snap) as any[];
        console.debug(
          `[faculty-assignments] faculty snapshot size=${list.length}`,
        );
        list.forEach((d, i) =>
          console.debug("[faculty-assignments] faculty doc[" + i + "] raw:", d),
        );
        // Normalize name for UI consumption
        const normalized = list.map((src) => {
          const out: any = { ...(src as any) };
          if (!out.name)
            out.name =
              out.displayName ??
              out.preferredName ??
              out.fullName ??
              out.facultyName ??
              out.name;
          if (!out.uid && out.id) out.uid = out.id;
          if (out.role && typeof out.role === "string")
            out.role = out.role.toLowerCase();
          return out as FacultyUser;
        });
        setFacultyList(normalized as FacultyUser[]);
        setFacultyLoading(false);
      },
      (err) => {
        console.error("[faculty-assignments] faculty snapshot", err);
        setFacultyList([]);
        setFacultyLoading(false);
      },
    );

    // subjects and assignments (initial fetch + realtime for assignments)
    let subjUnsub: any = null;
    (async () => {
      setSubjectsLoading(true);
      try {
        const subs = await fetchAllSubjects();
        console.debug(
          `[faculty-assignments] initial fetchAllSubjects count=${subs?.length ?? 0}`,
        );
        setSubjects(subs ?? []);
      } catch (e) {
        console.error("[faculty-assignments] fetchAllSubjects failed", e);
        setSubjects([]);
      } finally {
        setSubjectsLoading(false);
      }
      // attach realtime subscription to keep subjects up-to-date
      subjUnsub = subscribeSubjects((list) => {
        console.debug(
          `[faculty-assignments] subscribeSubjects snapshot size=${list?.length ?? 0}`,
        );
        setSubjects(list ?? []);
        setSubjectsLoading(false);
      });
      // store on component instance via closure - cleaned up in outer return
      try {
        const snap = await safeGetDocs(
          collection(db, "faculty_assignments") as any,
        );
        setAssignments(
          snapshotToList<FacultyAssignment>(snap) as FacultyAssignment[],
        );
      } catch (e) {
        console.error(e);
        setAssignments([]);
      } finally {
        setLoading(false);
        setAssignmentsLoading(false);
      }
    })();

    const assignUnsub = safeOnSnapshot(
      collection(db, "faculty_assignments") as any,
      (snap: any) => {
        setAssignments(
          snapshotToList<FacultyAssignment>(snap) as FacultyAssignment[],
        );
      },
      (err) => {
        console.error("[faculty-assignments] assignments snapshot", err);
      },
    );

    return () => {
      depUnsub();
      facUnsub();
      assignUnsub();
      try {
        subjUnsub();
      } catch (e) {
        /* ignore */
      }
    };
  }, []);

  // Realtime academic structure subscriptions (classes + sections)
  useEffect(() => {
    const cUnsub = subscribeClasses((list) => {
      // keep all classes; UI will filter by department/year
      setClasses(list as ClassDoc[]);
    });
    const sUnsub = subscribeSections(undefined, (list) => {
      setSections(list as Section[]);
    });
    return () => {
      try {
        cUnsub();
      } catch (e) {}
      try {
        sUnsub();
      } catch (e) {}
    };
  }, []);

  // Subjects are global now; selection is independent of department/class/section

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          style={{ flex: 1, backgroundColor: "#fff" }}
          nestedScrollEnabled={false}
        >
          <View style={{ marginBottom: 12 }}>
            <View style={styles.stepCard}>
              <Text style={{ fontWeight: "700" }}>Academic Context</Text>
              <Text style={{ color: "#666", marginTop: 6 }}>
                {selectedDepartment?.name ?? "Select Department"}
              </Text>
              <View style={{ marginTop: 8 }}>
                <FlatList
                  data={departments}
                  horizontal
                  keyExtractor={(d, i) => d.id ?? `${i}`}
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        selectedDepartment?.id === item.id
                          ? styles.chipSelected
                          : undefined,
                      ]}
                      onPress={async () => {
                        setSelectedDepartment(item);
                        setSelectedYear(null);
                        setSelectedClass(null);
                        setSelectedSection(null);
                        setYearsLoading(true);
                        try {
                          const ys = await fetchYearsByDepartment(
                            db,
                            item.id as any,
                          );
                          setYears(ys || []);
                          if (ys && ys.length === 1) setSelectedYear(ys[0]);
                        } catch (e) {
                          setYears([]);
                        } finally {
                          setYearsLoading(false);
                        }
                      }}
                    >
                      <Text>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
              <View style={{ marginTop: 8 }}>
                {yearsLoading ? (
                  <ActivityIndicator />
                ) : years.length === 0 ? (
                  <Text style={{ color: "#666" }}>
                    Create classes in Academic Setup.
                  </Text>
                ) : (
                  <FlatList
                    data={years}
                    horizontal
                    keyExtractor={(y) => String(y)}
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.chip,
                          selectedYear === item
                            ? styles.chipSelected
                            : undefined,
                        ]}
                        onPress={async () => {
                          setSelectedYear(item);
                          setSelectedClass(null);
                          setSelectedSection(null);
                          // filter classes from subscribed classes
                          const filtered = classes.filter(
                            (c) =>
                              c.departmentId === selectedDepartment?.id &&
                              c.year === item,
                          );
                          setClasses(filtered as ClassDoc[]);
                          // fetch sections for classes (prefetch)
                          try {
                            const secs = await fetchSectionsByDepartmentAndYear(
                              db,
                              selectedDepartment?.id as any,
                              item,
                            );
                            setSections(secs || []);
                          } catch (e) {
                            setSections([]);
                          }
                        }}
                      >
                        <Text>{item} Year</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
              <View style={{ marginTop: 8 }}>
                <FlatList
                  data={classes.filter(
                    (c) =>
                      c.departmentId === selectedDepartment?.id &&
                      (selectedYear ? c.year === selectedYear : true),
                  )}
                  horizontal
                  keyExtractor={(c) => c.id as string}
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        selectedClass?.id === item.id
                          ? styles.chipSelected
                          : undefined,
                      ]}
                      onPress={async () => {
                        setSelectedClass(item);
                        try {
                          const secs = await fetchSectionsByClass(
                            item.id as any,
                          );
                          setSections(secs || []);
                        } catch (e) {
                          setSections([]);
                        }
                      }}
                    >
                      <Text>{item.code ?? `Y${item.year}`}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
              <View style={{ marginTop: 8 }}>
                {sectionsLoading ? (
                  <ActivityIndicator />
                ) : sections.filter((s) => s.classId === selectedClass?.id)
                    .length === 0 ? (
                  <Text style={{ color: "#666" }}>
                    Create sections for this class.
                  </Text>
                ) : (
                  <FlatList
                    data={sections.filter(
                      (s) => s.classId === selectedClass?.id,
                    )}
                    horizontal
                    keyExtractor={(s) => s.id as string}
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.chip,
                          selectedSection?.id === item.id
                            ? styles.chipSelected
                            : undefined,
                        ]}
                        onPress={() => setSelectedSection(item)}
                      >
                        <Text>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            </View>

            <View style={styles.stepCard}>
              <Text style={{ fontWeight: "700" }}>Subject Selection</Text>
              <Pressable
                style={[styles.selector, { marginTop: 8 }]}
                onPress={() => setSubjectModalOpen(true)}
              >
                <Text>
                  {selectedCurriculumSubject?.subjectName ??
                    selectedSubject?.name ??
                    "Choose subject"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.stepCard}>
              <Text style={{ fontWeight: "700" }}>Faculty Selection</Text>
              <Pressable
                style={[styles.selector, { marginTop: 8 }]}
                onPress={() => setFacultyModalOpen(true)}
              >
                <Text>
                  {(selectedFaculty as any)?.name ??
                    selectedFaculty?.displayName ??
                    "Choose faculty"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.previewCardLarge}>
              <Text style={{ fontWeight: "700", fontSize: 16 }}>
                Assignment Preview
              </Text>
              <Text style={{ marginTop: 8, color: "#666" }}>
                {selectedDepartment?.name ?? "—"}{" "}
                {selectedYear ? `→ Year ${selectedYear}` : ""}{" "}
                {selectedCurriculumSubject?.semester
                  ? `→ ${selectedCurriculumSubject.semester}`
                  : ""}{" "}
                {selectedSection ? `→ Section ${selectedSection.name}` : ""}
              </Text>
              <Text style={{ marginTop: 12, fontWeight: "700", fontSize: 14 }}>
                {selectedCurriculumSubject?.subjectName ??
                  selectedSubject?.name ??
                  "—"}
              </Text>
              <Text style={{ marginTop: 8 }}>
                Faculty:{" "}
                {(selectedFaculty as any)?.name ??
                  selectedFaculty?.displayName ??
                  "—"}
              </Text>
              <TouchableOpacity
                style={[
                  styles.createBtn,
                  { marginTop: 12, backgroundColor: "#6a4cff" },
                ]}
                onPress={handleCreate}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff" }}>Create Assignment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* class chips (if classes exist) */}
        <FlatList
          data={classes}
          keyExtractor={(c, i) =>
            (c.id ?? `${c.code ?? "class"}-${i}`) as string
          }
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.chip,
                selectedClass?.id === item.id ? styles.chipSelected : undefined,
              ]}
              onPress={async () => {
                setSelectedClass(item);
                // fetch sections for class specifically
                setSectionsLoading(true);
                try {
                  const snap = await safeGetDocs(
                    query(
                      collection(db, "sections") as any,
                      where("classId", "==", item.id),
                    ) as any,
                  );
                  const secs = snapshotToList<Section>(snap) as Section[];
                  setSections(secs);
                  setSelectedSection(null);
                } catch (e) {
                  console.error(e);
                } finally {
                  setSectionsLoading(false);
                }
              }}
            >
              <Text>{item.code ?? `Class ${item.id}`}</Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.stepRow}>
          <Text style={styles.stepLabel}>Step 3 — Section</Text>
          {sectionsLoading ? (
            <ActivityIndicator />
          ) : sections.length === 0 ? (
            <Text style={{ color: "#666" }}>
              No sections found — add sections in Academic Setup to continue.
            </Text>
          ) : (
            <FlatList
              data={sections}
              keyExtractor={(s, i) =>
                (s.id ?? `${s.name ?? "section"}-${i}`) as string
              }
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.chip,
                    selectedSection?.id === item.id
                      ? styles.chipSelected
                      : undefined,
                  ]}
                  onPress={() => setSelectedSection(item)}
                >
                  <Text>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        <View style={styles.stepRow}>
          <Text style={styles.stepLabel}>Step 4 — Subject</Text>
          <Pressable
            style={styles.selector}
            onPress={() => setSubjectModalOpen(true)}
          >
            <Text>
              {selectedCurriculumSubject?.subjectName ??
                selectedSubject?.name ??
                "Choose subject"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.stepRow}>
          <Text style={styles.stepLabel}>Step 5 — Faculty</Text>
          <Pressable
            style={styles.selector}
            onPress={() => setFacultyModalOpen(true)}
          >
            <Text>
              {(selectedFaculty as any)?.name ??
                selectedFaculty?.displayName ??
                "Choose faculty"}
            </Text>
          </Pressable>
        </View>

        {/* Assignment Preview Card */}
        <View style={styles.previewCardLarge}>
          <Text style={{ fontWeight: "700", fontSize: 16 }}>
            Assignment Preview
          </Text>
          <Text style={{ marginTop: 8, color: "#666" }}>
            {selectedDepartment?.name ?? "—"}{" "}
            {selectedYear ? `→ Year ${selectedYear}` : ""}{" "}
            {selectedCurriculumSubject?.semester
              ? `→ ${selectedCurriculumSubject.semester}`
              : ""}{" "}
            {selectedSection ? `→ Section ${selectedSection.name}` : ""}
          </Text>
          <Text style={{ marginTop: 12, fontWeight: "700", fontSize: 14 }}>
            {selectedCurriculumSubject?.subjectName ??
              selectedSubject?.name ??
              "—"}
          </Text>
          <Text style={{ marginTop: 8 }}>
            Faculty:{" "}
            {(selectedFaculty as any)?.name ??
              selectedFaculty?.displayName ??
              "—"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity onPress={handleCreate} style={styles.createBtn}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={{ color: "#fff" }}>
                Create Assignment
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>

        <ThemedText type="subtitle" style={{ marginTop: 12 }}>
          Existing Assignments
        </ThemedText>
        <View style={styles.assignmentsHeader}>
          <TextInput
            placeholder="Search assignments..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {assignmentsLoading ? (
          <ActivityIndicator />
        ) : filteredAssignments.length === 0 ? (
          <Text style={{ marginTop: 12 }}>No assignments found.</Text>
        ) : (
          <FlatList
            data={filteredAssignments}
            keyExtractor={(a, i) =>
              (a.id ??
                `${a.facultyUid ?? "fac"}-${a.subjectId ?? "sub"}-${a.classId ?? "cls"}-${i}`) as string
            }
            renderItem={({ item }) => {
              const subj = subjects.find((s) => s.id === item.subjectId);
              const fac = facultyList.find((f) => f.uid === item.facultyUid);
              return (
                <View style={styles.assignCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700" }}>
                      {subj?.name ?? item.subjectId}
                    </Text>
                    <Text>
                      {fac
                        ? `${(fac as any).name ?? fac.displayName} • ${fac.departmentId ?? ""}`
                        : item.facultyUid}
                    </Text>
                    <Text>
                      {item.classId}
                      {item.sectionId ? ` / ${item.sectionId}` : ""} •{" "}
                      {item.academicYear ?? ""} • {item.semester ?? ""}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        // TODO: implement edit modal for assignments (prefill stepper)
                        Alert.alert(
                          "Edit",
                          "Edit assignment feature coming soon (TODO)",
                        );
                      }}
                    >
                      <Text style={{ color: "#0a7ea4", marginBottom: 8 }}>
                        Edit
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item.id as string)}
                    >
                      <Text style={{ color: "red" }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Faculty selection modal */}
        <Modal visible={facultyModalOpen} animationType="slide">
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 16 }}>
              <Text style={{ fontWeight: "700", fontSize: 18 }}>
                Select Faculty
              </Text>
              <TextInput
                placeholder="Search"
                value={facultyQuery}
                onChangeText={setFacultyQuery}
                style={styles.input}
              />
              {facultyLoading ? (
                <ActivityIndicator />
              ) : filteredFaculty.length === 0 ? (
                <Text style={{ marginTop: 12, color: "#666" }}>
                  No faculty found.
                </Text>
              ) : (
                <FlatList
                  data={filteredFaculty}
                  keyExtractor={(f, i) =>
                    f.uid ??
                    f.id ??
                    `${(f as any).name ?? (f as any).displayName ?? "faculty"}-${i}`
                  }
                  renderItem={({ item }) => {
                    const activeCount = assignments.filter(
                      (a) => a.facultyUid === item.uid,
                    ).length;
                    return (
                      <TouchableOpacity
                        style={styles.modalRow}
                        onPress={() => {
                          setSelectedFaculty(item);
                          setFacultyModalOpen(false);
                        }}
                      >
                        <View>
                          <Text style={{ fontWeight: "700" }}>
                            {(item as any).name ?? item.displayName}
                          </Text>
                          <Text style={{ color: "#666" }}>
                            {item.departmentId ?? ""}
                          </Text>
                        </View>
                        <View>
                          <Text
                            style={{
                              backgroundColor: "#eef6fb",
                              padding: 6,
                              borderRadius: 6,
                            }}
                          >
                            {activeCount} assignments
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
              <TouchableOpacity
                onPress={() => setFacultyModalOpen(false)}
                style={{ marginTop: 12 }}
              >
                <Text style={{ color: "#0a7ea4" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Subject selection modal */}
        <Modal visible={subjectModalOpen} animationType="slide">
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 16 }}>
              <Text style={{ fontWeight: "700", fontSize: 18 }}>
                Select Subject
              </Text>
              {curriculumLoading ? (
                <ActivityIndicator />
              ) : curriculumSubjects && curriculumSubjects.length > 0 ? (
                <FlatList
                  data={curriculumSubjects}
                  keyExtractor={(c, i) => c.id ?? `${c.subjectId}-${i}`}
                  renderItem={({ item }) => {
                    const subj = subjects.find((s) => s.id === item.subjectId);
                    return (
                      <TouchableOpacity
                        style={styles.modalRow}
                        onPress={() => {
                          setSelectedCurriculumSubject({
                            ...item,
                            subjectName: subj?.name ?? "",
                          });
                          setSelectedSubject(subj ?? null);
                          setSubjectModalOpen(false);
                        }}
                      >
                        <View>
                          <Text style={{ fontWeight: "700" }}>
                            {subj?.name ?? item.subjectId}
                          </Text>
                          <Text style={{ color: "#666" }}>
                            {subj?.code ?? ""} • Semester: {item.semester}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              ) : subjectsLoading ? (
                <ActivityIndicator />
              ) : filteredSubjects.length === 0 ? (
                <Text style={{ marginTop: 12, color: "#666" }}>
                  No subjects found.
                </Text>
              ) : (
                <>
                  <TextInput
                    placeholder="Search subjects..."
                    value={subjectQuery}
                    onChangeText={setSubjectQuery}
                    style={styles.input}
                  />
                  <FlatList
                    data={filteredSubjects}
                    keyExtractor={(s, i) =>
                      (s.id ??
                        `${s.code ?? s.name ?? "subject"}-${i}`) as string
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.modalRow}
                        onPress={() => {
                          setSelectedSubject(item);
                          setSelectedCurriculumSubject(null);
                          setSubjectModalOpen(false);
                        }}
                      >
                        <View>
                          <Text style={{ fontWeight: "700" }}>
                            {(item as any).name}
                          </Text>
                          <Text style={{ color: "#666" }}>
                            {item.code ?? ""} • {item.semester ?? ""}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                </>
              )}
              <TouchableOpacity
                onPress={() => setSubjectModalOpen(false)}
                style={{ marginTop: 12 }}
              >
                <Text style={{ color: "#0a7ea4" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* TODOs:
          - dynamic academic years (config-driven)
          - semester mapping per department/year
          - bulk section creation UI
          - auto class generation from programme templates
          - elective groups and open electives support
          - curriculum versioning for syllabus changes
          - semester rollover automation and promotion scripts
          - regulation support (multiple curriculum rules)
          - syllabus attachments on `curriculum_subjects`
        */}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  formRow: { marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  stepRow: { marginTop: 12 },
  stepLabel: { fontSize: 12, color: "#666", marginBottom: 6 },
  selector: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: "#e6f4fb",
    borderColor: "#a7dcea",
  },
  previewCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  assignmentsHeader: { marginTop: 16 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#eee",
    padding: 8,
    borderRadius: 8,
  },
  modalRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listItem: { padding: 8 },
  selected: { backgroundColor: "#eef6fb" },
  subjectCard: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  stepCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 8,
  },
  previewCardLarge: {
    marginTop: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  createBtn: {
    backgroundColor: "#0a7ea4",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  assignCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f7fbfc",
    marginVertical: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
