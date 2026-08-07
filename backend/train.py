"""
Train a model that predicts spin-coated thin film thickness (nm) from
process parameters, and save it as a single serialized artifact that
app.py loads at request time.

Usage:
    python train.py [path/to/dataset.csv]

Defaults to data/spin_coating_synthetic_dataset.csv if no path is given.

Model choice: HistGradientBoostingRegressor (scikit-learn's native
histogram-based gradient boosting -- the same family as XGBoost/LightGBM).
It was chosen empirically after comparing against a linear baseline and a
random forest on this dataset; see README.md for the comparison.

Swapping in XGBoost instead: install xgboost, then replace the model
definition below with:
    from xgboost import XGBRegressor
    model = XGBRegressor(n_estimators=400, max_depth=6, learning_rate=0.05,
                          random_state=42)
Everything else (features, split, save path) stays the same.
"""
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split

FEATURES = [
    "Spin_Speed_rpm",
    "Spin_Time_s",
    "Viscosity_cP",
    "Surface_Tension_mN_m",
    "Concentration_wt_pct",
    "Volume_Deposited_uL",
    "Annealing_Temp_C",
    "Annealing_Time_min",
]
TARGET = "Film_Thickness_nm"

MODEL_DIR = Path(__file__).parent / "model"
MODEL_PATH = MODEL_DIR / "thickness_model.joblib"


def main():
    data_path = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path(__file__).parent / "data" / "spin_coating_synthetic_dataset.csv"
    )
    print(f"Loading {data_path} ...")
    df = pd.read_csv(data_path)

    missing = [c for c in FEATURES + [TARGET] if c not in df.columns]
    if missing:
        raise ValueError(
            f"Dataset is missing expected columns: {missing}. "
            f"Expected features: {FEATURES}, target: {TARGET}"
        )

    X, y = df[FEATURES], df[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = HistGradientBoostingRegressor(
        max_iter=400, max_depth=6, learning_rate=0.05, random_state=42
    )

    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring="r2")
    print(f"5-fold CV R^2 on training set: {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")

    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    rmse = mean_squared_error(y_test, preds) ** 0.5
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    print(f"Held-out test set -> RMSE: {rmse:.2f} nm | MAE: {mae:.2f} nm | R^2: {r2:.4f}")

    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump({"model": model, "features": FEATURES}, MODEL_PATH)
    print(f"Saved trained model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
