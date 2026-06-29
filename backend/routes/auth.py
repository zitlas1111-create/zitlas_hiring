import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.connection import get_db
from middleware.auth import get_current_user
from schemas import UserCreate, UserLogin, Token, UserResponse, SendOtpRequest, VerifyOtpRequest, GoogleLoginRequest
import services.auth_service as auth_svc
import services.otp_service as otp_svc

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    try:
        return auth_svc.signup(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    try:
        return auth_svc.login(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/google-login", response_model=Token)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        return auth_svc.google_login(db, payload)
    except Exception as e:
        logger.error("Google login error: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/logout")
def logout():
    # JWT is stateless — the client simply discards the token
    return {"message": "Logged out successfully"}


# ── OTP ────────────────────────────────────────────────────────────────────────

@router.post("/send-otp")
def send_otp(payload: SendOtpRequest, db: Session = Depends(get_db)):
    """
    Generate a 6-digit OTP and deliver it via Twilio SMS.
    Rate limited: max 3 requests per phone per hour.
    """
    try:
        otp_svc.send_otp(db, payload.phone_number)
    except ValueError as exc:
        # Rate limit or validation error — surface message to the user
        raise HTTPException(status_code=429, detail=str(exc))
    except RuntimeError as exc:
        # Twilio delivery failure
        logger.error("SMS delivery failed for phone=%s: %s", payload.phone_number, exc)
        raise HTTPException(status_code=503, detail=str(exc))

    return {"success": True, "message": "OTP sent successfully"}


@router.post("/verify-otp")
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    """
    Verify the OTP for a given phone number.
    Increments attempt counter on every call; locks after 5 wrong attempts.
    """
    try:
        otp_svc.verify_otp(db, payload.phone_number, payload.otp)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {"success": True, "verified": True}
