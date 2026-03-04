"""
explain.py
Rôle : Générer une explication LIME en français.
"""

import lime
import lime.lime_tabular
import pandas as pd
import joblib
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

model = joblib.load(os.path.join(BASE_DIR, "model", "model.pkl"))
scaler = joblib.load(os.path.join(BASE_DIR, "model", "scaler.pkl"))
FEATURE_COLUMNS = joblib.load(os.path.join(BASE_DIR, "model", "features.pkl"))

# Charger les données d'entraînement pour LIME
DATA_PATH = os.path.join(BASE_DIR, "data", "cs-training.csv")
df_train = pd.read_csv(DATA_PATH)
if "Unnamed: 0" in df_train.columns:
    df_train.drop(columns=["Unnamed: 0"], inplace=True)
df_train["MonthlyIncome"] = df_train["MonthlyIncome"].fillna(df_train["MonthlyIncome"].median())
df_train["NumberOfDependents"] = df_train["NumberOfDependents"].fillna(df_train["NumberOfDependents"].median())
df_train = df_train[df_train["age"] > 18]
df_train["TotalLatePayments"] = (
    df_train["NumberOfTime30-59DaysPastDueNotWorse"] +
    df_train["NumberOfTime60-89DaysPastDueNotWorse"] +
    df_train["NumberOfTimes90DaysLate"]
)
df_train["DebtToIncome"] = df_train["DebtRatio"] / (df_train["MonthlyIncome"] + 1)

X_train_scaled = scaler.transform(df_train[FEATURE_COLUMNS].values)

# Traduction des features en français
FEATURE_NAMES_FR = {
    "RevolvingUtilizationOfUnsecuredLines": "Taux d'utilisation du crédit",
    "age": "Âge",
    "NumberOfTime30-59DaysPastDueNotWorse": "Retards 30-59 jours",
    "DebtRatio": "Ratio d'endettement",
    "MonthlyIncome": "Revenu mensuel",
    "NumberOfOpenCreditLinesAndLoans": "Nombre de crédits ouverts",
    "NumberOfTimes90DaysLate": "Retards > 90 jours",
    "NumberRealEstateLoansOrLines": "Crédits immobiliers",
    "NumberOfTime60-89DaysPastDueNotWorse": "Retards 60-89 jours",
    "NumberOfDependents": "Personnes à charge",
    "TotalLatePayments": "Total retards de paiement",
    "DebtToIncome": "Ratio dette/revenu"
}

# Initialiser LIME une seule fois
explainer = lime.lime_tabular.LimeTabularExplainer(
    training_data=X_train_scaled,
    feature_names=FEATURE_COLUMNS,
    class_names=["Accepté", "Refusé"],
    mode="classification",
    random_state=42
)


def explain_prediction(data: dict) -> dict:
    df = pd.DataFrame([data])[FEATURE_COLUMNS]
    df_scaled = scaler.transform(df)
    instance = df_scaled[0]

    explanation = explainer.explain_instance(
        data_row=instance,
        predict_fn=model.predict_proba,
        num_features=6,
        num_samples=1000
    )

    raisons = []
    for feature_condition, weight in explanation.as_list():
        feature_fr = feature_condition
        for col, fr_name in FEATURE_NAMES_FR.items():
            if col in feature_condition:
                feature_fr = fr_name
                break

        impact = "négatif (risque)" if weight > 0 else "positif (favorable)"
        symbole = "✗" if weight > 0 else "✓"
        force = "fort" if abs(weight) > 0.05 else "modéré" if abs(weight) > 0.02 else "faible"

        raisons.append({
            "variable": feature_fr,
            "poids": round(weight, 4),
            "impact": impact,
            "symbole": symbole,
            "explication": f"{symbole} {feature_fr} → impact {impact} ({force})"
        })

    facteurs_negatifs = [r for r in raisons if r["poids"] > 0]
    facteurs_positifs = [r for r in raisons if r["poids"] <= 0]

    resume = "Analyse de la décision :\n"
    if facteurs_negatifs:
        resume += "Facteurs défavorables : " + ", ".join([r["variable"] for r in facteurs_negatifs[:3]]) + ". "
    if facteurs_positifs:
        resume += "Facteurs favorables : " + ", ".join([r["variable"] for r in facteurs_positifs[:3]]) + "."

    return {"raisons": raisons, "resume_fr": resume}