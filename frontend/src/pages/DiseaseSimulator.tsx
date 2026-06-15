import { useState } from "react";
import { api } from "../api";
import { GitBranch, Loader, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const DISEASES = [
  { id: "diabetes",      label: "Diabetes",      icon: "🩸", metric: "HbA1c", key: "hba1c", default: 7.5, unit: "%" },
  { id: "hypertension",  label: "Hypertension",  icon: "💉", metric: "Systolic BP", key: "systolic_bp", default: 148, unit: "mmHg" },
  { id: "obesity",       label: "Obesity",        icon: "⚖️", metric: "BMI", key: "bmi", default: 33, unit: "kg/m²" },
  { id: "heart_disease", label: "Heart Disease",  icon: "❤️", metric: "Cholesterol", key: "cholesterol", default: 230, unit: "mg/dL" },
];

const SCENARIO_CONFIG = {
  no_change: { label: "No Lifestyle Changes", color: "#ef4444", icon: TrendingUp, desc: "Current trajectory without any intervention" },
  moderate:  { label: "Moderate Improvement", color: "#f59e0b", icon: Minus,      desc: "Diet + moderate exercise 3x/week" },
  strict:    { label: "Strict Management",    color: "#10b981", icon: TrendingDown, desc: "Medical treatment + strict diet + daily exercise" },
};

export default function DiseaseSimulator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(DISEASES[0]);
  const [metricValue, setMetricValue] = useState(DISEASES[0].default);
  const [riskScore, setRiskScore] = useState(50);
  const [activeScenarios, setActiveScenarios] = useState(["no_change", "moderate", "strict"]);

  const handleDisease = (d: typeof DISEASES[0]) => {
    setSelected(d); setMetricValue(d.default); setResult(null);
  };

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const metrics: any = { risk_score: riskScore };
      metrics[selected.key] = metricValue;
      const res = await api.diseaseSimulation({ disease: selected.id, current_metrics: metrics, scenario: "all" });
      setResult(res.result || res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // Build combined chart data from all scenarios
  const buildChartData = () => {
    if (!result?.scenarios) return [];
    const points = Array.from({ length: 13 }, (_, i) => ({ month: `M${i}` }));
    activeScenarios.forEach(sc => {
      const timeline = result.scenarios[sc]?.timeline || [];
      timeline.forEach((pt: any, i: number) => {
        (points[i] as any)[sc] = pt.risk_score;
      });
    });
    return points;
  };

  const toggleScenario = (sc: string) => {
    setActiveScenarios(prev => prev.includes(sc) ? prev.filter(s => s !== sc) : [...prev, sc]);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center">
          <GitBranch size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Disease Progression Simulator</h1>
          <p className="text-sm text-gray-500">Visualize how your disease progresses across 3 intervention scenarios</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Config Panel */}
        <div className="space-y-4">
          {/* Disease Selector */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
            <h2 className="text-white font-semibold text-sm mb-3">Select Disease</h2>
            {DISEASES.map(d => (
              <button key={d.id} onClick={() => handleDisease(d)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  selected.id === d.id ? "bg-orange-600 text-white" : "text-gray-400 bg-gray-800 hover:bg-gray-750"
                }`}>
                <span>{d.icon}</span> {d.label}
              </button>
            ))}
          </div>

          {/* Metric Input */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
            <h2 className="text-white font-semibold text-sm">Current Metrics</h2>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-gray-500">{selected.metric}</label>
                <span className="text-xs text-orange-400 font-medium">{metricValue} {selected.unit}</span>
              </div>
              <input type="range"
                min={selected.id === "diabetes" ? 5 : selected.id === "hypertension" ? 110 : selected.id === "obesity" ? 25 : 130}
                max={selected.id === "diabetes" ? 14 : selected.id === "hypertension" ? 200 : selected.id === "obesity" ? 55 : 350}
                step={selected.id === "diabetes" ? 0.1 : 1}
                value={metricValue}
                onChange={e => setMetricValue(parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-gray-500">Current Risk Score</label>
                <span className="text-xs text-orange-400 font-medium">{riskScore}/100</span>
              </div>
              <input type="range" min={10} max={90} value={riskScore}
                onChange={e => setRiskScore(parseInt(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Scenario Toggles */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
            <h2 className="text-white font-semibold text-sm mb-1">Scenarios</h2>
            {(Object.entries(SCENARIO_CONFIG) as [string, any][]).map(([k, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button key={k} onClick={() => toggleScenario(k)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all border ${
                    activeScenarios.includes(k)
                      ? "border-transparent text-white"
                      : "border-gray-700 text-gray-600 bg-gray-800/40"
                  }`}
                  style={activeScenarios.includes(k) ? { backgroundColor: cfg.color + "20", borderColor: cfg.color + "40", color: cfg.color } : {}}>
                  <Icon size={12} /> {cfg.label}
                </button>
              );
            })}
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all">
            {loading ? <><Loader size={14} className="animate-spin" /> Simulating...</> : "Run Simulation →"}
          </button>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <>
              {/* Scenario Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.entries(SCENARIO_CONFIG) as [string, any][]).map(([k, cfg]) => {
                  const scData = result.scenarios?.[k];
                  if (!scData) return null;
                  const Icon = cfg.icon;
                  const endRisk = scData.timeline?.[12]?.risk_score || "—";
                  return (
                    <div key={k} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon size={14} style={{ color: cfg.color }} />
                        <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{cfg.desc}</p>
                      <div className="flex items-end gap-1">
                        <span className="text-xl font-bold text-white">{endRisk}</span>
                        <span className="text-xs text-gray-500 mb-0.5">risk at 12mo</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Combined Chart */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <h3 className="text-white font-semibold text-sm mb-4">12-Month Disease Risk Progression</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={buildChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} domain={[0, 100]} label={{ value: "Risk Score", angle: -90, position: "insideLeft", fill: "#6b7280", fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "8px", color: "#f9fafb" }} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    {activeScenarios.includes("no_change") && (
                      <Line type="monotone" dataKey="no_change" stroke="#ef4444" strokeWidth={2.5} dot={false} name="No Change" />
                    )}
                    {activeScenarios.includes("moderate") && (
                      <Line type="monotone" dataKey="moderate" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="Moderate" />
                    )}
                    {activeScenarios.includes("strict") && (
                      <Line type="monotone" dataKey="strict" stroke="#10b981" strokeWidth={2.5} dot={false} name="Strict" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Narrative */}
              {result.narrative && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <h3 className="text-orange-400 text-sm font-semibold mb-2">AI Clinical Narrative</h3>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{result.narrative}</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800 border-dashed rounded-2xl flex flex-col items-center justify-center h-80 gap-3">
              <GitBranch size={40} className="text-gray-700" />
              <p className="text-gray-600 text-sm">Select disease, set metrics, and run simulation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
