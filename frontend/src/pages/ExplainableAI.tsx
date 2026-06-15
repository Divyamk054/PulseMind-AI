import { useState } from "react";
import { api } from "../api";
import { Brain, Loader, AlertTriangle, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const PREDICTION_TYPES = [
  "Diabetes Risk", "Cardiac Risk", "Hypertension", "Kidney Disease", "Fatty Liver",
  "Overall Health Score", "Emergency Triage", "Drug Interaction Risk",
];

const SAMPLE_INPUTS: Record<string, { input: any; result: any }> = {
  "Diabetes Risk": {
    input: { age: 52, bmi: 31.5, glucose: 118, hba1c: 6.1, exercise_days_per_week: 2 },
    result: { risk_percent: 68, confidence: 74, stage: "High Risk" }
  },
  "Cardiac Risk": {
    input: { age: 58, systolic_bp: 148, ldl: 175, hdl: 36, smoking: true, total_cholesterol: 260 },
    result: { risk_percent: 82, confidence: 88, stage: "High Risk" }
  },
};

export default function ExplainableAI() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [predType, setPredType] = useState("Diabetes Risk");
  const [inputJson, setInputJson] = useState(JSON.stringify(SAMPLE_INPUTS["Diabetes Risk"].input, null, 2));
  const [resultJson, setResultJson] = useState(JSON.stringify(SAMPLE_INPUTS["Diabetes Risk"].result, null, 2));
  const [jsonError, setJsonError] = useState("");

  const loadSample = (type: string) => {
    const sample = SAMPLE_INPUTS[type];
    if (sample) {
      setInputJson(JSON.stringify(sample.input, null, 2));
      setResultJson(JSON.stringify(sample.result, null, 2));
    }
    setPredType(type);
    setJsonError("");
  };

  const handleExplain = async () => {
    setJsonError("");
    let inputData: any, resultData: any;
    try {
      inputData = JSON.parse(inputJson);
      resultData = JSON.parse(resultJson);
    } catch {
      setJsonError("Invalid JSON. Please fix the input or result JSON.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.xaiExplain({ prediction_type: predType, input_data: inputData, result: resultData });
      setResult(res);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const IMPORTANCE_COLORS = ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe", "#f5f3ff", "#faf5ff"];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-700 to-purple-600 flex items-center justify-center">
          <Brain size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Explainable AI Framework</h1>
          <p className="text-sm text-gray-500">No black boxes — every prediction fully explained (Phase 15)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <label className="text-xs text-gray-500 mb-2 block">Prediction Type</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {PREDICTION_TYPES.map(t => (
                <button key={t} onClick={() => loadSample(t)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    predType === t
                      ? "bg-violet-700 border-violet-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
                  }`}>{t}</button>
              ))}
            </div>

            <label className="text-xs text-gray-500 mb-1 block">Input Data (JSON)</label>
            <textarea rows={6} value={inputJson} onChange={e => setInputJson(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-green-400 font-mono focus:outline-none focus:border-violet-500 resize-none mb-3" />

            <label className="text-xs text-gray-500 mb-1 block">AI Result (JSON)</label>
            <textarea rows={4} value={resultJson} onChange={e => setResultJson(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-blue-400 font-mono focus:outline-none focus:border-violet-500 resize-none mb-2" />

            {jsonError && <p className="text-red-400 text-xs mb-2">{jsonError}</p>}

            <button onClick={handleExplain} disabled={loading}
              className="w-full py-2.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all">
              {loading ? <><Loader size={14} className="animate-spin" /> Explaining...</> : "Explain This Prediction →"}
            </button>
          </div>
        </div>

        {/* XAI Results */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Confidence */}
              <div className="bg-gray-900 border border-violet-500/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white">Prediction Confidence</p>
                  <span className="text-xs text-gray-500">Data completeness: {result.data_completeness_pct}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-600 to-purple-400 rounded-full transition-all duration-1000"
                      style={{ width: `${result.confidence_percent}%` }} />
                  </div>
                  <span className="text-2xl font-black text-violet-400">{result.confidence_percent}%</span>
                </div>
              </div>

              {/* Feature Importance Chart */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <p className="text-sm font-semibold text-white mb-3">Feature Importance (SHAP-style)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={result.feature_importance} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} unit="%" domain={[0, 100]} />
                    <YAxis type="category" dataKey="feature" tick={{ fill: "#9ca3af", fontSize: 10 }} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "8px" }}
                      formatter={(v: any) => [`${v}%`, "Importance"]} />
                    <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                      {(result.feature_importance || []).map((_: any, i: number) => (
                        <Cell key={i} fill={IMPORTANCE_COLORS[i % IMPORTANCE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Plain Reasoning */}
              <div className="bg-violet-950/30 border border-violet-500/20 rounded-2xl p-4">
                <p className="text-xs text-violet-400 font-semibold mb-2 flex items-center gap-1"><Info size={12} /> AI Reasoning (Plain Language)</p>
                <p className="text-sm text-gray-200 leading-relaxed">{result.plain_reasoning}</p>
              </div>

              {/* Risk Drivers */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <p className="text-xs text-gray-500 font-semibold mb-2">Top Risk Drivers</p>
                <div className="space-y-1.5">
                  {(result.risk_drivers || []).map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-300">{d.driver}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400 font-medium">{d.direction === "increases_risk" ? "↑ Risk" : "—"}</span>
                        <span className="text-xs font-bold text-violet-400">{d.contribution}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Limitations */}
              <div className="bg-gray-900 border border-amber-500/20 rounded-xl p-3">
                <p className="text-xs text-amber-400 font-semibold flex items-center gap-1 mb-1"><AlertTriangle size={11} /> Limitations</p>
                {(result.limitations || []).map((l: string, i: number) => (
                  <p key={i} className="text-xs text-gray-500">• {l}</p>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800 border-dashed rounded-2xl flex flex-col items-center justify-center py-24 gap-3">
              <Brain size={40} className="text-gray-700" />
              <p className="text-gray-600 text-sm">Click "Explain This Prediction" to see XAI output</p>
              <p className="text-gray-700 text-xs">Confidence · Feature Importance · Risk Drivers · Plain Reasoning</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
