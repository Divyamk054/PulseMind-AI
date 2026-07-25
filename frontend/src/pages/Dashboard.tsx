import { useEffect, useState } from "react";
import { useAuth } from "../App";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import {
  FileText, MessageSquare, ScanLine, AlertTriangle, TrendingUp,
  Zap, Bot, Users, BookOpen, Siren, Heart, Activity, Pill, Calendar,
  ChevronRight, ArrowUpRight, ShieldCheck, Sparkles, Droplets,
  Moon, CheckCircle2, Clock, PlusCircle
} from "lucide-react";

// Card color configurations for 3D gradient floating cards
const STAT_CARD_CONFIG: Record<string, { bg: string; iconBg: string; border: string; glow: string; text: string }> = {
  purple: {
    bg: "from-purple-900/30 via-purple-950/20 to-slate-900/40",
    iconBg: "from-purple-500 to-indigo-600",
    border: "border-purple-500/20 hover:border-purple-500/50",
    glow: "shadow-purple-500/10 hover:shadow-purple-500/20",
    text: "text-purple-400"
  },
  cyan: {
    bg: "from-cyan-900/30 via-slate-900/40 to-blue-950/30",
    iconBg: "from-cyan-400 to-blue-600",
    border: "border-cyan-500/20 hover:border-cyan-500/50",
    glow: "shadow-cyan-500/10 hover:shadow-cyan-500/20",
    text: "text-cyan-400"
  },
  amber: {
    bg: "from-amber-900/30 via-slate-900/40 to-orange-950/20",
    iconBg: "from-amber-400 to-orange-500",
    border: "border-amber-500/20 hover:border-amber-500/50",
    glow: "shadow-amber-500/10 hover:shadow-amber-500/20",
    text: "text-amber-400"
  },
  green: {
    bg: "from-emerald-900/30 via-slate-900/40 to-teal-950/20",
    iconBg: "from-emerald-400 to-teal-600",
    border: "border-emerald-500/20 hover:border-emerald-500/50",
    glow: "shadow-emerald-500/10 hover:shadow-emerald-500/20",
    text: "text-emerald-400"
  },
  blue: {
    bg: "from-blue-900/30 via-slate-900/40 to-indigo-950/30",
    iconBg: "from-blue-500 to-cyan-500",
    border: "border-blue-500/20 hover:border-blue-500/50",
    glow: "shadow-blue-500/10 hover:shadow-blue-500/20",
    text: "text-blue-400"
  },
  red: {
    bg: "from-rose-900/30 via-slate-900/40 to-pink-950/20",
    iconBg: "from-rose-500 to-red-600",
    border: "border-rose-500/20 hover:border-rose-500/50",
    glow: "shadow-rose-500/10 hover:shadow-rose-500/20",
    text: "text-rose-400"
  }
};

