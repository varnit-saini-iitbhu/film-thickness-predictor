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
//   Scale,
//   PieChart,
//   Tag,
//   Hash,
//   CheckCircle // Imported CheckCircle for the success pop-up
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

// const PROCESS_FIELDS = [
//   { key: "spinSpeed", label: "Spin Speed", unit: "RPM", placeholder: "3000", icon: Gauge, step: "10" },
//   { key: "spinTime", label: "Spin Time", unit: "s", placeholder: "60", icon: Timer, step: "1" },
//   { key: "volumeDeposited", label: "Volume Deposited", unit: "mL", placeholder: "0.05", icon: Beaker, step: "0.001" },
//   { key: "annealingTemp", label: "Annealing Temp.", unit: "°C", placeholder: "150", icon: Thermometer, step: "1" },
//   { key: "annealingTime", label: "Annealing Time", unit: "min", placeholder: "30", icon: Clock, step: "1" },
// ];

// const INITIAL_PROCESS_DATA = PROCESS_FIELDS.reduce((acc, f) => {
//   acc[f.key] = "";
//   return acc;
// }, {});

// const EMPTY_MATERIAL = {
//   name: "",
//   fraction: "",
//   molarity: "",
//   molecularWeight: "",
//   density: "",
//   viscosity: "",
//   surfaceTension: ""
// };

// export default function ThinFilmPredictor() {
//   const [numCompounds, setNumCompounds] = useState("1");
//   const [materials, setMaterials] = useState([{ ...EMPTY_MATERIAL, fraction: "100" }]);
//   const [processData, setProcessData] = useState(INITIAL_PROCESS_DATA);
//   const [prediction, setPrediction] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showErrors, setShowErrors] = useState(false);
//   const [unit, setUnit] = useState("nm");
//   const [showSuccess, setShowSuccess] = useState(false);

//   // Live calculation of the total fraction for the UI
//   const currentTotalFraction = materials.reduce((sum, m) => sum + (parseFloat(m.fraction) || 0), 0);
//   const isFractionExactly100 = Math.abs(currentTotalFraction - 100) < 0.1;

//   const handleNumCompoundsChange = (val) => {
//     setNumCompounds(val);
//     setShowSuccess(false); // Hide success message on change
//     const num = parseInt(val, 10);
    
//     if (isNaN(num) || num < 1) {
//       setMaterials([]);
//       return;
//     }
    
//     const newMaterials = [...materials];
    
//     if (num > materials.length) {
//       for (let i = materials.length; i < num; i++) {
//         newMaterials.push({ ...EMPTY_MATERIAL });
//       }
//     } else if (num < materials.length) {
//       newMaterials.length = num;
//     }
    
//     if (num === 1 && newMaterials.length > 0) {
//       newMaterials[0].fraction = "100";
//     }
    
//     setMaterials(newMaterials);
//   };

//   const handleMaterialChange = (index, key, value) => {
//     const newMaterials = [...materials];
//     newMaterials[index][key] = value;
//     setMaterials(newMaterials);
//     setShowSuccess(false); // Hide success message on change
//   };

//   const handleProcessChange = (key, value) => {
//     setProcessData((prev) => ({ ...prev, [key]: value }));
//     setShowSuccess(false); // Hide success message on change
//   };

//   const validateForm = () => {
//     if (materials.length === 0) return false;

//     const isProcessValid = PROCESS_FIELDS.every((f) => {
//       const v = parseFloat(processData[f.key]);
//       return processData[f.key] !== "" && !isNaN(v) && v >= 0;
//     });

//     const areMaterialsValid = materials.every((m) => {
//       const fraction = parseFloat(m.fraction);
//       const mol = parseFloat(m.molarity);
//       const mw = parseFloat(m.molecularWeight);
//       const den = parseFloat(m.density);
//       const visc = parseFloat(m.viscosity);
//       const st = parseFloat(m.surfaceTension);

