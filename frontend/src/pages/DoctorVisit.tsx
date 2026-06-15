import { useState } from "react";
import { api } from "../api";
import { Stethoscope, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle, Clock, User, Pill, Activity, Loader } from "lucide-react";

const STEPS = ["Symptoms", "Duration & History", "Medications & Lifestyle", "Results"];

export default function DoctorVisit() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    symptoms: "", duration: "", medical_history: "",
    medications: "", lifestyle: "", report_text: ""
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.doctorVisit(form);
      setResult(res.result || res);
      setStep(3);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const urgencyColor: Record<string, string> = {
    "Routine": "text-green-400 bg-green-400/10 border-green-400/30",
    "Soon": "text-amber-400 bg-amber-400/10 border-amber-400/30",
    "Urgent": "text-orange-400 bg-orange-400/10 border-orange-400/30",
    "Emergency": "text-red-400 bg-red-400/10 border-red-400/30",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center">
          <Stethoscope size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">AI Doctor Visit Simulator</h1>
          <p className="text-sm text-gray-500">Get a comprehensive pre-consultation assessment before your doctor visit</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-all ${
              i < step ? "bg-cyan-600 border-cyan-600 text-white" :
              i === step ? "border-cyan-500 text-cyan-400 bg-cyan-500/10" :
              "border-gray-700 text-gray-600"
            }`}>{i < step ? <CheckCircle size={14} /> : i + 1}</div>
            <span className={`text-xs hidden sm:block ${i === step ? "text-cyan-400" : i < step ? "text-gray-400" : "text-gray-600"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`h-px w-8 ${i < step ? "bg-cyan-600" : "bg-gray-800"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        {/* Step 0: Symptoms */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-cyan-400" />
              <h2 className="text-white font-semibold">Describe Your Symptoms</h2>
            </div>
            <textarea
              rows={4} placeholder="e.g. Persistent headache, mild fever, fatigue, occasional dizziness for the past 3 days..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 resize-none"
              value={form.symptoms} onChange={e => set("symptoms", e.target.value)}
            />
            <p className="text-xs text-gray-600">Be as specific as possible — location, intensity, pattern, and associated symptoms.</p>
          </div>
        )}

        {/* Step 1: Duration & History */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-cyan-400" />
              <h2 className="text-white font-semibold">Duration & Medical History</h2>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">How long have you had these symptoms?</label>
              <select className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                value={form.duration} onChange={e => set("duration", e.target.value)}>
                <option value="">Select duration</option>
                {["Less than 1 day", "1-3 days", "4-7 days", "1-2 weeks", "2-4 weeks", "1-3 months", "More than 3 months", "Chronic / recurring"].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Past Medical History (conditions, surgeries, etc.)</label>
              <textarea rows={3} placeholder="e.g. Type 2 Diabetes (2019), Appendectomy (2015), no known allergies..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 resize-none"
                value={form.medical_history} onChange={e => set("medical_history", e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 2: Medications & Lifestyle */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Pill size={18} className="text-cyan-400" />
              <h2 className="text-white font-semibold">Medications & Lifestyle</h2>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Current Medications</label>
              <input type="text" placeholder="e.g. Metformin 500mg, Lisinopril 10mg, Aspirin 81mg"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                value={form.medications} onChange={e => set("medications", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Lifestyle (diet, exercise, smoking, alcohol, stress)</label>
              <textarea rows={3} placeholder="e.g. Sedentary lifestyle, no exercise, smokes 5 cigarettes/day, occasional alcohol, high-stress job..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 resize-none"
                value={form.lifestyle} onChange={e => set("lifestyle", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Paste recent report text (optional)</label>
              <textarea rows={2} placeholder="Paste relevant lab results or report excerpts..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 resize-none"
                value={form.report_text} onChange={e => set("report_text", e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && result && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">AI Consultation Results</h2>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${urgencyColor[result.urgency_level] || "text-gray-400 border-gray-700 bg-gray-800"}`}>
                {result.urgency_level}
              </span>
            </div>

            {/* Probable Conditions */}
            <div className="bg-gray-800/60 rounded-xl p-4">
              <h3 className="text-cyan-400 text-sm font-semibold mb-3 flex items-center gap-2"><Stethoscope size={14} /> Probable Conditions</h3>
              <div className="space-y-2">
                {(result.probable_conditions || []).map((c: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-900/60 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-cyan-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-cyan-400 font-bold">{i + 1}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{c.condition}</span>
                        <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">{c.probability}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{c.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Specialist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-gray-800/60 rounded-xl p-4">
                <h3 className="text-purple-400 text-sm font-semibold mb-2 flex items-center gap-2"><User size={14} /> Suggested Specialist</h3>
                <p className="text-white font-medium">{result.suggested_specialist}</p>
                <p className="text-xs text-gray-500 mt-1">{result.specialist_reason}</p>
              </div>
              <div className="bg-gray-800/60 rounded-xl p-4">
                <h3 className="text-red-400 text-sm font-semibold mb-2 flex items-center gap-2"><AlertTriangle size={14} /> Red Flags to Watch</h3>
                <ul className="space-y-1">
                  {(result.red_flags || []).map((f: string, i: number) => (
                    <li key={i} className="text-xs text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />{f}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Consultation Notes */}
            <div className="bg-gray-800/60 rounded-xl p-4">
              <h3 className="text-green-400 text-sm font-semibold mb-2">Consultation Notes</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{result.consultation_notes}</p>
            </div>

            {/* Preparation Sheet */}
            {result.preparation_sheet && (
              <div className="bg-gray-800/60 rounded-xl p-4">
                <h3 className="text-amber-400 text-sm font-semibold mb-3">📋 Doctor Visit Preparation Sheet</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "bring_documents", label: "Documents to Bring", color: "blue" },
                    { key: "tests_expected", label: "Tests Expected", color: "purple" },
                    { key: "questions_to_ask", label: "Questions to Ask", color: "green" },
                    { key: "lifestyle_prep", label: "Preparation Tips", color: "amber" },
                  ].map(({ key, label, color }) => (
                    <div key={key}>
                      <p className={`text-xs text-${color}-400 font-medium mb-1`}>{label}</p>
                      <ul className="space-y-1">
                        {(result.preparation_sheet[key] || []).map((item: string, i: number) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                            <CheckCircle size={11} className="text-gray-600 flex-shrink-0 mt-0.5" />{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Doctor Questions */}
            <div className="bg-gray-800/60 rounded-xl p-4">
              <h3 className="text-cyan-400 text-sm font-semibold mb-2">Questions Your Doctor May Ask</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(result.likely_doctor_questions || []).map((q: string, i: number) => (
                  <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5 bg-gray-900/40 p-2 rounded-lg">
                    <span className="text-cyan-600 font-bold flex-shrink-0">Q:</span> {q}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-gray-600 italic">{result.disclaimer}</p>
          </div>
        )}

        {error && <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        {step > 0 && step < 3 && (
          <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm transition-all">
            <ChevronLeft size={16} /> Back
          </button>
        )}
        {step === 3 ? (
          <button onClick={() => { setStep(0); setResult(null); setForm({ symptoms: "", duration: "", medical_history: "", medications: "", lifestyle: "", report_text: "" }); }}
            className="ml-auto px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm transition-all font-medium">
            New Consultation
          </button>
        ) : step === 2 ? (
          <button onClick={handleSubmit} disabled={loading || !form.symptoms}
            className="ml-auto flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all">
            {loading ? <><Loader size={14} className="animate-spin" /> Analyzing...</> : <>Generate Consultation <ChevronRight size={16} /></>}
          </button>
        ) : (
          <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !form.symptoms}
            className="ml-auto flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all">
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
