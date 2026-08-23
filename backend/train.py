"""
Train a highly optimized model that predicts spin-coated thin film thickness (nm).
Uses physics-informed feature engineering, a log-target transform, and a
randomized hyperparameter search over HistGradientBoostingRegressor.

Usage:
    python train.py [path/to/dataset.csv]

Defaults to data/spin_coating_dataset_v3.csv -- the current dataset. Point it
elsewhere explicitly if you ever need to train on something else.
"""
import sys
import numpy as np
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.compose import TransformedTargetRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import RandomizedSearchCV, train_test_split

BASE_FEATURES = [
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
        else Path(__file__).parent / "data" / "spin_coating_dataset_v3.csv"
    )
    print(f"Loading {data_path} ...")
    df = pd.read_csv(data_path)

    # Physics-informed feature engineering.
    # Physics_Ratio: Meyerhofer relation shortcut (sqrt(viscosity / spin speed)).
    # Ratio_x_Layers: total thickness scales with per-layer thickness (captured
    # by Physics_Ratio) times how many layers are deposited -- this interaction
    # term matters far more than either input alone once Number_of_Layers is
    # in the picture.
    print("Engineering features: Physics_Ratio, Ratio_x_Layers...")
    df["Physics_Ratio"] = np.sqrt(df["Viscosity_cP"] / df["Spin_Speed_rpm"])
    df["Ratio_x_Layers"] = df["Physics_Ratio"] * df["Number_of_Layers"]

    features = BASE_FEATURES + ["Number_of_Layers", "Physics_Ratio", "Ratio_x_Layers"]

    missing = [c for c in features + [TARGET] if c not in df.columns]
    if missing:
        raise ValueError(
            f"Dataset is missing expected columns: {missing}. "
            f"Expected features: {features}, target: {TARGET}"
        )

    X, y = df[features], df[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Log-target transform: thickness error scales with the size of the
    # value (heteroscedastic), so training on log1p(thickness) fits much
    # better than raw nm. TransformedTargetRegressor handles the log1p /
    # expm1 round-trip automatically -- predict() still returns nm.
    print("Starting randomized search to find optimal hyperparameters (this may take a minute)...")
    base_model = HistGradientBoostingRegressor(random_state=42)
    wrapped_model = TransformedTargetRegressor(
        regressor=base_model, func=np.log1p, inverse_func=np.expm1
    )

    param_dist = {
        "regressor__learning_rate": [0.02, 0.03, 0.05, 0.08, 0.1],
        "regressor__max_depth": [3, 4, 5, 6, 8],
        "regressor__max_iter": [200, 300, 500, 700],
        "regressor__max_leaf_nodes": [15, 31, 63],
        "regressor__min_samples_leaf": [5, 10, 20, 30],
        "regressor__l2_regularization": [0.0, 0.1, 0.5],
    }

    search = RandomizedSearchCV(
        estimator=wrapped_model,
        param_distributions=param_dist,
        n_iter=25,
        cv=5,
        scoring="neg_mean_absolute_error",  # optimize what we actually report (MAE)
        random_state=42,
        n_jobs=-1,
        verbose=1,
    )

    search.fit(X_train, y_train)

    print(f"\n*** TRAINING COMPLETE ***")
    print(f"Best parameters found: {search.best_params_}")
    print(f"Best 5-fold CV MAE on training set: {-search.best_score_:.2f} nm")

    # Evaluate the champion model on the unseen test set
    best_model = search.best_estimator_
    preds = best_model.predict(X_test)

    rmse = mean_squared_error(y_test, preds) ** 0.5
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    print(f"Held-out test set -> RMSE: {rmse:.2f} nm | MAE: {mae:.2f} nm | R^2: {r2:.4f}\n")

    # Save the optimized model and its features list.
    # best_model.predict(X) still returns thickness in nm directly (the log
    # transform is handled internally).
    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump({"model": best_model, "features": features}, MODEL_PATH)
    print(f"Saved trained model to {MODEL_PATH}")


if __name__ == "__main__":
    main()



# """
# Train a highly optimized model that predicts spin-coated thin film thickness (nm).
# This script uses Physics-Informed Feature Engineering and GridSearchCV to find 
# the best possible HistGradientBoostingRegressor hyperparameters.

# Usage:
#     python train.py [path/to/dataset.csv]
# """
# import sys
# import numpy as np
# from pathlib import Path

# import joblib
# import pandas as pd
# from sklearn.ensemble import HistGradientBoostingRegressor
# from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
# from sklearn.model_selection import GridSearchCV, train_test_split

# # Your original base features
# BASE_FEATURES = [
#     "Spin_Speed_rpm",
#     "Spin_Time_s",
#     "Viscosity_cP",
#     "Surface_Tension_mN_m",
#     "Concentration_wt_pct",
#     "Volume_Deposited_uL",
#     "Annealing_Temp_C",
#     "Annealing_Time_min",
# ]
# TARGET = "Film_Thickness_nm"

# MODEL_DIR = Path(__file__).parent / "model"
# MODEL_PATH = MODEL_DIR / "thickness_model.joblib"

# def main():
#     data_path = (
#         Path(sys.argv[1])
#         if len(sys.argv) > 1
#         else Path(__file__).parent / "data" / "spin_coating_synthetic_dataset.csv"
#     )
#     print(f"Loading {data_path} ...")
#     df = pd.read_csv(data_path)

#     # 1. Physics-Informed Feature Engineering
#     # Adding the Meyerhofer relation shortcut (sqrt(viscosity / spin speed))
#     print("Engineering new feature: Physics_Ratio...")
#     df["Physics_Ratio"] = np.sqrt(df["Viscosity_cP"] / df["Spin_Speed_rpm"])
    
#     # Dynamically update the features list to include the new physics calculation
#     features = BASE_FEATURES + ["Physics_Ratio"]

#     missing = [c for c in features + [TARGET] if c not in df.columns]
#     if missing:
#         raise ValueError(
#             f"Dataset is missing expected columns: {missing}. "
#             f"Expected features: {features}, target: {TARGET}"
#         )

#     X, y = df[features], df[TARGET]
#     X_train, X_test, y_train, y_test = train_test_split(
#         X, y, test_size=0.2, random_state=42
#     )

#     # 2. Automated Hyperparameter Tuning (GridSearchCV)
#     print("Starting Grid Search to find optimal hyperparameters (this may take a minute)...")
#     base_model = HistGradientBoostingRegressor(random_state=42)
    
#     param_grid = {
#         "max_iter": [200, 400, 600],
#         "max_depth": [4, 6, 8],
#         "learning_rate": [0.01, 0.05, 0.1]
#     }

#     grid_search = GridSearchCV(
#         estimator=base_model,
#         param_grid=param_grid,
#         cv=5,
#         scoring="r2",
#         n_jobs=-1, # Uses all CPU cores for faster training
#         verbose=1
#     )

#     grid_search.fit(X_train, y_train)
    
#     print(f"\n*** TRAINING COMPLETE ***")
#     print(f"Best parameters found: {grid_search.best_params_}")
#     print(f"Best 5-fold CV R^2 on training set: {grid_search.best_score_:.4f}")

#     # 3. Evaluate the champion model on the unseen test set
#     best_model = grid_search.best_estimator_
#     preds = best_model.predict(X_test)
    
#     rmse = mean_squared_error(y_test, preds) ** 0.5
#     mae = mean_absolute_error(y_test, preds)
#     r2 = r2_score(y_test, preds)
#     print(f"Held-out test set -> RMSE: {rmse:.2f} nm | MAE: {mae:.2f} nm | R^2: {r2:.4f}\n")

#     # 4. Save the highly optimized model and the new features list
#     MODEL_DIR.mkdir(exist_ok=True)
#     joblib.dump({"model": best_model, "features": features}, MODEL_PATH)
#     print(f"Saved trained model to {MODEL_PATH}")


# if __name__ == "__main__":
#     main()
