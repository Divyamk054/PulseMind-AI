import { useState, useEffect, createContext, useContext } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { authService } from "./firebase";

// Existing Pages
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ReportUpload from "./pages/ReportUpload";
import ChatAssistant from "./pages/ChatAssistant";
import MedicalImaging from "./pages/MedicalImaging";
import RiskPrediction from "./pages/RiskPrediction";
import AdminPanel from "./pages/AdminPanel";
import NutritionPlanner from "./pages/NutritionPlanner";
import AppointmentManager from "./pages/AppointmentManager";
import MedicationReminders from "./pages/MedicationReminders";
import EmergencyGuide from "./pages/EmergencyGuide";
import Sidebar from "./components/Sidebar";

// V4.0 New Pages
import DiseaseSimulator from "./pages/DiseaseSimulator";
import HealthCopilot from "./pages/HealthCopilot";
import EmergencyTriage from "./pages/EmergencyTriage";
import MedicalResearch from "./pages/MedicalResearch";
import FamilyHealth from "./pages/FamilyHealth";
import CommandCenter from "./pages/CommandCenter";

// V5.0 National Platform Pages
import DigitalTwin from "./pages/DigitalTwin";
import PreventionEngine from "./pages/PreventionEngine";
import VoiceAssistant from "./pages/VoiceAssistant";
import RuralWorker from "./pages/RuralWorker";
import AffordabilityEngine from "./pages/AffordabilityEngine";
import PopulationAnalytics from "./pages/PopulationAnalytics";
import OutbreakPredictor from "./pages/OutbreakPredictor";
import MedicalEducator from "./pages/MedicalEducator";
import ExplainableAI from "./pages/ExplainableAI";

// Auth Context
interface User { id: string; email: string; name: string; role: string; }
interface AuthCtx { user: User | null; setUser: (u: User | null) => void; logout: () => void; }
const AuthContext = createContext<AuthCtx>({ user: null, setUser: () => {}, logout: () => {} });
export const useAuth = () => useContext(AuthContext);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

const P = ({ page }: { page: React.ReactNode }) => (
  <ProtectedRoute><AppLayout>{page}</AppLayout></ProtectedRoute>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((u) => { setUser(u); });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Existing Protected Pages */}
        <Route path="/dashboard"          element={<P page={<Dashboard />} />} />
        <Route path="/reports"            element={<P page={<ReportUpload />} />} />
        <Route path="/chat"               element={<P page={<ChatAssistant />} />} />
        <Route path="/imaging"            element={<P page={<MedicalImaging />} />} />
        <Route path="/risk"               element={<P page={<RiskPrediction />} />} />
        <Route path="/admin"              element={<P page={<AdminPanel />} />} />
        <Route path="/nutrition"          element={<P page={<NutritionPlanner />} />} />
        <Route path="/appointments"       element={<P page={<AppointmentManager />} />} />
        <Route path="/medications"        element={<P page={<MedicationReminders />} />} />
        <Route path="/emergency"          element={<P page={<EmergencyGuide />} />} />

        {/* V4.0 New Pages */}
        <Route path="/disease-simulator"  element={<P page={<DiseaseSimulator />} />} />
        <Route path="/health-copilot"     element={<P page={<HealthCopilot />} />} />
        <Route path="/emergency-triage"   element={<P page={<EmergencyTriage />} />} />
        <Route path="/medical-research"   element={<P page={<MedicalResearch />} />} />
        <Route path="/family-health"      element={<P page={<FamilyHealth />} />} />
        <Route path="/command-center"     element={<P page={<CommandCenter />} />} />

        {/* V5.0 National Platform Pages */}
        <Route path="/digital-twin"        element={<P page={<DigitalTwin />} />} />
        <Route path="/prevention-engine"   element={<P page={<PreventionEngine />} />} />
        <Route path="/voice-assistant"     element={<P page={<VoiceAssistant />} />} />
        <Route path="/rural-worker"        element={<P page={<RuralWorker />} />} />
        <Route path="/affordability"       element={<P page={<AffordabilityEngine />} />} />
        <Route path="/population-analytics" element={<P page={<PopulationAnalytics />} />} />
        <Route path="/outbreak-predictor" element={<P page={<OutbreakPredictor />} />} />
        <Route path="/medical-educator"   element={<P page={<MedicalEducator />} />} />
        <Route path="/explainable-ai"     element={<P page={<ExplainableAI />} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
