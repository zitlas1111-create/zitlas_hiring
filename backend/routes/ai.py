from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.connection import get_db
from middleware.auth import get_current_user
from schemas import AssessmentRequest
import services.profile_service as profile_svc
import services.ai_service as ai_svc

router = APIRouter()


@router.get("/profile-suggestions")
def profile_suggestions(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    profile = profile_svc.get_profile(db, current_user.id)
    data = profile.data if profile else {}
    return ai_svc.profile_suggestions(current_user.role, data)


@router.get("/expert-matches")
def expert_matches(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    profile = profile_svc.get_profile(db, current_user.id)
    data = profile.data if profile else {}
    return {"matches": ai_svc.expert_matches(current_user.role, data)}


@router.post("/generate-bio")
def generate_bio(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    profile = profile_svc.get_profile(db, current_user.id)
    data = profile.data if profile else {}
    return {"bio": ai_svc.generate_bio(current_user.role, data)}


@router.post("/assessment")
def generate_assessment(
    payload: AssessmentRequest,
    current_user=Depends(get_current_user),
):
    return ai_svc.generate_assessment(payload.model_dump())


@router.post("/swot")
def generate_swot(
    payload: AssessmentRequest,
    current_user=Depends(get_current_user),
):
    return ai_svc.generate_swot(payload.model_dump())


@router.post("/diet-plan")
def generate_diet_plan(
    payload: AssessmentRequest,
    current_user=Depends(get_current_user),
):
    return ai_svc.generate_diet_plan(payload.model_dump())


@router.post("/workout-plan")
def generate_workout_plan(
    payload: AssessmentRequest,
    current_user=Depends(get_current_user),
):
    return ai_svc.generate_workout_plan(payload.model_dump())
