import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from database.models import PhoneOtp
from services.twilio_service import send_otp_sms

logger = logging.getLogger(__name__)

OTP_EXPIRY_MINUTES      = 5
OTP_MAX_ATTEMPTS        = 5
OTP_RATE_LIMIT_PER_HOUR = 3   # max OTP sends per phone per hour


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_otp() -> str:
    """Cryptographically random 6-digit OTP (100000–999999)."""
    return str(secrets.randbelow(900_000) + 100_000)


def _count_recent_requests(db: Session, phone: str) -> int:
    """Count OTP records created in the last hour for this phone."""
    cutoff = datetime.utcnow() - timedelta(hours=1)
    return (
        db.query(PhoneOtp)
        .filter(PhoneOtp.phone_number == phone, PhoneOtp.created_at >= cutoff)
        .count()
    )


def _latest_otp(db: Session, phone: str) -> Optional[PhoneOtp]:
    return (
        db.query(PhoneOtp)
        .filter(PhoneOtp.phone_number == phone)
        .order_by(PhoneOtp.created_at.desc())
        .first()
    )


# ── Send OTP ──────────────────────────────────────────────────────────────────

def send_otp(db: Session, phone_number: str) -> None:
    """
    1. Rate-limit check (max 3 requests / phone / hour).
    2. Delete all previous OTP records for this phone.
    3. Generate a 6-digit OTP.
    4. Persist to phone_otps.
    5. Send SMS via Twilio.

    Raises ValueError for rate limit / validation errors.
    Raises RuntimeError for SMS delivery failures.
    """
    # Rate limit
    recent = _count_recent_requests(db, phone_number)
    if recent >= OTP_RATE_LIMIT_PER_HOUR:
        logger.warning("OTP rate limit hit for phone=%s (count=%d)", phone_number, recent)
        raise ValueError(
            f"Too many OTP requests. You can request a maximum of {OTP_RATE_LIMIT_PER_HOUR} "
            "OTPs per hour. Please try again later."
        )

    # Purge old OTPs for this phone (keep table clean)
    db.query(PhoneOtp).filter(PhoneOtp.phone_number == phone_number).delete()

    # Create new OTP
    otp_code = _generate_otp()
    record   = PhoneOtp(
        phone_number=phone_number,
        otp_code=otp_code,
        is_verified=False,
        attempts=0,
        expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
    )
    db.add(record)
    db.commit()
    logger.info("OTP generated for phone=%s (expires_at=%s)", phone_number, record.expires_at)

    # Send SMS — may raise RuntimeError on Twilio failure
    send_otp_sms(phone_number, otp_code)


# ── Verify OTP ────────────────────────────────────────────────────────────────

def verify_otp(db: Session, phone_number: str, otp_code: str) -> bool:
    """
    1. Look up the latest OTP for the phone.
    2. Check expiry.
    3. Increment attempt counter (always, even on wrong code).
    4. Check attempt limit before comparing.
    5. Compare code.
    6. Mark verified on match.

    Raises ValueError with user-facing message on any failure.
    Returns True on success.
    """
    record = _latest_otp(db, phone_number)

    if not record:
        logger.warning("No OTP found for phone=%s", phone_number)
        raise ValueError("No OTP found for this number. Please request a new OTP.")

    if record.is_verified:
        logger.info("Phone=%s already verified", phone_number)
        return True  # idempotent — already verified

    # Increment attempts first (before checking) to prevent timing-based bypass
    record.attempts += 1
    db.commit()

    # Expiry check
    if datetime.utcnow() > record.expires_at:
        logger.warning("Expired OTP attempt for phone=%s", phone_number)
        raise ValueError("OTP has expired. Please request a new one.")

    # Attempt limit check
    if record.attempts > OTP_MAX_ATTEMPTS:
        logger.warning(
            "Too many OTP attempts for phone=%s (attempts=%d)", phone_number, record.attempts
        )
        raise ValueError(
            f"Too many incorrect attempts ({OTP_MAX_ATTEMPTS} maximum). "
            "Please request a new OTP."
        )

    # Code comparison (constant-time via secrets.compare_digest)
    if not secrets.compare_digest(record.otp_code, otp_code):
        remaining = OTP_MAX_ATTEMPTS - record.attempts
        logger.warning(
            "Wrong OTP for phone=%s (attempt %d/%d)", phone_number, record.attempts, OTP_MAX_ATTEMPTS
        )
        if remaining <= 0:
            raise ValueError(
                f"Incorrect OTP. You have used all {OTP_MAX_ATTEMPTS} attempts. "
                "Please request a new OTP."
            )
        raise ValueError(f"Incorrect OTP. {remaining} attempt{'s' if remaining != 1 else ''} remaining.")

    # Success — mark verified
    record.is_verified = True
    db.commit()
    logger.info("Phone=%s verified successfully", phone_number)
    return True
