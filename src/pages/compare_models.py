"""
compare_models.py
Rôle : Comparer plusieurs modèles ML et choisir le meilleur
"""

import pandas as pd
import numpy as np
import os
import warnings
warnings.filterwarnings('ignore')

from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    roc_auc_score, classification_report,
    accuracy_score, f1_score
)
from imblearn.over_sampling import SMOTE

# ── Chargement des données ─────────────────────────────────────────────────
print("=" * 60)
print("  COMPARAISON DES MODÈLES — CREDIT SCORING")
print("=" * 60)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "cs-training.csv")

print("\n📂 Chargement des données...")
df = pd.read_csv(DATA_PATH)
if "Unnamed: 0" in df.columns:
    df.drop(columns=["Unnamed: 0"], inplace=True)

# ── Preprocessing ──────────────────────────────────────────────────────────
print("🔧 Preprocessing...")
df["MonthlyIncome"] = df["MonthlyIncome"].fillna(df["MonthlyIncome"].median())
df["NumberOfDependents"] = df["NumberOfDependents"].fillna(df["NumberOfDependents"].median())
df = df[df["age"] > 18]
df["TotalLatePayments"] = (
    df["NumberOfTime30-59DaysPastDueNotWorse"] +
    df["NumberOfTime60-89DaysPastDueNotWorse"] +
    df["NumberOfTimes90DaysLate"]
)
df["DebtToIncome"] = df["DebtRatio"] / (df["MonthlyIncome"] + 1)

FEATURE_COLUMNS = [
    "RevolvingUtilizationOfUnsecuredLines", "age",
    "NumberOfTime30-59DaysPastDueNotWorse", "DebtRatio",
    "MonthlyIncome", "NumberOfOpenCreditLinesAndLoans",
    "NumberOfTimes90DaysLate", "NumberRealEstateLoansOrLines",
    "NumberOfTime60-89DaysPastDueNotWorse", "NumberOfDependents",
    "TotalLatePayments", "DebtToIncome"
]

X = df[FEATURE_COLUMNS]
y = df["SeriousDlqin2yrs"]

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Normalisation
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print(f"   Train : {X_train_scaled.shape[0]} échantillons")
print(f"   Test  : {X_test_scaled.shape[0]} échantillons")

# ── Définition des modèles ─────────────────────────────────────────────────
models = {
    "Régression Logistique": LogisticRegression(
        max_iter=1000, class_weight='balanced', random_state=42
    ),
    "Decision Tree": DecisionTreeClassifier(
        max_depth=10, class_weight='balanced', random_state=42
    ),
    "Random Forest": RandomForestClassifier(
        n_estimators=200, max_depth=10,
        class_weight='balanced', random_state=42, n_jobs=-1
    ),
    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=100, max_depth=5, random_state=42
    ),
    "KNN": KNeighborsClassifier(n_neighbors=5, n_jobs=-1),
}

# ── Entraînement et évaluation ─────────────────────────────────────────────
print("\n🤖 Entraînement et évaluation des modèles...\n")

results = []

for name, model in models.items():
    print(f"   ⏳ {name}...")
    model.fit(X_train_scaled, y_train)
    y_pred = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled)[:, 1]

    auc = roc_auc_score(y_test, y_proba)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='weighted')

    report = classification_report(
        y_test, y_pred,
        target_names=["Accepté", "Refusé"],
        output_dict=True
    )
    recall_refuse = report["Refusé"]["recall"]
    precision_refuse = report["Refusé"]["precision"]

    results.append({
        "Modèle": name,
        "AUC-ROC": round(auc, 4),
        "Accuracy": round(acc, 4),
        "F1-Score": round(f1, 4),
        "Recall Refusé": round(recall_refuse, 4),
        "Precision Refusé": round(precision_refuse, 4),
    })
    print(f"   ✅ {name} → AUC: {auc:.4f} | Recall Refusé: {recall_refuse:.4f}")

# ── Tableau des résultats ──────────────────────────────────────────────────
print("\n" + "=" * 60)
print("  RÉSULTATS COMPARATIFS")
print("=" * 60)

df_results = pd.DataFrame(results).sort_values("AUC-ROC", ascending=False)
df_results.index = range(1, len(df_results) + 1)

print(df_results.to_string(index=True))

# ── Meilleur modèle ────────────────────────────────────────────────────────
best = df_results.iloc[0]
print("\n" + "=" * 60)
print(f"  🏆 MEILLEUR MODÈLE : {best['Modèle']}")
print(f"     AUC-ROC        : {best['AUC-ROC']}")
print(f"     Accuracy       : {best['Accuracy']}")
print(f"     Recall Refusé  : {best['Recall Refusé']}")
print("=" * 60)

# ── Explication des métriques ──────────────────────────────────────────────
print("""
📊 EXPLICATION DES MÉTRIQUES :

AUC-ROC        → Capacité à distinguer bon/mauvais payeur
                 1.0 = parfait | 0.5 = aléatoire
                 > 0.85 = excellent ✅

Accuracy       → % de bonnes prédictions globales

Recall Refusé  → % de mauvais payeurs détectés
                 Important ! On veut détecter max de risques

Precision      → Quand on dit REFUSÉ, on a raison ?
""")

# ── Sauvegarder les résultats ──────────────────────────────────────────────
output_path = os.path.join(BASE_DIR, "model", "comparaison_modeles.csv")
df_results.to_csv(output_path, index=True)
print(f"💾 Résultats sauvegardés : {output_path}")
print("\n✅ Comparaison terminée !")
