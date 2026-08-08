"""
Quick inspection script for the trained model bundle.

Place this file in the same folder as thickness_model.joblib
(i.e. backend/model/check.py) and run:

    python check.py
"""
from pathlib import Path

import joblib

MODEL_PATH = Path(__file__).parent / "thickness_model.joblib"

bundle = joblib.load(MODEL_PATH)
model = bundle["model"]
features = bundle["features"]

print("Model:", model)
print()
print(f"Features ({len(features)}):")
for i, f in enumerate(features, start=1):
    print(f"  {i}. {f}")
print()

if "Physics_Ratio" in features and len(features) == 9:
    print("OK — Physics_Ratio is present and there are 9 features. Matches app.py's /predict.")
else:
    print("MISMATCH — this model will NOT match app.py's /predict, and /predict will crash.")
    if "Physics_Ratio" not in features:
        print("  - Physics_Ratio is missing.")
    if len(features) != 9:
        print(f"  - Expected 9 features, found {len(features)}.")
