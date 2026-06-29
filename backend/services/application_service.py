from typing import List, Optional
from sqlalchemy.orm import Session
from database.models import Application, Opportunity
from schemas import ApplicationCreate

VALID_STATUSES = {"pending", "reviewed", "shortlisted", "rejected"}


def apply(db: Session, user_id: str, payload: ApplicationCreate) -> Application:
    opp = db.query(Opportunity).filter(Opportunity.id == payload.opportunity_id).first()
    if not opp:
        raise ValueError("Opportunity not found")
    if not opp.is_active:
        raise ValueError("Opportunity is no longer active")

    existing = db.query(Application).filter(
        Application.user_id == user_id,
        Application.opportunity_id == payload.opportunity_id,
    ).first()
    if existing:
        raise ValueError("You have already applied to this opportunity")

    application = Application(
        user_id=user_id,
        opportunity_id=payload.opportunity_id,
        notes=payload.notes,
        status="pending",
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def my_applications(db: Session, user_id: str) -> List[Application]:
    return (
        db.query(Application)
        .filter(Application.user_id == user_id)
        .order_by(Application.applied_at.desc())
        .all()
    )


def get_application(db: Session, application_id: str) -> Optional[Application]:
    return db.query(Application).filter(Application.id == application_id).first()


def update_status(db: Session, application_id: str, new_status: str) -> Optional[Application]:
    if new_status not in VALID_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(VALID_STATUSES)}")
    app = db.query(Application).filter(Application.id == application_id).first()
    if app:
        app.status = new_status
        db.commit()
        db.refresh(app)
    return app
