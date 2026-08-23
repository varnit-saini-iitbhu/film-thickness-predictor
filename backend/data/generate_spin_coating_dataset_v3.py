"""
v3: adds Number_of_Layers (deposition cycles) -- the parameter published ZnO
sol-gel spin-coating papers identify as the dominant lever for reaching
hundreds-of-nm thickness. A single sol-gel spin-coated layer of ZnO typically
tops out around 85-450 nm depending on concentration before cracking becomes
a real risk; getting to higher thicknesses reliably is done by repeating
coat -> low-temp dry -> coat cycles, then a single final high-temp anneal.
Reported examples: 1/3/5/7 cycles -> ~40/60/100/200 nm; 98-366 nm across a
cycle sweep; 6/8/10-layer studies. Thickness scales roughly linearly with
cycle count (per-layer physics stays identical each cycle -- same Meyerhofer
term as before, just applied N times).

Everything else is unchanged from v2 (concentration/viscosity coupling,
annealing-temperature densification, near-zero effect from spin time /
surface tension / volume beyond the ranges here).
"""

import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
N = 3000

# --- Process parameters ---
spin_speed_rpm   = rng.uniform(500, 5000, N)
spin_time_s      = rng.uniform(20, 120, N)
concentration    = rng.uniform(1, 15, N)              # wt%
annealing_temp_C = rng.uniform(150, 600, N)
annealing_time_m = rng.uniform(10, 120, N)
surface_tension  = rng.uniform(20, 60, N)              # mN/m -- edge/uniformity, not center thickness
volume_uL        = rng.uniform(10, 100, N)             # weak effect above min coverage volume
num_layers       = rng.integers(1, 11, N)              # NEW: 1-10 coat/dry cycles (matches literature range)

# --- Viscosity coupled to concentration (real solution rheology) ---
viscosity_cP = 2.0 + 2.3 * concentration + rng.normal(0, 3.0, N)
viscosity_cP = np.clip(viscosity_cP, 1.0, 60.0)

# --- Per-layer wet-film thickness (Meyerhofer term) ---
omega = spin_speed_rpm
wet_layer_per_coat = concentration * np.sqrt(viscosity_cP / omega)

# --- Thermal densification (applies once, to the stacked film, at final anneal) ---
k = 0.0035
T_ref = 350.0
shrink_temp = np.exp(-k * (annealing_temp_C - T_ref))
shrink_time_fraction = 1 - 0.5 * np.exp(-annealing_time_m / 30.0)
shrink_factor = 1 - (1 - shrink_temp) * shrink_time_fraction

# --- Total thickness = per-layer thickness x number of coat cycles, then densified ---
# scale recalibrated (55 -> 27) so a SINGLE layer lands in the ~1-110nm range,
# matching the per-cycle literature figures (~20-40nm/cycle in multilayer work,
# up to ~110-120nm for a deliberately thick single coat) rather than the old
# per-layer scale, which was implicitly already "the whole film."
scale = 27.0
thickness = scale * wet_layer_per_coat * num_layers * shrink_factor
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
    "Number_of_Layers": num_layers,
    "Film_Thickness_nm": thickness.round(2),
})

df.to_csv("/mnt/user-data/outputs/spin_coating_dataset_v3.csv", index=False)
print(df.describe())
print("\nPer-layer (Number_of_Layers==1) thickness range, sanity check vs literature (~85-450nm):")
print(df[df.Number_of_Layers == 1]["Film_Thickness_nm"].describe())
print("\nSaved to spin_coating_dataset_v3.csv")