//       return (
//         m.name.trim() !== "" && 
//         m.fraction !== "" && !isNaN(fraction) && fraction >= 0 &&
//         m.molarity !== "" && !isNaN(mol) && mol >= 0 &&
//         m.molecularWeight !== "" && !isNaN(mw) && mw >= 0 &&
//         m.density !== "" && !isNaN(den) && den > 0 &&
//         m.viscosity !== "" && !isNaN(visc) && visc > 0 &&
//         m.surfaceTension !== "" && !isNaN(st) && st >= 0
//       );
//     });

//     return isProcessValid && areMaterialsValid && isFractionExactly100;
//   };

//   const handlePredict = async () => {
//     const valid = validateForm();
//     if (!valid) {
//       setShowErrors(true);
//       return;
//     }
    
//     setShowErrors(false);
//     setIsLoading(true);
//     setPrediction(null);
//     setShowSuccess(false);

//     try {
//       let mixDensity = 0;
//       let mixViscosityLog = 0;
//       let mixSurfaceTension = 0;
//       let mixMW = 0;
//       let mixMolarity = 0;

//       materials.forEach((m) => {
//         const phi = parseFloat(m.fraction) / 100.0;
//         mixDensity += phi * parseFloat(m.density);
//         mixViscosityLog += phi * Math.log(parseFloat(m.viscosity));
//         mixSurfaceTension += phi * parseFloat(m.surfaceTension);
//         mixMW += phi * parseFloat(m.molecularWeight);
//         mixMolarity += phi * parseFloat(m.molarity);
//       });

//       const mixViscosity = Math.exp(mixViscosityLog); 
//       const calculated_wt_pct = (mixMolarity * mixMW) / (10 * mixDensity);

//       const numericData = {
//         spin_speed_rpm: parseFloat(processData.spinSpeed),
//         spin_time_s: parseFloat(processData.spinTime),
//         viscosity_cp: mixViscosity, 
//         surface_tension_mn_m: mixSurfaceTension, 
//         concentration_wt_pct: calculated_wt_pct, 
//         volume_deposited_ul: parseFloat(processData.volumeDeposited) * 1000, 
//         annealing_temp_c: parseFloat(processData.annealingTemp),
//         annealing_time_min: parseFloat(processData.annealingTime),
//       };

//       const response = await fetch("https://film-thickness-predictor.onrender.com/predict", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(numericData),
//       });

//       if (!response.ok) {
//         throw new Error(`Server returned ${response.status}`);
//       }

//       const data = await response.json();
//       setPrediction(data.thickness_nm);
//       setShowSuccess(true); // Trigger success popup!
      
//     } catch (error) {
//       console.error("Error fetching prediction:", error);
//       alert(`Error communicating with ML backend: ${error.message}.`);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleReset = () => {
//     setNumCompounds("1");
//     setMaterials([{ ...EMPTY_MATERIAL, fraction: "100" }]);
//     setProcessData(INITIAL_PROCESS_DATA);
//     setPrediction(null);
//     setShowErrors(false);
//     setShowSuccess(false);
//     setIsLoading(false);
//   };

//   const gaugePercent = prediction !== null ? Math.min(100, Math.max(0, ((prediction - MIN_THICKNESS) / (MAX_THICKNESS - MIN_THICKNESS)) * 100)) : 0;
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
//               Configure multicomponent formulations and spin-coating parameters to model film thickness.
//             </p>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
//           <div className="lg:col-span-3 space-y-6">
            
//             {/* Step 1: GIANT Compound Number Input */}
//             <div className="rounded-2xl bg-slate-900/80 border-2 border-sky-500/50 backdrop-blur-md p-6 sm:p-8 shadow-[0_0_20px_rgba(14,165,233,0.15)] flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-300">
//               <div className="flex items-start gap-4">
//                 <div className="w-12 h-12 flex shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
//                   <Hash className="w-6 h-6" />
//                 </div>
//                 <div>
//                   <h2 className="text-lg font-bold uppercase tracking-wider text-white" style={FONT_MONO}>
//                     Total Compounds
//                   </h2>
//                   <p className="text-sm text-sky-300/80 mt-1">
//                     How many different materials are you mixing?
//                   </p>
//                 </div>
//               </div>
//               <input
//                 type="number"
//                 min="1"
//                 step="1"
//                 value={numCompounds}
//                 onChange={(e) => handleNumCompoundsChange(e.target.value)}
//                 className="w-32 bg-slate-950/90 border-2 border-sky-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-500/30 rounded-xl px-4 py-3 text-center text-4xl font-black text-sky-400 focus:outline-none transition-all shadow-inner"
//                 style={FONT_MONO}
//               />
//             </div>

