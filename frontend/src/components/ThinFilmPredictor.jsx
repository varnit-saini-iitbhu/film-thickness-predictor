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
  return `hsl(${hueForThickness(thickness)}, 70%, 55%) ${(t * 100).toFixed(1)}%`;
}).join(", ")})`;

const FIELD_GROUPS = [
  {
    title: "Solution Properties",
    icon: FlaskConical,
    fields: [
      { key: "concentration", label: "Concentration", unit: "wt%", placeholder: "5", icon: FlaskConical, step: "0.1" },
      { key: "viscosity", label: "Viscosity", unit: "cP", placeholder: "10", icon: Droplet, step: "0.1" },
      { key: "surfaceTension", label: "Surface Tension", unit: "mN/m", placeholder: "30", icon: Waves, step: "0.1" },
    ],
  },
  {
    title: "Spin Coating Parameters",
    icon: RotateCw,
    fields: [
      { key: "spinSpeed", label: "Spin Speed", unit: "RPM", placeholder: "3000", icon: Gauge, step: "10" },
      { key: "spinTime", label: "Spin Time", unit: "s", placeholder: "60", icon: Timer, step: "1" },
      { key: "volumeDeposited", label: "Volume Deposited", unit: "mL", placeholder: "0.5", icon: Beaker, step: "0.01" },
    ],
  },
  {
    title: "Annealing Conditions",
    icon: Thermometer,
    fields: [
      { key: "annealingTemp", label: "Annealing Temperature", unit: "°C", placeholder: "150", icon: Thermometer, step: "1" },
      { key: "annealingTime", label: "Annealing Time", unit: "min", placeholder: "30", icon: Clock, step: "1" },
    ],
  },
];

const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);
const INITIAL_FORM_DATA = ALL_FIELDS.reduce((acc, f) => {
  acc[f.key] = "";
  return acc;
}, {});

// ─── Placeholder prediction ──────────────────────────────────────────
// Replace the body of this function with a real backend / ML model call
// once it exists, e.g.:
//   const res = await fetch("/api/predict", { method: "POST", body: JSON.stringify(params) });
//   return (await res.json()).thickness_nm;
function runPrediction(params) {
  return Math.round((MIN_THICKNESS + Math.random() * (MAX_THICKNESS - MIN_THICKNESS)) * 10) / 10;
}

export default function ThinFilmPredictor() {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [unit, setUnit] = useState("nm");

  const isValid = ALL_FIELDS.every((f) => {
    const v = parseFloat(formData[f.key]);
    return formData[f.key] !== "" && !isNaN(v) && v >= 0;
  });

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handlePredict = () => {
    if (!isValid) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setIsLoading(true);
    setPrediction(null);
    setTimeout(() => {
      setPrediction(runPrediction(formData));
      setIsLoading(false);
    }, 900);
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_DATA);
    setPrediction(null);
    setShowErrors(false);
    setIsLoading(false);
  };

  const gaugePercent =
    prediction !== null
      ? Math.min(100, Math.max(0, ((prediction - MIN_THICKNESS) / (MAX_THICKNESS - MIN_THICKNESS)) * 100))
      : 0;
  const swatchColor = prediction !== null ? `hsl(${hueForThickness(prediction)}, 70%, 55%)` : "transparent";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8" style={FONT_SANS}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`}</style>

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-teal-700 mb-2" style={FONT_MONO}>
          <Layers className="w-3.5 h-3.5" />
          Spin Coating · Materials Lab
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 mb-1">Thin Film Thickness Predictor</h1>
        <p className="text-slate-500 text-sm mb-6">Enter your process parameters to estimate the resulting film thickness.</p>

        <div
          className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full bg-white border border-slate-300 text-xs uppercase tracking-wide text-slate-500"
          style={FONT_MONO}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 motion-safe:animate-pulse" />
          Simulated output — model not connected
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-5">
            {FIELD_GROUPS.map((group) => (
              <div key={group.title} className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 flex items-center justify-center rounded-md bg-teal-50">
                    <group.icon className="w-3.5 h-3.5 text-teal-700" />
                  </div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400" style={FONT_MONO}>
                    {group.title}
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {group.fields.map((field) => {
                    const val = formData[field.key];
                    const invalid = showErrors && (val === "" || isNaN(parseFloat(val)) || parseFloat(val) < 0);
                    return (
                      <div key={field.key}>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                          <field.icon className="w-3.5 h-3.5 text-slate-400" />
                          {field.label}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step={field.step}
                            value={val}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className={
                              "w-full bg-slate-50 border rounded-lg pl-3 pr-14 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-colors " +
                              (invalid
                                ? "border-red-400 focus:ring-red-200"
                                : "border-slate-200 focus:ring-teal-200 focus:border-teal-400")
                            }
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" style={FONT_MONO}>
                            {field.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {showErrors && !isValid && (
              <div className="flex items-center gap-2 text-red-600 text-sm px-1">
                <AlertCircle className="w-4 h-4" />
                Fill in every field with a valid, non-negative number.
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handlePredict}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 motion-safe:animate-spin" />
                    Simulating prediction...
                  </>
                ) : (
                  "Predict Thickness"
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-3 rounded-lg border border-slate-300 text-slate-600 hover:bg-white transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-6 rounded-xl bg-white border border-slate-200 shadow-sm p-6 space-y-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400" style={FONT_MONO}>
                Predicted Thickness
              </h2>

              {prediction === null && !isLoading && (
                <div className="py-10 text-center text-slate-400 text-sm">
                  Fill in the parameters on the left, then predict to see the estimated thickness here.
                </div>
              )}

              {isLoading && (
                <div className="py-10 flex flex-col items-center gap-3 text-slate-400 text-sm">
                  <Loader2 className="w-6 h-6 motion-safe:animate-spin text-teal-600" />
                  Simulating prediction...
                </div>
              )}

              {prediction !== null && !isLoading && (
                <>
                  <div className="text-center">
                    <div className="flex items-end justify-center gap-2">
                      <span className="text-5xl sm:text-6xl font-semibold tracking-tight text-slate-900" style={FONT_MONO}>
                        {unit === "nm" ? prediction.toFixed(1) : (prediction / 1000).toFixed(3)}
                      </span>
                      <span className="text-xl text-slate-400 mb-1.5" style={FONT_MONO}>
                        {unit}
                      </span>
                    </div>
                    <div className="flex justify-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => setUnit("nm")}
                        style={FONT_MONO}
                        className={
                          "text-xs px-2.5 py-1 rounded-full transition-colors " +
                          (unit === "nm" ? "bg-teal-50 text-teal-700" : "text-slate-400 hover:text-slate-600")
                        }
                      >
                        nm
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnit("um")}
                        style={FONT_MONO}
                        className={
                          "text-xs px-2.5 py-1 rounded-full transition-colors " +
                          (unit === "um" ? "bg-teal-50 text-teal-700" : "text-slate-400 hover:text-slate-600")
                        }
                      >
                        µm
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-widest text-slate-400 mb-2" style={FONT_MONO}>
                      Interference tone across range
                    </div>
                    <div className="relative h-10 rounded-lg overflow-hidden border border-slate-200" style={{ background: SPECTRUM_GRADIENT_CSS }}>
                      <div className="absolute top-0 bottom-0 w-px bg-slate-900/60" style={{ left: `${gaugePercent}%` }} />
                      <div
                        className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md"
                        style={{
                          left: `calc(${gaugePercent}% - 8px)`,
                          top: "50%",
                          transform: "translateY(-50%)",
                          backgroundColor: swatchColor,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1.5" style={FONT_MONO}>
                      <span>{MIN_THICKNESS} nm</span>
                      <span>{MAX_THICKNESS} nm</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Stylized interference tone — illustrative only, not a physical simulation for your material system.
                    </p>
                  </div>
                </>
              )}

              <div className="flex items-start gap-2 pt-4 border-t border-slate-200 text-xs text-slate-400 leading-relaxed">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  This number is randomly generated as a placeholder. Swap{" "}
                  <code className="text-slate-500" style={FONT_MONO}>
                    runPrediction()
                  </code>{" "}
                  for a real API or model call once your backend is ready.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
