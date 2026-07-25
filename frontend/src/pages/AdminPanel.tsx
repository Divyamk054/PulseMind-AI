import { useEffect, useState } from "react";
import { ShieldCheck, Users, FileText, ScanLine, Pill, MessageSquare, AlertTriangle, Loader } from "lucide-react";
import { api } from "../api";

const iconMap: any = {
  Users: { icon: Users, color: "blue" },
  "Reports Uploaded": { icon: FileText, color: "blue" },
  "Prescriptions Checked": { icon: Pill, color: "green" },
  "Images Scanned": { icon: ScanLine, color: "purple" },
  "Assistant Chats": { icon: MessageSquare, color: "green" },
  "Risk Calculations": { icon: AlertTriangle, color: "amber" },
};

const colorCls: any = {
  blue: "text-blue-400 bg-blue-600/10",
  green: "text-green-400 bg-green-600/10",
  purple: "text-purple-400 bg-purple-600/10",
  amber: "text-amber-400 bg-amber-600/10",
};

export default function AdminPanel() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminAnalytics()
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
          <ShieldCheck size={18} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm">Platform analytics and monitoring overview</p>
        </div>
      </div>

      {/* Database Status */}
      {analytics && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border w-fit ${
          analytics.database_mode?.includes("Firestore")
            ? "bg-green-900/20 border-green-500/30 text-green-400"
            : "bg-amber-900/20 border-amber-500/30 text-amber-400"
        }`}>
          <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
          Database: {analytics?.database_mode || "Unknown"}
        </div>
      )}

      {/* Metric Cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size={24} className="text-blue-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {analytics?.counts && Object.entries(analytics.counts).map(([label, count]: any) => {
            const meta = iconMap[label] || { icon: ShieldCheck, color: "blue" };
            const cls = colorCls[meta.color];
            return (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-3xl font-black text-white">{count}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cls}`}>
                    <meta.icon size={18} className={cls.split(" ")[0]} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Notes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white text-sm mb-4">Platform Notes</h2>
        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex gap-2 items-start">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>All user files are stored locally in <code className="text-xs bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">backend/uploads/</code> directories.</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>Database mode depends on <code className="text-xs bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">FIREBASE_SERVICE_ACCOUNT_KEY</code> env variable. If not set, a local JSON file store is used.</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>Admin access is granted to accounts with <code className="text-xs bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">admin@pulsemind.ai</code> or via admin demo login.</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-amber-400 mt-0.5">•</span>
            <span>For production deployment, configure Firebase credentials and enable rate limiting middleware.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
