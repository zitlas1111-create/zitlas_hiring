from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database.connection import get_db
from middleware.auth import get_current_user
from schemas import (
    ExpertCreate, ExpertResponse,
    ConsultationCreate, ConsultationResponse,
    ReviewCreate, ReviewResponse,
)
import services.expert_service as expert_svc

router = APIRouter()


# ── Experts ────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[ExpertResponse])
def list_experts(
    expert_type:   Optional[str] = Query(None, description="Filter: nutritionist | fitness_trainer"),
    verified_only: bool          = Query(False),
    skip:  int = Query(0,  ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return expert_svc.list_experts(db, expert_type=expert_type, verified_only=verified_only, skip=skip, limit=limit)


@router.get("/me", response_model=ExpertResponse)
def get_my_expert_profile(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    expert = expert_svc.get_expert_by_user(db, current_user.id)
    if not expert:
        raise HTTPException(status_code=404, detail="Expert profile not found")
    return expert


@router.get("/{expert_id}", response_model=ExpertResponse)
def get_expert(expert_id: str, db: Session = Depends(get_db)):
    expert = expert_svc.get_expert(db, expert_id)
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")
    return expert


@router.post("/", response_model=ExpertResponse, status_code=201)
def create_expert(
    payload: ExpertCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = expert_svc.get_expert_by_user(db, current_user.id)
    if existing:
        raise HTTPException(status_code=409, detail="Expert profile already exists. Use PUT to update.")
    return expert_svc.create_expert(db, current_user.id, payload)


@router.put("/{expert_id}", response_model=ExpertResponse)
def update_expert(
    expert_id: str,
    payload: ExpertCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expert = expert_svc.update_expert(db, expert_id, current_user.id, payload)
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found or access denied")
    return expert


# ── Consultations ──────────────────────────────────────────────────────────────

@router.post("/consultations", response_model=ConsultationResponse, status_code=201)
def book_consultation(
    payload: ConsultationCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return expert_svc.create_consultation(db, current_user.id, payload)


@router.get("/consultations/my", response_model=list[ConsultationResponse])
def my_consultations(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return expert_svc.list_consultations(db, current_user.id)


@router.get("/consultations/expert", response_model=list[ConsultationResponse])
def expert_consultations(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    expert = expert_svc.get_expert_by_user(db, current_user.id)
    if not expert:
        raise HTTPException(status_code=404, detail="Expert profile not found")
    return expert_svc.list_expert_consultations(db, expert.id)


# ── Reviews ────────────────────────────────────────────────────────────────────

@router.post("/reviews", response_model=ReviewResponse, status_code=201)
def submit_review(
    payload: ReviewCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return expert_svc.create_review(db, current_user.id, payload)


@router.get("/{expert_id}/reviews", response_model=list[ReviewResponse])
def get_expert_reviews(expert_id: str, db: Session = Depends(get_db)):
    return expert_svc.list_reviews(db, expert_id)
