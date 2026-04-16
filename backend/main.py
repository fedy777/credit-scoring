"""
main.py
Rôle : Serveur FastAPI avec Auth JWT + PostgreSQL + Rôles Admin/Conseiller + Approbation
"""
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
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
import pandas as pd
import io

# Créer les tables automatiquement
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Credit Scoring API",
    description="API de prédiction de risque crédit avec Auth JWT et rôles",
    version="4.0.0"
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

    # Admin → approuvé direct | Conseiller → en attente
    statut = "approuve" if data.role == "admin" else "en_attente"

    user = models.User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
        statut=statut
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "message": "Compte créé avec succès" if statut == "approuve"
                   else "Demande envoyée — en attente d'approbation par l'administrateur",
        "username": user.username,
        "role": user.role,
        "statut": user.statut
    }


@app.post("/auth/login", tags=["Auth"])
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    # Vérifier le statut du compte
    if user.statut == "en_attente":
        raise HTTPException(
            status_code=403,
            detail="⏳ Votre compte est en attente d'approbation par l'administrateur."
        )
    if user.statut == "refuse":
        raise HTTPException(
            status_code=403,
            detail="❌ Votre demande d'accès a été refusée par l'administrateur."
        )

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
        "role": current_user.role,
        "statut": current_user.statut
    }


# ── Santé ─────────────────────────────────────────────────────────────────
@app.get("/", tags=["Santé"])
def root():
    return {"message": "Credit Scoring API v4 opérationnelle ✅"}


# ── Prédiction ────────────────────────────────────────────────────────────
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


