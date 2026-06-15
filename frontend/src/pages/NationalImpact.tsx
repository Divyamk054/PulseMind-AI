import { useEffect, useState } from "react";
import { api } from "../api";
import { Globe2, Loader, TrendingUp, Users, Heart, IndianRupee, Hospital, Map, Flag } from "lucide-react";

interface Metric { label: string; value: number; unit: string; icon: any; color: string; format: "number" | "currency" | "pct"; }

function AnimatedCounter({ target, format, unit }: { target: number; format: string; unit: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const dur = 1500;
    const step = target / (dur / 30);
    let cur = 0;
    const id = setInterval(() => {
      cur = Math.min(cur + step, target);
      setCount(Math.floor(cur));
      if (cur >= target) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [target]);

  if (format === "currency") {
    if (count >= 10000000) return <>{(count / 10000000).toFixed(1)} Cr</>;
    if (count >= 100000) return <>{(count / 100000).toFixed(1)} L</>;
    return <>₹{count.toLocaleString("en-IN")}</>;
  }
  if (count >= 100000) return <>{(count / 100000).toFixed(1)} L</>;
  return <>{count.toLocaleString("en-IN")}</>;
}

export default function NationalImpact() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.nationalImpact().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  const metrics: Metric[] = data ? [
    { label: "Diseases Predicted",    value: data.headline_metrics.diseases_predicted,      unit: "",   icon: Heart,         color: "from-red-900/40 border-red-500/20 text-red-400",     format: "number" },
    { label: "Lives Improved",         value: data.headline_metrics.lives_improved,           unit: "",   icon: Users,         color: "from-green-900/40 border-green-500/20 text-green-400", format: "number" },
    { label: "Hospital Visits Avoided",value: data.headline_metrics.hospital_visits_avoided, unit: "",   icon: Hospital,      color: "from-blue-900/40 border-blue-500/20 text-blue-400",   format: "number" },
    { label: "Cost Savings",           value: data.headline_metrics.healthcare_cost_savings_inr, unit: "₹", icon: IndianRupee, color: "from-amber-900/40 border-amber-500/20 text-amber-400", format: "currency" },
    { label: "Population Covered",     value: data.headline_metrics.population_covered,       unit: "",   icon: Globe2,        color: "from-purple-900/40 border-purple-500/20 text-purple-400", format: "number" },
    { label: "States Reached",         value: data.headline_metrics.states_reached,           unit: "",   icon: Map,           color: "from-cyan-900/40 border-cyan-500/20 text-cyan-400",   format: "number" },
  ] : [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center">
          <Flag size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">National Health Impact Dashboard</h1>
          <p className="text-sm text-gray-500">India's first preventive healthcare intelligence platform — measurable impact (Phase 16)</p>
        </div>
      </div>

      {/* Mission Banner */}
      <div className="bg-gradient-to-r from-orange-900/30 via-red-900/20 to-green-900/30 border border-orange-500/20 rounded-2xl p-5 text-center">
        <div className="flex justify-center gap-3 text-2xl mb-2">🇮🇳</div>
        <h2 className="text-white font-black text-lg mb-1">MediMind AI X — Reactive → Preventive</h2>
        <p className="text-gray-400 text-sm max-w-xl mx-auto">
          Transforming India's healthcare from hospital-centric disease management to citizen-centric health prediction. Serving individuals, families, healthcare workers, hospitals, and government agencies.
        </p>
        <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500">
          <span>🏥 16 AI Modules</span>
          <span>🌐 8 Languages</span>
          <span>📱 Rural-ready</span>
          <span>🔒 100% Private</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader size={24} className="animate-spin text-orange-500" /></div>
      ) : (
        <>
          {/* Impact Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {metrics.map(({ label, value, icon: Icon, color, format }) => (
              <div key={label} className={`bg-gradient-to-br ${color.split(" ").slice(0, 3).join(" ")} border ${color.split(" ")[2]} rounded-2xl p-5`}>
                <Icon size={18} className={color.split(" ")[3]} />
                <div className={`text-3xl font-black mt-2 mb-0.5 ${color.split(" ")[3]}`}>
                  <AnimatedCounter target={value} format={format} unit="" />
                </div>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          {/* SDG Alignment */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Globe2 size={14} className="text-blue-400" /> UN Sustainable Development Goals Alignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(data?.sdg_alignment || []).map((sdg: any) => (
                <div key={sdg.goal} className="bg-blue-900/20 border border-blue-500/15 rounded-xl p-3">
                  <p className="text-blue-400 font-bold text-xs mb-1">{sdg.goal}</p>
                  <p className="text-gray-300 text-xs mb-2">{sdg.description}</p>
                  <p className="text-gray-500 text-xs">✓ {sdg.contribution}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-green-400" /> Platform Milestones
            </h3>
            <div className="space-y-3">
              {(data?.milestones || []).map((m: any) => (
                <div key={m.target} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.achieved ? "bg-green-600" : "bg-gray-800"}`}>
                    {m.achieved ? "✓" : "○"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{m.target}</p>
                    <div className="h-1.5 bg-gray-800 rounded-full mt-1">
                      <div className={`h-full rounded-full transition-all duration-1000 ${m.achieved ? "bg-green-500" : "bg-blue-600"}`}
                        style={{ width: m.achieved ? "100%" : `${Math.min(99, (m.value / parseInt(m.target.replace(/\D/g, "")) * 0.001))}%` }} />
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${m.achieved ? "text-green-400" : "text-gray-500"}`}>
                    {m.achieved ? "ACHIEVED ✅" : "In Progress"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Differentiator */}
          {data?.global_benchmarks && (
            <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-500/20 rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-2">🌟 MediMind AI X Differentiator</h3>
              <p className="text-orange-300 font-bold text-base mb-3">{data.global_benchmarks.medimind_differentiator}</p>
              <p className="text-xs text-gray-500">Comparable platforms: {data.global_benchmarks.similar_platforms?.join(", ")}</p>
            </div>
          )}

          {/* Roadmap */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">🚀 National Scale Roadmap</h3>
            <div className="space-y-2">
              {(data?.future_roadmap || []).map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-orange-600/20 flex items-center justify-center text-xs text-orange-400 font-bold flex-shrink-0">{i + 1}</div>
                  <p className="text-sm text-gray-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
