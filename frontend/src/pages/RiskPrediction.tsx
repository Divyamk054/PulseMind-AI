import { useState, useEffect } from "react";
import { AlertTriangle, TrendingUp, Loader } from "lucide-react";
import { api } from "../api";

const riskColor = (risk: string) => {
  if (risk === "Low Risk") return { text: "text-green-400", bg: "bg-green-900/30", border: "border-green-500/30" };
  if (risk === "Moderate Risk") return { text: "text-amber-400", bg: "bg-amber-900/30", border: "border-amber-500/30" };
  return { text: "text-red-400", bg: "bg-red-900/30", border: "border-red-500/30" };
};

export default function RiskPrediction() {
  const [form, setForm] = useState({ age: 45, systolic_bp: 125, cholesterol: 200, bmi: 24.0, smoker: false });
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.getRiskHistory().then(setHistory).catch(() => {}); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await api.predictRisk(form);
      setResult(res);
      const h = await api.getRiskHistory();
      setHistory(h);
    } catch { } finally { setLoading(false); }
  };

  const Field = ({ label, name, type = "number", min, max, step }: any) => (
    <div>
      <label className="text-xs text-gray-500 font-medium mb-1.5 block">{label}</label>
      {type === "checkbox" ? (
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={(form as any)[name]} onChange={e => setForm(p => ({ ...p, [name]: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500" />
          <span className="text-sm text-gray-300">{(form as any)[name] ? "Yes" : "No"}</span>
        </label>
      ) : (
        <div className="flex items-center gap-3">
          <input type="range" min={min} max={max} step={step || 1} value={(form as any)[name]}
            onChange={e => setForm(p => ({ ...p, [name]: parseFloat(e.target.value) }))}
            className="flex-1 accent-blue-500" />
          <span className="text-sm font-mono text-white w-16 text-right">{(form as any)[name]}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Health Risk Prediction</h1>
        <p className="text-gray-500 text-sm mt-0.5">AI-powered cardiovascular, diabetes, and hypertension risk assessment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-white text-sm mb-5">Enter Biometric Indicators</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Age (Years)" name="age" min={18} max={100} />
            <Field label="Systolic Blood Pressure (mmHg)" name="systolic_bp" min={80} max={220} />
            <Field label="Total Cholesterol (mg/dL)" name="cholesterol" min={100} max={400} />
            <Field label="BMI" name="bmi" min={15} max={50} step={0.5} />
            <Field label="Active Smoker?" name="smoker" type="checkbox" />
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-semibold text-sm text-white transition-all flex items-center justify-center gap-2">
              {loading ? <><Loader size={14} className="animate-spin" /> Calculating...</> : <><TrendingUp size={14} /> Run Risk Assessment</>}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-white text-sm mb-5">Risk Assessment Results</h2>
          {result ? (
            <div className="space-y-4">
              {Object.entries(result.scores).map(([disease, risk]: any) => {
                const c = riskColor(risk);
                return (
                  <div key={disease} className={`p-4 rounded-xl border ${c.bg} ${c.border}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-300">{disease}</span>
                      <span className={`text-sm font-bold ${c.text}`}>{risk}</span>
                    </div>
                    <div className="mt-2 bg-gray-900/50 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${risk === "Low Risk" ? "bg-green-500 w-1/4" : risk === "Moderate Risk" ? "bg-amber-500 w-1/2" : "bg-red-500 w-3/4"}`} />
                    </div>
                  </div>
                );
              })}
              <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-500 mt-2">
                ⚠️ Risk scores are predictive estimations based on biometric inputs and do not constitute medical diagnosis. Consult a physician for clinical evaluation.
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle size={36} className="text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Fill in your biometrics and run the assessment to see your risk scores.</p>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white text-sm mb-4">Assessment History ({history.length})</h2>
          <div className="space-y-2">
            {[...history].reverse().map((h: any) => (
              <div key={h.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <span className="text-xs text-gray-500">{h.date}</span>
                <div className="flex gap-4">
                  {Object.entries(h.scores || {}).map(([k, v]: any) => (
                    <div key={k} className="text-center">
                      <div className="text-xs text-gray-600">{k.split(" ")[0]}</div>
                      <div className={`text-xs font-bold ${riskColor(v).text}`}>{v.split(" ")[0]}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
