from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db
from middleware.auth import get_current_user
from schemas import ApplicationCreate, ApplicationResponse
import services.application_service as app_svc

router = APIRouter()


@router.get("/", response_model=list[ApplicationResponse])
def my_applications(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return app_svc.my_applications(db, current_user.id)


@router.post("/", response_model=ApplicationResponse, status_code=201)
def apply(
    payload: ApplicationCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return app_svc.apply(db, current_user.id, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(
    application_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = app_svc.get_application(db, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return application


@router.patch("/{application_id}/status", response_model=ApplicationResponse)
def update_status(
    application_id: str,
    status: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = app_svc.update_status(db, application_id, status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not result:
        raise HTTPException(status_code=404, detail="Application not found")
    return result
