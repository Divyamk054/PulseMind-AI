import { useState, useEffect } from "react";
import { Activity, ShieldAlert, Zap, Heart, Brain, Dumbbell, Compass, Info, Play, CheckCircle } from "lucide-react";

interface Profile {
  name: string;
  restingHr: number;
  restingGlucose: number;
  restingBp: number;
  restingCortisol: number;
  description: string;
}

interface Stressor {
  name: string;
  icon: any;
  duration: string;
  description: string;
  effect: (t: number, baseline: Profile) => {
    hr: number;
    glucose: number;
    bp: number;
    cortisol: number;
    adrenaline: number;
  };
}

const profiles: Profile[] = [
  { name: "Healthy Athlete", restingHr: 52, restingGlucose: 85, restingBp: 115, restingCortisol: 12, description: "Highly conditioned cardiovascular system, optimized insulin sensitivity, and efficient cortisol regulation." },
  { name: "Sedentary Office Worker", restingHr: 76, restingGlucose: 98, restingBp: 128, restingCortisol: 18, description: "Moderate metabolic profile, elevated resting cortisol due to chronic occupational stress." },
  { name: "Type-2 Diabetic Profile", restingHr: 82, restingGlucose: 155, restingBp: 135, restingCortisol: 22, description: "Impaired pancreatic beta-cell insulin response. Prone to severe glycemic volatility during metabolic stress." },
  { name: "Elderly Hypertensive", restingHr: 68, restingGlucose: 90, restingBp: 148, restingCortisol: 15, description: "Reduced arterial elasticity, hyper-reactive sympathetic nervous system response to sudden stressors." }
];

const stressors: Stressor[] = [
  {
    name: "HIIT Workout Session",
    icon: Dumbbell,
    duration: "60 Mins",
    description: "High-intensity intervals triggering rapid adrenaline spikes, lactic acid accumulation, and acute cardiovascular output.",
    effect: (t, b) => {
      // t is from 0 to 100 representing percentage of simulation
      const factor = Math.sin((t / 100) * Math.PI); // peak in middle
      return {
        hr: Math.round(b.restingHr + factor * 110),
        glucose: Math.round(b.restingGlucose - factor * 15 + (t > 50 ? (t - 50) * 0.2 : 0)),
        bp: Math.round(b.restingBp + factor * 40),
        cortisol: Math.round(b.restingCortisol + factor * 18),
        adrenaline: Math.round(15 + factor * 250)
      };
    }
  },
  {
    name: "Triple-Espresso Caffeine Spike",
    icon: Zap,
    duration: "4 Hours",
    description: "300mg of caffeine loading the nervous system, blocking adenosine receptors, and raising vascular resistance.",
    effect: (t, b) => {
      // quick rise, slow decay
      const factor = t < 25 ? (t / 25) : Math.max(0, 1 - (t - 25) / 75);
      return {
        hr: Math.round(b.restingHr + factor * 28),
        glucose: Math.round(b.restingGlucose + factor * 12),
        bp: Math.round(b.restingBp + factor * 22),
        cortisol: Math.round(b.restingCortisol + factor * 14),
        adrenaline: Math.round(15 + factor * 120)
      };
    }
  },
  {
    name: "48-Hour Sleep Deprivation",
    icon: Brain,
    duration: "48 Hours",
    description: "Prolonged wakefulness disrupting the circadian rhythm, causing chronic hypothalamic-pituitary-adrenal activation.",
    effect: (t, b) => {
      // monotonic steady rise
      const factor = t / 100;
      return {
        hr: Math.round(b.restingHr + factor * 18),
        glucose: Math.round(b.restingGlucose + factor * 25),
        bp: Math.round(b.restingBp + factor * 18),
        cortisol: Math.round(b.restingCortisol + factor * 24),
        adrenaline: Math.round(15 + factor * 80)
      };
    }
  },
  {
    name: "Extended Fasting Ketosis",
    icon: Compass,
    duration: "36 Hours",
    description: "Glycogen depletion forcing gluconeogenesis and mitochondrial shift to fatty acid beta-oxidation.",
    effect: (t, b) => {
      // glucose drops, adrenaline increases slightly, cortisol rises to release energy
      const factor = t / 100;
      const glucoseDrop = b.name.includes("Diabetic") ? 40 * factor : 25 * factor;
      return {
        hr: Math.round(b.restingHr + factor * 6),
        glucose: Math.round(Math.max(55, b.restingGlucose - glucoseDrop)),
        bp: Math.round(b.restingBp - factor * 8),
        cortisol: Math.round(b.restingCortisol + factor * 12),
        adrenaline: Math.round(15 + factor * 40)
      };
    }
  }
];

