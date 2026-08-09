import { useState } from "react";
import {
  Layers,
  Gauge,
  Droplet,
  Waves,
  Timer,
  FlaskConical,
  Beaker,
  Thermometer,
  Clock,
  RotateCw,
  AlertCircle,
  Info,
  Loader2,
  Sparkles,
  RefreshCw,
  Scale,
  PieChart,
  Tag, // Imported Tag icon for the Compound Name
  ListNumbers
} from "lucide-react";

const FONT_SANS = { fontFamily: "'IBM Plex Sans', sans-serif" };
const FONT_MONO = { fontFamily: "'IBM Plex Mono', monospace" };

const MIN_THICKNESS = 20;
const MAX_THICKNESS = 1200;

function hueForThickness(thickness) {
  return (thickness * 0.9) % 360;
}

const SPECTRUM_STOPS = 12;
const SPECTRUM_GRADIENT_CSS = `linear-gradient(to right, ${Array.from({ length: SPECTRUM_STOPS + 1 }, (_, i) => {
  const t = i / SPECTRUM_STOPS;
  const thickness = MIN_THICKNESS + t * (MAX_THICKNESS - MIN_THICKNESS);
  return `hsl(${hueForThickness(thickness)}, 80%, 60%) ${(t * 100).toFixed(1)}%`;
}).join(", ")})`;

const PROCESS_FIELDS = [
  { key: "spinSpeed", label: "Spin Speed", unit: "RPM", placeholder: "3000", icon: Gauge, step: "10" },
  { key: "spinTime", label: "Spin Time", unit: "s", placeholder: "60", icon: Timer, step: "1" },
  { key: "volumeDeposited", label: "Volume Deposited", unit: "mL", placeholder: "0.05", icon: Beaker, step: "0.001" },
  { key: "annealingTemp", label: "Annealing Temp.", unit: "°C", placeholder: "150", icon: Thermometer, step: "1" },
  { key: "annealingTime", label: "Annealing Time", unit: "min", placeholder: "30", icon: Clock, step: "1" },
];

const INITIAL_PROCESS_DATA = PROCESS_FIELDS.reduce((acc, f) => {
  acc[f.key] = "";
  return acc;
}, {});

// Added 'name' to the empty material object
const EMPTY_MATERIAL = {
  name: "",
  fraction: "",
  molarity: "",
  molecularWeight: "",
  density: "",
  viscosity: "",
  surfaceTension: ""
};

