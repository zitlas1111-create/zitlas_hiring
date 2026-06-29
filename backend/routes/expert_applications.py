import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import ExpertApplication
import services.affiliate_service as aff_svc
import services.email_service as email_svc
from schemas import ExpertApplicationCreate, ExpertApplicationResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", status_code=201)
def submit_application(
    payload: ExpertApplicationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Submit a new expert application.
    - Validates required contact info.
    - Persists to expert_applications table (status = pending).
    - Sends a notification email to the ZITLAS admin in the background.
    """
    if not payload.email and not payload.phone:
        raise HTTPException(status_code=400, detail="Email or phone number is required")

    app = aff_svc.submit_expert_application(
        db,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        role=payload.role,
        affiliate_ref=payload.affiliate_ref,
        form_data=payload.form_data,
    )

    # Fire-and-forget admin notification — does not block response
    background_tasks.add_task(email_svc.notify_admin_new_application, app)

    logger.info("New expert application submitted: id=%s role=%s", app.id, app.role)
    return {
        "id": app.id,
        "status": app.status,
        "message": (
            "Thank you for applying to become a ZITLAS Expert. "
            "Our team will review your application and contact you via email once it has been approved."
        ),
    }


@router.get("/{app_id}/status")
def get_application_status(app_id: str, db: Session = Depends(get_db)):
    """Public endpoint — allows applicant to poll their application status by ID."""
    app = db.query(ExpertApplication).filter(ExpertApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return {
        "id":           app.id,
        "status":       app.status,
        "submitted_at": app.submitted_at.isoformat(),
        "reviewed_at":  app.reviewed_at.isoformat() if app.reviewed_at else None,
    }
