import { useState, useEffect } from "react";
import { MessageSquare, Users, ShieldAlert, Loader2, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

import { api } from "../api";

interface DialogueLine {
  doctor: string;
  specialty: string;
  avatar: string;
  color: string;
  message: string;
}

function ResultCard({ result }: { result: string }) {
  return (
    <div className="mt-8 bg-gray-900 rounded-2xl border border-emerald-500/30 p-6 shadow-xl space-y-4">
      <div className="flex items-center gap-2 text-emerald-400 border-b border-gray-800 pb-3">
        <CheckCircle2 size={20} />
        <h3 className="font-bold text-base text-white">Certified Consensus Second Opinion</h3>
      </div>
      <div className="space-y-2.5">
        {result.split("\n").map((line, i) => {
          if (!line.trim()) return <div key={i} className="h-2" />;
          const isHeader = /^\d+\./.test(line.trim()) || line.includes("**") || line.endsWith(":");
          return (
            <p key={i} className={`text-sm leading-relaxed ${isHeader ? "text-indigo-300 font-semibold mt-4" : "text-gray-300"}`}>
              {line.replace(/\*\*/g, "")}
            </p>
          );
        })}
      </div>
      <div className="border-t border-gray-850 pt-4 mt-6 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs font-bold text-white font-mono">Dr. Sarah Lin, MD</div>
          <div className="text-3xs text-gray-500">Internal Medicine Lead</div>
        </div>
        <div>
          <div className="text-xs font-bold text-white font-mono">Dr. Marcus Vance, FACC</div>
          <div className="text-3xs text-gray-500">Cardiology Specialist</div>
        </div>
        <div>
          <div className="text-xs font-bold text-white font-mono">Dr. Elena Rostova, PharmD</div>
          <div className="text-3xs text-gray-500">Clinical Pharmacologist</div>
        </div>
      </div>
    </div>
  );
}

export default function SecondOpinion() {
  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [labs, setLabs] = useState("");
  const [meds, setMeds] = useState("");
  const [loading, setLoading] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [dialogue, setDialogue] = useState<DialogueLine[]>([]);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const boardDialogue: DialogueLine[] = [
    {
      doctor: "Dr. Sarah Lin",
      specialty: "Internal Medicine Lead",
      avatar: "SL",
      color: "bg-blue-600",
      message: `Let's review this patient's clinical presentation. Primary diagnosis: "${diagnosis}". Active symptoms: "${symptoms}". Dr. Vance, what are your cardiovascular recommendations?`
    },
    {
      doctor: "Dr. Marcus Vance",
      specialty: "Cardiology Specialist",
      avatar: "MV",
      color: "bg-purple-600",
      message: `Given the symptoms and reported laboratory findings "${labs || "none declared"}", we must assess arterial resistance and rule out ischemic trends. An ECG and comprehensive echo workup are priority confirmations.`
    },
    {
      doctor: "Dr. Elena Rostova",
      specialty: "Clinical Pharmacologist",
      avatar: "ER",
      color: "bg-amber-600",
      message: `I am auditing the pharmacological profile. Current therapies: "${meds || "none declared"}". We must cross-reference metabolic clearance rates, check for adverse interactions, and monitor renal/electrolyte stability.`
    },
    {
      doctor: "Dr. Sarah Lin",
      specialty: "Internal Medicine Lead",
      avatar: "SL",
      color: "bg-blue-600",
      message: `Excellent input. Let's compile our consensus clinical report, determine the differential diagnosis ranking, and verify warning thresholds.`
    }
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis || !symptoms) return;
    setLoading(true);
    setResult("");
    setError("");
    setSimulationStep(0);
    setDialogue([]);

    // Trigger simulation timeline
    let step = 0;
    const interval = setInterval(() => {
      if (step < boardDialogue.length) {
        setDialogue((prev) => [...prev, boardDialogue[step]]);
        setSimulationStep(step + 1);
        step++;
      } else {
        clearInterval(interval);
      }
    }, 1800);

    try {
      const data = await api.getSecondOpinion(diagnosis, symptoms, labs, meds);
      
      // Wait for simulation to finish at least
      setTimeout(() => {
        setResult(data.result);
        setLoading(false);
      }, 7500);

    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Clinical Second Opinion Panel</h1>
            <p className="text-gray-400 text-sm">Consult an AI panel of simulated specialists for confirmatory diagnosis support</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-5 bg-gray-900 rounded-2xl border border-gray-800 p-6 h-fit shadow-xl">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldAlert size={18} className="text-indigo-400" /> Case Submission
          </h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Primary Diagnosis</label>
              <input required value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g., Stage 1 Hypertension" disabled={loading}
                className="w-full bg-gray-800 border border-gray-750 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-650" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Medications (optional)</label>
              <input value={meds} onChange={e => setMeds(e.target.value)} placeholder="e.g., Lisinopril 10mg daily" disabled={loading}
                className="w-full bg-gray-800 border border-gray-750 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-650" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Active Symptoms</label>
              <textarea required value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="Describe active symptoms, duration, and severity..." disabled={loading}
                className="w-full bg-gray-800 border border-gray-750 rounded-xl px-4 py-2.5 text-white text-sm h-20 resize-none focus:outline-none focus:border-indigo-500 placeholder-gray-650" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Lab Results / Findings (optional)</label>
              <textarea value={labs} onChange={e => setLabs(e.target.value)} placeholder="Key lab metrics e.g., BP: 142/92, Cholesterol: 240" disabled={loading}
                className="w-full bg-gray-800 border border-gray-750 rounded-xl px-4 py-2.5 text-white text-sm h-20 resize-none focus:outline-none focus:border-indigo-500 placeholder-gray-650" />
            </div>
            <button type="submit" disabled={loading || !diagnosis.trim() || !symptoms.trim()}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white py-3 rounded-xl font-semibold hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-600/10">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Panel Reviewing...</> : <><ArrowRight size={16} /> Request Specialist Review</>}
            </button>
          </form>
        </div>

        {/* Live Panel Consultation Screen */}
        <div className="lg:col-span-7">
          {loading || dialogue.length > 0 ? (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl space-y-4 h-full min-h-[400px] flex flex-col">
              <div className="flex justify-between items-center border-b border-gray-850 pb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  Live Board Discussion
                </span>
                <span className="text-3xs text-gray-500 font-mono">Panel Room #B31</span>
              </div>

              {/* Consultation Live Chat */}
              <div className="flex-1 space-y-4 overflow-y-auto">
                {dialogue.map((line, idx) => (
                  <div key={idx} className="flex items-start gap-3 animate-fade-in">
                    <div className={`w-8 h-8 rounded-full ${line.color} flex items-center justify-center font-bold text-white text-xs flex-shrink-0 mt-0.5`}>
                      {line.avatar}
                    </div>
                    <div className="bg-gray-850 border border-gray-800 rounded-xl p-3 flex-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-bold text-white">{line.doctor}</span>
                        <span className="text-3xs text-gray-500">{line.specialty}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5 leading-relaxed font-sans">{line.message}</p>
                    </div>
                  </div>
                ))}
                
                {loading && simulationStep < boardDialogue.length && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 px-12">
                    <Loader2 size={12} className="animate-spin text-indigo-400" />
                    <span>Specialist drafting analysis...</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center shadow-xl h-full flex flex-col justify-center items-center min-h-[400px]">
              <div className="w-12 h-12 rounded-2xl bg-indigo-900/30 border border-indigo-500/25 flex items-center justify-center mb-4 text-indigo-400">
                <Users size={24} />
              </div>
              <h3 className="text-sm font-bold text-white">No Consultations Active</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">Submit your case details on the left to convene the simulated clinical panels and draft your second opinion.</p>
            </div>
          )}
        </div>
      </div>

      {error && <div className="mt-6 bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>}
      
      {result && !loading && <ResultCard result={result} />}
    </div>
  );
}
