from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db
from middleware.auth import get_current_user
from schemas import ProfileUpsert, ProfileResponse
import services.profile_service as profile_svc

router = APIRouter()


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    profile = profile_svc.get_profile(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found — save your profile first")
    return profile


@router.put("/me", response_model=ProfileResponse)
def upsert_my_profile(
    payload: ProfileUpsert,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return profile_svc.upsert_profile(db, current_user.id, current_user.role, payload)


@router.post("/me/publish", response_model=ProfileResponse)
def publish_my_profile(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    profile = profile_svc.publish_profile(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.get("/{user_id}", response_model=ProfileResponse)
def get_profile(user_id: str, db: Session = Depends(get_db)):
    profile = profile_svc.get_profile(db, user_id)
    if not profile or not profile.is_published:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