//             {/* Step 2: Dynamic Materials Section */}
//             <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-5 sm:p-6 shadow-xl transition-all duration-300">
//               <div className="space-y-6">
//                 {materials.map((mat, index) => (
//                   <div key={index} className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/20 relative">
//                     <h3 className="text-sm font-bold text-sky-300 mb-4 flex items-center gap-2" style={FONT_MONO}>
//                       COMPOUND {index + 1}
//                     </h3>
//                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
//                       {/* Name Input */}
//                       <div className="space-y-1.5 sm:col-span-3">
//                          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
//                             <Tag className="w-3.5 h-3.5 text-sky-500" /> Compound Name
//                          </label>
//                          <input
//                             type="text" 
//                             value={mat.name}
//                             onChange={(e) => handleMaterialChange(index, "name", e.target.value)}
//                             placeholder={`e.g. Polymer A, Solvent B`}
//                             className={`w-full bg-slate-950/80 border rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:border-sky-500 border-slate-700`}
//                          />
//                       </div>

//                       {/* Numeric Inputs */}
//                       {[
//                         { key: "fraction", label: "Volume Fraction", unit: "%", icon: PieChart, step: "0.1" },
//                         { key: "molarity", label: "Molarity", unit: "M", icon: FlaskConical, step: "0.01" },
//                         { key: "molecularWeight", label: "Mol. Weight", unit: "g/mol", icon: Scale, step: "0.1" },
//                         { key: "density", label: "Density", unit: "g/mL", icon: Droplet, step: "0.01" },
//                         { key: "viscosity", label: "Viscosity", unit: "cP", icon: Droplet, step: "0.1" },
//                         { key: "surfaceTension", label: "Surface Tension", unit: "mN/m", icon: Waves, step: "0.1" },
//                       ].map((field) => (
//                         <div key={field.key} className="space-y-1.5 group/input">
//                           <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
//                             <field.icon className="w-3.5 h-3.5 text-slate-500" /> {field.label}
//                           </label>
//                           <div className="relative">
//                             <input
//                               type="number" step={field.step} value={mat[field.key]}
//                               onChange={(e) => handleMaterialChange(index, field.key, e.target.value)}
//                               className={`w-full bg-slate-950/80 border rounded-lg pl-3 pr-10 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:border-sky-500 border-slate-700`}
//                               style={FONT_MONO}
//                             />
//                             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono pointer-events-none">
//                               {field.unit}
//                             </span>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 ))}
                
//                 {materials.length === 0 && (
//                    <div className="text-center py-6 text-slate-500 text-sm italic">
//                       Please enter a valid number of compounds to mix above.
//                    </div>
//                 )}
//               </div>
//             </div>

//             {/* Spin & Annealing Parameters */}
//             <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-5 sm:p-6 shadow-xl transition-all duration-300">
//                <div className="flex items-center gap-2.5 mb-5">
//                   <div className="w-8 h-8 flex items-center justify-center rounded-lg border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
//                     <RotateCw className="w-4 h-4" />
//                   </div>
//                   <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 cursor-default" style={FONT_MONO}>
//                     Process Parameters
//                   </h2>
//                 </div>
//                 <div className="grid sm:grid-cols-3 gap-4">
//                   {PROCESS_FIELDS.map((field) => (
//                      <div key={field.key} className="space-y-1.5 group/input">
//                         <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 group-hover/input:text-slate-300 transition-colors">
//                           <field.icon className="w-3.5 h-3.5 text-slate-500" />
//                           {field.label}
//                         </label>
//                         <div className="relative">
//                           <input
//                             type="number" step={field.step} value={processData[field.key]}
//                             onChange={(e) => handleProcessChange(field.key, e.target.value)}
//                             placeholder={field.placeholder}
//                             className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-600 focus:border-indigo-500 focus:ring-1 rounded-xl pl-3 pr-10 py-2.5 text-sm text-slate-100 focus:outline-none transition-all font-mono"
//                             style={FONT_MONO}
//                           />
//                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono pointer-events-none">
//                             {field.unit}
//                           </span>
//                         </div>
//                       </div>
//                   ))}
//                 </div>
//             </div>

