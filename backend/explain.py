"""
explain.py
Rôle : Explication des prédictions avec LIME + SHAP + Counterfactual
Shape SHAP : (1, n_features, 2) → on prend [:, :, 1] pour classe "Refusé"
"""

import numpy as np
import joblib
import os
import lime
import lime.lime_tabular
import shap

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "..", "model")

model    = joblib.load(os.path.join(MODEL_DIR, "model.pkl"))
scaler   = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
features = joblib.load(os.path.join(MODEL_DIR, "features.pkl"))

# Noms français des features
FEATURE_NAMES_FR = {
    "RevolvingUtilizationOfUnsecuredLines":   "Taux utilisation crédit",
    "age":                                     "Âge",
    "NumberOfTime30-59DaysPastDueNotWorse":    "Retards 30-59j",
    "DebtRatio":                               "Ratio d'endettement",
    "MonthlyIncome":                           "Revenu mensuel",
    "NumberOfOpenCreditLinesAndLoans":         "Crédits ouverts",
    "NumberOfTimes90DaysLate":                 "Retards > 90j",
    "NumberRealEstateLoansOrLines":            "Crédits immobiliers",
    "NumberOfTime60-89DaysPastDueNotWorse":    "Retards 60-89j",
    "NumberOfDependents":                      "Personnes à charge",
    "TotalLatePayments":                       "Total retards",
    "DebtToIncome":                            "Dette/Revenu",
}

# Variables modifiables par le client (pas l'âge ni les immobiliers)
MODIFIABLE_FEATURES = {
    "RevolvingUtilizationOfUnsecuredLines": {"direction": "decrease", "step": 0.10, "min": 0.0,  "max": 1.0},
    "NumberOfTime30-59DaysPastDueNotWorse": {"direction": "decrease", "step": 1.0,  "min": 0.0,  "max": 20.0},
    "DebtRatio":                            {"direction": "decrease", "step": 0.10, "min": 0.0,  "max": 1.0},
    "MonthlyIncome":                        {"direction": "increase", "step": 500,  "min": 0.0,  "max": 50000},
    "NumberOfOpenCreditLinesAndLoans":      {"direction": "decrease", "step": 1.0,  "min": 0.0,  "max": 20.0},
    "NumberOfTimes90DaysLate":              {"direction": "decrease", "step": 1.0,  "min": 0.0,  "max": 20.0},
    "NumberOfTime60-89DaysPastDueNotWorse": {"direction": "decrease", "step": 1.0,  "min": 0.0,  "max": 20.0},
}

# Données simulées pour LIME
np.random.seed(42)
training_data = np.random.randn(500, len(features))

# Initialiser LIME
lime_explainer = lime.lime_tabular.LimeTabularExplainer(
    training_data=training_data,
    feature_names=features,
    class_names=["Accepté", "Refusé"],
    mode="classification",
    random_state=42
)

# Initialiser SHAP
shap_explainer = shap.TreeExplainer(model)


def _get_shap_values_and_base(scaled_instance):
    instance_2d = np.array([scaled_instance])
    raw = shap_explainer.shap_values(instance_2d)
    raw_arr = np.array(raw)

    if raw_arr.ndim == 3:
        shap_vals = raw_arr[0, :, 1]
    elif raw_arr.ndim == 2:
        shap_vals = raw_arr[0]
    else:
        shap_vals = raw_arr.flatten()[:len(features)]

    ev = np.array(shap_explainer.expected_value)
    base_value = float(ev[1]) if (ev.ndim == 1 and len(ev) >= 2) else float(ev.flat[0])

    return shap_vals, base_value


def _predict_proba(feature_values):
    """Prédit la probabilité de défaut pour un vecteur de features"""
    scaled = scaler.transform([feature_values])[0]
    proba = model.predict_proba([scaled])[0]
    return proba[1]  # probabilité de Refus


