"""
Physics-grounded synthetic dataset generator for spin coating film thickness.

Governing relationship (Meyerhofer-type, matching the exponents you derived):
    h_wet_layer   ~ C * sqrt(viscosity / omega)                     [fluid dynamics + mass conservation]
    h_final       = h_wet_layer * shrink(T, anneal_time)             [thermal densification]

Design choices vs. the original dataset:
  - Concentration and viscosity are CORRELATED (as in a real solution) instead of independent.
  - Annealing temperature drives an exp(-k*T) densification term, so it actually
    shows up in feature importance instead of being pure noise.
  - Annealing time has a saturating effect on how much shrinkage completes.
  - Spin time (beyond ~15s critical time) and surface tension are kept near-zero
    effect on CENTER thickness -- this matches real physics (they mostly govern
    edge uniformity / early transient), so we deliberately do NOT force them to
    matter. That's a feature, not a bug -- just be ready to explain it that way.
  - Multiplicative noise ~5% (slightly more conservative than the 3.6% implied by
    the original file, which is close to noise-free for real lab data).
"""

import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
N = 3000

# --- Process parameters (independent controls an operator actually sets) ---
spin_speed_rpm   = rng.uniform(500, 5000, N)
spin_time_s      = rng.uniform(20, 120, N)
concentration    = rng.uniform(1, 15, N)          # wt%
annealing_temp_C = rng.uniform(150, 600, N)
annealing_time_m = rng.uniform(10, 120, N)
surface_tension  = rng.uniform(20, 60, N)          # mN/m -- weak/no center-thickness effect
volume_uL        = rng.uniform(10, 100, N)         # weak/no effect above min coverage volume

# --- Viscosity is COUPLED to concentration (real solution rheology), + own noise ---
viscosity_cP = 2.0 + 2.3 * concentration + rng.normal(0, 3.0, N)
viscosity_cP = np.clip(viscosity_cP, 1.0, 60.0)

# --- Fluid-dynamics term (Meyerhofer): wet-layer thickness proxy ---
omega = spin_speed_rpm  # already proportional to angular velocity for our purposes
wet_layer = concentration * np.sqrt(viscosity_cP / omega)

# --- Thermal densification term: h_final = h_wet * shrink_factor ---
# k tuned so thickness drops roughly 3-4x from 150C to 600C, matching the
# exp(-kT) relationship in the physics doc.
k = 0.0035
T_ref = 350.0
shrink_temp = np.exp(-k * (annealing_temp_C - T_ref))

# Longer anneal time lets more of that shrinkage actually complete (saturating).
shrink_time_fraction = 1 - 0.5 * np.exp(-annealing_time_m / 30.0)
shrink_factor = 1 - (1 - shrink_temp) * shrink_time_fraction

# --- Combine + calibrate scale + add realistic multiplicative noise (~5%) ---
scale = 55.0
thickness = scale * wet_layer * shrink_factor
thickness *= rng.normal(1.0, 0.05, N)
thickness = np.clip(thickness, 3, None)

df = pd.DataFrame({
    "Spin_Speed_rpm": spin_speed_rpm.round(1),
    "Spin_Time_s": spin_time_s.round(1),
    "Viscosity_cP": viscosity_cP.round(2),
    "Surface_Tension_mN_m": surface_tension.round(2),
    "Concentration_wt_pct": concentration.round(2),
    "Volume_Deposited_uL": volume_uL.round(1),
    "Annealing_Temp_C": annealing_temp_C.round(1),
    "Annealing_Time_min": annealing_time_m.round(1),
    "Film_Thickness_nm": thickness.round(2),
})

df.to_csv("/mnt/user-data/outputs/spin_coating_dataset_v2.csv", index=False)
print(df.describe())
print("\nSaved to spin_coating_dataset_v2.csv")