//             {/* Step 4: Validate and Predict Area */}
//             <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
              
//               {/* LIVE TOTAL FRACTION COUNTER */}
//               <div className={`flex items-center justify-between p-4 rounded-xl border mb-5 transition-colors duration-300 ${isFractionExactly100 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
//                 <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
//                   <PieChart className={`w-5 h-5 ${isFractionExactly100 ? 'text-emerald-400' : 'text-amber-400'}`} />
//                   Total Volume Fraction:
//                 </div>
//                 <div className={`text-2xl font-bold font-mono ${isFractionExactly100 ? 'text-emerald-400' : 'text-amber-400'}`}>
//                   {currentTotalFraction.toFixed(1)}% <span className="text-slate-500 text-lg">/ 100%</span>
//                 </div>
//               </div>

//               {/* Error States */}
//               {showErrors && !isFractionExactly100 && (
//                 <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 mb-5">
//                   <AlertCircle className="w-4 h-4 shrink-0" />
//                   Cannot predict! Your volume fractions currently add up to {currentTotalFraction}%. They must equal exactly 100%.
//                 </div>
//               )}
//               {showErrors && isFractionExactly100 && (
//                 <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 mb-5">
//                   <AlertCircle className="w-4 h-4 shrink-0" />
//                   Please ensure all names are entered, parameters are valid numbers, and densities/viscosities are {'>'} 0.
//                 </div>
//               )}

//               {/* Action Buttons */}
//               <div className="flex flex-col sm:flex-row gap-3 relative">
//                 <button
//                   type="button" 
//                   onClick={handlePredict} 
//                   disabled={isLoading || materials.length === 0 || !isFractionExactly100}
//                   className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-semibold py-4 rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
//                 >
//                   {isLoading ? <><Loader2 className="w-5 h-5 animate-spin text-slate-950" /> Calculating Dynamics...</> : <><Sparkles className="w-5 h-5 fill-slate-950" /> Predict Thickness</>}
//                 </button>
//                 <button
//                   type="button" onClick={handleReset}
//                   className="px-6 py-4 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all flex items-center justify-center gap-2 font-medium"
//                 >
//                   <RefreshCw className="w-4 h-4" /> Reset
//                 </button>
//               </div>

//               {/* SUCCESS POPUP */}
//               {showSuccess && (
//                 <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2.5 rounded-lg text-sm font-semibold animate-in zoom-in duration-300">
//                   <CheckCircle className="w-4 h-4" />
//                   Prediction successful! Please check the results panel.
//                 </div>
//               )}
//             </div>

//           </div>

//           <div className="lg:col-span-2">
//              <div className="lg:sticky lg:top-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md p-6 shadow-2xl space-y-6">
//               <div className="flex items-center justify-between">
//                 <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-default" style={FONT_MONO}>Predicted Thickness</h2>
//                 {prediction !== null && <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default">ESTIMATED</span>}
//               </div>

//               {prediction === null && !isLoading && (
//                 <div className="py-14 text-center text-slate-500 text-sm border-2 border-dashed border-slate-800/80 rounded-xl p-4 cursor-default">
//                   Configure formulation and parameters on the left to model thickness.
//                 </div>
//               )}

//               {isLoading && (
//                 <div className="py-14 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
//                   <Loader2 className="w-8 h-8 animate-spin text-cyan-400" /> Running bulk property analysis...
//                 </div>
//               )}

