import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "expo-router";
import { auth } from "../constants/firebase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation Error", "Please enter both email and password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Validation Error", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      // Auth state change triggers root layout to redirect to tabs
      router.replace("/(tabs)");
    } catch (err: any) {
      const msg =
        err.code === "auth/user-not-found"
          ? "No account found with this email. Try signing up."
          : err.code === "auth/wrong-password"
          ? "Incorrect password. Please try again."
          : err.code === "auth/email-already-in-use"
          ? "An account with this email already exists. Sign in instead."
          : err.code === "auth/invalid-email"
          ? "Please enter a valid email address."
          : err.message ?? "Authentication failed.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Header */}
        <View style={styles.header}>
          <Text style={styles.logoEmoji}>🧠</Text>
          <Text style={styles.logoTitle}>PulseMind AI</Text>
          <Text style={styles.logoSub}>
            Your AI-powered personal health companion
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </Text>
          <Text style={styles.cardSub}>
            {isSignUp
              ? "Sign up to start managing your health"
              : "Sign in to continue to PulseMind"}
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#6b7280"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#6b7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleAuth}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>
                {isSignUp ? "Create Account" : "Sign In"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => setIsSignUp((v) => !v)}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? "Already have an account? "
                : "Don't have an account? "}
              <Text style={styles.switchLink}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          Your health data is encrypted and private. PulseMind AI is for
          informational purposes only and does not replace professional medical
          advice.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#030712",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  logoTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  logoSub: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 6,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 24,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#1f2937",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#ffffff",
  },
  btn: {
    backgroundColor: "#06b6d4",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  switchBtn: {
    marginTop: 20,
    alignItems: "center",
  },
  switchText: {
    fontSize: 13,
    color: "#6b7280",
  },
  switchLink: {
    color: "#06b6d4",
    fontWeight: "600",
  },
  disclaimer: {
    fontSize: 11,
    color: "#374151",
    textAlign: "center",
    lineHeight: 16,
  },
});