def generate_counterfactual(data: dict) -> dict:
    """
    Génère des explications contrefactuelles :
    "Que modifier pour passer de REFUSÉ à ACCEPTÉ ?"
    """
    feature_values = [data.get(f, 0) for f in features]
    original_proba = _predict_proba(feature_values)

    # Si déjà accepté → pas besoin de counterfactual
    if original_proba <= 0.5:
        return {
            "applicable": False,
            "message": "✅ Ce client est déjà accepté — aucune modification nécessaire.",
            "conseils": [],
            "scenario": None
        }

    # ── Étape 1 : Impact individuel de chaque variable ────────────────────
    impacts = []
    for feat, config in MODIFIABLE_FEATURES.items():
        if feat not in features:
            continue
        idx = features.index(feat)
        current_val = feature_values[idx]

        # Calculer la meilleure valeur possible
        if config["direction"] == "decrease":
            best_val = max(current_val - config["step"] * 3, config["min"])
        else:
            best_val = min(current_val + config["step"] * 3, config["max"])

        # Tester l'impact
        modified = feature_values.copy()
        modified[idx] = best_val

        # Recalculer TotalLatePayments si nécessaire
        feat_map = {f: i for i, f in enumerate(features)}
        if "TotalLatePayments" in feat_map:
            ti = feat_map["TotalLatePayments"]
            modified[ti] = (
                modified[feat_map.get("NumberOfTime30-59DaysPastDueNotWorse", idx)] +
                modified[feat_map.get("NumberOfTime60-89DaysPastDueNotWorse", idx)] +
                modified[feat_map.get("NumberOfTimes90DaysLate", idx)]
            )

        new_proba = _predict_proba(modified)
        reduction = original_proba - new_proba

        if reduction > 0.01:
            impacts.append({
                "feature":      feat,
                "nom_fr":       FEATURE_NAMES_FR.get(feat, feat),
                "valeur_actuelle": round(float(current_val), 3),
                "valeur_cible":    round(float(best_val), 3),
                "direction":    config["direction"],
                "reduction_risque": round(float(reduction * 100), 1),
                "config":       config
            })

    # Trier par impact décroissant
    impacts.sort(key=lambda x: x["reduction_risque"], reverse=True)

    # ── Étape 2 : Scénario combiné ─────────────────────────────────────────
    scenario_values = feature_values.copy()
    modifications   = []
    feat_map        = {f: i for i, f in enumerate(features)}

    for imp in impacts[:4]:  # Top 4 modifications
        idx = features.index(imp["feature"])
        scenario_values[idx] = imp["valeur_cible"]

    # Recalculer TotalLatePayments dans le scénario
    if "TotalLatePayments" in feat_map:
        ti = feat_map["TotalLatePayments"]
        scenario_values[ti] = (
            scenario_values[feat_map.get("NumberOfTime30-59DaysPastDueNotWorse", 0)] +
            scenario_values[feat_map.get("NumberOfTime60-89DaysPastDueNotWorse", 0)] +
            scenario_values[feat_map.get("NumberOfTimes90DaysLate", 0)]
        )

    scenario_proba   = _predict_proba(scenario_values)
    scenario_decision = "ACCEPTÉ" if scenario_proba <= 0.5 else "REFUSÉ"

    # ── Étape 3 : Construire les conseils ─────────────────────────────────
    conseils = []
    for imp in impacts[:4]:
        direction_txt = "↓ Réduire" if imp["direction"] == "decrease" else "↑ Augmenter"
        fleche        = "📉" if imp["direction"] == "decrease" else "📈"
        conseils.append({
            "variable":         imp["nom_fr"],
            "valeur_actuelle":  imp["valeur_actuelle"],
            "valeur_cible":     imp["valeur_cible"],
            "conseil":          f"{direction_txt} de {imp['valeur_actuelle']} → {imp['valeur_cible']}",
            "reduction_risque": imp["reduction_risque"],
            "fleche":           fleche
        })

    # Message global
    if scenario_decision == "ACCEPTÉ":
        message = f"✅ En appliquant ces {len(conseils)} modifications, le client serait ACCEPTÉ avec {(1 - scenario_proba) * 100:.1f}% de probabilité."
    else:
        message = f"⚠️ Ces modifications réduisent le risque de {original_proba*100:.1f}% à {scenario_proba*100:.1f}% mais ne suffisent pas encore pour l'acceptation."

    return {
        "applicable":        True,
        "message":           message,
        "probabilite_avant": round(float(original_proba * 100), 1),
        "probabilite_apres": round(float(scenario_proba * 100), 1),
        "decision_apres":    scenario_decision,
        "conseils":          conseils,
        "nb_modifications":  len(conseils)
    }


