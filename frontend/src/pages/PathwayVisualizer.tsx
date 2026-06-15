import { useState } from "react";
import { Activity, ShieldAlert, BookOpen, RotateCcw, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

interface PathwayPair {
  name: string;
  drug: string;
  substance: string;
  enzyme: string;
  severity: "Major" | "Moderate" | "Contraindicated";
  colorClass: string;
  borderColorClass: string;
  description: string;
  molecularDetail: string;
  clinicalOutcome: string;
  animationType: "block" | "compete" | "compound";
}

const pathways: PathwayPair[] = [
  {
    name: "Atorvastatin + Grapefruit Juice",
    drug: "Atorvastatin",
    substance: "Grapefruit (Naringin)",
    enzyme: "CYP3A4 Enzyme",
    severity: "Major",
    colorClass: "text-amber-400 bg-amber-950/20",
    borderColorClass: "border-amber-800",
    description: "Grapefruit bioflavonoids selectively inhibit intestinal CYP3A4, stopping first-pass drug metabolization.",
    molecularDetail: "Naringin molecules bind covalently to the active catalytic pocket of the CYP3A4 cytochrome, causing irreversible enzyme inactivation. Statin molecules cannot be cleaved and build up in circulation.",
    clinicalOutcome: "Severe plasma statin toxicity, increasing risk of rhabdomyolysis (skeletal muscle breakdown) and acute renal failure.",
    animationType: "block"
  },
  {
    name: "Lisinopril + Potassium-Rich Foods",
    drug: "Lisinopril",
    substance: "Potassium (Banana/Avocado)",
    enzyme: "Aldosterone Receptor",
    severity: "Moderate",
    colorClass: "text-orange-400 bg-orange-950/20",
    borderColorClass: "border-orange-800",
    description: "ACE inhibition reduces aldosterone synthesis, impairing renal potassium clearance pathways.",
    molecularDetail: "Lisinopril blocks Angiotensin-Converting Enzyme, halting conversion of Angiotensin I to II. This downregulates aldosterone release in the adrenal cortex, shutting down the kidney's potassium-sodium pump.",
    clinicalOutcome: "Hyperkalemia (high serum potassium levels), resulting in cardiac conduction anomalies, muscle weakness, and cardiac arrest.",
    animationType: "compound"
  },
  {
    name: "Warfarin + Leafy Greens",
    drug: "Warfarin",
    substance: "Vitamin K (Spinach/Kale)",
    enzyme: "VKORC1 Reductase",
    severity: "Major",
    colorClass: "text-red-400 bg-red-950/20",
    borderColorClass: "border-red-800",
    description: "Dietary Vitamin K competes with and overrides Warfarin's blockade on the clotting factor recycling system.",
    molecularDetail: "Warfarin inhibits the VKORC1 enzyme to prevent Vitamin K recycling. Excess dietary Vitamin K bypasses this enzyme entirely via direct reduction pathways, resuming synthesis of factors II, VII, IX, and X.",
    clinicalOutcome: "Neutralization of anticoagulant efficacy, increasing the risk of deep vein thrombosis, stroke, and arterial clotting.",
    animationType: "compete"
  }
];

export default function PathwayVisualizer() {
  const [selectedPair, setSelectedPair] = useState<PathwayPair>(pathways[0]);
  const [reactionActive, setReactionActive] = useState(false);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Molecular Synapse & Receptor Pathway Visualizer</h1>
            <p className="text-gray-400 text-sm">Observe real-time animated drug-food interactions at the cellular and enzyme level</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Controls & Clinical Notes */}
        <div className="lg:col-span-5 space-y-6">
          {/* Pair Selector */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <BookOpen size={16} className="text-indigo-400" /> Select Pathway Combination
            </h2>
            <div className="space-y-2">
              {pathways.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setSelectedPair(p);
                    setReactionActive(false);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all flex flex-col justify-between ${
                    selectedPair.name === p.name
                      ? "border-indigo-500 bg-indigo-950/20 text-white"
                      : "border-gray-850 bg-gray-850 text-gray-400 hover:border-gray-750 hover:text-white"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-3xs px-2 py-0.5 rounded-full bg-red-950/30 border border-red-900 text-red-400">
                      {p.severity} Severity
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{p.description}</span>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setReactionActive(!reactionActive)}
              className={`w-full font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm mt-4 ${
                reactionActive 
                  ? "bg-red-900/30 border border-red-500/50 text-red-400" 
                  : "bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-lg shadow-indigo-600/20"
              }`}
            >
              {reactionActive ? (
                <>
                  <RotateCcw size={15} /> Reset Synapse Simulation
                </>
              ) : (
                <>
                  <Activity size={15} /> Trigger Reaction Simulation
                </>
              )}
            </button>
          </div>

          {/* Clinical Findings Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert size={16} className="text-pink-400" /> Pharmacological Analysis
            </h3>
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 bg-gray-850 rounded-xl border border-gray-850">
                <span className="font-bold text-white block">Receptor/Enzyme Site</span>
                <span className="text-gray-400 mt-1 block">{selectedPair.enzyme}</span>
              </div>
              <div className="p-3 bg-gray-850 rounded-xl border border-gray-850">
                <span className="font-bold text-white block">Molecular Binding Details</span>
                <span className="text-gray-400 mt-1 block">{selectedPair.molecularDetail}</span>
              </div>
              <div className="p-3 bg-red-950/20 rounded-xl border border-red-900/30">
                <span className="font-bold text-red-400 block flex items-center gap-1">
                  <AlertTriangle size={13} /> Clinical Outcome
                </span>
                <span className="text-gray-450 mt-1 block font-medium">{selectedPair.clinicalOutcome}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Animated SVG Synapse Panel */}
        <div className="lg:col-span-7 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[480px]">
          <div className="flex justify-between items-center border-b border-gray-850 pb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${reactionActive ? "bg-red-500 animate-ping" : "bg-indigo-500"}`} />
              Cellular Synapse Chamber
            </span>
            <span className="text-xs text-gray-500 font-mono">Site: Intestinal Mucosa / Hepatocyte</span>
          </div>

          {/* SVG Workspace */}
          <div className="flex-1 flex items-center justify-center relative my-4 bg-gray-950/40 rounded-xl border border-gray-850 p-4 min-h-[340px] overflow-hidden">
            <svg className="w-full h-full max-w-[450px] max-h-[300px]" viewBox="0 0 400 300">
              {/* Style tags for keyframe animations */}
              <style>{`
                @keyframes float-drug {
                  0% { transform: translate(20px, 40px); }
                  50% { transform: translate(35px, 80px); }
                  100% { transform: translate(20px, 40px); }
                }
                @keyframes float-substance {
                  0% { transform: translate(320px, 50px); }
                  50% { transform: translate(280px, 110px); }
                  100% { transform: translate(320px, 50px); }
                }
                @keyframes react-block-substance {
                  0% { transform: translate(320px, 50px); }
                  100% { transform: translate(200px, 140px); }
                }
                @keyframes react-block-drug {
                  0% { transform: translate(20px, 40px); opacity: 1; }
                  40% { transform: translate(120px, 130px); opacity: 1; }
                  100% { transform: translate(120px, 80px); opacity: 0.1; }
                }
                @keyframes react-compete-drug {
                  0% { transform: translate(20px, 40px); }
                  40% { transform: translate(170px, 130px); }
                  70% { transform: translate(150px, 90px); }
                  100% { transform: translate(20px, 40px); }
                }
                @keyframes react-compete-substance {
                  0% { transform: translate(320px, 50px); }
                  100% { transform: translate(200px, 140px); }
                }
                @keyframes react-compound-all {
                  0% { transform: translate(20px, 40px); }
                  100% { transform: translate(200px, 140px); filter: drop-shadow(0 0 10px #f97316); }
                }
                .drug-mol { animation: float-drug 5s infinite ease-in-out; }
                .sub-mol { animation: float-substance 6s infinite ease-in-out; }
                
                .react-block-sub { animation: react-block-substance 2.5s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94); }
                .react-block-drg { animation: react-block-drug 3s forwards ease-in-out; }
                .react-comp-drg { animation: react-compete-drug 3.5s forwards ease-in-out; }
                .react-comp-sub { animation: react-compete-substance 2.2s forwards ease-in-out; }
                .react-comp-all { animation: react-compound-all 2.5s forwards ease-in-out; }
              `}</style>

              {/* Receptor (CYP3A4 / VKORC1) represented as a circular channel in membrane */}
              <path d="M 100 150 Q 200 120 300 150" fill="none" stroke="#374151" strokeWidth="6" />
              <path d="M 100 160 Q 200 130 300 160" fill="none" stroke="#1f2937" strokeWidth="4" />
              
              {/* Enzyme target pocket */}
              <circle cx="200" cy="142" r="28" fill="#1e1b4b" stroke="#4f46e5" strokeWidth="2.5" />
              <text x="200" y="146" fill="#818cf8" fontSize="8" fontWeight="bold" textAnchor="middle">{selectedPair.enzyme.split(" ")[0]}</text>

              {/* Membrane barrier */}
              <line x1="20" y1="150" x2="172" y2="150" stroke="#4b5563" strokeWidth="4" strokeDasharray="3,3" />
              <line x1="228" y1="150" x2="380" y2="150" stroke="#4b5563" strokeWidth="4" strokeDasharray="3,3" />

              {/* Reactant Molecules */}
              {!reactionActive ? (
                <>
                  {/* Floating drug sphere */}
                  <g className="drug-mol">
                    <circle cx="0" cy="0" r="14" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
                    <text x="0" y="3" fill="#93c5fd" fontSize="7" fontWeight="bold" textAnchor="middle">Statin</text>
                  </g>
                  {/* Floating food substance sphere */}
                  <g className="sub-mol">
                    <circle cx="0" cy="0" r="14" fill="#78350f" stroke="#f59e0b" strokeWidth="2" />
                    <text x="0" y="3" fill="#fde68a" fontSize="6.5" fontWeight="bold" textAnchor="middle">Naringin</text>
                  </g>
                </>
              ) : (
                <>
                  {/* Active Simulation paths */}
                  {selectedPair.animationType === "block" && (
                    <>
                      {/* Naringin blocks the receptor pocket */}
                      <g className="react-block-sub">
                        <circle cx="0" cy="0" r="14" fill="#78350f" stroke="#f59e0b" strokeWidth="2" />
                        <text x="0" y="3" fill="#fde68a" fontSize="6.5" fontWeight="bold" textAnchor="middle">Blocker</text>
                        {/* Inhibitor halos */}
                        <circle cx="0" cy="0" r="20" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2,2" className="animate-spin" />
                      </g>
                      {/* Statin bounces off because CYP3A4 is blocked */}
                      <g className="react-block-drg">
                        <circle cx="0" cy="0" r="14" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
                        <text x="0" y="3" fill="#93c5fd" fontSize="7" fontWeight="bold" textAnchor="middle">Statin</text>
                      </g>
                    </>
                  )}

                  {selectedPair.animationType === "compete" && (
                    <>
                      {/* Spinach molecules flood receptor */}
                      <g className="react-comp-sub">
                        <circle cx="0" cy="0" r="14" fill="#14532d" stroke="#22c55e" strokeWidth="2" />
                        <text x="0" y="3" fill="#bbf7d0" fontSize="7" fontWeight="bold" textAnchor="middle">Vit K</text>
                      </g>
                      {/* Warfarin competes but is pushed back */}
                      <g className="react-comp-drg">
                        <circle cx="0" cy="0" r="14" fill="#7f1d1d" stroke="#ef4444" strokeWidth="2" />
                        <text x="0" y="3" fill="#fca5a5" fontSize="7" fontWeight="bold" textAnchor="middle">Warfarin</text>
                      </g>
                    </>
                  )}

                  {selectedPair.animationType === "compound" && (
                    <>
                      {/* Potassium compounding in kidney channels */}
                      <g className="react-comp-all">
                        <circle cx="0" cy="0" r="14" fill="#7c2d12" stroke="#ea580c" strokeWidth="2" />
                        <text x="0" y="3" fill="#ffedd5" fontSize="7" fontWeight="bold" textAnchor="middle">K+ Ions</text>
                        {/* Hazard pulse halo */}
                        <circle cx="0" cy="0" r="22" fill="none" stroke="#ef4444" strokeWidth="1.5" className="animate-ping" />
                      </g>
                    </>
                  )}
                </>
              )}

              {/* Labels */}
              <text x="350" y="138" fill="#9ca3af" fontSize="8" textAnchor="middle">Extracellular Space</text>
              <text x="50" y="180" fill="#9ca3af" fontSize="8" textAnchor="middle">Intracellular Chamber</text>
            </svg>

            {/* Reaction Indicator Badge */}
            {reactionActive && (
              <div className="absolute bottom-3 left-3 bg-red-950/40 border border-red-800 px-3 py-1 rounded-lg text-red-400 text-3xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                Interference Registered
              </div>
            )}
          </div>

          {/* Molecular Key */}
          <div className="flex gap-4 justify-center text-xs border-t border-gray-850 pt-3 text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-blue-400" />
              <span>Statin / Drug Agent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 border border-amber-400" />
              <span>Bioflavonoid / Food Compound</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-900 border border-indigo-500" />
              <span>Catalytic Receptor Site</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
