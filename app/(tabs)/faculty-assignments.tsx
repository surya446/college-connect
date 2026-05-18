import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function FacultyAssignmentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    // navigate to the full faculty assignments screen
    router.replace("/faculty-assignments");
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
