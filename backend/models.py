"""
models.py
Rôle : Tables PostgreSQL — Users + CreditRequests
"""

from sqlalchemy import Column, Integer, Float, String, DateTime
from sqlalchemy.sql import func
from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="conseiller")  # "admin" ou "conseiller"
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CreditRequest(Base):
    __tablename__ = "credit_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)

    revolving_utilization = Column(Float)
    age = Column(Integer)
    late_30_59 = Column(Float)
    debt_ratio = Column(Float)
    monthly_income = Column(Float)
    open_credit_lines = Column(Integer)
    late_90 = Column(Integer)
    real_estate_loans = Column(Integer)
    late_60_89 = Column(Float)
    dependents = Column(Float)

    decision = Column(String)
    probability_default = Column(Float)
    probability_accepted = Column(Float)
    explanation_summary = Column(String)

    created_at = Column(DateTime(timezone=True), server_default=func.now())