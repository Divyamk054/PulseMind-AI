import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string; // emoji or single char
  accentColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Reusable metric card for the PulseMind mobile dashboard.
 * Displays a key health metric with an optional emoji icon, value, and subtitle.
 */
export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  accentColor = "#06b6d4",
  onPress,
  style,
}: MetricCardProps) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon ? (
        <Text style={styles.icon}>{icon}</Text>
      ) : (
        <View
          style={[styles.accentDot, { backgroundColor: accentColor }]}
        />
      )}
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 16,
    alignItems: "center",
    minWidth: 100,
    flex: 1,
  },
  icon: {
    fontSize: 28,
    marginBottom: 6,
  },
  accentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  title: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "600",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2,
    textAlign: "center",
  },
});