//               {prediction !== null && !isLoading && (
//                 <>
//                   <div className={`text-center py-4 bg-slate-950/60 rounded-xl border transition-colors duration-500 ${showSuccess ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'border-slate-800/80'}`}>
//                     <div className="flex items-baseline justify-center gap-2 cursor-default">
//                       <span className="text-5xl sm:text-6xl font-bold tracking-tight text-white font-mono" style={FONT_MONO}>
//                         {unit === "nm" ? prediction.toFixed(1) : (prediction / 1000).toFixed(3)}
//                       </span>
//                       <span className="text-xl text-cyan-400 font-mono" style={FONT_MONO}>{unit}</span>
//                     </div>
//                     <div className="flex justify-center gap-2 mt-4">
//                       <button type="button" onClick={() => setUnit("nm")} style={FONT_MONO} className={`text-xs px-3 py-1 rounded-lg font-mono transition-all ${unit === "nm" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "text-slate-500 hover:text-cyan-400"}`}>nm</button>
//                       <button type="button" onClick={() => setUnit("μm")} style={FONT_MONO} className={`text-xs px-3 py-1 rounded-lg font-mono transition-all ${unit === "μm" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "text-slate-500 hover:text-cyan-400"}`}>μm</button>
//                     </div>
//                   </div>
//                   <div className="space-y-2 group/spectrum cursor-default">
//                     <div className="flex justify-between text-xs text-slate-400 font-mono" style={FONT_MONO}>
//                       <span>Interference Spectrum</span>
//                       <span className="text-slate-300">{prediction.toFixed(1)} nm</span>
//                     </div>
//                     <div className="relative h-9 rounded-xl overflow-hidden border border-slate-700/80 shadow-inner" style={{ background: SPECTRUM_GRADIENT_CSS }}>
//                       <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{ left: `${gaugePercent}%` }} />
//                       <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow-xl" style={{ left: `calc(${gaugePercent}% - 8px)`, top: "50%", transform: "translateY(-50%)", backgroundColor: swatchColor }} />
//                     </div>
//                   </div>
//                 </>
//               )}
//                <div className="flex items-start gap-2.5 pt-4 border-t border-slate-800 text-xs text-slate-400 leading-relaxed cursor-default">
//                 <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
//                 <span>Model assumes ideal volumetric mixing. Non-ideal chemical interactions between solutes/solvents are not reflected.</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
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
  Tag,
  Hash,
  CheckCircle // Imported CheckCircle for the success pop-up
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
  { key: "numberOfLayers", label: "Number of Layers", unit: "", placeholder: "1", icon: Layers, step: "1" }, // NEW
];

