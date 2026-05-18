import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/context/auth-context";
import {
    checkDuplicateEmployeeId,
    checkDuplicateRoll,
    createFacultyAccount,
    createStudentAccount,
    deleteUserAccount,
    resetUserPassword,
    setUserStatus,
    subscribeUsers,
} from "@/services/admin-users";
import { subscribeClasses } from "@/services/classes";
import { subscribeDepartments } from "@/services/departments";
import { subscribeSections } from "@/services/sections";
import type { ClassDoc, Department, Section } from "@/types/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminUsersScreen() {
  const { user } = useAuth();
  const [filterRole, setFilterRole] = useState<string | undefined>(undefined);
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(
    undefined,
  );
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New user form
  const [isStudent, setIsStudent] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [classId, setClassId] = useState("");
  const [section, setSection] = useState("");
  // friendly labels (never expose raw doc ids in UI)
  const [departmentLabel, setDepartmentLabel] = useState<string | null>(null);
  const [classLabel, setClassLabel] = useState<string | null>(null);
  const [sectionLabel, setSectionLabel] = useState<string | null>(null);

  // collections & loading states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [depsLoading, setDepsLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);
  const [mobile, setMobile] = useState("");
  const [designation, setDesignation] = useState("");
  const [facultyRole, setFacultyRole] = useState<string>("faculty");
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeUsers(
      { role: filterRole, department: departmentFilter },
      setUsers,
    );
    return () => unsub();
  }, [filterRole, departmentFilter]);

  // realtime subscriptions for departments, classes and sections
  useEffect(() => {
    // subscribe departments once on mount
    setDepsLoading(true);
    const unsubDeps = subscribeDepartments((list) => {
      setDepartments(list);
      setDepsLoading(false);
    });
    return () => {
      unsubDeps();
    };
  }, []);

  // subscribe classes filtered by selected department (realtime)
  useEffect(() => {
    setClassesLoading(true);
    const unsub = subscribeClasses(department, (list) => {
      setClasses(list as ClassDoc[]);
      setClassesLoading(false);
    });
    // clear class/section when department changes
    setClassId("");
    setClassLabel(null);
    setSection("");
    setSectionLabel(null);
    return () => unsub();
  }, [department]);

  // subscribe sections filtered by selected class (realtime)
  useEffect(() => {
    setSectionsLoading(true);
    const unsub = subscribeSections(classId, (list) => {
      setSections(list as Section[]);
      setSectionsLoading(false);
    });
    // clear section selection when class changes
    setSection("");
    setSectionLabel(null);
    return () => unsub();
  }, [classId]);

  async function handleCreate() {
    setLoading(true);
    try {
      // Basic front-end validation
      if (!name || name.trim().length === 0)
        throw new Error("Full name required");
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
        throw new Error("Valid email required");
      if (!password || password.length < 6)
        throw new Error("Password must be at least 6 characters");

      if (isStudent) {
        if (!roll) throw new Error("roll required");
        const dup = await checkDuplicateRoll(roll);
        if (dup) throw new Error("duplicate roll number");
        await createStudentAccount({
          email,
          password,
          name,
          displayName: name,
          studentId: roll,
          department,
          classId,
          sectionId: section,
          semester: "S1",
          mobile,
          createdBy: user?.uid,
        });
      } else {
        if (!employeeId) throw new Error("employee id required");
        const dup = await checkDuplicateEmployeeId(employeeId);
        if (dup) throw new Error("duplicate employee id");
        await createFacultyAccount({
          email,
          password,
          name,
          displayName: name,
          facultyId: employeeId,
          department,
          designation,
          mobile,
          role: facultyRole,
          createdBy: user?.uid,
        });
      }
      Alert.alert("Success", "User created");
      setEmail("");
      setPassword("");
      setName("");
      setRoll("");
      setEmployeeId("");
      setDepartment("");
      setClassId("");
      setSection("");
      setMobile("");
      setDesignation("");
      setFacultyRole("faculty");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(u: any) {
    const newStatus = u.status === "active" ? "inactive" : "active";
    await setUserStatus(u.uid ?? u.id, newStatus, user?.uid);
  }

  async function handleResetPassword(u: any) {
    Alert.prompt("Reset password", "Enter new password", async (text) => {
      if (!text) return;
      await resetUserPassword(u.uid ?? u.id, text);
      Alert.alert("Success", "Password reset");
    });
  }

  async function handleDelete(u: any) {
    Alert.alert("Confirm", "Delete account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteUserAccount(u.uid ?? u.id);
          Alert.alert("Deleted");
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">User Management</ThemedText>
        <ThemedText type="subtitle">
          Create and manage student & faculty accounts
        </ThemedText>

        <View style={styles.formRow}>
          <TouchableOpacity
            onPress={() => setIsStudent(true)}
            style={[styles.toggleBtn, isStudent ? styles.selected : null]}
          >
            <ThemedText>Student</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsStudent(false)}
            style={[styles.toggleBtn, !isStudent ? styles.selected : null]}
          >
            <ThemedText>Faculty</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.formRow}>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
          />
        </View>

        {isStudent ? (
          <>
            <TextInput
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <TextInput
              placeholder="Roll number"
              value={roll}
              onChangeText={setRoll}
              style={styles.input}
            />
            {/* Department dropdown */}
            <View style={{ marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => setDeptDropdownOpen((s) => !s)}
                style={styles.input}
              >
                {depsLoading ? (
                  <ActivityIndicator />
                ) : departments.length === 0 ? (
                  <ThemedText>No departments found</ThemedText>
                ) : (
                  <ThemedText>
                    {departmentLabel ?? "Select Department"}
                  </ThemedText>
                )}
              </TouchableOpacity>
              {deptDropdownOpen && (
                <View style={styles.dropdownList}>
                  {departments.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      onPress={() => {
                        setDepartment(d.id ?? "");
                        setDepartmentLabel(
                          d.code ? `${d.code} — ${d.name}` : d.name,
                        );
                        setDeptDropdownOpen(false);
                        // clear dependent selections
                        setClassId("");
                        setClassLabel(null);
                        setSection("");
                        setSectionLabel(null);
                      }}
                      style={styles.dropdownItem}
                    >
                      <ThemedText>
                        {d.code ? `${d.code} — ${d.name}` : d.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Year / Class dropdown (simple fixed choices) */}
            <View style={{ marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => setClassDropdownOpen((s) => !s)}
                style={styles.input}
              >
                {classesLoading ? (
                  <ActivityIndicator />
                ) : classes.length === 0 ? (
                  <ThemedText>No classes found</ThemedText>
                ) : (
                  <ThemedText>{classLabel ?? "Select Year / Class"}</ThemedText>
                )}
              </TouchableOpacity>
              {classDropdownOpen && (
                <View style={styles.dropdownList}>
                  {[1, 2, 3, 4].map((y) => {
                    const match = classes.find((c) => c.year === y);
                    const label = match
                      ? `${match.programme ?? "Year"} ${y}`
                      : `Year ${y}`;
                    return (
                      <TouchableOpacity
                        key={y}
                        onPress={() => {
                          if (match) {
                            setClassId(match.id ?? "");
                            setClassLabel(`${match.programme ?? "Year"} ${y}`);
                          } else {
                            setClassId("");
                            setClassLabel(`Year ${y}`);
                          }
                          setClassDropdownOpen(false);
                          setSection("");
                          setSectionLabel(null);
                        }}
                        style={styles.dropdownItem}
                      >
                        <ThemedText>{label}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Section dropdown */}
            <View style={{ marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => setSectionDropdownOpen((s) => !s)}
                style={styles.input}
              >
                {sectionsLoading ? (
                  <ActivityIndicator />
                ) : (
                  <ThemedText>
                    {sectionLabel ?? "Select Section (optional)"}
                  </ThemedText>
                )}
              </TouchableOpacity>
              {sectionDropdownOpen && (
                <View style={styles.dropdownList}>
                  {sections
                    .filter((s) => s.classId === classId)
                    .map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => {
                          setSection(s.id ?? "");
                          setSectionLabel(s.name);
                          setSectionDropdownOpen(false);
                        }}
                        style={styles.dropdownItem}
                      >
                        <ThemedText>Section {s.name}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  {sections.filter((s) => s.classId === classId).length ===
                    0 && (
                    <ThemedText style={{ padding: 8 }}>No sections</ThemedText>
                  )}
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            <TextInput
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <TextInput
              placeholder="Employee ID"
              value={employeeId}
              onChangeText={setEmployeeId}
              style={styles.input}
            />
            <TextInput
              placeholder="Designation"
              value={designation}
              onChangeText={setDesignation}
              style={styles.input}
            />
            {/* Role dropdown */}
            <View style={{ marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => setRoleDropdownOpen((s) => !s)}
                style={styles.input}
              >
                <ThemedText>{facultyRole ?? "Select Role"}</ThemedText>
              </TouchableOpacity>
              {roleDropdownOpen && (
                <View style={styles.dropdownList}>
                  {[
                    { key: "faculty", label: "Faculty" },
                    { key: "admin", label: "Admin" },
                    { key: "administrator", label: "Administrator" },
                  ].map((r) => (
                    <TouchableOpacity
                      key={r.key}
                      onPress={() => {
                        setFacultyRole(r.key);
                        setRoleDropdownOpen(false);
                      }}
                      style={styles.dropdownItem}
                    >
                      <ThemedText>{r.label}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        <View style={styles.formRow}>
          {/* Department (for both student & faculty) */}
          <View style={{ flex: 1, marginRight: 8 }}>
            <TouchableOpacity
              onPress={() => setDeptDropdownOpen((s) => !s)}
              style={styles.input}
            >
              {depsLoading ? (
                <ActivityIndicator />
              ) : departments.length === 0 ? (
                <ThemedText>No departments</ThemedText>
              ) : (
                <ThemedText>
                  {departmentLabel ?? "Select Department"}
                </ThemedText>
              )}
            </TouchableOpacity>
            {deptDropdownOpen && (
              <View style={styles.dropdownList}>
                {departments.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => {
                      setDepartment(d.id ?? "");
                      setDepartmentLabel(
                        d.code ? `${d.code} — ${d.name}` : d.name,
                      );
                      setDeptDropdownOpen(false);
                      // clear dependent selections when department changed
                      setClassId("");
                      setClassLabel(null);
                      setSection("");
                      setSectionLabel(null);
                    }}
                    style={styles.dropdownItem}
                  >
                    <ThemedText>
                      {d.code ? `${d.code} — ${d.name}` : d.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TextInput
            placeholder="Mobile"
            value={mobile}
            onChangeText={setMobile}
            style={[styles.input, { flex: 1 }]}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity onPress={handleCreate} style={styles.createBtn}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={{ color: "#fff" }}>Create Account</ThemedText>
          )}
        </TouchableOpacity>

        <ThemedText type="subtitle" style={{ marginTop: 12 }}>
          Users
        </ThemedText>
        <FlatList
          data={users}
          keyExtractor={(u) => u.uid ?? u.id}
          renderItem={({ item }) => (
            <View style={styles.userRow}>
              <ThemedText>
                {item.displayName ?? item.name ?? item.email} — {item.role}
              </ThemedText>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity onPress={() => handleToggleStatus(item)}>
                  <ThemedText>
                    {item.status === "active" ? "Deactivate" : "Activate"}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleResetPassword(item)}>
                  <ThemedText>Reset</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)}>
                  <ThemedText style={{ color: "red" }}>Delete</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        {/*
          TODOs:
          - searchable dropdowns for departments/classes/sections
          - bulk student import UI
          - CSV onboarding workflow
          - auto roll-number validation & formatting
          - duplicate detection & merge suggestions
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
  dropdownList: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    maxHeight: 220,
    marginTop: 4,
    paddingVertical: 4,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  toggleBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    marginRight: 8,
  },
  selected: { backgroundColor: "#eef6fb" },
  createBtn: {
    backgroundColor: "#0a7ea4",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  userRow: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f7fbfc",
    marginVertical: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
