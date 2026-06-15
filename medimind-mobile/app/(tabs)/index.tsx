import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "expo-router";
import { auth } from "../../constants/firebase";
import { mobileApi } from "../../constants/api";
import MetricCard from "../../components/MetricCard";

interface Medication {
  id: string;
  drug: string;
  dosage: string;
  frequency: string;
}

interface Appointment {
  id: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
}

interface MoodEntry {
  id: string;
  mood_score: number;
  emotions: string;
  timestamp: string;
}

const MOODS = [
  { score: 1, emoji: "😭", color: "#ef4444" },
  { score: 2, emoji: "😢", color: "#f97316" },
  { score: 3, emoji: "😟", color: "#eab308" },
  { score: 4, emoji: "😐", color: "#84cc16" },
  { score: 5, emoji: "🙂", color: "#22c55e" },
  { score: 6, emoji: "😊", color: "#14b8a6" },
  { score: 7, emoji: "😄", color: "#06b6d4" },
  { score: 8, emoji: "😁", color: "#3b82f6" },
  { score: 9, emoji: "🤩", color: "#8b5cf6" },
  { score: 10, emoji: "🥳", color: "#ec4899" },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  const loadData = useCallback(async () => {
    const uid = user?.uid;
    if (!uid) return;

    // Check backend connectivity
    try {
      await mobileApi.ping();
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }

    // Fetch all dashboard data concurrently
    const [meds, apts, mood] = await Promise.allSettled([
      mobileApi.getMedications(uid),
      mobileApi.getAppointments(uid),
      mobileApi.getMoodHistory(uid),
    ]);

    if (meds.status === "fulfilled") {
      setMedications(Array.isArray(meds.value) ? meds.value.slice(0, 5) : []);
    }
    if (apts.status === "fulfilled") {
      const sorted = (Array.isArray(apts.value) ? apts.value : []).sort(
        (a: Appointment, b: Appointment) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setAppointments(sorted.slice(0, 3));
    }
    if (mood.status === "fulfilled") {
      const entries = Array.isArray(mood.value) ? mood.value : [];
      setMoodHistory(
        entries
          .sort((a: MoodEntry, b: MoodEntry) =>
            b.timestamp?.localeCompare(a.timestamp ?? "") ?? 0
          )
          .slice(0, 7)
      );
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/login");
        },
      },
    ]);
  };

  // Compute mood stats
  const avgMood =
    moodHistory.length > 0
      ? (
          moodHistory.reduce((s, h) => s + (h.mood_score || 0), 0) /
          moodHistory.length
        ).toFixed(1)
      : null;
  const latestMood = moodHistory[0];
  const latestMoodDef = latestMood
    ? MOODS[Math.min((latestMood.mood_score || 1) - 1, 9)]
    : null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#06b6d4"
        />
      }
    >
      {/* Welcome Header */}
      <View style={styles.welcomeRow}>
        <View>
          <Text style={styles.welcomeText}>
            👋 Hello, {user?.displayName ?? user?.email?.split("@")[0] ?? "there"}
          </Text>
          <Text style={styles.welcomeSub}>Here's your health overview</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Backend status badge */}
      {backendOnline !== null && (
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: backendOnline ? "#052e16" : "#3b0764" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: backendOnline ? "#4ade80" : "#c4b5fd" },
            ]}
          >
            {backendOnline ? "✅ Backend Connected" : "⚠️ Backend Offline — showing cached data"}
          </Text>
        </View>
      )}

      {/* Mood Metrics */}
      <Text style={styles.sectionTitle}>Mental Wellness</Text>
      <View style={styles.metricsRow}>
        <MetricCard
          title="Latest Mood"
          value={latestMoodDef ? `${latestMoodDef.emoji} ${latestMood!.mood_score}/10` : "—"}
          subtitle="Most recent"
          accentColor={latestMoodDef?.color ?? "#06b6d4"}
          style={styles.metricFlex}
        />
        <MetricCard
          title="Avg Mood"
          value={avgMood ? `${avgMood}/10` : "—"}
          subtitle={`${moodHistory.length} entries`}
          accentColor="#8b5cf6"
          style={styles.metricFlex}
        />
        <MetricCard
          title="Trend"
          value={moodHistory.length > 0 ? "📊" : "—"}
          subtitle="Last 7 days"
          accentColor="#ec4899"
          style={styles.metricFlex}
        />
      </View>

      {/* Recent Mood Bar Chart */}
      {moodHistory.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Recent Mood Trend</Text>
          <View style={styles.barRow}>
            {[...moodHistory].reverse().map((h, i) => {
              const mood = MOODS[Math.min((h.mood_score || 1) - 1, 9)];
              const heightPct = ((h.mood_score || 1) / 10) * 72;
              const day = h.timestamp
                ? new Date(h.timestamp).toLocaleDateString("en", {
                    weekday: "short",
                  })[0]
                : `D${i + 1}`;
              return (
                <View key={h.id || i} style={styles.barCol}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(heightPct, 4),
                          backgroundColor: mood.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Medications */}
      <Text style={styles.sectionTitle}>
        💊 Medications{" "}
        <Text style={styles.sectionCount}>({medications.length})</Text>
      </Text>
      {medications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No medications added yet.</Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          {medications.map((med, idx) => (
            <View
              key={med.id}
              style={[
                styles.listRow,
                idx < medications.length - 1 && styles.listRowBorder,
              ]}
            >
              <View>
                <Text style={styles.listPrimary}>{med.drug}</Text>
                <Text style={styles.listSecondary}>
                  {med.dosage} · {med.frequency}
                </Text>
              </View>
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>Active</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Appointments */}
      <Text style={styles.sectionTitle}>
        📅 Upcoming Appointments{" "}
        <Text style={styles.sectionCount}>({appointments.length})</Text>
      </Text>
      {appointments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No upcoming appointments.</Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          {appointments.map((apt, idx) => (
            <View
              key={apt.id}
              style={[
                styles.listRow,
                idx < appointments.length - 1 && styles.listRowBorder,
              ]}
            >
              <View>
                <Text style={styles.listPrimary}>Dr. {apt.doctor}</Text>
                <Text style={styles.listSecondary}>{apt.specialty}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.aptDate}>{apt.date}</Text>
                <Text style={styles.aptTime}>{apt.time}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#1e1b4b" }]}
          onPress={() => router.push("/(tabs)/chat")}
        >
          <Text style={styles.actionEmoji}>💬</Text>
          <Text style={styles.actionText}>AI Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#172554" }]}
          onPress={() =>
            Alert.alert(
              "Coming Soon",
              "Upload reports from the web app at http://localhost:5173"
            )
          }
        >
          <Text style={styles.actionEmoji}>📄</Text>
          <Text style={styles.actionText}>Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#1c1917" }]}
          onPress={() =>
            Alert.alert(
              "Coming Soon",
              "Full symptom checker available on web app"
            )
          }
        >
          <Text style={styles.actionEmoji}>🩺</Text>
          <Text style={styles.actionText}>Symptoms</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        MediMind AI is for informational purposes only. Always consult a
        licensed healthcare professional for medical decisions.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#030712",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
  },
  welcomeSub: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  signOutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  signOutText: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "600",
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#e5e7eb",
    marginTop: 20,
    marginBottom: 10,
  },
  sectionCount: {
    color: "#6b7280",
    fontWeight: "400",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricFlex: {
    flex: 1,
  },
  chartCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 16,
    marginTop: 10,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9ca3af",
    marginBottom: 12,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 88,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barContainer: {
    width: "100%",
    height: 80,
    justifyContent: "flex-end",
    borderRadius: 6,
    backgroundColor: "#1f2937",
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 4,
  },
  listCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  listPrimary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  listSecondary: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  activePill: {
    backgroundColor: "#052e16",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activePillText: {
    fontSize: 11,
    color: "#4ade80",
    fontWeight: "600",
  },
  aptDate: {
    fontSize: 13,
    fontWeight: "600",
    color: "#06b6d4",
  },
  aptTime: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#4b5563",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  actionEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
  },
  footer: {
    fontSize: 11,
    color: "#374151",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 24,
  },
});