def explain_prediction(data: dict) -> dict:
    """Explique une prédiction avec LIME + SHAP + Counterfactual"""

    feature_values = [data.get(f, 0) for f in features]
    scaled = scaler.transform([feature_values])[0]

    # ── LIME ──────────────────────────────────────────────────────────────
    lime_exp = lime_explainer.explain_instance(
        data_row=scaled,
        predict_fn=model.predict_proba,
        num_features=len(features)
    )

    lime_raisons = []
    for feat_name, weight in lime_exp.as_list():
        feat_key = None
        for f in features:
            if f[:8].lower() in feat_name.lower() or feat_name[:8].lower() in f.lower():
                feat_key = f
                break
        nom_fr  = FEATURE_NAMES_FR.get(feat_key, feat_name[:25])
        symbole = "🔴" if weight > 0 else "🟢"
        impact  = "Augmente le risque" if weight > 0 else "Réduit le risque"
        lime_raisons.append({
            "variable": nom_fr,
            "poids":    round(float(weight), 4),
            "symbole":  symbole,
            "impact":   impact
        })

    lime_raisons.sort(key=lambda x: abs(x["poids"]), reverse=True)

    defavorables = [r for r in lime_raisons if r["poids"] > 0][:3]
    favorables   = [r for r in lime_raisons if r["poids"] < 0][:3]
    resume_lime  = "Analyse de la décision :\n"
    if defavorables:
        resume_lime += "Facteurs défavorables : " + ", ".join([r["variable"] for r in defavorables]) + ". "
    if favorables:
        resume_lime += "Facteurs favorables : "   + ", ".join([r["variable"] for r in favorables])   + "."

    # ── SHAP ──────────────────────────────────────────────────────────────
    try:
        shap_vals, base_value = _get_shap_values_and_base(scaled)

        shap_raisons = []
        for i, (feat, val) in enumerate(zip(features, shap_vals)):
            nom_fr  = FEATURE_NAMES_FR.get(feat, feat)
            v       = float(val)
            symbole = "🔴" if v > 0 else "🟢"
            impact  = "Augmente le risque" if v > 0 else "Réduit le risque"
            shap_raisons.append({
                "variable":      nom_fr,
                "valeur_reelle": round(float(feature_values[i]), 4),
                "shap_value":    round(v, 4),
                "symbole":       symbole,
                "impact":        impact
            })

        shap_raisons.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        resume_shap = "Variables les plus influentes (SHAP) : " + \
            ", ".join([f"{r['variable']} ({r['symbole']})" for r in shap_raisons[:3]])

        print(f"✅ SHAP OK — base_value={base_value:.4f}")

    except Exception as shap_err:
        import traceback
        traceback.print_exc()
        shap_raisons = []
        resume_shap  = "SHAP non disponible"
        base_value   = 0.0

    # ── COUNTERFACTUAL ────────────────────────────────────────────────────
    try:
        counterfactual = generate_counterfactual(data)
        print(f"✅ Counterfactual OK — {len(counterfactual['conseils'])} conseils")
    except Exception as cf_err:
        print(f"❌ Counterfactual error: {cf_err}")
        counterfactual = {
            "applicable": False,
            "message": "Counterfactual non disponible",
            "conseils": []
        }

    return {
        "resume_fr": resume_lime,
        "raisons":   lime_raisons[:6],
        "lime": {
            "resume":  resume_lime,
            "raisons": lime_raisons[:8]
        },
        "shap": {
            "resume":     resume_shap,
            "raisons":    shap_raisons[:8],
            "base_value": round(base_value, 4)
        },
        "counterfactual": counterfactual
    }
