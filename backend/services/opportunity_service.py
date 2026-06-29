from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database.models import Opportunity
from schemas import OpportunityCreate


def list_opportunities(
    db: Session,
    role_type: Optional[str] = None,
    active_only: bool = True,
    skip: int = 0,
    limit: int = 50,
) -> List[Opportunity]:
    q = db.query(Opportunity)
    if active_only:
        q = q.filter(Opportunity.is_active == True)  # noqa: E712
    if role_type:
        q = q.filter(Opportunity.role_type == role_type)
    return q.order_by(desc(Opportunity.created_at)).offset(skip).limit(limit).all()


def get_opportunity(db: Session, opportunity_id: str) -> Optional[Opportunity]:
    return db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()


def create_opportunity(db: Session, posted_by_id: str, payload: OpportunityCreate) -> Opportunity:
    opp = Opportunity(
        title=payload.title,
        description=payload.description,
        role_type=payload.role_type,
        location=payload.location,
        salary_range=payload.salary_range,
        posted_by=posted_by_id,
        expires_at=payload.expires_at,
    )
    db.add(opp)
    db.commit()
    db.refresh(opp)
    return opp


def deactivate_opportunity(db: Session, opportunity_id: str, owner_id: str) -> Optional[Opportunity]:
    opp = db.query(Opportunity).filter(
        Opportunity.id == opportunity_id,
        Opportunity.posted_by == owner_id,
    ).first()
    if opp:
        opp.is_active = False
        db.commit()
        db.refresh(opp)
    return opp
