"""
FastAPI server that loads the trained thickness model and serves it at
POST /predict. Run with:

    uvicorn app:app --reload --port 8000

Then visit http://localhost:8000/docs for interactive API docs.
"""
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MODEL_PATH = Path(__file__).parent / "model" / "thickness_model.joblib"

app = FastAPI(
    title="Thin Film Thickness Predictor API",
    description="Predicts spin-coated thin film thickness (nm) from process parameters.",
    version="1.0.0",
)

# Vite's default dev server origin. Add your deployed frontend's origin here too
# once you host this somewhere other than localhost.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_bundle = None  # loaded lazily so the app can still start if training hasn't run yet


def get_bundle():
    global _bundle
    if _bundle is None:
        if not MODEL_PATH.exists():
            raise HTTPException(
                status_code=503,
                detail="Model not found. Run `python train.py` first to create model/thickness_model.joblib.",
            )
        _bundle = joblib.load(MODEL_PATH)
    return _bundle


class PredictRequest(BaseModel):
    spin_speed_rpm: float = Field(..., gt=0, description="Spin speed in RPM")
    spin_time_s: float = Field(..., gt=0, description="Spin time in seconds")
    viscosity_cp: float = Field(..., gt=0, description="Solution viscosity in cP")
    surface_tension_mn_m: float = Field(..., gt=0, description="Surface tension in mN/m")
    concentration_wt_pct: float = Field(..., gt=0, description="Solution concentration in wt%")
    volume_deposited_ul: float = Field(..., gt=0, description="Volume deposited in microliters")
    annealing_temp_c: float = Field(..., ge=0, description="Annealing temperature in Celsius")
    annealing_time_min: float = Field(..., ge=0, description="Annealing time in minutes")


class PredictResponse(BaseModel):
    thickness_nm: float


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": MODEL_PATH.exists()}


@app.get("/")
def root():
    return {
        "message": "Thin Film Thickness Predictor API",
        "docs": "/docs",
        "predict": "POST /predict",
    }


@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    bundle = get_bundle()
    model, features = bundle["model"], bundle["features"]

    # Calculate the physics ratio so we have all 9 expected features
    physics_ratio = np.sqrt(payload.viscosity_cp / payload.spin_speed_rpm)

    row = pd.DataFrame(
        [[
            payload.spin_speed_rpm,
            payload.spin_time_s,
            payload.viscosity_cp,
            payload.surface_tension_mn_m,
            payload.concentration_wt_pct,
            payload.volume_deposited_ul,
            payload.annealing_temp_c,
            payload.annealing_time_min,
            physics_ratio,
        ]],
        columns=features,
    )

    prediction = float(model.predict(row)[0])
    return PredictResponse(thickness_nm=round(prediction, 2))# """
# FastAPI server that loads the trained thickness model and serves it at
# POST /predict. Run with:

#     uvicorn app:app --reload --port 8000

# Then visit http://localhost:8000/docs for interactive API docs.
# """
# from pathlib import Path

# import joblib
# import pandas as pd
# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel, Field

# MODEL_PATH = Path(__file__).parent / "model" / "thickness_model.joblib"

# app = FastAPI(
#     title="Thin Film Thickness Predictor API",
#     description="Predicts spin-coated thin film thickness (nm) from process parameters.",
#     version="1.0.0",
# )

# # Vite's default dev server origin. Add your deployed frontend's origin here too
# # once you host this somewhere other than localhost.
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# _bundle = None  # loaded lazily so the app can still start if training hasn't run yet


# def get_bundle():
#     global _bundle
#     if _bundle is None:
#         if not MODEL_PATH.exists():
#             raise HTTPException(
#                 status_code=503,
#                 detail="Model not found. Run `python train.py` first to create model/thickness_model.joblib.",
#             )
#         _bundle = joblib.load(MODEL_PATH)
#     return _bundle


# class PredictRequest(BaseModel):
#     spin_speed_rpm: float = Field(..., gt=0, description="Spin speed in RPM")
#     spin_time_s: float = Field(..., gt=0, description="Spin time in seconds")
#     viscosity_cp: float = Field(..., gt=0, description="Solution viscosity in cP")
#     surface_tension_mn_m: float = Field(..., gt=0, description="Surface tension in mN/m")
#     concentration_wt_pct: float = Field(..., gt=0, description="Solution concentration in wt%")
#     volume_deposited_ul: float = Field(..., gt=0, description="Volume deposited in microliters")
#     annealing_temp_c: float = Field(..., ge=0, description="Annealing temperature in Celsius")
#     annealing_time_min: float = Field(..., ge=0, description="Annealing time in minutes")


# class PredictResponse(BaseModel):
#     thickness_nm: float


# @app.get("/health")
# def health():
#     return {"status": "ok", "model_loaded": MODEL_PATH.exists()}


# @app.get("/")
# def root():
#     return {
#         "message": "Thin Film Thickness Predictor API",
#         "docs": "/docs",
#         "predict": "POST /predict",
#     }


# @app.post("/predict", response_model=PredictResponse)
# def predict(payload: PredictRequest):
#     bundle = get_bundle()
#     model, features = bundle["model"], bundle["features"]

#     row = pd.DataFrame(
#         [[
#             payload.spin_speed_rpm,
#             payload.spin_time_s,
#             payload.viscosity_cp,
#             payload.surface_tension_mn_m,
#             payload.concentration_wt_pct,
#             payload.volume_deposited_ul,
#             payload.annealing_temp_c,
#             payload.annealing_time_min,
#         ]],
#         columns=features,
#     )

#     prediction = float(model.predict(row)[0])
#     return PredictResponse(thickness_nm=round(prediction, 2))
