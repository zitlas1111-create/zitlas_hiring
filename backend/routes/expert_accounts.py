import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import ExpertAccount
import services.admin_service as admin_svc
from schemas import SetPasswordRequest, VerifyTokenResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/verify-token", response_model=VerifyTokenResponse)
def verify_token(token: str, db: Session = Depends(get_db)):
    """
    Validate a password setup token.
    Used by the set-password page on load to confirm the link is still valid.
    """
    rec = admin_svc.verify_setup_token(db, token)
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or expired setup link.")

    account = db.query(ExpertAccount).filter(ExpertAccount.id == rec.expert_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Expert account not found.")

    return VerifyTokenResponse(
        valid=True,
        email=account.email,
        expert_type=account.expert_type,
    )


@router.post("/set-password")
def set_password(payload: SetPasswordRequest, db: Session = Depends(get_db)):
    """
    Complete the password setup flow:
    1. Validates the token (not used, not expired).
    2. Hashes the new password and saves it.
    3. Marks the token as used (one-time).
    """
    try:
        account = admin_svc.complete_password_setup(db, payload.token, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    logger.info("Password setup completed for expert account id=%s", account.id)
    return {
        "success": True,
        "email":   account.email,
        "message": "Password created successfully. You can now log in to your expert account.",
    }
