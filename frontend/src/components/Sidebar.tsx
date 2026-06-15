import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import {
  LayoutDashboard, FileText, MessageSquare, Pill, ScanLine,
  Clock, AlertTriangle, ShieldCheck, LogOut, Brain, Activity,
  RefreshCw, HeartPulse, Apple, Calendar, PhoneCall, HelpCircle,
  Stethoscope, TrendingUp, GitBranch, Bot, Siren, BookOpen,
  Users, Zap, ChevronDown, ChevronRight, Smile, Receipt,
  Cpu, Shield, Languages, MapPin, IndianRupee, BarChart2,
  AlertOctagon, GraduationCap, Flag, Globe2
} from "lucide-react";

interface NavItem { path: string; icon: any; label: string; }

const NAV_GROUPS: { label: string; color: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    color: "text-blue-400",
    items: [
      { path: "/dashboard",        icon: LayoutDashboard, label: "Dashboard" },
      { path: "/command-center",   icon: Zap,             label: "⚡ Command Center" },
      { path: "/health-copilot",   icon: Bot,             label: "AI Copilot" },
      { path: "/national-impact",  icon: Flag,            label: "🇮🇳 National Impact" },
    ]
  },
  {
    label: "🇮🇳 India Platform",
    color: "text-orange-400",
    items: [
      { path: "/digital-twin",         icon: Cpu,          label: "Digital Health Twin" },
      { path: "/prevention-engine",    icon: Shield,       label: "Prevention Engine" },
      { path: "/voice-assistant",      icon: Languages,    label: "Voice Assistant" },
      { path: "/rural-worker",         icon: MapPin,       label: "ASHA Rural Mode" },
      { path: "/affordability",        icon: IndianRupee,  label: "Affordability Engine" },
      { path: "/population-analytics", icon: BarChart2,    label: "Population Analytics" },
      { path: "/outbreak-predictor",   icon: AlertOctagon, label: "Outbreak Predictor" },
      { path: "/medical-educator",     icon: GraduationCap,label: "Medical Educator" },
      { path: "/explainable-ai",       icon: Brain,        label: "Explainable AI" },
    ]
  },
  {
    label: "AI Features",
    color: "text-purple-400",
    items: [
      { path: "/doctor-visit",      icon: Stethoscope, label: "Doctor Visit AI" },
      { path: "/health-forecast",   icon: TrendingUp,  label: "Health Forecast" },
      { path: "/disease-simulator", icon: GitBranch,   label: "Disease Simulator" },
      { path: "/medical-research",  icon: BookOpen,    label: "Research Agent" },
      { path: "/family-health",     icon: Users,       label: "Family Health" },
    ]
  },
  {
    label: "Diagnostics",
    color: "text-cyan-400",
    items: [
      { path: "/reports",           icon: FileText,      label: "Reports" },
      { path: "/imaging",           icon: ScanLine,      label: "Medical Imaging" },
      { path: "/symptoms",          icon: Activity,      label: "Symptom Checker" },
      { path: "/risk",              icon: AlertTriangle, label: "Risk Prediction" },
      { path: "/prescriptions",     icon: Pill,          label: "Prescriptions" },
    ]
  },
  {
    label: "Emergency",
    color: "text-red-400",
    items: [
      { path: "/emergency-triage",  icon: Siren,         label: "🚨 Emergency Triage" },
      { path: "/emergency",         icon: PhoneCall,     label: "Emergency Guide" },
    ]
  },
  {
    label: "Management",
    color: "text-green-400",
    items: [
      { path: "/medications",       icon: Pill,          label: "Medications" },
      { path: "/appointments",      icon: Calendar,      label: "Appointments" },
      { path: "/nutrition",         icon: Apple,         label: "Nutrition" },
      { path: "/timeline",          icon: Clock,         label: "Timeline" },
      { path: "/mental-health",     icon: Smile,         label: "Mental Health" },
    ]
  },
  {
    label: "Advanced",
    color: "text-amber-400",
    items: [
      { path: "/chat",              icon: MessageSquare, label: "AI Assistant" },
      { path: "/drug-interactions", icon: HeartPulse,   label: "Drug Interactions" },
      { path: "/second-opinion",    icon: HelpCircle,   label: "Second Opinion" },
      { path: "/bio-twin",          icon: Activity,     label: "Bio-Twin" },
      { path: "/bill-auditor",      icon: Receipt,      label: "Bill Auditor" },
      { path: "/pathway-visualizer",icon: RefreshCw,    label: "Pathway Synapse" },
      { path: "/report-comparison", icon: RefreshCw,    label: "Report Compare" },
    ]
  },
];

function NavGroup({ group, defaultOpen = false }: { group: typeof NAV_GROUPS[0]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors"
        style={{ color: open ? "white" : "#6b7280" }}>
        <span className={open ? group.color : ""}>{group.label}</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div className="space-y-0.5 mt-0.5">
          {group.items.map(({ path, icon: Icon, label }) => (
            <NavLink key={path} to={path}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`
              }>
              <Icon size={13} className="flex-shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Brand */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Brain size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">MediMind AI</div>
            <div className="text-xs text-gray-500">v4.0 Platform</div>
          </div>
        </div>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
        {NAV_GROUPS.map((g, i) => (
          <NavGroup key={g.label} group={g} defaultOpen={i < 2} />
        ))}

        {/* Admin */}
        {user?.role === "admin" && (
          <div>
            <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-600">Admin</div>
            <NavLink to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? "bg-purple-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}>
              <ShieldCheck size={13} /> Admin Panel
            </NavLink>
          </div>
        )}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-800 mb-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{user?.name || "Guest"}</div>
            <div className="text-xs text-gray-500 truncate">{user?.email || ""}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-all">
          <LogOut size={12} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
