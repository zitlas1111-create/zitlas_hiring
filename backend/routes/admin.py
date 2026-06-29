import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database.connection import get_db
from middleware.auth import get_current_user
import services.admin_service as admin_svc
import services.email_service as email_svc
from schemas import ApproveApplicationRequest, RejectApplicationRequest

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Admin auth dependency ─────────────────────────────────────────────────────

def require_admin(current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize(app, full: bool = False) -> dict:
    d = {
        "id":             app.id,
        "name":           app.name,
        "email":          app.email,
        "phone":          app.phone,
        "expert_type":    app.role,
        "status":         app.status,
        "submitted_at":   app.submitted_at.isoformat() if app.submitted_at else None,
        "reviewed_at":    app.reviewed_at.isoformat() if app.reviewed_at else None,
        "reviewed_by":    getattr(app, "reviewed_by", None),
        "approval_notes": getattr(app, "approval_notes", None),
        "affiliate_ref":  app.affiliate_ref,
        "profile_photo":  getattr(app, "profile_photo", None),
    }
    if full:
        d["form_data"] = app.form_data or {}
    return d


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return admin_svc.application_counts(db)


@router.get("/applications")
def list_applications(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all expert applications with optional status filter."""
    valid_statuses = {"pending", "approved", "rejected"}
    if status and status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"status must be one of: {', '.join(valid_statuses)}")
    apps = admin_svc.list_applications(db, status=status, skip=skip, limit=limit)
    return [_serialize(a) for a in apps]


@router.get("/applications/{app_id}")
def get_application(
    app_id: str,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get full details of a single application including form_data."""
    app = admin_svc.get_application(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return _serialize(app, full=True)


@router.post("/applications/{app_id}/approve")
def approve_application(
    app_id: str,
    payload: ApproveApplicationRequest,
    background_tasks: BackgroundTasks,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Approve an application:
    1. Creates ExpertAccount.
    2. Generates one-time password setup token.
    3. Sends approval email with setup link to the applicant.
    """
    try:
        account, raw_token = admin_svc.approve_application(db, app_id, admin.id, payload.notes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    app = admin_svc.get_application(db, app_id)
    if app and app.email:
        background_tasks.add_task(
            email_svc.send_approval_email,
            name=app.name,
            email=app.email,
            setup_token=raw_token,
        )

    logger.info("Application %s approved by admin %s", app_id, admin.id)
    return {
        "success": True,
        "account_id": account.id,
        "message": f"Application approved. Password setup email sent to {app.email if app else '(no email)'}.",
    }


@router.post("/applications/{app_id}/reject")
def reject_application(
    app_id: str,
    payload: RejectApplicationRequest,
    background_tasks: BackgroundTasks,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Reject an application:
    1. Marks status as rejected.
    2. Sends rejection email with reason.
    """
    try:
        app = admin_svc.reject_application(db, app_id, admin.id, payload.reason)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if app.email:
        background_tasks.add_task(
            email_svc.send_rejection_email,
            name=app.name,
            email=app.email,
            reason=payload.reason,
        )

    logger.info("Application %s rejected by admin %s", app_id, admin.id)
    return {"success": True, "message": "Application rejected. Notification email sent."}
