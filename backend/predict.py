"""
predict.py
Rôle : Charger le modèle et effectuer une prédiction.
"""

import joblib
import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

model = joblib.load(os.path.join(BASE_DIR, "model", "model.pkl"))
scaler = joblib.load(os.path.join(BASE_DIR, "model", "scaler.pkl"))
FEATURE_COLUMNS = joblib.load(os.path.join(BASE_DIR, "model", "features.pkl"))


def predict_credit(data: dict) -> dict:
    df = pd.DataFrame([data])[FEATURE_COLUMNS]
    df_scaled = scaler.transform(df)

    prediction = model.predict(df_scaled)[0]
    probability_default = model.predict_proba(df_scaled)[0][1]

    decision = "REFUSÉ" if prediction == 1 else "ACCEPTÉ"

    return {
        "decision": decision,
        "prediction": int(prediction),
        "probability_default": round(float(probability_default), 4),
        "probability_accepted": round(1 - float(probability_default), 4)
    }