export default function BioTwin() {
  const [selectedProfile, setSelectedProfile] = useState(profiles[0]);
  const [selectedStressor, setSelectedStressor] = useState(stressors[0]);
  const [simulating, setSimulating] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [dataPoints, setDataPoints] = useState<any[]>([]);

  useEffect(() => {
    if (!simulating) return;
    const interval = setInterval(() => {
      setSimTime((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setSimulating(false);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [simulating]);

  useEffect(() => {
    // Generate data points up to current simTime
    const points = [];
    for (let i = 0; i <= simTime; i += 2) {
      points.push({
        time: i,
        ...selectedStressor.effect(i, selectedProfile)
      });
    }
    setDataPoints(points);
  }, [simTime, selectedProfile, selectedStressor]);

  const handleStart = () => {
    setSimTime(0);
    setSimulating(true);
  };

  const currentStats = selectedStressor.effect(simTime, selectedProfile);

  // Helper to make SVGs for the timeline charts
  const renderLineChart = (data: any[], key: string, maxVal: number, color: string) => {
    if (data.length < 2) return null;
    const width = 500;
    const height = 120;
    const pointsStr = data
      .map((d) => {
        const x = (d.time / 100) * width;
        const y = height - (d[key] / maxVal) * height * 0.9 - 10;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg className="w-full h-28 bg-gray-950/40 rounded-lg border border-gray-800 p-2" viewBox={`0 0 ${width} ${height}`}>
        <polyline fill="none" stroke={color} strokeWidth="2" points={pointsStr} />
        {/* Draw subtle grid lines */}
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#374151" strokeDasharray="3,3" />
        {/* Current Indicator dot */}
        {data.length > 0 && (
          <circle
            cx={(data[data.length - 1].time / 100) * width}
            cy={height - (data[data.length - 1][key] / maxVal) * height * 0.9 - 10}
            r="4"
            fill={color}
          />
        )}
      </svg>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Activity size={20} className="text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Bio-Digital Twin Stress Test</h1>
            <p className="text-gray-400 text-sm">Simulate and study complex organ system compensatory dynamics in real time</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Select Profile and Stressors */}
        <div className="space-y-6 lg:col-span-1">
          {/* Profile Selection */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3 shadow-xl">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Heart size={16} className="text-emerald-400" /> 1. Select Patient Profile
            </h2>
            <div className="space-y-2">
              {profiles.map((p) => (
                <button
                  key={p.name}
                  onClick={() => !simulating && setSelectedProfile(p)}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                    selectedProfile.name === p.name
                      ? "border-emerald-500 bg-emerald-950/20 text-white"
                      : "border-gray-800 bg-gray-850 text-gray-400 hover:border-gray-700 hover:text-white"
                  }`}
                  disabled={simulating}
                >
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Stressor Selection */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3 shadow-xl">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap size={16} className="text-amber-400" /> 2. Choose Physiological Stressor
            </h2>
            <div className="space-y-2">
              {stressors.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.name}
                    onClick={() => !simulating && setSelectedStressor(s)}
                    className={`w-full text-left p-3 rounded-xl border text-sm transition-all flex gap-3 items-start ${
                      selectedStressor.name === s.name
                        ? "border-amber-500 bg-amber-950/20 text-white"
                        : "border-gray-800 bg-gray-850 text-gray-400 hover:border-gray-700 hover:text-white"
                    }`}
                    disabled={simulating}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={16} className={selectedStressor.name === s.name ? "text-amber-400" : "text-gray-400"} />
                    </div>
                    <div>
                      <p className="font-semibold flex items-center gap-1.5">
                        {s.name} <span className="text-2xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">{s.duration}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{s.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Control Button */}
          <button
            onClick={handleStart}
            disabled={simulating}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all text-sm"
          >
            <Play size={16} fill="white" />
            {simulating ? "Simulating Organs..." : "Initiate Stress Test Simulation"}
          </button>
        </div>

        {/* Output Diagnostics Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">Live Twin Simulation Output</h2>
                <p className="text-xs text-gray-500 mt-0.5">Profile: {selectedProfile.name} · Stressor: {selectedStressor.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Timeline Progress:</span>
                <span className="text-sm font-mono text-emerald-400 font-bold">{simTime}%</span>
              </div>
            </div>

            {/* Organ System Visual Status */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { name: "Brain / CNS", status: currentStats.adrenaline > 180 ? "Hyper-Alert" : "Stable", desc: "Neurotransmitter activity & sympathetic trigger", color: currentStats.adrenaline > 180 ? "text-amber-400 bg-amber-950/20 border-amber-800" : "text-emerald-400 bg-emerald-950/20 border-emerald-800" },
                { name: "Myocardium", status: `${currentStats.hr} BPM`, desc: `Cardiac output and stroke volume demands`, color: currentStats.hr > 140 ? "text-red-400 bg-red-950/20 border-red-800" : currentStats.hr > 95 ? "text-amber-400 bg-amber-950/20 border-amber-800" : "text-emerald-400 bg-emerald-950/20 border-emerald-800" },
                { name: "Pancreas", status: currentStats.glucose > 140 ? "Insulin Surge" : currentStats.glucose < 70 ? "Glucagon Release" : "Homeostasis", desc: "Glucose metabolization rates", color: currentStats.glucose > 140 ? "text-red-400 bg-red-950/20 border-red-800" : "text-emerald-400 bg-emerald-950/20 border-emerald-800" },
                { name: "Adrenals", status: `${currentStats.adrenaline} pg/mL`, desc: "Epinephrine / cortisol hormone dump", color: currentStats.adrenaline > 100 ? "text-amber-400 bg-amber-950/20 border-amber-800" : "text-emerald-400 bg-emerald-950/20 border-emerald-800" },
                { name: "Vasculature", status: `${currentStats.bp} mmHg`, desc: "Arterial pressure and resistance levels", color: currentStats.bp > 150 ? "text-red-400 bg-red-950/20 border-red-800" : currentStats.bp > 130 ? "text-amber-400 bg-amber-950/20 border-amber-800" : "text-emerald-400 bg-emerald-950/20 border-emerald-800" }
              ].map((organ) => (
                <div key={organ.name} className={`p-3 rounded-xl border flex flex-col justify-between ${organ.color} h-28 transition-all duration-300`}>
                  <div>
                    <p className="text-xs font-semibold">{organ.name}</p>
                    <p className="text-3xs text-gray-500 mt-1 leading-snug">{organ.desc}</p>
                  </div>
                  <p className="text-sm font-bold mt-2">{organ.status}</p>
                </div>
              ))}
            </div>

            {/* Graphs of physiological changes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-400 flex justify-between">
                  <span>Heart Rate (BPM)</span>
                  <span className="text-emerald-400 font-mono">{currentStats.hr} BPM</span>
                </span>
                {renderLineChart(dataPoints, "hr", 200, "#10b981")}
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-400 flex justify-between">
                  <span>Blood Glucose (mg/dL)</span>
                  <span className="text-blue-400 font-mono">{currentStats.glucose} mg/dL</span>
                </span>
                {renderLineChart(dataPoints, "glucose", 220, "#3b82f6")}
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-400 flex justify-between">
                  <span>Cortisol (mcg/dL)</span>
                  <span className="text-purple-400 font-mono">{currentStats.cortisol} mcg/dL</span>
                </span>
                {renderLineChart(dataPoints, "cortisol", 60, "#a855f7")}
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-400 flex justify-between">
                  <span>Adrenaline (pg/mL)</span>
                  <span className="text-amber-400 font-mono">{currentStats.adrenaline} pg/mL</span>
                </span>
                {renderLineChart(dataPoints, "adrenaline", 300, "#f59e0b")}
              </div>
            </div>

            {/* Clinical Explanation */}
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-gray-300 uppercase flex items-center gap-1.5">
                <Info size={14} className="text-teal-400" /> Autonomic & Metabolic Compensatory Report
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                {selectedStressor.name === "HIIT Workout Session" && `Under high muscular energy demand, the brain signals the sympathetic nervous system to dump adrenaline (${currentStats.adrenaline} pg/mL) to recruit cardiac rate (${currentStats.hr} BPM) and output. In ${selectedProfile.name}, glucose levels initially fluctuate as skeletal muscles draw on glycogen, followed by liver glycogenolysis to raise blood glucose back to homeostatic parameters.`}
                {selectedStressor.name === "Triple-Espresso Caffeine Spike" && `Caffeine competitively binds to adenosine receptors, suppressing neurological indicators of fatigue. Systemic vasoconstriction follows, lifting arterial pressure to ${currentStats.bp} mmHg. In response, cortisol rises to assist gluconeogenic pathway acceleration.`}
                {selectedStressor.name === "48-Hour Sleep Deprivation" && `Continuous sensory inputs prevent normal nocturnal restorative pituitary regulation. Cortisol (${currentStats.cortisol} mcg/dL) remains pathologically elevated, inducing liver glucose release and causing systemic vascular inflammation (BP: ${currentStats.bp} mmHg).`}
                {selectedStressor.name === "Extended Fasting Ketosis" && `As circulatory glucose sinks to ${currentStats.glucose} mg/dL, insulin output drops. The pancreas increases glucagon secretion to trigger gluconeogenesis. Healthy profiles demonstrate stable metabolic shifts, while Diabetic profiles show slower adjustment due to rigid glucose transport receptors.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