# ── Explication ───────────────────────────────────────────────────────────
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
def get_history(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role == "admin":
        requests = db.query(models.CreditRequest).order_by(
            models.CreditRequest.created_at.desc()).all()
    else:
        requests = db.query(models.CreditRequest).filter(
            models.CreditRequest.user_id == current_user.id
        ).order_by(models.CreditRequest.created_at.desc()).all()
    return requests


# ── Supprimer une demande ─────────────────────────────────────────────────
@app.delete("/history/{request_id}", tags=["Historique"])
def delete_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    request = db.query(models.CreditRequest).filter(
        models.CreditRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    if current_user.role != "admin" and request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas supprimer cette demande")
    db.delete(request)
    db.commit()
    return {"message": f"Demande #{request_id} supprimée avec succès"}


# ── Statistiques ──────────────────────────────────────────────────────────
@app.get("/stats", tags=["Statistiques"])
def get_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role == "admin":
        query = db.query(models.CreditRequest)
    else:
        query = db.query(models.CreditRequest).filter(
            models.CreditRequest.user_id == current_user.id)
    total    = query.count()
    accepted = query.filter(models.CreditRequest.decision == "ACCEPTÉ").count()
    refused  = query.filter(models.CreditRequest.decision == "REFUSÉ").count()
    return {
        "total": total,
        "accepted": accepted,
        "refused": refused,
        "acceptance_rate": round(accepted / total * 100, 1) if total > 0 else 0,
        "role": current_user.role
    }


# ── Admin : Liste des utilisateurs ────────────────────────────────────────
@app.get("/admin/users", tags=["Admin"])
def get_users(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    users = db.query(models.User).all()
    return [
        {
            "id": u.id, "username": u.username,
            "email": u.email, "role": u.role,
            "statut": u.statut
        }
        for u in users
    ]


# ── Admin : Demandes en attente ───────────────────────────────────────────
@app.get("/admin/pending", tags=["Admin"])
def get_pending(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    users = db.query(models.User).filter(
        models.User.statut == "en_attente"
    ).all()
    return [
        {
            "id": u.id, "username": u.username,
            "email": u.email, "role": u.role,
            "statut": u.statut, "created_at": u.created_at
        }
        for u in users
    ]


# ── Admin : Approuver un utilisateur ─────────────────────────────────────
@app.put("/admin/users/{user_id}/approuver", tags=["Admin"])
def approuver_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    user.statut = "approuve"
    db.commit()
    return {"message": f"✅ Compte de {user.username} approuvé avec succès"}


# ── Admin : Refuser un utilisateur ───────────────────────────────────────
@app.put("/admin/users/{user_id}/refuser", tags=["Admin"])
def refuser_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Impossible de refuser votre propre compte")
    user.statut = "refuse"
    db.commit()
    return {"message": f"❌ Compte de {user.username} refusé"}


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
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte")
    db.delete(user)
    db.commit()
    return {"message": f"Utilisateur {user.username} supprimé avec succès"}


# ── Admin : Stats par conseiller ──────────────────────────────────────────
@app.get("/admin/stats-by-user", tags=["Admin"])
def stats_by_user(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    users = db.query(models.User).filter(models.User.role == "conseiller").all()
    result = []
    for user in users:
        total    = db.query(models.CreditRequest).filter(models.CreditRequest.user_id == user.id).count()
        accepted = db.query(models.CreditRequest).filter(
            models.CreditRequest.user_id == user.id,
            models.CreditRequest.decision == "ACCEPTÉ").count()
        refused  = db.query(models.CreditRequest).filter(
            models.CreditRequest.user_id == user.id,
            models.CreditRequest.decision == "REFUSÉ").count()
        result.append({
            "conseiller": user.username,
            "total": total, "accepted": accepted, "refused": refused,
            "acceptance_rate": round(accepted / total * 100, 1) if total > 0 else 0
        })
    return result


# ── Admin : Historique complet avec nom du conseiller ─────────────────────
@app.get("/admin/history-all", tags=["Admin"])
def history_all(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    requests = db.query(models.CreditRequest).order_by(
        models.CreditRequest.created_at.desc()).all()
    result = []
    for req in requests:
        user = db.query(models.User).filter(models.User.id == req.user_id).first()
        result.append({
            "id": req.id,
            "conseiller": user.username if user else "Inconnu",
            "age": req.age, "monthly_income": req.monthly_income,
            "decision": req.decision,
            "probability_default": req.probability_default,
            "probability_accepted": req.probability_accepted,
            "explanation_summary": req.explanation_summary,
            "created_at": req.created_at,
            "debt_ratio": req.debt_ratio,
            "open_credit_lines": req.open_credit_lines,
            "late_90": req.late_90, "dependents": req.dependents
        })
    return result


# ── Import CSV ────────────────────────────────────────────────────────────
@app.get("/import/template", tags=["Import CSV"])
def download_template():
    from fastapi.responses import StreamingResponse
    template_data = {
        "RevolvingUtilizationOfUnsecuredLines": [0.5, 0.85, 0.1],
        "age": [35, 28, 52],
        "NumberOfTime30-59DaysPastDueNotWorse": [0, 2, 0],
        "DebtRatio": [0.3, 0.6, 0.2],
        "MonthlyIncome": [5000, 2500, 8000],
        "NumberOfOpenCreditLinesAndLoans": [4, 7, 2],
        "NumberOfTimes90DaysLate": [0, 1, 0],
        "NumberRealEstateLoansOrLines": [1, 0, 2],
        "NumberOfTime60-89DaysPastDueNotWorse": [0, 1, 0],
        "NumberOfDependents": [2, 0, 3]
    }
    df = pd.DataFrame(template_data)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=modele_clients.csv"}
    )


@app.post("/import/csv", tags=["Import CSV"])
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Le fichier doit être un CSV")

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        required_columns = [
            "RevolvingUtilizationOfUnsecuredLines", "age",
            "NumberOfTime30-59DaysPastDueNotWorse", "DebtRatio",
            "MonthlyIncome", "NumberOfOpenCreditLinesAndLoans",
            "NumberOfTimes90DaysLate", "NumberRealEstateLoansOrLines",
            "NumberOfTime60-89DaysPastDueNotWorse", "NumberOfDependents"
        ]

        missing = [col for col in required_columns if col not in df.columns]
        if missing:
            raise HTTPException(status_code=400, detail=f"Colonnes manquantes : {', '.join(missing)}")

        if len(df) > 500:
            raise HTTPException(status_code=400, detail="Maximum 500 clients par import")

        results = []
        accepted_count = 0
        refused_count  = 0

        for index, row in df.iterrows():
            try:
                data = {col: float(row[col]) for col in required_columns}
                data["age"] = int(row["age"])
                data["NumberOfOpenCreditLinesAndLoans"] = int(row["NumberOfOpenCreditLinesAndLoans"])
                data["NumberOfTimes90DaysLate"]         = int(row["NumberOfTimes90DaysLate"])
                data["NumberRealEstateLoansOrLines"]    = int(row["NumberRealEstateLoansOrLines"])
                data["TotalLatePayments"] = (
                    data["NumberOfTime30-59DaysPastDueNotWorse"] +
                    data["NumberOfTime60-89DaysPastDueNotWorse"] +
                    data["NumberOfTimes90DaysLate"]
                )
                data["DebtToIncome"] = data["DebtRatio"] / (data["MonthlyIncome"] + 1)

                result = predict_credit(data)

                # LIME pour chaque client
                try:
                    from backend.explain import explain_prediction
                    explanation      = explain_prediction(data)
                    explanation_text = explanation["resume_fr"]
                except Exception:
                    explanation_text = ""

                db_request = models.CreditRequest(
                    user_id=int(current_user.id),
                    revolving_utilization=float(row["RevolvingUtilizationOfUnsecuredLines"]),
                    age=int(row["age"]),
                    late_30_59=float(row["NumberOfTime30-59DaysPastDueNotWorse"]),
                    debt_ratio=float(row["DebtRatio"]),
                    monthly_income=float(row["MonthlyIncome"]),
                    open_credit_lines=int(row["NumberOfOpenCreditLinesAndLoans"]),
                    late_90=int(row["NumberOfTimes90DaysLate"]),
                    real_estate_loans=int(row["NumberRealEstateLoansOrLines"]),
                    late_60_89=float(row["NumberOfTime60-89DaysPastDueNotWorse"]),
                    dependents=float(row["NumberOfDependents"]),
                    decision=str(result["decision"]),
                    probability_default=float(result["probability_default"]),
                    probability_accepted=float(result["probability_accepted"]),
                    explanation_summary=explanation_text
                )
                db.add(db_request)

                if result["decision"] == "ACCEPTÉ":
                    accepted_count += 1
                else:
                    refused_count += 1

                results.append({
                    "ligne": int(index + 1),
                    "age": int(row["age"]),
                    "monthly_income": float(row["MonthlyIncome"]),
                    "decision": str(result["decision"]),
                    "probability_default": float(result["probability_default"]),
                    "probability_accepted": float(result["probability_accepted"]),
                    "statut": "✅ succès"
                })

            except Exception as e:
                results.append({
                    "ligne": int(index + 1),
                    "age": int(row.get("age", 0)),
                    "monthly_income": float(row.get("MonthlyIncome", 0)),
                    "decision": "ERREUR",
                    "probability_default": 0.0,
                    "probability_accepted": 0.0,
                    "statut": f"❌ erreur: {str(e)}"
                })

        db.commit()

        return {
            "total": int(len(df)),
            "accepted": int(accepted_count),
            "refused": int(refused_count),
            "acceptance_rate": round(float(accepted_count) / len(df) * 100, 1),
            "results": results
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
