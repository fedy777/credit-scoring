"""
train_model.py
Rôle : Charger les données, nettoyer, entraîner et sauvegarder le modèle.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score
import joblib
import os

# ── 1. Chemins ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "cs-training.csv")  # ← nom correct
MODEL_PATH = os.path.join(BASE_DIR, "model", "model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "model", "scaler.pkl")

# ── 2. Chargement ─────────────────────────────────────────────────────────
print("📂 Chargement des données...")
df = pd.read_csv(DATA_PATH)

if "Unnamed: 0" in df.columns:
    df.drop(columns=["Unnamed: 0"], inplace=True)

print(f"   Taille : {df.shape}")
print(f"   Valeurs manquantes :\n{df.isnull().sum()}\n")

# ── 3. Preprocessing ──────────────────────────────────────────────────────
print("🔧 Preprocessing...")
df["MonthlyIncome"] = df["MonthlyIncome"].fillna(df["MonthlyIncome"].median())
df["NumberOfDependents"] = df["NumberOfDependents"].fillna(df["NumberOfDependents"].median())
df = df[df["age"] > 18]

# ── 4. Feature Engineering ────────────────────────────────────────────────
df["TotalLatePayments"] = (
    df["NumberOfTime30-59DaysPastDueNotWorse"] +
    df["NumberOfTime60-89DaysPastDueNotWorse"] +
    df["NumberOfTimes90DaysLate"]
)
df["DebtToIncome"] = df["DebtRatio"] / (df["MonthlyIncome"] + 1)

# ── 5. Features / Cible ───────────────────────────────────────────────────
FEATURE_COLUMNS = [
    "RevolvingUtilizationOfUnsecuredLines",
    "age",
    "NumberOfTime30-59DaysPastDueNotWorse",
    "DebtRatio",
    "MonthlyIncome",
    "NumberOfOpenCreditLinesAndLoans",
    "NumberOfTimes90DaysLate",
    "NumberRealEstateLoansOrLines",
    "NumberOfTime60-89DaysPastDueNotWorse",
    "NumberOfDependents",
    "TotalLatePayments",
    "DebtToIncome"
]

X = df[FEATURE_COLUMNS]
y = df["SeriousDlqin2yrs"]

print(f"   Distribution des classes :\n{y.value_counts()}\n")

# ── 6. Split ──────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ── 7. Normalisation ──────────────────────────────────────────────────────
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ── 8. Entraînement ───────────────────────────────────────────────────────
print("🤖 Entraînement du modèle Random Forest...")
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)
model.fit(X_train_scaled, y_train)

# ── 9. Évaluation ─────────────────────────────────────────────────────────
print("\n📊 Évaluation :")
y_pred = model.predict(X_test_scaled)
y_proba = model.predict_proba(X_test_scaled)[:, 1]
print(classification_report(y_test, y_pred, target_names=["Accepté", "Refusé"]))
print(f"AUC-ROC : {roc_auc_score(y_test, y_proba):.4f}")

# ── 10. Sauvegarde ────────────────────────────────────────────────────────
os.makedirs(os.path.join(BASE_DIR, "model"), exist_ok=True)
joblib.dump(model, MODEL_PATH)
joblib.dump(scaler, SCALER_PATH)
joblib.dump(FEATURE_COLUMNS, os.path.join(BASE_DIR, "model", "features.pkl"))

print(f"\n✅ Modèle sauvegardé : {MODEL_PATH}")
print(f"✅ Scaler sauvegardé : {SCALER_PATH}")
print(f"✅ Features sauvegardées")