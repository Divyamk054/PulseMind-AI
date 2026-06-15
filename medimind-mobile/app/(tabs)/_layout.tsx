import React, { useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { Text, Platform } from "react-native";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../constants/firebase";

/**
 * Root tab navigator for authenticated users.
 * Redirects to /login if no Firebase user is detected.
 */
export default function TabLayout() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (authChecked && !user) {
      router.replace("/login");
    }
  }, [authChecked, user, router]);

  if (!authChecked) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#0f172a",
          borderTopColor: "#1e293b",
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
        },
        tabBarActiveTintColor: "#06b6d4",
        tabBarInactiveTintColor: "#4b5563",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#0f172a",
          borderBottomColor: "#1e293b",
          borderBottomWidth: 1,
        },
        headerTintColor: "#ffffff",
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 17,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          headerTitle: "🧠 MediMind AI",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "AI Chat",
          headerTitle: "Clinical AI Assistant",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>💬</Text>
          ),
        }}
      />
    </Tabs>
  );
}
