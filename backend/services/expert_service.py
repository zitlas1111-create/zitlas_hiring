from typing import Optional
from sqlalchemy.orm import Session, joinedload

from database.models import Expert, Consultation, Review
from schemas import ExpertCreate, ConsultationCreate, ReviewCreate


def list_experts(
    db: Session,
    expert_type: Optional[str] = None,
    verified_only: bool = False,
    skip: int = 0,
    limit: int = 50,
) -> list[Expert]:
    q = db.query(Expert).options(joinedload(Expert.user)).filter(Expert.is_active == True)
    if expert_type:
        q = q.filter(Expert.expert_type == expert_type)
    if verified_only:
        q = q.filter(Expert.verified == True)
    return q.order_by(Expert.rating.desc()).offset(skip).limit(limit).all()


def get_expert(db: Session, expert_id: str) -> Optional[Expert]:
    return db.query(Expert).options(joinedload(Expert.user)).filter(Expert.id == expert_id, Expert.is_active == True).first()


def get_expert_by_user(db: Session, user_id: str) -> Optional[Expert]:
    return db.query(Expert).filter(Expert.user_id == user_id).first()


def create_expert(db: Session, user_id: str, payload: ExpertCreate) -> Expert:
    expert = Expert(
        user_id         = user_id,
        expert_type     = payload.expert_type,
        specializations = payload.specializations,
        experience      = payload.experience,
        qualification   = payload.qualification,
        fees            = payload.fees or 500.0,
        bio             = payload.bio,
        languages       = payload.languages,
        city            = payload.city,
    )
    db.add(expert)
    db.commit()
    db.refresh(expert)
    return expert


def update_expert(db: Session, expert_id: str, user_id: str, payload: ExpertCreate) -> Optional[Expert]:
    expert = db.query(Expert).filter(Expert.id == expert_id, Expert.user_id == user_id).first()
    if not expert:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(expert, field, value)
    db.commit()
    db.refresh(expert)
    return expert


def create_consultation(db: Session, user_id: str, payload: ConsultationCreate) -> Consultation:
    c = Consultation(
        user_id           = user_id,
        expert_id         = payload.expert_id,
        consultation_type = payload.consultation_type,
        notes             = payload.notes,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def list_consultations(db: Session, user_id: str) -> list[Consultation]:
    return db.query(Consultation).filter(Consultation.user_id == user_id).order_by(Consultation.created_at.desc()).all()


def list_expert_consultations(db: Session, expert_id: str) -> list[Consultation]:
    return db.query(Consultation).filter(Consultation.expert_id == expert_id).order_by(Consultation.created_at.desc()).all()


def create_review(db: Session, user_id: str, payload: ReviewCreate) -> Review:
    r = Review(
        user_id   = user_id,
        expert_id = payload.expert_id,
        rating    = payload.rating,
        review    = payload.review,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    _refresh_expert_rating(db, payload.expert_id)
    return r


def _refresh_expert_rating(db: Session, expert_id: str) -> None:
    reviews = db.query(Review).filter(Review.expert_id == expert_id).all()
    if reviews:
        avg = sum(r.rating for r in reviews) / len(reviews)
        db.query(Expert).filter(Expert.id == expert_id).update({"rating": round(avg, 2)})
        db.commit()


def list_reviews(db: Session, expert_id: str) -> list[Review]:
    return db.query(Review).filter(Review.expert_id == expert_id).order_by(Review.created_at.desc()).all()
