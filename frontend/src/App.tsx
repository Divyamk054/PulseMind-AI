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
import PrescriptionScanner from "./pages/PrescriptionScanner";
import MedicalImaging from "./pages/MedicalImaging";
import Timeline from "./pages/Timeline";
import RiskPrediction from "./pages/RiskPrediction";
import AdminPanel from "./pages/AdminPanel";
import SymptomChecker from "./pages/SymptomChecker";
import DrugInteractions from "./pages/DrugInteractions";
import MentalHealth from "./pages/MentalHealth";
import NutritionPlanner from "./pages/NutritionPlanner";
import AppointmentManager from "./pages/AppointmentManager";
import MedicationReminders from "./pages/MedicationReminders";
import SecondOpinion from "./pages/SecondOpinion";
import EmergencyGuide from "./pages/EmergencyGuide";
import SecondOpinionEngine from "./pages/SecondOpinionEngine";
import BioTwin from "./pages/BioTwin";
import BillAuditor from "./pages/BillAuditor";
import PathwayVisualizer from "./pages/PathwayVisualizer";
import Sidebar from "./components/Sidebar";

// V4.0 New Pages
import DoctorVisit from "./pages/DoctorVisit";
import HealthForecast from "./pages/HealthForecast";
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
import NationalImpact from "./pages/NationalImpact";

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
        <Route path="/prescriptions"      element={<P page={<PrescriptionScanner />} />} />
        <Route path="/imaging"            element={<P page={<MedicalImaging />} />} />
        <Route path="/timeline"           element={<P page={<Timeline />} />} />
        <Route path="/risk"               element={<P page={<RiskPrediction />} />} />
        <Route path="/bio-twin"           element={<P page={<BioTwin />} />} />
        <Route path="/bill-auditor"       element={<P page={<BillAuditor />} />} />
        <Route path="/pathway-visualizer" element={<P page={<PathwayVisualizer />} />} />
        <Route path="/symptoms"           element={<P page={<SymptomChecker />} />} />
        <Route path="/admin"              element={<P page={<AdminPanel />} />} />
        <Route path="/drug-interactions"  element={<P page={<DrugInteractions />} />} />
        <Route path="/mental-health"      element={<P page={<MentalHealth />} />} />
        <Route path="/nutrition"          element={<P page={<NutritionPlanner />} />} />
        <Route path="/appointments"       element={<P page={<AppointmentManager />} />} />
        <Route path="/medications"        element={<P page={<MedicationReminders />} />} />
        <Route path="/second-opinion"     element={<P page={<SecondOpinion />} />} />
        <Route path="/emergency"          element={<P page={<EmergencyGuide />} />} />
        <Route path="/report-comparison"  element={<P page={<SecondOpinionEngine />} />} />

        {/* V4.0 New Pages */}
        <Route path="/doctor-visit"       element={<P page={<DoctorVisit />} />} />
        <Route path="/health-forecast"    element={<P page={<HealthForecast />} />} />
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
        <Route path="/national-impact"    element={<P page={<NationalImpact />} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