export default function ThinFilmPredictor() {
  const [numCompounds, setNumCompounds] = useState("1");
  const [materials, setMaterials] = useState([{ ...EMPTY_MATERIAL, fraction: "100" }]);
  const [processData, setProcessData] = useState(INITIAL_PROCESS_DATA);
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [unit, setUnit] = useState("nm");
  const [fractionError, setFractionError] = useState(false);

  // Function to handle the "How many compounds?" input
  const handleNumCompoundsChange = (val) => {
    setNumCompounds(val);
    const num = parseInt(val, 10);
    
    if (isNaN(num) || num < 1) {
      setMaterials([]);
      return;
    }
    
    const newMaterials = [...materials];
    
    if (num > materials.length) {
      // Add missing empty forms
      for (let i = materials.length; i < num; i++) {
        newMaterials.push({ ...EMPTY_MATERIAL });
      }
    } else if (num < materials.length) {
      // Remove excess forms
      newMaterials.length = num;
    }
    
    // Auto-fill fraction if there is only 1 compound
    if (num === 1 && newMaterials.length > 0) {
      newMaterials[0].fraction = "100";
    }
    
    setMaterials(newMaterials);
  };

  const handleMaterialChange = (index, key, value) => {
    const newMaterials = [...materials];
    newMaterials[index][key] = value;
    setMaterials(newMaterials);
  };

  const handleProcessChange = (key, value) => {
    setProcessData((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (materials.length === 0) return false;

    const isProcessValid = PROCESS_FIELDS.every((f) => {
      const v = parseFloat(processData[f.key]);
      return processData[f.key] !== "" && !isNaN(v) && v >= 0;
    });

    let totalFraction = 0;
    const areMaterialsValid = materials.every((m) => {
      const fraction = parseFloat(m.fraction);
      const mol = parseFloat(m.molarity);
      const mw = parseFloat(m.molecularWeight);
      const den = parseFloat(m.density);
      const visc = parseFloat(m.viscosity);
      const st = parseFloat(m.surfaceTension);

      if (!isNaN(fraction)) totalFraction += fraction;

      return (
        m.name.trim() !== "" && // Ensure name is filled out
        m.fraction !== "" && !isNaN(fraction) && fraction >= 0 &&
        m.molarity !== "" && !isNaN(mol) && mol >= 0 &&
        m.molecularWeight !== "" && !isNaN(mw) && mw >= 0 &&
        m.density !== "" && !isNaN(den) && den > 0 &&
        m.viscosity !== "" && !isNaN(visc) && visc > 0 &&
        m.surfaceTension !== "" && !isNaN(st) && st >= 0
      );
    });

    const isFractionValid = Math.abs(totalFraction - 100) < 0.1;
    setFractionError(!isFractionValid);

    return isProcessValid && areMaterialsValid && isFractionValid;
  };

  const handlePredict = async () => {
    const valid = validateForm();
    if (!valid) {
      setShowErrors(true);
      return;
    }
    
    setShowErrors(false);
    setIsLoading(true);
    setPrediction(null);

    try {
      let mixDensity = 0;
      let mixViscosityLog = 0;
      let mixSurfaceTension = 0;
      let mixMW = 0;
      let mixMolarity = 0;

      materials.forEach((m) => {
        const phi = parseFloat(m.fraction) / 100.0;
        mixDensity += phi * parseFloat(m.density);
        mixViscosityLog += phi * Math.log(parseFloat(m.viscosity));
        mixSurfaceTension += phi * parseFloat(m.surfaceTension);
        mixMW += phi * parseFloat(m.molecularWeight);
        mixMolarity += phi * parseFloat(m.molarity);
      });

      const mixViscosity = Math.exp(mixViscosityLog); 
      const calculated_wt_pct = (mixMolarity * mixMW) / (10 * mixDensity);

      const numericData = {
        spin_speed_rpm: parseFloat(processData.spinSpeed),
        spin_time_s: parseFloat(processData.spinTime),
        viscosity_cp: mixViscosity, 
        surface_tension_mn_m: mixSurfaceTension, 
        concentration_wt_pct: calculated_wt_pct, 
        volume_deposited_ul: parseFloat(processData.volumeDeposited) * 1000, 
        annealing_temp_c: parseFloat(processData.annealingTemp),
        annealing_time_min: parseFloat(processData.annealingTime),
      };

      const response = await fetch("https://film-thickness-predictor.onrender.com/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(numericData),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setPrediction(data.thickness_nm);
      
    } catch (error) {
      console.error("Error fetching prediction:", error);
      alert(`Error communicating with ML backend: ${error.message}.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setNumCompounds("1");
    setMaterials([{ ...EMPTY_MATERIAL, fraction: "100" }]);
    setProcessData(INITIAL_PROCESS_DATA);
    setPrediction(null);
    setShowErrors(false);
    setFractionError(false);
    setIsLoading(false);
  };

  const gaugePercent = prediction !== null ? Math.min(100, Math.max(0, ((prediction - MIN_THICKNESS) / (MAX_THICKNESS - MIN_THICKNESS)) * 100)) : 0;
  const swatchColor = prediction !== null ? `hsl(${hueForThickness(prediction)}, 80%, 60%)` : "transparent";

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 sm:p-8 relative overflow-hidden" style={FONT_SANS}>
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`}</style>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-400 mb-2 font-mono cursor-default" style={FONT_MONO}>
              <Layers className="w-4 h-4 text-cyan-400" />
              Emerging Electronic Materials & Device Lab
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2 cursor-default">
              Thin Film Thickness Predictor
            </h1>
            <p className="text-slate-400 text-sm cursor-default">
              Configure multicomponent formulations and spin-coating parameters to model film thickness.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            
            {/* Step 1 & 2: Dynamic Materials Section */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-5 sm:p-6 shadow-xl hover:shadow-sky-500/10 hover:border-sky-500/30 transition-all duration-300">
              
              {/* Top Input: How many compounds? */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-6 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg border bg-sky-500/10 text-sky-400 border-sky-500/20">
                    <ListNumbers className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 cursor-default" style={FONT_MONO}>
                    How many compounds will you mix?
                  </h2>
                </div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={numCompounds}
                  onChange={(e) => handleNumCompoundsChange(e.target.value)}
                  className="w-24 bg-slate-950/80 border border-sky-500/30 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 rounded-xl px-3 py-2 text-center text-lg font-bold text-sky-400 focus:outline-none transition-all ml-auto"
                  style={FONT_MONO}
                />
              </div>

              {/* Loop through generated compound forms */}
              <div className="space-y-6">
                {materials.map((mat, index) => (
                  <div key={index} className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/20 relative">
                    <h3 className="text-sm font-bold text-sky-300 mb-4 flex items-center gap-2" style={FONT_MONO}>
                      COMPOUND {index + 1}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      {/* Name Input */}
                      <div className="space-y-1.5 sm:col-span-3">
                         <label className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                            <Tag className="w-3.5 h-3.5 text-sky-500" /> Compound Name
                         </label>
                         <input
                            type="text" 
                            value={mat.name}
                            onChange={(e) => handleMaterialChange(index, "name", e.target.value)}
                            placeholder={`e.g. Polymer A, Solvent B`}
                            className={`w-full bg-slate-950/80 border rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:border-sky-500 border-slate-700`}
                         />
                      </div>

                      {/* Numeric Inputs */}
                      {[
                        { key: "fraction", label: "Volume Fraction", unit: "%", icon: PieChart, step: "0.1" },
                        { key: "molarity", label: "Molarity", unit: "M", icon: FlaskConical, step: "0.01" },
                        { key: "molecularWeight", label: "Mol. Weight", unit: "g/mol", icon: Scale, step: "0.1" },
                        { key: "density", label: "Density", unit: "g/mL", icon: Droplet, step: "0.01" },
                        { key: "viscosity", label: "Viscosity", unit: "cP", icon: Droplet, step: "0.1" },
                        { key: "surfaceTension", label: "Surface Tension", unit: "mN/m", icon: Waves, step: "0.1" },
                      ].map((field) => (
                        <div key={field.key} className="space-y-1.5 group/input">
                          <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                            <field.icon className="w-3.5 h-3.5 text-slate-500" /> {field.label}
                          </label>
                          <div className="relative">
                            <input
                              type="number" step={field.step} value={mat[field.key]}
                              onChange={(e) => handleMaterialChange(index, field.key, e.target.value)}
                              className={`w-full bg-slate-950/80 border rounded-lg pl-3 pr-10 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:border-sky-500 border-slate-700`}
                              style={FONT_MONO}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono pointer-events-none">
                              {field.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {materials.length === 0 && (
                   <div className="text-center py-6 text-slate-500 text-sm italic">
                      Please enter a valid number of compounds to mix above.
                   </div>
                )}
              </div>
            </div>

            {/* Spin & Annealing Parameters */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-5 sm:p-6 shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300">
               <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                    <RotateCw className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 cursor-default" style={FONT_MONO}>
                    Process Parameters
                  </h2>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {PROCESS_FIELDS.map((field) => (
                     <div key={field.key} className="space-y-1.5 group/input">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 group-hover/input:text-slate-300 transition-colors">
                          <field.icon className="w-3.5 h-3.5 text-slate-500" />
                          {field.label}
                        </label>
                        <div className="relative">
                          <input
                            type="number" step={field.step} value={processData[field.key]}
                            onChange={(e) => handleProcessChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-600 focus:border-indigo-500 focus:ring-1 rounded-xl pl-3 pr-10 py-2.5 text-sm text-slate-100 focus:outline-none transition-all font-mono"
                            style={FONT_MONO}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono pointer-events-none">
                            {field.unit}
                          </span>
                        </div>
                      </div>
                  ))}
                </div>
            </div>

            {/* Error States */}
            {showErrors && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Please ensure all names are entered, parameters are valid numeric values, and densities/viscosities are {'>'} 0.
              </div>
            )}
            {showErrors && fractionError && (
               <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Your volume fractions across all compounds must add up to exactly 100%.
              </div>
            )}

            {/* Step 4: Predict Button */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button" onClick={handlePredict} disabled={isLoading || materials.length === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-semibold py-3.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin text-slate-950" /> Calculating Dynamics...</> : <><Sparkles className="w-4 h-4 fill-slate-950" /> Predict Thickness</>}
              </button>
              <button
                type="button" onClick={handleReset}
                className="px-5 py-3.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <RefreshCw className="w-4 h-4" /> Reset
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
             <div className="lg:sticky lg:top-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-default" style={FONT_MONO}>Predicted Thickness</h2>
                {prediction !== null && <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default">ESTIMATED</span>}
              </div>

              {prediction === null && !isLoading && (
                <div className="py-14 text-center text-slate-500 text-sm border-2 border-dashed border-slate-800/80 rounded-xl p-4 cursor-default">
                  Configure formulation and parameters on the left to model thickness.
                </div>
              )}

              {isLoading && (
                <div className="py-14 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" /> Running bulk property analysis...
                </div>
              )}

              {prediction !== null && !isLoading && (
                <>
                  <div className="text-center py-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
                    <div className="flex items-baseline justify-center gap-2 cursor-default">
                      <span className="text-5xl sm:text-6xl font-bold tracking-tight text-white font-mono" style={FONT_MONO}>
                        {unit === "nm" ? prediction.toFixed(1) : (prediction / 1000).toFixed(3)}
                      </span>
                      <span className="text-xl text-cyan-400 font-mono" style={FONT_MONO}>{unit}</span>
                    </div>
                    <div className="flex justify-center gap-2 mt-4">
                      <button type="button" onClick={() => setUnit("nm")} style={FONT_MONO} className={`text-xs px-3 py-1 rounded-lg font-mono transition-all ${unit === "nm" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "text-slate-500 hover:text-cyan-400"}`}>nm</button>
                      <button type="button" onClick={() => setUnit("μm")} style={FONT_MONO} className={`text-xs px-3 py-1 rounded-lg font-mono transition-all ${unit === "μm" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "text-slate-500 hover:text-cyan-400"}`}>μm</button>
                    </div>
                  </div>
                  <div className="space-y-2 group/spectrum cursor-default">
                    <div className="flex justify-between text-xs text-slate-400 font-mono" style={FONT_MONO}>
                      <span>Interference Spectrum</span>
                      <span className="text-slate-300">{prediction.toFixed(1)} nm</span>
                    </div>
                    <div className="relative h-9 rounded-xl overflow-hidden border border-slate-700/80 shadow-inner" style={{ background: SPECTRUM_GRADIENT_CSS }}>
                      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{ left: `${gaugePercent}%` }} />
                      <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow-xl" style={{ left: `calc(${gaugePercent}% - 8px)`, top: "50%", transform: "translateY(-50%)", backgroundColor: swatchColor }} />
                    </div>
                  </div>
                </>
              )}
               <div className="flex items-start gap-2.5 pt-4 border-t border-slate-800 text-xs text-slate-400 leading-relaxed cursor-default">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>Model assumes ideal volumetric mixing. Non-ideal chemical interactions between solutes/solvents are not reflected.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// import { useState } from "react";
// import {
//   Layers,
//   Gauge,
//   Droplet,
//   Waves,
//   Timer,
//   FlaskConical,
//   Beaker,
//   Thermometer,
//   Clock,
//   RotateCw,
//   AlertCircle,
//   Info,
//   Loader2,
//   Sparkles,
//   RefreshCw,
//   Scale, // Imported Scale icon for molecular weight/density
// } from "lucide-react";

// const FONT_SANS = { fontFamily: "'IBM Plex Sans', sans-serif" };
// const FONT_MONO = { fontFamily: "'IBM Plex Mono', monospace" };

// const MIN_THICKNESS = 20;
// const MAX_THICKNESS = 1200;

// function hueForThickness(thickness) {
//   return (thickness * 0.9) % 360;
// }

// const SPECTRUM_STOPS = 12;
// const SPECTRUM_GRADIENT_CSS = `linear-gradient(to right, ${Array.from({ length: SPECTRUM_STOPS + 1 }, (_, i) => {
//   const t = i / SPECTRUM_STOPS;
//   const thickness = MIN_THICKNESS + t * (MAX_THICKNESS - MIN_THICKNESS);
//   return `hsl(${hueForThickness(thickness)}, 80%, 60%) ${(t * 100).toFixed(1)}%`;
// }).join(", ")})`;

// // Updated FIELD_GROUPS to replace concentration with Molarity, MW, and Density
// const FIELD_GROUPS = [
//   {
//     title: "Solution Properties",
//     icon: FlaskConical,
//     badgeColor: "border-sky-500/30 bg-sky-500/10 text-sky-400",
//     iconBg: "bg-sky-500/10 text-sky-400 border-sky-500/20",
//     focusBorder: "focus:border-sky-500 focus:ring-sky-500/20",
//     hoverShadow: "hover:shadow-sky-500/10 hover:border-sky-500/30",
//     fields: [
//       { key: "molarity", label: "Molarity", unit: "M", placeholder: "0.5", icon: FlaskConical, step: "0.01" },
//       { key: "molecularWeight", label: "Molecular Weight", unit: "g/mol", placeholder: "100.0", icon: Scale, step: "0.1" },
//       { key: "density", label: "Density", unit: "g/mL", placeholder: "1.2", icon: Droplet, step: "0.01" },
//       { key: "viscosity", label: "Viscosity", unit: "cP", placeholder: "10.0", icon: Droplet, step: "0.1" },
//       { key: "surfaceTension", label: "Surface Tension", unit: "mN/m", placeholder: "30.0", icon: Waves, step: "0.1" },
//     ],
//   },
//   {
//     title: "Spin Coating Parameters",
//     icon: RotateCw,
//     badgeColor: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
//     iconBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
//     focusBorder: "focus:border-indigo-500 focus:ring-indigo-500/20",
//     hoverShadow: "hover:shadow-indigo-500/10 hover:border-indigo-500/30",
//     fields: [
//       { key: "spinSpeed", label: "Spin Speed", unit: "RPM", placeholder: "3000", icon: Gauge, step: "10" },
//       { key: "spinTime", label: "Spin Time", unit: "s", placeholder: "60", icon: Timer, step: "1" },
//       { key: "volumeDeposited", label: "Volume Deposited", unit: "mL", placeholder: "0.05", icon: Beaker, step: "0.001" },
//     ],
//   },
//   {
//     title: "Annealing Conditions",
//     icon: Thermometer,
//     badgeColor: "border-amber-500/30 bg-amber-500/10 text-amber-400",
//     iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
//     focusBorder: "focus:border-amber-500 focus:ring-amber-500/20",
//     hoverShadow: "hover:shadow-amber-500/10 hover:border-amber-500/30",
//     fields: [
//       { key: "annealingTemp", label: "Annealing Temp.", unit: "°C", placeholder: "150", icon: Thermometer, step: "1" },
//       { key: "annealingTime", label: "Annealing Time", unit: "min", placeholder: "30", icon: Clock, step: "1" },
//     ],
//   },
// ];

// const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);
// const INITIAL_FORM_DATA = ALL_FIELDS.reduce((acc, f) => {
//   acc[f.key] = "";
//   return acc;
// }, {});

// export default function ThinFilmPredictor() {
//   const [formData, setFormData] = useState(INITIAL_FORM_DATA);
//   const [prediction, setPrediction] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showErrors, setShowErrors] = useState(false);
//   const [unit, setUnit] = useState("nm");

//   // Allow density to be > 0 (it cannot be 0 because we divide by it)
//   const isValid = ALL_FIELDS.every((f) => {
//     const v = parseFloat(formData[f.key]);
//     if (f.key === "density") {
//         return formData[f.key] !== "" && !isNaN(v) && v > 0;
//     }
//     return formData[f.key] !== "" && !isNaN(v) && v >= 0;
//   });

//   const handleChange = (key, value) => {
//     setFormData((prev) => ({ ...prev, [key]: value }));
//   };

//   const handlePredict = async () => {
//     if (!isValid) {
//       setShowErrors(true);
//       return;
//     }
//     setShowErrors(false);
//     setIsLoading(true);
//     setPrediction(null);

//     try {
//       // Calculate concentration (wt%) from Molarity, MW, and Density
//       const molarity = parseFloat(formData.molarity);
//       const mw = parseFloat(formData.molecularWeight);
//       const density = parseFloat(formData.density);
      
//       const calculated_wt_pct = (molarity * mw) / (10 * density);

//       const numericData = {
//         spin_speed_rpm: parseFloat(formData.spinSpeed),
//         spin_time_s: parseFloat(formData.spinTime),
//         viscosity_cp: parseFloat(formData.viscosity),
//         surface_tension_mn_m: parseFloat(formData.surfaceTension),
//         concentration_wt_pct: calculated_wt_pct, // Sending calculated value to backend
//         volume_deposited_ul: parseFloat(formData.volumeDeposited) * 1000, 
//         annealing_temp_c: parseFloat(formData.annealingTemp),
//         annealing_time_min: parseFloat(formData.annealingTime),
//       };

//       const response = await fetch("https://film-thickness-predictor.onrender.com/predict", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(numericData),
//       });

//       if (!response.ok) {
//         throw new Error(`Server returned ${response.status}`);
//       }

//       const data = await response.json();
//       setPrediction(data.thickness_nm);
      
//     } catch (error) {
//       console.error("Error fetching prediction:", error);
//       alert(`Error communicating with ML backend: ${error.message}. If using a free Render server, it may take 50 seconds to wake up. Please try clicking Predict again.`);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleReset = () => {
//     setFormData(INITIAL_FORM_DATA);
//     setPrediction(null);
//     setShowErrors(false);
//     setIsLoading(false);
//   };

//   const gaugePercent =
//     prediction !== null
//       ? Math.min(100, Math.max(0, ((prediction - MIN_THICKNESS) / (MAX_THICKNESS - MIN_THICKNESS)) * 100))
//       : 0;

//   const swatchColor = prediction !== null ? `hsl(${hueForThickness(prediction)}, 80%, 60%)` : "transparent";

//   return (
//     <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 sm:p-8 relative overflow-hidden" style={FONT_SANS}>
//       <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
//       <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

//       <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`}</style>

//       <div className="max-w-6xl mx-auto relative z-10">
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
//           <div>
//             <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-400 mb-2 font-mono cursor-default" style={FONT_MONO}>
//               <Layers className="w-4 h-4 text-cyan-400" />
//               Emerging Electronic Materials & Device Lab
//             </div>
//             <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2 cursor-default">
//               Thin Film Thickness Predictor
//             </h1>
//             <p className="text-slate-400 text-sm cursor-default">
//               Enter your solution formulation and spin-coating parameters to model film thickness.
//             </p>
//           </div>

//           <div
//             className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs font-mono text-slate-300 shadow-inner hover:bg-slate-800/80 transition-colors cursor-default"
//             style={FONT_MONO}
//           >
//             <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
//             Computational Model Active
//           </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
//           <div className="lg:col-span-3 space-y-6">
//             {FIELD_GROUPS.map((group) => (
//               <div
//                 key={group.title}
//                 className={`rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-5 sm:p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${group.hoverShadow}`}
//               >
//                 <div className="flex items-center gap-2.5 mb-5">
//                   <div className={`w-8 h-8 flex items-center justify-center rounded-lg border ${group.iconBg}`}>
//                     <group.icon className="w-4 h-4" />
//                   </div>
//                   <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 cursor-default" style={FONT_MONO}>
//                     {group.title}
//                   </h2>
//                 </div>

//                 <div className="grid sm:grid-cols-2 gap-4">
//                   {group.fields.map((field) => {
//                     const val = formData[field.key];
//                     let invalid = false;
//                     if (showErrors) {
//                         if (field.key === "density") {
//                             invalid = val === "" || isNaN(parseFloat(val)) || parseFloat(val) <= 0;
//                         } else {
//                             invalid = val === "" || isNaN(parseFloat(val)) || parseFloat(val) < 0;
//                         }
//                     }
                    
//                     return (
//                       <div key={field.key} className="space-y-1.5 group/input">
//                         <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 group-hover/input:text-slate-300 transition-colors">
//                           <field.icon className="w-3.5 h-3.5 text-slate-500 group-hover/input:text-slate-400 transition-colors" />
//                           {field.label}
//                         </label>
//                         <div className="relative">
//                           <input
//                             type="number"
//                             step={field.step}
//                             value={val}
//                             onChange={(e) => handleChange(field.key, e.target.value)}
//                             placeholder={field.placeholder}
//                             className={
//                               "w-full bg-slate-950/80 border rounded-xl pl-3.5 pr-14 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 transition-all duration-300 hover:bg-slate-900 font-mono " +
//                               (invalid
//                                 ? "border-red-500/80 focus:ring-red-500/20 bg-red-950/10 hover:border-red-400"
//                                 : `border-slate-800 hover:border-slate-600 ${group.focusBorder}`)
//                             }
//                             style={FONT_MONO}
//                           />
//                           <span
//                             className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono pointer-events-none group-hover/input:text-slate-400 transition-colors"
//                             style={FONT_MONO}
//                           >
//                             {field.unit}
//                           </span>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             ))}

//             {showErrors && !isValid && (
//               <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
//                 <AlertCircle className="w-4 h-4 shrink-0" />
//                 Please complete all parameters with valid numeric values. Density must be greater than 0.
//               </div>
//             )}

//             <div className="flex flex-col sm:flex-row gap-3 pt-2">
//               <button
//                 type="button"
//                 onClick={handlePredict}
//                 disabled={isLoading}
//                 className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-semibold py-3.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-cyan-500/40 active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
//               >
//                 {isLoading ? (
//                   <>
//                     <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
//                     Calculating Film Dynamics...
//                   </>
//                 ) : (
//                   <>
//                     <Sparkles className="w-4 h-4 fill-slate-950" />
//                     Predict Thickness
//                   </>
//                 )}
//               </button>

//               <button
//                 type="button"
//                 onClick={handleReset}
//                 className="px-5 py-3.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 hover:border-slate-600 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-medium active:scale-[0.98]"
//               >
//                 <RefreshCw className="w-4 h-4" />
//                 Reset
//               </button>
//             </div>
//           </div>

//           <div className="lg:col-span-2">
//             <div className="lg:sticky lg:top-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md p-6 shadow-2xl transition-all duration-300 hover:shadow-cyan-500/5 hover:border-slate-700/80 space-y-6">
//               <div className="flex items-center justify-between">
//                 <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-default" style={FONT_MONO}>
//                   Predicted Film Thickness
//                 </h2>
//                 {prediction !== null && (
//                   <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default">
//                     ESTIMATED
//                   </span>
//                 )}
//               </div>

//               {prediction === null && !isLoading && (
//                 <div className="py-14 text-center text-slate-500 text-sm border-2 border-dashed border-slate-800/80 rounded-xl p-4 transition-colors hover:border-slate-700 hover:bg-slate-800/20 cursor-default">
//                   Fill in process parameters on the left and hit <span className="text-slate-300">Predict</span> to model thickness.
//                 </div>
//               )}

//               {isLoading && (
//                 <div className="py-14 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
//                   <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
//                   Running fluid dynamics model...
//                 </div>
//               )}

//               {prediction !== null && !isLoading && (
//                 <>
//                   <div className="text-center py-4 bg-slate-950/60 rounded-xl border border-slate-800/80 transition-all duration-300 hover:bg-slate-950/80 hover:border-slate-700">
//                     <div className="flex items-baseline justify-center gap-2 cursor-default">
//                       <span className="text-5xl sm:text-6xl font-bold tracking-tight text-white font-mono" style={FONT_MONO}>
//                         {unit === "nm" ? prediction.toFixed(1) : (prediction / 1000).toFixed(3)}
//                       </span>
//                       <span className="text-xl text-cyan-400 font-mono" style={FONT_MONO}>
//                         {unit}
//                       </span>
//                     </div>

//                     <div className="flex justify-center gap-2 mt-4">
//                       <button
//                         type="button"
//                         onClick={() => setUnit("nm")}
//                         style={FONT_MONO}
//                         className={
//                           "text-xs px-3 py-1 rounded-lg font-mono transition-all duration-300 " +
//                           (unit === "nm"
//                             ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
//                             : "text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10")
//                         }
//                       >
//                         nm
//                       </button>
//                       <button
//                         type="button"
//                         onClick={() => setUnit("μm")}
//                         style={FONT_MONO}
//                         className={
//                           "text-xs px-3 py-1 rounded-lg font-mono transition-all duration-300 " +
//                           (unit === "μm"
//                             ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
//                             : "text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10")
//                         }
//                       >
//                         μm
//                       </button>
//                     </div>
//                   </div>

//                   <div className="space-y-2 group/spectrum cursor-default">
//                     <div className="flex justify-between text-xs text-slate-400 font-mono transition-colors group-hover/spectrum:text-slate-300" style={FONT_MONO}>
//                       <span>Interference Spectrum</span>
//                       <span className="text-slate-300">{prediction.toFixed(1)} nm</span>
//                     </div>

//                     <div
//                       className="relative h-9 rounded-xl overflow-hidden border border-slate-700/80 shadow-inner transition-all duration-300 group-hover/spectrum:shadow-lg"
//                       style={{ background: SPECTRUM_GRADIENT_CSS }}
//                     >
//                       <div
//                         className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
//                         style={{ left: `${gaugePercent}%` }}
//                       />
//                       <div
//                         className="absolute w-4 h-4 rounded-full border-2 border-white shadow-xl transition-all duration-500 group-hover/spectrum:scale-125"
//                         style={{
//                           left: `calc(${gaugePercent}% - 8px)`,
//                           top: "50%",
//                           transform: "translateY(-50%)",
//                           backgroundColor: swatchColor,
//                         }}
//                       />
//                     </div>

//                     <div className="flex justify-between text-[11px] text-slate-500 font-mono transition-colors group-hover/spectrum:text-slate-400" style={FONT_MONO}>
//                       <span>{MIN_THICKNESS} nm</span>
//                       <span>{MAX_THICKNESS} nm</span>
//                     </div>
//                   </div>
//                 </>
//               )}

//               <div className="flex items-start gap-2.5 pt-4 border-t border-slate-800 text-xs text-slate-400 leading-relaxed cursor-default transition-colors hover:text-slate-300">
//                 <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
//                 <span>
//                   Output represents simulated approximations based on trained parameters. True physical results are subject to real-world variance.
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }




























// // import { useState } from "react";
// // import {
// //   Layers,
// //   Gauge,
// //   Droplet,
// //   Waves,
// //   Timer,
// //   FlaskConical,
// //   Beaker,
// //   Thermometer,
// //   Clock,
// //   RotateCw,
// //   AlertCircle,
// //   Info,
// //   Loader2,
// //   Sparkles,
// //   RefreshCw,
// // } from "lucide-react";

// // const FONT_SANS = { fontFamily: "'IBM Plex Sans', sans-serif" };
// // const FONT_MONO = { fontFamily: "'IBM Plex Mono', monospace" };

// // const MIN_THICKNESS = 20;
// // const MAX_THICKNESS = 1200;

// // function hueForThickness(thickness) {
// //   return (thickness * 0.9) % 360;
// // }

// // const SPECTRUM_STOPS = 12;
// // const SPECTRUM_GRADIENT_CSS = `linear-gradient(to right, ${Array.from({ length: SPECTRUM_STOPS + 1 }, (_, i) => {
// //   const t = i / SPECTRUM_STOPS;
// //   const thickness = MIN_THICKNESS + t * (MAX_THICKNESS - MIN_THICKNESS);
// //   return `hsl(${hueForThickness(thickness)}, 80%, 60%) ${(t * 100).toFixed(1)}%`;
// // }).join(", ")})`;

// // const FIELD_GROUPS = [
// //   {
// //     title: "Solution Properties",
// //     icon: FlaskConical,
// //     badgeColor: "border-sky-500/30 bg-sky-500/10 text-sky-400",
// //     iconBg: "bg-sky-500/10 text-sky-400 border-sky-500/20",
// //     focusBorder: "focus:border-sky-500 focus:ring-sky-500/20",
// //     hoverShadow: "hover:shadow-sky-500/10 hover:border-sky-500/30",
// //     fields: [
// //       { key: "concentration", label: "Concentration", unit: "wt%", placeholder: "5.0", icon: FlaskConical, step: "0.1" },
// //       { key: "viscosity", label: "Viscosity", unit: "cP", placeholder: "10.0", icon: Droplet, step: "0.1" },
// //       { key: "surfaceTension", label: "Surface Tension", unit: "mN/m", placeholder: "30.0", icon: Waves, step: "0.1" },
// //     ],
// //   },
// //   {
// //     title: "Spin Coating Parameters",
// //     icon: RotateCw,
// //     badgeColor: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
// //     iconBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
// //     focusBorder: "focus:border-indigo-500 focus:ring-indigo-500/20",
// //     hoverShadow: "hover:shadow-indigo-500/10 hover:border-indigo-500/30",
// //     fields: [
// //       { key: "spinSpeed", label: "Spin Speed", unit: "RPM", placeholder: "3000", icon: Gauge, step: "10" },
// //       { key: "spinTime", label: "Spin Time", unit: "s", placeholder: "60", icon: Timer, step: "1" },
// //       { key: "volumeDeposited", label: "Volume Deposited", unit: "mL", placeholder: "0.05", icon: Beaker, step: "0.001" },
// //     ],
// //   },
// //   {
// //     title: "Annealing Conditions",
// //     icon: Thermometer,
// //     badgeColor: "border-amber-500/30 bg-amber-500/10 text-amber-400",
// //     iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
// //     focusBorder: "focus:border-amber-500 focus:ring-amber-500/20",
// //     hoverShadow: "hover:shadow-amber-500/10 hover:border-amber-500/30",
// //     fields: [
// //       { key: "annealingTemp", label: "Annealing Temp.", unit: "°C", placeholder: "150", icon: Thermometer, step: "1" },
// //       { key: "annealingTime", label: "Annealing Time", unit: "min", placeholder: "30", icon: Clock, step: "1" },
// //     ],
// //   },
// // ];

// // const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);
// // const INITIAL_FORM_DATA = ALL_FIELDS.reduce((acc, f) => {
// //   acc[f.key] = "";
// //   return acc;
// // }, {});

// // export default function ThinFilmPredictor() {
// //   const [formData, setFormData] = useState(INITIAL_FORM_DATA);
// //   const [prediction, setPrediction] = useState(null);
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [showErrors, setShowErrors] = useState(false);
// //   const [unit, setUnit] = useState("nm");

// //   const isValid = ALL_FIELDS.every((f) => {
// //     const v = parseFloat(formData[f.key]);
// //     return formData[f.key] !== "" && !isNaN(v) && v >= 0;
// //   });

// //   const handleChange = (key, value) => {
// //     setFormData((prev) => ({ ...prev, [key]: value }));
// //   };

// //   const handlePredict = async () => {
// //     if (!isValid) {
// //       setShowErrors(true);
// //       return;
// //     }
// //     setShowErrors(false);
// //     setIsLoading(true);
// //     setPrediction(null);

// //     try {
// //       const numericData = {
// //         spin_speed_rpm: parseFloat(formData.spinSpeed),
// //         spin_time_s: parseFloat(formData.spinTime),
// //         viscosity_cp: parseFloat(formData.viscosity),
// //         surface_tension_mn_m: parseFloat(formData.surfaceTension),
// //         concentration_wt_pct: parseFloat(formData.concentration),
// //         volume_deposited_ul: parseFloat(formData.volumeDeposited) * 1000, 
// //         annealing_temp_c: parseFloat(formData.annealingTemp),
// //         annealing_time_min: parseFloat(formData.annealingTime),
// //       };

// //       const response = await fetch("https://film-thickness-predictor.onrender.com/predict", {
// //         method: "POST",
// //         headers: {
// //           "Content-Type": "application/json",
// //         },
// //         body: JSON.stringify(numericData),
// //       });

// //       if (!response.ok) {
// //         throw new Error(`Server returned ${response.status}`);
// //       }

// //       const data = await response.json();
// //       setPrediction(data.thickness_nm);
      
// //     } catch (error) {
// //       console.error("Error fetching prediction:", error);
// //       alert(`Error communicating with ML backend: ${error.message}. If using a free Render server, it may take 50 seconds to wake up. Please try clicking Predict again.`);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const handleReset = () => {
// //     setFormData(INITIAL_FORM_DATA);
// //     setPrediction(null);
// //     setShowErrors(false);
// //     setIsLoading(false);
// //   };

// //   const gaugePercent =
// //     prediction !== null
// //       ? Math.min(100, Math.max(0, ((prediction - MIN_THICKNESS) / (MAX_THICKNESS - MIN_THICKNESS)) * 100))
// //       : 0;

// //   const swatchColor = prediction !== null ? `hsl(${hueForThickness(prediction)}, 80%, 60%)` : "transparent";

// //   return (
// //     <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 sm:p-8 relative overflow-hidden" style={FONT_SANS}>
// //       <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
// //       <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

// //       <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`}</style>

// //       <div className="max-w-6xl mx-auto relative z-10">
// //         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
// //           <div>
// //             <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-400 mb-2 font-mono cursor-default" style={FONT_MONO}>
// //               <Layers className="w-4 h-4 text-cyan-400" />
// //               Emerging Electronic Materials & Device Lab
// //             </div>
// //             <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2 cursor-default">
// //               Thin Film Thickness Predictor
// //             </h1>
// //             <p className="text-slate-400 text-sm cursor-default">
// //               Enter your solution formulation and spin-coating parameters to model film thickness.
// //             </p>
// //           </div>

// //           <div
// //             className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs font-mono text-slate-300 shadow-inner hover:bg-slate-800/80 transition-colors cursor-default"
// //             style={FONT_MONO}
// //           >
// //             <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
// //             Computational Model Active
// //           </div>
// //         </div>

// //         <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
// //           <div className="lg:col-span-3 space-y-6">
// //             {FIELD_GROUPS.map((group) => (
// //               <div
// //                 key={group.title}
// //                 className={`rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-5 sm:p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${group.hoverShadow}`}
// //               >
// //                 <div className="flex items-center gap-2.5 mb-5">
// //                   <div className={`w-8 h-8 flex items-center justify-center rounded-lg border ${group.iconBg}`}>
// //                     <group.icon className="w-4 h-4" />
// //                   </div>
// //                   <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 cursor-default" style={FONT_MONO}>
// //                     {group.title}
// //                   </h2>
// //                 </div>

// //                 <div className="grid sm:grid-cols-2 gap-4">
// //                   {group.fields.map((field) => {
// //                     const val = formData[field.key];
// //                     const invalid = showErrors && (val === "" || isNaN(parseFloat(val)) || parseFloat(val) < 0);
// //                     return (
// //                       <div key={field.key} className="space-y-1.5 group/input">
// //                         <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 group-hover/input:text-slate-300 transition-colors">
// //                           <field.icon className="w-3.5 h-3.5 text-slate-500 group-hover/input:text-slate-400 transition-colors" />
// //                           {field.label}
// //                         </label>
// //                         <div className="relative">
// //                           <input
// //                             type="number"
// //                             step={field.step}
// //                             value={val}
// //                             onChange={(e) => handleChange(field.key, e.target.value)}
// //                             placeholder={field.placeholder}
// //                             className={
// //                               "w-full bg-slate-950/80 border rounded-xl pl-3.5 pr-14 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 transition-all duration-300 hover:bg-slate-900 font-mono " +
// //                               (invalid
// //                                 ? "border-red-500/80 focus:ring-red-500/20 bg-red-950/10 hover:border-red-400"
// //                                 : `border-slate-800 hover:border-slate-600 ${group.focusBorder}`)
// //                             }
// //                             style={FONT_MONO}
// //                           />
// //                           <span
// //                             className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono pointer-events-none group-hover/input:text-slate-400 transition-colors"
// //                             style={FONT_MONO}
// //                           >
// //                             {field.unit}
// //                           </span>
// //                         </div>
// //                       </div>
// //                     );
// //                   })}
// //                 </div>
// //               </div>
// //             ))}

// //             {showErrors && !isValid && (
// //               <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
// //                 <AlertCircle className="w-4 h-4 shrink-0" />
// //                 Please complete all parameters with valid positive numeric values.
// //               </div>
// //             )}

// //             <div className="flex flex-col sm:flex-row gap-3 pt-2">
// //               <button
// //                 type="button"
// //                 onClick={handlePredict}
// //                 disabled={isLoading}
// //                 className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-semibold py-3.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-cyan-500/40 active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
// //               >
// //                 {isLoading ? (
// //                   <>
// //                     <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
// //                     Calculating Film Dynamics...
// //                   </>
// //                 ) : (
// //                   <>
// //                     <Sparkles className="w-4 h-4 fill-slate-950" />
// //                     Predict Thickness
// //                   </>
// //                 )}
// //               </button>

// //               <button
// //                 type="button"
// //                 onClick={handleReset}
// //                 className="px-5 py-3.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 hover:border-slate-600 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-medium active:scale-[0.98]"
// //               >
// //                 <RefreshCw className="w-4 h-4" />
// //                 Reset
// //               </button>
// //             </div>
// //           </div>

// //           <div className="lg:col-span-2">
// //             <div className="lg:sticky lg:top-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md p-6 shadow-2xl transition-all duration-300 hover:shadow-cyan-500/5 hover:border-slate-700/80 space-y-6">
// //               <div className="flex items-center justify-between">
// //                 <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-default" style={FONT_MONO}>
// //                   Predicted Film Thickness
// //                 </h2>
// //                 {prediction !== null && (
// //                   <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default">
// //                     ESTIMATED
// //                   </span>
// //                 )}
// //               </div>

// //               {prediction === null && !isLoading && (
// //                 <div className="py-14 text-center text-slate-500 text-sm border-2 border-dashed border-slate-800/80 rounded-xl p-4 transition-colors hover:border-slate-700 hover:bg-slate-800/20 cursor-default">
// //                   Fill in process parameters on the left and hit <span className="text-slate-300">Predict</span> to model thickness.
// //                 </div>
// //               )}

// //               {isLoading && (
// //                 <div className="py-14 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
// //                   <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
// //                   Running fluid dynamics model...
// //                 </div>
// //               )}

// //               {prediction !== null && !isLoading && (
// //                 <>
// //                   <div className="text-center py-4 bg-slate-950/60 rounded-xl border border-slate-800/80 transition-all duration-300 hover:bg-slate-950/80 hover:border-slate-700">
// //                     <div className="flex items-baseline justify-center gap-2 cursor-default">
// //                       <span className="text-5xl sm:text-6xl font-bold tracking-tight text-white font-mono" style={FONT_MONO}>
// //                         {unit === "nm" ? prediction.toFixed(1) : (prediction / 1000).toFixed(3)}
// //                       </span>
// //                       <span className="text-xl text-cyan-400 font-mono" style={FONT_MONO}>
// //                         {unit}
// //                       </span>
// //                     </div>

// //                     <div className="flex justify-center gap-2 mt-4">
// //                       <button
// //                         type="button"
// //                         onClick={() => setUnit("nm")}
// //                         style={FONT_MONO}
// //                         className={
// //                           "text-xs px-3 py-1 rounded-lg font-mono transition-all duration-300 " +
// //                           (unit === "nm"
// //                             ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
// //                             : "text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10")
// //                         }
// //                       >
// //                         nm
// //                       </button>
// //                       <button
// //                         type="button"
// //                         onClick={() => setUnit("μm")}
// //                         style={FONT_MONO}
// //                         className={
// //                           "text-xs px-3 py-1 rounded-lg font-mono transition-all duration-300 " +
// //                           (unit === "μm"
// //                             ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
// //                             : "text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10")
// //                         }
// //                       >
// //                         μm
// //                       </button>
// //                     </div>
// //                   </div>

// //                   <div className="space-y-2 group/spectrum cursor-default">
// //                     <div className="flex justify-between text-xs text-slate-400 font-mono transition-colors group-hover/spectrum:text-slate-300" style={FONT_MONO}>
// //                       <span>Interference Spectrum</span>
// //                       <span className="text-slate-300">{prediction} nm</span>
// //                     </div>

// //                     <div
// //                       className="relative h-9 rounded-xl overflow-hidden border border-slate-700/80 shadow-inner transition-all duration-300 group-hover/spectrum:shadow-lg"
// //                       style={{ background: SPECTRUM_GRADIENT_CSS }}
// //                     >
// //                       <div
// //                         className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
// //                         style={{ left: `${gaugePercent}%` }}
// //                       />
// //                       <div
// //                         className="absolute w-4 h-4 rounded-full border-2 border-white shadow-xl transition-all duration-500 group-hover/spectrum:scale-125"
// //                         style={{
// //                           left: `calc(${gaugePercent}% - 8px)`,
// //                           top: "50%",
// //                           transform: "translateY(-50%)",
// //                           backgroundColor: swatchColor,
// //                         }}
// //                       />
// //                     </div>

// //                     <div className="flex justify-between text-[11px] text-slate-500 font-mono transition-colors group-hover/spectrum:text-slate-400" style={FONT_MONO}>
// //                       <span>{MIN_THICKNESS} nm</span>
// //                       <span>{MAX_THICKNESS} nm</span>
// //                     </div>
// //                   </div>
// //                 </>
// //               )}

// //               <div className="flex items-start gap-2.5 pt-4 border-t border-slate-800 text-xs text-slate-400 leading-relaxed cursor-default transition-colors hover:text-slate-300">
// //                 <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
// //                 <span>
// //                   Output represents simulated approximations based on trained parameters. True physical results are subject to real-world variance.
// //                 </span>
// //               </div>
// //             </div>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }
