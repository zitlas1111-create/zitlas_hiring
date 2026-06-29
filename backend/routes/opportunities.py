from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database.connection import get_db
from middleware.auth import get_current_user
from schemas import OpportunityCreate, OpportunityResponse
import services.opportunity_service as opp_svc

router = APIRouter()


@router.get("/", response_model=list[OpportunityResponse])
def list_opportunities(
    role_type: Optional[str] = Query(None, description="Filter by role: nutritionist, fitness_coach, both"),
    skip: int  = Query(0,  ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return opp_svc.list_opportunities(db, role_type=role_type, skip=skip, limit=limit)


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
def get_opportunity(opportunity_id: str, db: Session = Depends(get_db)):
    opp = opp_svc.get_opportunity(db, opportunity_id)
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opp


@router.post("/", response_model=OpportunityResponse, status_code=201)
def create_opportunity(
    payload: OpportunityCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return opp_svc.create_opportunity(db, current_user.id, payload)


@router.delete("/{opportunity_id}", status_code=204)
def deactivate_opportunity(
    opportunity_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = opp_svc.deactivate_opportunity(db, opportunity_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Opportunity not found or access denied")
