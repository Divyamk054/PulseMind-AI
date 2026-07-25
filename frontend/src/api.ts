const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(method: string, path: string, body?: any, isForm = false) {
  const opts: RequestInit = { method };
  if (body) {
    if (isForm) {
      opts.body = body;
    } else {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Network error" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

const getUserId = (): string => {
  try {
    const user = localStorage.getItem("pulsemind_user");
    if (user) {
      const parsed = JSON.parse(user);
      if (parsed?.id) return parsed.id;
    }
  } catch { /* ignore */ }
  return "demo-user";
};

export const api = {
  // ── Reports ─────────────────────────────────────────────
  uploadReport: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("user_id", getUserId());
    return request("POST", "/api/reports/upload", form, true);
  },
  getReports: () => request("GET", `/api/reports?user_id=${getUserId()}`),
  deleteReport: (id: string) => request("DELETE", `/api/reports/${id}`),
  getReportAnalysis: (id: string) => request("GET", `/api/reports/${id}/analysis`),
  downloadPdf: (id: string) => `${API_BASE}/api/reports/${id}/pdf`,

  // ── Chat ─────────────────────────────────────────────────
  sendChat: (query: string, reportText?: string) =>
    request("POST", `/api/chat?user_id=${getUserId()}`, { query, report_text: reportText }),
  getChatHistory: () => request("GET", `/api/chat/history?user_id=${getUserId()}`),

  // ── Imaging ──────────────────────────────────────────────
  classifyImage: (file: File, modality: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("modality", modality);
    form.append("user_id", getUserId());
    return request("POST", "/api/imaging/classify", form, true);
  },
  getImages: () => request("GET", `/api/imaging?user_id=${getUserId()}`),
  deleteImage: (id: string) => request("DELETE", `/api/imaging/${id}`),

  // ── Prescriptions ────────────────────────────────────────
  uploadPrescription: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("user_id", getUserId());
    return request("POST", "/api/prescriptions/upload", form, true);
  },
  getPrescriptions: () => request("GET", `/api/prescriptions?user_id=${getUserId()}`),
  deletePrescription: (id: string) => request("DELETE", `/api/prescriptions/${id}`),

  // ── Risk Prediction ──────────────────────────────────────
  predictRisk: (data: object) =>
    request("POST", `/api/predict-risk?user_id=${getUserId()}`, data),
  getRiskHistory: () => request("GET", `/api/predict-risk/history?user_id=${getUserId()}`),

  // ── Admin ────────────────────────────────────────────────
  getAdminAnalytics: () => request("GET", "/api/admin/analytics"),

  // ── Symptom Checker ──────────────────────────────────────
  checkSymptoms: (symptoms: string) =>
    request("POST", `/api/symptoms?user_id=${getUserId()}`, { symptoms }),
  getSymptomHistory: () => request("GET", `/api/symptoms/history?user_id=${getUserId()}`),

  // ── Mental Health / Mood ─────────────────────────────────
  logMood: (moodScore: number, emotions: string, notes: string) =>
    request("POST", "/api/mood/log", { mood_score: moodScore, emotions, notes, user_id: getUserId() }),
  getMoodHistory: () => request("GET", `/api/mood/history?user_id=${getUserId()}`),

  // ── Nutrition ────────────────────────────────────────────
  analyzeMeal: (mealDescription: string) =>
    request("POST", "/api/nutrition/analyze-meal", { meal_description: mealDescription }),
  getMealPlan: (condition: string, dietaryPreferences: string, durationDays?: number) =>
    request("POST", "/api/nutrition/meal-plan", { condition, dietary_preferences: dietaryPreferences, duration_days: durationDays || 7 }),

  // ── Appointments ─────────────────────────────────────────
  createAppointment: (doctor: string, specialty: string, date: string, time: string, notes: string) =>
    request("POST", "/api/appointments", { doctor, specialty, date, time, notes, user_id: getUserId() }),
  getAppointments: () => request("GET", `/api/appointments?user_id=${getUserId()}`),
  deleteAppointment: (id: string) => request("DELETE", `/api/appointments/${id}`),

  // ── Medication Reminders ─────────────────────────────────
  addMedication: (drug: string, dosage: string, frequency: string, instructions?: string) =>
    request("POST", "/api/medications", { drug, dosage, frequency, instructions: instructions || "", user_id: getUserId() }),
  getMedications: () => request("GET", `/api/medications?user_id=${getUserId()}`),
  deleteMedication: (id: string) => request("DELETE", `/api/medications/${id}`),

  // ── Drug & Food Interactions ─────────────────────────────
  checkDrugInteractions: (medications: string) =>
    request("POST", "/api/drug-interactions", { medications }),
  checkFoodDrugInteractions: (medication: string, foods: string) =>
    request("POST", "/api/food-drug-interactions", { medication, foods }),

  // ── Second Opinion & Differential ───────────────────────
  getSecondOpinion: (primaryDiagnosis: string, symptoms: string, labResults?: string, medications?: string) =>
    request("POST", "/api/second-opinion", { primary_diagnosis: primaryDiagnosis, symptoms, lab_results: labResults || "", medications: medications || "" }),
  getDifferentialDiagnosis: (symptoms: string, age: number, gender: string) =>
    request("POST", "/api/differential-diagnosis", { symptoms, age, gender }),

  // ── Emergency (existing) ─────────────────────────────────
  getEmergencyGuidance: (emergencyType: string, context?: string) =>
    request("POST", "/api/emergency/guidance", { emergency_type: emergencyType, context: context || "" }),

  // ── Health Risk V5 ───────────────────────────────────────
  healthRiskV5: (profile: object) => request("POST", "/api/health-risk-v5", profile),
  bmiAdvice: (weightKg: number, heightCm: number, age: number, gender: string) =>
    request("POST", "/api/bmi-advice", { weight_kg: weightKg, height_cm: heightCm, age, gender }),

  // ── Bill Audit ───────────────────────────────────────────
  auditBill: (billText: string) =>
    request("POST", "/api/bill-audit", { bill_text: billText }),



  // ── V4.0 Disease Progression Simulator ──────────────────
  diseaseSimulation: (payload: { disease: string; current_metrics: object; scenario?: string }) =>
    request("POST", "/api/disease-simulation", { ...payload, user_id: getUserId() }),
  getDiseaseSimHistory: () => request("GET", `/api/disease-simulation/history?user_id=${getUserId()}`),

  // ── V4.0 AI Health Copilot ───────────────────────────────
  getCopilot: (medications?: string[], lastVitals?: object) =>
    request("GET", `/api/copilot?user_id=${getUserId()}`),
  refreshCopilot: (medications?: string[], lastVitals?: object) =>
    request("POST", "/api/copilot", { user_id: getUserId(), medications, last_vitals: lastVitals }),

  // ── V4.0 Emergency Triage ────────────────────────────────
  emergencyTriage: (symptoms: string[]) =>
    request("POST", "/api/emergency/triage", { symptoms, user_id: getUserId() }),
  getEmergencyTriageHistory: () => request("GET", `/api/emergency/triage/history?user_id=${getUserId()}`),

  // ── V4.0 Medical Research Agent ──────────────────────────
  medicalResearch: (payload: { condition: string; biomarkers?: string }) =>
    request("POST", "/api/research", { ...payload, user_id: getUserId() }),
  getResearchHistory: () => request("GET", `/api/research/history?user_id=${getUserId()}`),

  // ── V4.0 Family Health Graph ─────────────────────────────
  familyHistory: (payload: { members: any[] }) =>
    request("POST", "/api/family-history", { ...payload, user_id: getUserId() }),
  getFamilyHistory: () => request("GET", `/api/family-history?user_id=${getUserId()}`),

  // ── V4.0 Healthcare Command Center ──────────────────────
  commandCenter: (payload: { report_text: string; medications?: string[] }) =>
    request("POST", "/api/command-center", { ...payload, user_id: getUserId() }),
  commandCenterUpload: (form: FormData) =>
    request("POST", "/api/command-center/upload", form, true),

  // ── V5.0 Phase 2: Digital Health Twin ────────────────────
  createDigitalTwin: (payload: any) =>
    request("POST", "/api/digital-twin", { ...payload, user_id: getUserId() }),
  getDigitalTwin: () =>
    request("GET", `/api/digital-twin?user_id=${getUserId()}`),

  // ── V5.0 Phase 3 Extended: 5-Year Forecast ───────────────
  extendedForecast: (profile: any, years = 5) =>
    request("POST", "/api/forecast/extended", { profile, years, user_id: getUserId() }),

  // ── V5.0 Phase 4: Prevention Engine ──────────────────────
  preventionEngine: (metrics: any) =>
    request("POST", "/api/prevention-engine", { ...metrics, user_id: getUserId() }),
  getPreventionHistory: () =>
    request("GET", `/api/prevention-engine/history?user_id=${getUserId()}`),



  // ── V5.0 Phase 8: Voice Assistant ────────────────────────
  voiceRespond: (query: string, language = "en") =>
    request("POST", "/api/voice/respond", { query, language, user_id: getUserId() }),

  // ── V5.0 Phase 9: Rural Triage ───────────────────────────
  ruralTriage: (payload: { symptoms_text: string; language?: string; village?: string; worker_name?: string }) =>
    request("POST", "/api/rural/triage", { ...payload, user_id: getUserId() }),
  getRuralTriageHistory: () =>
    request("GET", `/api/rural/triage/history?user_id=${getUserId()}`),

  // ── V5.0 Phase 11: Affordability Engine ──────────────────
  affordabilityEstimate: (payload: { condition: string; state?: string; severity?: string }) =>
    request("POST", "/api/affordability/estimate", { ...payload, user_id: getUserId() }),

  // ── V5.0 Phase 12: Population Analytics ──────────────────
  populationAnalytics: (state = "All India", disease = "diabetes") =>
    request("GET", `/api/population/analytics?state=${encodeURIComponent(state)}&disease=${disease}`),

  // ── V5.0 Phase 13: Outbreak Predictor ────────────────────
  outbreakPredict: (payload: { region: string; disease: string; season: string }) =>
    request("POST", "/api/outbreak/predict", payload),

  // ── V5.0 Phase 14: Medical Educator ──────────────────────
  educatorExplain: (payload: { report_text: string; level: number }) =>
    request("POST", "/api/educator/explain", { ...payload, user_id: getUserId() }),

  // ── V5.0 Phase 15: XAI Framework ─────────────────────────
  xaiExplain: (payload: { prediction_type: string; input_data: any; result: any }) =>
    request("POST", "/api/xai/explain", { ...payload, user_id: getUserId() }),

  // ── V5.0 Phase 16: National Impact ───────────────────────
  nationalImpact: () =>
    request("GET", "/api/national-impact"),
};
