import secrets
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from database.models import ExpertApplication, ExpertAccount, PasswordSetupToken
from services.auth_service import hash_password

logger = logging.getLogger(__name__)

TOKEN_EXPIRY_HOURS = 24


# ── Application listing ───────────────────────────────────────────────────────

def list_applications(
    db: Session,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[ExpertApplication]:
    q = db.query(ExpertApplication)
    if status:
        q = q.filter(ExpertApplication.status == status)
    return q.order_by(ExpertApplication.submitted_at.desc()).offset(skip).limit(limit).all()


def get_application(db: Session, app_id: str) -> Optional[ExpertApplication]:
    return db.query(ExpertApplication).filter(ExpertApplication.id == app_id).first()


def application_counts(db: Session) -> dict:
    total    = db.query(ExpertApplication).count()
    pending  = db.query(ExpertApplication).filter(ExpertApplication.status == "pending").count()
    approved = db.query(ExpertApplication).filter(ExpertApplication.status == "approved").count()
    rejected = db.query(ExpertApplication).filter(ExpertApplication.status == "rejected").count()
    return {"total": total, "pending": pending, "approved": approved, "rejected": rejected}


# ── Approve ───────────────────────────────────────────────────────────────────

def approve_application(
    db: Session,
    app_id: str,
    admin_id: str,
    notes: Optional[str] = None,
) -> Tuple[ExpertAccount, str]:
    """
    1. Validate application is pending and has an email.
    2. Create ExpertAccount (password is null until setup link is used).
    3. Generate a one-time password setup token (expires in 24 h).
    4. Mark application as approved.
    Returns (account, raw_token) — caller must email the token.
    """
    app = db.query(ExpertApplication).filter(ExpertApplication.id == app_id).first()
    if not app:
        raise ValueError("Application not found")
    if app.status != "pending":
        raise ValueError(f"Application is already '{app.status}' — cannot approve again")
    if not app.email:
        raise ValueError("Application has no email address — cannot create account or send setup link")

    existing = db.query(ExpertAccount).filter(ExpertAccount.application_id == app_id).first()
    if existing:
        raise ValueError("An expert account already exists for this application")

    # Mark approved
    app.status        = "approved"
    app.reviewed_at   = datetime.utcnow()
    app.reviewed_by   = admin_id
    app.approval_notes = notes or ""

    # Create account (password set later via setup link)
    account = ExpertAccount(
        application_id=app_id,
        email=app.email,
        expert_type=app.role,
        is_verified=True,
    )
    db.add(account)
    db.flush()  # populate account.id before creating token

    # Generate setup token
    raw_token = secrets.token_urlsafe(32)
    token_rec = PasswordSetupToken(
        expert_id=account.id,
        token=raw_token,
        expires_at=datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS),
        used=False,
    )
    db.add(token_rec)
    db.commit()
    db.refresh(account)

    logger.info("Application %s approved — account %s created, setup token generated", app_id, account.id)
    return account, raw_token


# ── Reject ────────────────────────────────────────────────────────────────────

def reject_application(
    db: Session,
    app_id: str,
    admin_id: str,
    reason: str,
) -> ExpertApplication:
    app = db.query(ExpertApplication).filter(ExpertApplication.id == app_id).first()
    if not app:
        raise ValueError("Application not found")
    if app.status != "pending":
        raise ValueError(f"Application is already '{app.status}' — cannot reject again")

    app.status        = "rejected"
    app.reviewed_at   = datetime.utcnow()
    app.reviewed_by   = admin_id
    app.approval_notes = reason
    db.commit()

    logger.info("Application %s rejected by admin %s", app_id, admin_id)
    return app


# ── Password setup token ──────────────────────────────────────────────────────

def verify_setup_token(db: Session, token: str) -> Optional[PasswordSetupToken]:
    """Return the token record if valid and unexpired, else None."""
    rec = (
        db.query(PasswordSetupToken)
        .filter(PasswordSetupToken.token == token, PasswordSetupToken.used == False)  # noqa: E712
        .first()
    )
    if not rec:
        return None
    if rec.expires_at < datetime.utcnow():
        return None
    return rec


def complete_password_setup(db: Session, token: str, new_password: str) -> ExpertAccount:
    """
    Validate token, set bcrypt-hashed password on the ExpertAccount,
    mark token as used.
    """
    rec = verify_setup_token(db, token)
    if not rec:
        raise ValueError("Invalid or expired setup link. Please contact support.")

    account = db.query(ExpertAccount).filter(ExpertAccount.id == rec.expert_id).first()
    if not account:
        raise ValueError("Expert account not found")

    account.password_hash = hash_password(new_password)
    rec.used = True
    db.commit()
    db.refresh(account)

    logger.info("Password setup completed for expert account %s", account.id)
    return account
