from typing import Optional
from sqlalchemy.orm import Session
from database.models import Profile
from schemas import ProfileUpsert


def get_profile(db: Session, user_id: str) -> Optional[Profile]:
    return db.query(Profile).filter(Profile.user_id == user_id).first()


def upsert_profile(db: Session, user_id: str, role: str, payload: ProfileUpsert) -> Profile:
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()

    if profile:
        if payload.data is not None:
            profile.data = payload.data
        if payload.completion_pct is not None:
            profile.completion_pct = payload.completion_pct
        if payload.is_published is not None:
            profile.is_published = payload.is_published
    else:
        profile = Profile(
            user_id=user_id,
            role=role,
            data=payload.data,
            completion_pct=payload.completion_pct or 0,
            is_published=payload.is_published or False,
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)
    return profile


def publish_profile(db: Session, user_id: str) -> Optional[Profile]:
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if profile:
        profile.is_published = True
        db.commit()
        db.refresh(profile)
    return profile