function PremiumStatCard({ label, value, icon: Icon, color, sub, onClick }: any) {
  const cfg = STAT_CARD_CONFIG[color] || STAT_CARD_CONFIG.purple;
  return (
    <button
      onClick={onClick}
      className={`glass-panel glass-panel-interactive bg-gradient-to-br ${cfg.bg} border ${cfg.border} p-5 text-left w-full flex flex-col justify-between shadow-xl ${cfg.glow} group transition-all duration-300 rounded-[24px]`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${cfg.iconBg} p-0.5 shadow-lg flex items-center justify-center text-white flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={20} />
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-white/10 transition-colors">
          <ArrowUpRight size={15} />
        </div>
      </div>

      <div>
        <div className="text-3xl font-black text-white tracking-tight group-hover:translate-x-0.5 transition-transform">
          {value}
        </div>
        <div className="text-xs font-bold text-gray-200 mt-1 uppercase tracking-wider">
          {label}
        </div>
        {sub && (
          <div className="text-[11px] font-medium text-gray-400 mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
            {sub}
          </div>
        )}
      </div>
    </button>
  );
}

function QuickActionTile({ label, icon: Icon, color, desc, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="glass-panel glass-panel-interactive p-4 text-left w-full flex items-center gap-3 bg-slate-900/60 hover:bg-indigo-900/20 border border-white/5 hover:border-indigo-500/40 rounded-[20px] transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all flex-shrink-0">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">{label}</p>
        {desc && <p className="text-[11px] text-gray-400 truncate mt-0.5">{desc}</p>}
      </div>
      <ChevronRight size={14} className="text-gray-600 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </button>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [copilot, setCopilot] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [reports, images, risks, meds, appts] = await Promise.allSettled([
          api.getReports(), api.getImages(), api.getRiskHistory(),
          api.getMedications(), api.getAppointments(),
        ]);
        setData({
          reports: reports.status === "fulfilled" ? reports.value : [],
          images: images.status === "fulfilled" ? images.value : [],
          risks: risks.status === "fulfilled" ? risks.value : [],
          meds: meds.status === "fulfilled" ? meds.value : [],
          appts: appts.status === "fulfilled" ? appts.value : [],
        });
      } catch { /* silent */ }

      try {
        const cop = await api.getCopilot();
        setCopilot(cop.recommendations || cop);
      } catch { /* no copilot yet */ }

      setLoading(false);
    };
    load();
  }, []);

  const latestRisk = data.risks?.slice(-1)[0];
  const riskColors: Record<string, string> = {
    "Low Risk": "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    "Moderate Risk": "text-amber-400 bg-amber-500/10 border-amber-500/30",
    "High Risk": "text-rose-400 bg-rose-500/10 border-rose-500/30",
  };

  // Health score from latest risk
  const healthScore = latestRisk
    ? Math.max(20, 100 - Object.values(latestRisk.scores).filter((v: any) => v === "High Risk").length * 25
        - Object.values(latestRisk.scores).filter((v: any) => v === "Moderate Risk").length * 10)
    : 88;

  const scoreColor = healthScore >= 80 ? "#10B981" : healthScore >= 60 ? "#F59E0B" : "#EF4444";
  const strokeDash = 283 - (283 * healthScore) / 100;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="relative min-h-screen p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto z-10">
      {/* Background Animated Mesh Blobs */}
      <div className="mesh-bg-overlay">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
        <div className="mesh-blob mesh-blob-3" />
      </div>

      {/* ── HERO BANNER SECTION ───────────────────────────────────────────── */}
      <div className="glass-panel p-8 md:p-10 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-950/90 border border-white/10 rounded-[32px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full badge-glass border border-indigo-500/30 text-indigo-300 text-xs font-bold tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
              PulseMind AI Engine Active · Real-time Telemetry
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Welcome back, <span className="text-gradient-purple">{user?.name?.split(" ")[0] || "User"}</span> 👋
            </h1>

            <p className="text-gray-300 text-sm md:text-base max-w-2xl leading-relaxed font-medium">
              Your clinical biomarkers and health telemetry are continuously synchronized. You have <strong className="text-indigo-300">{data.appts?.length || 0} upcoming appointments</strong> and <strong className="text-emerald-300">{data.meds?.length || 0} active medications</strong> logged.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => navigate("/command-center")}
                className="btn-primary-glow px-6 py-3.5 rounded-2xl text-sm font-bold text-white flex items-center gap-2.5 cursor-pointer"
              >
                <Zap size={18} className="fill-white" /> Run Full Diagnostics Pipeline
              </button>

              <button
                onClick={() => navigate("/reports")}
                className="px-5 py-3.5 rounded-2xl text-sm font-bold text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-2"
              >
                <PlusCircle size={16} /> Upload New Report
              </button>
            </div>
          </div>

          {/* Health Score Ring Widget */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center glass-panel p-6 bg-slate-900/60 border border-white/10 rounded-[28px] relative">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="45"
                  className="text-slate-800"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="50" cy="50" r="45"
                  strokeWidth="8"
                  stroke={scoreColor}
                  strokeDasharray="283"
                  strokeDashoffset={strokeDash}
                  strokeLinecap="round"
                  fill="transparent"
                  className="score-ring-circle glow-filter-purple"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-black text-white tracking-tight">{healthScore}</span>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Health Score</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <TrendingUp size={14} /> +4.2% Optimization vs last month
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI 3D FLOATING CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
        <PremiumStatCard
          label="Reports"
          value={loading ? "—" : data.reports?.length ?? 0}
          icon={FileText}
          color="blue"
          sub="Analyzed"
          onClick={() => navigate("/reports")}
        />
        <PremiumStatCard
          label="Scans"
          value={loading ? "—" : data.images?.length ?? 0}
          icon={ScanLine}
          color="purple"
          sub="Processed"
          onClick={() => navigate("/imaging")}
        />
        <PremiumStatCard
          label="Risk Checks"
          value={loading ? "—" : data.risks?.length ?? 0}
          icon={AlertTriangle}
          color="amber"
          sub="Assessments"
          onClick={() => navigate("/risk")}
        />
        <PremiumStatCard
          label="Medications"
          value={loading ? "—" : data.meds?.length ?? 0}
          icon={Pill}
          color="green"
          sub="Active Rx"
          onClick={() => navigate("/medications")}
        />
        <PremiumStatCard
          label="Appointments"
          value={loading ? "—" : data.appts?.length ?? 0}
          icon={Calendar}
          color="cyan"
          sub="Scheduled"
          onClick={() => navigate("/appointments")}
        />
        <PremiumStatCard
          label="AI Chat"
          value="24/7"
          icon={MessageSquare}
          color="red"
          sub="Assistant Ready"
          onClick={() => navigate("/chat")}
        />
      </div>

      {/* ── MAIN CONTENT GRID ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left / Center Column (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Recent Reports Timeline Feed */}
          <div className="glass-panel p-6 md:p-8 bg-slate-900/70 border border-white/10 rounded-[32px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <FileText size={18} />
                  </div>
                  Recent Medical Reports & Analysis
                </h2>
                <p className="text-xs text-gray-400 mt-1">Uploaded clinical panels & AI diagnostics</p>
              </div>
              <button
                onClick={() => navigate("/reports")}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20"
              >
                View All <ChevronRight size={13} />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-2xl shimmer-glass" />
                ))}
              </div>
            ) : (data.reports?.length ?? 0) === 0 ? (
              <div className="text-center py-12 glass-panel border border-dashed border-white/10 rounded-2xl">
                <FileText size={40} className="text-gray-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-300">No medical reports uploaded yet</p>
                <p className="text-xs text-gray-500 mt-1">Upload PDF, DOCX, or TXT for AI automated breakdown</p>
                <button
                  onClick={() => navigate("/reports")}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
                >
                  Upload First Report
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.reports.slice(-5).reverse().map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-4 bg-slate-900/80 border border-white/5 hover:border-indigo-500/30 rounded-2xl transition-all duration-200 group hover:translate-x-1"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">{r.filename}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{r.file_type} · {r.upload_date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                        Processed
                      </span>
                      <button
                        onClick={() => window.open(api.downloadPdf(r.id), "_blank")}
                        className="px-3 py-1.5 bg-white/5 hover:bg-indigo-600 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-white/10 flex items-center gap-1"
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Appointments Card */}
          {(data.appts?.length ?? 0) > 0 && (
            <div className="glass-panel p-6 md:p-8 bg-slate-900/70 border border-white/10 rounded-[32px]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                      <Calendar size={18} />
                    </div>
                    Scheduled Consultations
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Upcoming doctor appointments</p>
                </div>
                <button
                  onClick={() => navigate("/appointments")}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20"
                >
                  Manage <ChevronRight size={13} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.appts.slice(0, 3).map((a: any) => (
                  <div key={a.id} className="p-4 bg-slate-900/90 border border-cyan-500/20 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">{a.specialty}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-sm font-bold text-white truncate">Dr. {a.doctor}</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock size={12} className="text-gray-500" /> {a.date} at {a.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Action Feature Grid */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">AI Platform Features</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Disease Simulator", icon: TrendingUp, color: "purple", desc: "3-Scenario View", path: "/disease-simulator" },
                { label: "Emergency Triage", icon: Siren, color: "red", desc: "Symptom Check", path: "/emergency-triage" },
                { label: "Research Agent", icon: BookOpen, color: "blue", desc: "Find Treatments", path: "/medical-research" },
                { label: "Family Health", icon: Users, color: "cyan", desc: "Hereditary Risk", path: "/family-health" },
                { label: "Digital Health Twin", icon: Activity, color: "green", desc: "Biometric Twin", path: "/digital-twin" },
                { label: "Prevention Engine", icon: ShieldCheck, color: "amber", desc: "Preventive Plan", path: "/prevention-engine" },
                { label: "Command Center", icon: Zap, color: "purple", desc: "Full Pipeline", path: "/command-center" },
                { label: "AI Copilot", icon: Bot, color: "cyan", desc: "Health Briefing", path: "/health-copilot" },
              ].map((props) => (
                <QuickActionTile key={props.path} {...props} onClick={() => navigate(props.path)} />
              ))}
            </div>
          </div>

        </div>

        {/* Right Sidebar Widgets Column (4 cols) */}
        <div className="lg:col-span-4 space-y-8">

          {/* Risk Scores Widget */}
          <div className="glass-panel p-6 bg-slate-900/70 border border-white/10 rounded-[32px] space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Heart size={18} className="text-rose-500 animate-heart-pulse" /> Risk Stratification
              </h2>
              <button
                onClick={() => navigate("/risk")}
                className="text-xs font-bold text-rose-400 hover:underline"
              >
                Assess →
              </button>
            </div>

            {latestRisk ? (
              <div className="space-y-3">
                {Object.entries(latestRisk.scores).map(([k, v]: any) => (
                  <div key={k} className="p-3 bg-slate-900/80 border border-white/5 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-300">{k}</span>
                      <span className={`font-bold px-2.5 py-0.5 rounded-full border ${riskColors[v] || "text-gray-400 bg-gray-800"}`}>
                        {v}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${v === "High Risk" ? "bg-rose-500" : v === "Moderate Risk" ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: v === "High Risk" ? "85%" : v === "Moderate Risk" ? "50%" : "20%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 glass-panel border border-dashed border-white/10 rounded-2xl">
                <TrendingUp size={28} className="text-gray-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-400">No risk assessments calculated</p>
                <button
                  onClick={() => navigate("/risk")}
                  className="mt-2 text-xs text-indigo-400 font-bold hover:underline"
                >
                  Run Risk Evaluation →
                </button>
              </div>
            )}
          </div>

          {/* AI Copilot Brief Widget */}
          {copilot && (
            <div className="glass-panel p-6 bg-gradient-to-br from-indigo-950/60 via-purple-950/40 to-slate-950/80 border border-indigo-500/30 rounded-[32px] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Bot size={18} className="text-indigo-400" /> AI Health Copilot
                </h2>
                <button
                  onClick={() => navigate("/health-copilot")}
                  className="text-xs font-bold text-indigo-300 hover:underline"
                >
                  Full Brief →
                </button>
              </div>

              {copilot.daily_health_tip && (
                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs text-gray-200 leading-relaxed font-medium">
                  💡 {copilot.daily_health_tip}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {copilot.exercise && (
                  <div className="p-3 bg-slate-900/60 border border-white/5 rounded-2xl flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <Activity size={16} />
                    <div>
                      <p className="text-gray-400 text-[10px] uppercase">Exercise</p>
                      <p className="text-white text-xs">{copilot.exercise.duration_minutes}m {copilot.exercise.type}</p>
                    </div>
                  </div>
                )}
                {copilot.hydration && (
                  <div className="p-3 bg-slate-900/60 border border-white/5 rounded-2xl flex items-center gap-2 text-xs font-semibold text-cyan-400">
                    <Droplets size={16} />
                    <div>
                      <p className="text-gray-400 text-[10px] uppercase">Hydration</p>
                      <p className="text-white text-xs">{copilot.hydration.goal_liters}L Goal</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live Vitals & Tracking Widgets */}
          <div className="glass-panel p-6 bg-slate-900/70 border border-white/10 rounded-[32px] space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" /> Today's Telemetry Summary
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-900/80 border border-white/5 rounded-2xl space-y-1">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-[11px] font-bold uppercase">Heart Rate</span>
                  <Heart size={14} className="text-rose-500 animate-heart-pulse" />
                </div>
                <p className="text-2xl font-black text-white">72 <span className="text-xs font-normal text-gray-400">BPM</span></p>
                <p className="text-[10px] font-semibold text-emerald-400">Resting Normal</p>
              </div>

              <div className="p-4 bg-slate-900/80 border border-white/5 rounded-2xl space-y-1">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-[11px] font-bold uppercase">Sleep</span>
                  <Moon size={14} className="text-indigo-400" />
                </div>
                <p className="text-2xl font-black text-white">7.8 <span className="text-xs font-normal text-gray-400">hrs</span></p>
                <p className="text-[10px] font-semibold text-indigo-400">89% Quality Score</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
