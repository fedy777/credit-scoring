"""
main.py
Rôle : Serveur FastAPI avec Auth JWT + PostgreSQL + Rôles Admin/Conseiller
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.predict import predict_credit
from backend.explain import explain_prediction
from backend.database import get_db, engine
from backend import models
from backend.auth import (
    hash_password, verify_password,
    create_access_token, get_current_user, require_admin
)

# Créer les tables automatiquement
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Credit Scoring API",
    description="API de prédiction de risque crédit avec Auth JWT et rôles",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schémas ───────────────────────────────────────────────────────────────
class RegisterSchema(BaseModel):
    username: str
    email: str
    password: str
    role: str = "conseiller"


class ClientData(BaseModel):
    RevolvingUtilizationOfUnsecuredLines: float = Field(..., ge=0)
    age: int = Field(..., ge=18, le=110)
    NumberOfTime30_59DaysPastDueNotWorse: float = Field(..., alias="NumberOfTime30-59DaysPastDueNotWorse")
    DebtRatio: float = Field(..., ge=0)
    MonthlyIncome: float = Field(..., ge=0)
    NumberOfOpenCreditLinesAndLoans: int = Field(..., ge=0)
    NumberOfTimes90DaysLate: int = Field(..., ge=0)
    NumberRealEstateLoansOrLines: int = Field(..., ge=0)
    NumberOfTime60_89DaysPastDueNotWorse: float = Field(..., alias="NumberOfTime60-89DaysPastDueNotWorse")
    NumberOfDependents: float = Field(..., ge=0)

    model_config = {"populate_by_name": True}

    def to_feature_dict(self):
        d = self.model_dump(by_alias=True)
        d["TotalLatePayments"] = (
            d["NumberOfTime30-59DaysPastDueNotWorse"] +
            d["NumberOfTime60-89DaysPastDueNotWorse"] +
            d["NumberOfTimes90DaysLate"]
        )
        d["DebtToIncome"] = d["DebtRatio"] / (d["MonthlyIncome"] + 1)
        return d


# ── Auth Routes ───────────────────────────────────────────────────────────
@app.post("/auth/register", tags=["Auth"])
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Nom d'utilisateur déjà utilisé")
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    user = models.User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "message": "Compte créé avec succès",
        "username": user.username,
        "role": user.role
    }


@app.post("/auth/login", tags=["Auth"])
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.username == form.username
    ).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    token = create_access_token({"sub": user.username, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
        "role": user.role
    }


@app.get("/auth/me", tags=["Auth"])
def get_me(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role
    }


# ── Santé ─────────────────────────────────────────────────────────────────
@app.get("/", tags=["Santé"])
def root():
    return {"message": "Credit Scoring API v3 opérationnelle ✅"}


# ── Prédiction (Conseiller seulement) ─────────────────────────────────────
@app.post("/predict", tags=["Prédiction"])
def predict(
    client: ClientData,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        data = client.to_feature_dict()
        result = predict_credit(data)

        db_request = models.CreditRequest(
            user_id=current_user.id,
            revolving_utilization=client.RevolvingUtilizationOfUnsecuredLines,
            age=client.age,
            late_30_59=client.NumberOfTime30_59DaysPastDueNotWorse,
            debt_ratio=client.DebtRatio,
            monthly_income=client.MonthlyIncome,
            open_credit_lines=client.NumberOfOpenCreditLinesAndLoans,
            late_90=client.NumberOfTimes90DaysLate,
            real_estate_loans=client.NumberRealEstateLoansOrLines,
            late_60_89=client.NumberOfTime60_89DaysPastDueNotWorse,
            dependents=client.NumberOfDependents,
            decision=result["decision"],
            probability_default=result["probability_default"],
            probability_accepted=result["probability_accepted"],
            explanation_summary=""
        )
        db.add(db_request)
        db.commit()
        db.refresh(db_request)
        return {**result, "id": db_request.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Explication (Conseiller seulement) ────────────────────────────────────
@app.post("/explain", tags=["Explication"])
def explain(
    client: ClientData,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        data = client.to_feature_dict()
        result = predict_credit(data)
        explanation = explain_prediction(data)

        db_request = models.CreditRequest(
            user_id=current_user.id,
            revolving_utilization=client.RevolvingUtilizationOfUnsecuredLines,
            age=client.age,
            late_30_59=client.NumberOfTime30_59DaysPastDueNotWorse,
            debt_ratio=client.DebtRatio,
            monthly_income=client.MonthlyIncome,
            open_credit_lines=client.NumberOfOpenCreditLinesAndLoans,
            late_90=client.NumberOfTimes90DaysLate,
            real_estate_loans=client.NumberRealEstateLoansOrLines,
            late_60_89=client.NumberOfTime60_89DaysPastDueNotWorse,
            dependents=client.NumberOfDependents,
            decision=result["decision"],
            probability_default=result["probability_default"],
            probability_accepted=result["probability_accepted"],
            explanation_summary=explanation["resume_fr"]
        )
        db.add(db_request)
        db.commit()
        db.refresh(db_request)
        return {**result, "id": db_request.id, "explication": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Historique ────────────────────────────────────────────────────────────
@app.get("/history", tags=["Historique"])
def get_history(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Admin voit tout, Conseiller voit seulement ses demandes
    if current_user.role == "admin":
        requests = db.query(models.CreditRequest).order_by(
            models.CreditRequest.created_at.desc()
        ).all()
    else:
        requests = db.query(models.CreditRequest).filter(
            models.CreditRequest.user_id == current_user.id
        ).order_by(models.CreditRequest.created_at.desc()).all()
    return requests


# ── Statistiques ──────────────────────────────────────────────────────────
@app.get("/stats", tags=["Statistiques"])
def get_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Admin voit stats globales, Conseiller voit ses stats
    if current_user.role == "admin":
        query = db.query(models.CreditRequest)
    else:
        query = db.query(models.CreditRequest).filter(
            models.CreditRequest.user_id == current_user.id
        )

    total = query.count()
    accepted = query.filter(models.CreditRequest.decision == "ACCEPTÉ").count()
    refused = query.filter(models.CreditRequest.decision == "REFUSÉ").count()

    return {
        "total": total,
        "accepted": accepted,
        "refused": refused,
        "acceptance_rate": round(accepted / total * 100, 1) if total > 0 else 0,
        "role": current_user.role
    }


# ── Admin : Liste des utilisateurs ────────────────────────────────────────
@app.get("/admin/users", tags=["Admin"])
def get_users(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    users = db.query(models.User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role
        }
        for u in users
    ]


# ── Admin : Supprimer un utilisateur ─────────────────────────────────────
@app.delete("/admin/users/{user_id}", tags=["Admin"])
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Impossible de supprimer votre propre compte"
        )
    db.delete(user)
    db.commit()
    return {"message": f"Utilisateur {user.username} supprimé avec succès"}


# ── Admin : Stats par conseiller ──────────────────────────────────────────
@app.get("/admin/stats-by-user", tags=["Admin"])
def stats_by_user(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    users = db.query(models.User).filter(
        models.User.role == "conseiller"
    ).all()

    result = []
    for user in users:
        total = db.query(models.CreditRequest).filter(
            models.CreditRequest.user_id == user.id
        ).count()
        accepted = db.query(models.CreditRequest).filter(
            models.CreditRequest.user_id == user.id,
            models.CreditRequest.decision == "ACCEPTÉ"
        ).count()
        refused = db.query(models.CreditRequest).filter(
            models.CreditRequest.user_id == user.id,
            models.CreditRequest.decision == "REFUSÉ"
        ).count()
        result.append({
            "conseiller": user.username,
            "total": total,
            "accepted": accepted,
            "refused": refused,
            "acceptance_rate": round(accepted / total * 100, 1) if total > 0 else 0
        })
    return result


# ── Admin : Historique complet avec nom du conseiller ─────────────────────
@app.get("/admin/history-all", tags=["Admin"])
def history_all(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    requests = db.query(models.CreditRequest).order_by(
        models.CreditRequest.created_at.desc()
    ).all()

    result = []
    for req in requests:
        user = db.query(models.User).filter(
            models.User.id == req.user_id
        ).first()
        result.append({
            "id": req.id,
            "conseiller": user.username if user else "Inconnu",
            "age": req.age,
            "monthly_income": req.monthly_income,
            "decision": req.decision,
            "probability_default": req.probability_default,
            "probability_accepted": req.probability_accepted,
            "explanation_summary": req.explanation_summary,
            "created_at": req.created_at,
            "debt_ratio": req.debt_ratio,
            "open_credit_lines": req.open_credit_lines,
            "late_90": req.late_90,
            "dependents": req.dependents
        })
    return result