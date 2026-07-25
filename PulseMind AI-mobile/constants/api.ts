/**
 * PulseMind AI — Shared API configuration for the Expo mobile app.
 * Update API_BASE_URL to point to your deployed backend in production.
 * For Android emulator, use 10.0.2.2 (maps to host machine localhost).
 * For iOS simulator / Web, use localhost directly.
 */

import Constants from "expo-constants";

// Allow override via app.json extra.apiUrl (for EAS builds / environment configs)
const configuredUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;

// Default: localhost for web & iOS sim; 10.0.2.2 for Android emulator
export const API_BASE_URL: string =
  configuredUrl ?? "http://localhost:8000";

// ────────────────────────────────────────────────
// Generic request helper (mirrors web api.ts)
// ────────────────────────────────────────────────
async function request<T = any>(
  method: string,
  path: string,
  body?: Record<string, any> | FormData,
  isForm = false
): Promise<T> {
  const opts: RequestInit = { method };
  if (body) {
    if (isForm) {
      opts.body = body as FormData;
    } else {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${API_BASE_URL}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Network error" }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ────────────────────────────────────────────────
// API module — same surface as the web api.ts
// ────────────────────────────────────────────────
export const mobileApi = {
  // Chat
  sendChat: (userId: string, query: string, reportText?: string) =>
    request("POST", `/api/chat?user_id=${encodeURIComponent(userId)}`, {
      query,
      report_text: reportText ?? "",
    }),
  getChatHistory: (userId: string) =>
    request("GET", `/api/chat/history?user_id=${encodeURIComponent(userId)}`),

  // Mental health / mood
  logMood: (
    userId: string,
    moodScore: number,
    emotions: string,
    notes: string
  ) =>
    request("POST", "/api/mood/log", {
      mood_score: moodScore,
      emotions,
      notes,
      user_id: userId,
    }),
  getMoodHistory: (userId: string) =>
    request("GET", `/api/mood/history?user_id=${encodeURIComponent(userId)}`),

  // Symptom checker
  checkSymptoms: (userId: string, symptoms: string) =>
    request("POST", `/api/symptoms?user_id=${encodeURIComponent(userId)}`, {
      symptoms,
    }),

  // Risk prediction
  predictRisk: (userId: string, data: Record<string, any>) =>
    request(
      "POST",
      `/api/predict-risk?user_id=${encodeURIComponent(userId)}`,
      data
    ),
  getRiskHistory: (userId: string) =>
    request(
      "GET",
      `/api/predict-risk/history?user_id=${encodeURIComponent(userId)}`
    ),

  // Reports
  getReports: (userId: string) =>
    request("GET", `/api/reports?user_id=${encodeURIComponent(userId)}`),

  // Medications
  getMedications: (userId: string) =>
    request("GET", `/api/medications?user_id=${encodeURIComponent(userId)}`),

  // Appointments
  getAppointments: (userId: string) =>
    request(
      "GET",
      `/api/appointments?user_id=${encodeURIComponent(userId)}`
    ),

  // Drug interactions
  checkDrugInteractions: (medications: string) =>
    request("POST", "/api/drug-interactions", { medications }),

  // Health check
  ping: () => request("GET", "/"),
};
