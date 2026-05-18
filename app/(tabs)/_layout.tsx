import { useRole } from "@/hooks/use-role";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";

const INDIGO = "#4F46E5";
const INACTIVE = "#9CA3AF";

type TabIconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  focused,
  color,
  active,
  inactive,
}: {
  focused: boolean;
  color: string;
  active: TabIconName;
  inactive: TabIconName;
}) {
  return (
    <Ionicons name={focused ? active : inactive} size={24} color={color} />
  );
}

export default function TabLayout() {
  const { isLoading: roleLoading, isAdmin } = useRole();
  const router = useRouter();
  const [busy] = useState(false);

  if (roleLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: INDIGO,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "transparent",
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 12,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: -6 },
          shadowRadius: 20,
          elevation: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      {isAdmin ? (
        <>
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  active="home"
                  inactive="home-outline"
                />
              ),
            }}
          />

          <Tabs.Screen
            name="users"
            options={{
              title: "Manage Users",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  active="people"
                  inactive="people-outline"
                />
              ),
            }}
          />

          <Tabs.Screen
            name="faculty-assignments"
            options={{
              title: "Faculty Assignments",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  active="clipboard"
                  inactive="clipboard-outline"
                />
              ),
            }}
          />

          <Tabs.Screen
            name="timetable"
            options={{
              title: "Timetable Management",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  active="time"
                  inactive="time-outline"
                />
              ),
            }}
          />

          <Tabs.Screen
            name="announcements"
            options={{
              title: "Announcements",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  active="notifications"
                  inactive="notifications-outline"
                />
              ),
            }}
          />

          <Tabs.Screen
            name="publish-results"
            options={{
              title: "Publish Results",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  active="cloud-upload"
                  inactive="cloud-upload-outline"
                />
              ),
            }}
          />
        </>
      ) : (
        <>
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  active="home"
                  inactive="home-outline"
                />
              ),
            }}
          />
        </>
      )}
    </Tabs>
  );
}
