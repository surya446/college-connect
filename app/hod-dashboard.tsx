import { subscribeUsers } from "@/services/admin-users";
import { fetchAssignmentsByDepartment } from "@/services/faculty-assignments";
import { fetchTimetableForDepartment } from "@/services/timetable";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

type Props = { departmentId: string; hodUid: string };

export default function HodDashboard({ departmentId }: Props) {
  const [assignmentsCount, setAssignmentsCount] = useState<number>(0);
  const [timetableCount, setTimetableCount] = useState<number>(0);
  const [facultyCount, setFacultyCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const assigns = await fetchAssignmentsByDepartment(departmentId);
      if (!mounted) return;
      setAssignmentsCount(assigns.length);

      const slots = await fetchTimetableForDepartment(departmentId);
      if (!mounted) return;
      setTimetableCount(slots.length);
    })();

    const unsub = subscribeUsers(
      { role: "faculty", department: departmentId },
      (users) => {
        setFacultyCount(users.length);
      },
    );

    return () => {
      mounted = false;
      unsub();
    };
  }, [departmentId]);

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 12 }}>
        Department Overview
      </Text>
      <View style={{ marginBottom: 12 }}>
        <Text>Assignments: {assignmentsCount}</Text>
        <Text>Timetable slots: {timetableCount}</Text>
        <Text>Faculty members: {facultyCount}</Text>
      </View>

      <View style={{ marginTop: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>Quick Actions</Text>
        <Text>- Manage assignments</Text>
        <Text>- Review timetable</Text>
        <Text>- View recent audit activity</Text>
      </View>

      <View style={{ marginTop: 24 }}>
        <Text style={{ color: "#666" }}>
          TODO: implement detailed workload summary, attendance insights,
          analytics, recent audit feed, HOD delegation management
        </Text>
      </View>
    </ScrollView>
  );
}
