# Thin Film Thickness Predictor — Backend

FastAPI service that predicts spin-coated thin film thickness (nm) from
process parameters, using a model trained on `data/spin_coating_synthetic_dataset.csv`.

## Setup

```
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 1. Train the model

```
python train.py
```

This reads `data/spin_coating_synthetic_dataset.csv`, trains a
`HistGradientBoostingRegressor`, prints cross-validated and held-out
metrics, and writes `model/thickness_model.joblib`. Re-run it any time
you update the dataset.

**Real performance on this dataset** (5-fold CV on the training split,
then a held-out 20% test set):

| Metric | Value |
|---|---|
| CV R² | 0.990 ± 0.001 |
| Test R² | 0.993 |
| Test RMSE | 13.2 nm |
| Test MAE | 8.5 nm |

For context, thickness in the dataset ranges from ~7 nm to ~972 nm
(mean 202 nm), so an average error of 8.5 nm is small relative to that
spread. Permutation importance shows **Concentration, Viscosity, and
Spin Speed** drive nearly all of the prediction — Surface Tension,
Volume Deposited, Spin Time, and Annealing conditions contribute
almost nothing in this particular dataset.

Model swap: the training script uses scikit-learn's
`HistGradientBoostingRegressor` (same algorithm family as XGBoost/LightGBM)
because it could be trained and verified without extra dependencies.
`train.py` has a comment showing exactly how to swap in real XGBoost if
you install it and prefer that specifically — the rest of the pipeline
doesn't change.

## 2. Run the API

```
uvicorn app:app --reload --port 8000
```

Visit `http://localhost:8000/docs` for interactive API docs, or
`http://localhost:8000/health` to confirm the model loaded.

## Endpoints

- `GET /health` — `{"status": "ok", "model_loaded": true}`
- `POST /predict` — body:
  ```json
  {
    "spin_speed_rpm": 3000,
    "spin_time_s": 60,
    "viscosity_cp": 25,
    "surface_tension_mn_m": 40,
    "concentration_wt_pct": 8,
    "volume_deposited_ul": 55,
    "annealing_temp_c": 350,
    "annealing_time_min": 65
  }
  ```
  returns `{"thickness_nm": 193.92}`

## CORS

`app.py` allows requests from `http://localhost:5173` (Vite's default
dev port). If you deploy the frontend elsewhere, add that origin to the
`allow_origins` list in `app.py`.

## Retraining on new data

Replace `data/spin_coating_synthetic_dataset.csv` with a new CSV that
has the same 9 columns (same names, same units), then re-run
`python train.py`. No other files need to change.