const INITIAL_PROCESS_DATA = PROCESS_FIELDS.reduce((acc, f) => {
  acc[f.key] = "";
  return acc;
}, {});

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
  const [showSuccess, setShowSuccess] = useState(false);

  // Live calculation of the total fraction for the UI
  const currentTotalFraction = materials.reduce((sum, m) => sum + (parseFloat(m.fraction) || 0), 0);
  const isFractionExactly100 = Math.abs(currentTotalFraction - 100) < 0.1;

  const handleNumCompoundsChange = (val) => {
    setNumCompounds(val);
    setShowSuccess(false); // Hide success message on change
    const num = parseInt(val, 10);
    
    if (isNaN(num) || num < 1) {
      setMaterials([]);
      return;
    }
    
    const newMaterials = [...materials];
    
    if (num > materials.length) {
      for (let i = materials.length; i < num; i++) {
        newMaterials.push({ ...EMPTY_MATERIAL });
      }
    } else if (num < materials.length) {
      newMaterials.length = num;
    }
    
    if (num === 1 && newMaterials.length > 0) {
      newMaterials[0].fraction = "100";
    }
    
    setMaterials(newMaterials);
  };

  const handleMaterialChange = (index, key, value) => {
    const newMaterials = [...materials];
    newMaterials[index][key] = value;
    setMaterials(newMaterials);
    setShowSuccess(false); // Hide success message on change
  };

  const handleProcessChange = (key, value) => {
    setProcessData((prev) => ({ ...prev, [key]: value }));
    setShowSuccess(false); // Hide success message on change
  };

  const validateForm = () => {
    if (materials.length === 0) return false;

    const isProcessValid = PROCESS_FIELDS.every((f) => {
      const v = parseFloat(processData[f.key]);
      return processData[f.key] !== "" && !isNaN(v) && v >= 0;
    });

    const areMaterialsValid = materials.every((m) => {
      const fraction = parseFloat(m.fraction);
      const mol = parseFloat(m.molarity);
      const mw = parseFloat(m.molecularWeight);
      const den = parseFloat(m.density);
      const visc = parseFloat(m.viscosity);
      const st = parseFloat(m.surfaceTension);

      return (
        m.name.trim() !== "" && 
        m.fraction !== "" && !isNaN(fraction) && fraction >= 0 &&
        m.molarity !== "" && !isNaN(mol) && mol >= 0 &&
        m.molecularWeight !== "" && !isNaN(mw) && mw >= 0 &&
        m.density !== "" && !isNaN(den) && den > 0 &&
        m.viscosity !== "" && !isNaN(visc) && visc > 0 &&
        m.surfaceTension !== "" && !isNaN(st) && st >= 0
      );
    });

    return isProcessValid && areMaterialsValid && isFractionExactly100;
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
    setShowSuccess(false);

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
        number_of_layers: parseInt(processData.numberOfLayers, 10), // NEW
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
      setShowSuccess(true); // Trigger success popup!
      
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
    setShowSuccess(false);
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
            
            {/* Step 1: GIANT Compound Number Input */}
            <div className="rounded-2xl bg-slate-900/80 border-2 border-sky-500/50 backdrop-blur-md p-6 sm:p-8 shadow-[0_0_20px_rgba(14,165,233,0.15)] flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Hash className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-wider text-white" style={FONT_MONO}>
                    Total Compounds
                  </h2>
                  <p className="text-sm text-sky-300/80 mt-1">
                    How many different materials are you mixing?
                  </p>
                </div>
              </div>
              <input
                type="number"
                min="1"
                step="1"
                value={numCompounds}
                onChange={(e) => handleNumCompoundsChange(e.target.value)}
                className="w-32 bg-slate-950/90 border-2 border-sky-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-500/30 rounded-xl px-4 py-3 text-center text-4xl font-black text-sky-400 focus:outline-none transition-all shadow-inner"
                style={FONT_MONO}
              />
            </div>

            {/* Step 2: Dynamic Materials Section */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-5 sm:p-6 shadow-xl transition-all duration-300">
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
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-5 sm:p-6 shadow-xl transition-all duration-300">
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

            {/* Step 4: Validate and Predict Area */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
              
              {/* LIVE TOTAL FRACTION COUNTER */}
              <div className={`flex items-center justify-between p-4 rounded-xl border mb-5 transition-colors duration-300 ${isFractionExactly100 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <PieChart className={`w-5 h-5 ${isFractionExactly100 ? 'text-emerald-400' : 'text-amber-400'}`} />
                  Total Volume Fraction:
                </div>
                <div className={`text-2xl font-bold font-mono ${isFractionExactly100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {currentTotalFraction.toFixed(1)}% <span className="text-slate-500 text-lg">/ 100%</span>
                </div>
              </div>

              {/* Error States */}
              {showErrors && !isFractionExactly100 && (
                <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 mb-5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Cannot predict! Your volume fractions currently add up to {currentTotalFraction}%. They must equal exactly 100%.
                </div>
              )}
              {showErrors && isFractionExactly100 && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 mb-5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Please ensure all names are entered, parameters are valid numbers, and densities/viscosities are {'>'} 0.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 relative">
                <button
                  type="button" 
                  onClick={handlePredict} 
                  disabled={isLoading || materials.length === 0 || !isFractionExactly100}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-semibold py-4 rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  {isLoading ? <><Loader2 className="w-5 h-5 animate-spin text-slate-950" /> Calculating Dynamics...</> : <><Sparkles className="w-5 h-5 fill-slate-950" /> Predict Thickness</>}
                </button>
                <button
                  type="button" onClick={handleReset}
                  className="px-6 py-4 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <RefreshCw className="w-4 h-4" /> Reset
                </button>
              </div>

              {/* SUCCESS POPUP */}
              {showSuccess && (
                <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2.5 rounded-lg text-sm font-semibold animate-in zoom-in duration-300">
                  <CheckCircle className="w-4 h-4" />
                  Prediction successful! Please check the results panel.
                </div>
              )}
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
                  <div className={`text-center py-4 bg-slate-950/60 rounded-xl border transition-colors duration-500 ${showSuccess ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'border-slate-800/80'}`}>
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
