from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database.connection import get_db
from middleware.auth import get_current_user
from schemas import ExpertApplicationCreate, TrackClickRequest, WithdrawRequest
import services.affiliate_service as aff_svc

router = APIRouter()


# ── Public endpoints (no auth required) ───────────────────────────────────────

@router.post("/track-click", status_code=200)
def track_click(payload: TrackClickRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    aff_svc.track_click(db, payload.affiliate_code, ip, ua)
    return {"ok": True}


@router.get("/validate/{code}")
def validate_code(code: str, db: Session = Depends(get_db)):
    aff = aff_svc.get_by_code(db, code)
    if not aff:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    return {"valid": True, "affiliate_id": aff.affiliate_id, "status": aff.status}


@router.post("/apply", status_code=201)
def submit_expert_application(payload: ExpertApplicationCreate, db: Session = Depends(get_db)):
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
    return {"id": app.id, "message": "Application submitted successfully"}


# ── Authenticated endpoints ────────────────────────────────────────────────────

@router.post("/register", status_code=201)
def register(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        aff = aff_svc.register(db, current_user.id)
        return {
            "user_name":       current_user.name,
            "affiliate_id":    aff.affiliate_id,
            "status":          aff.status,
            "commission_rate": aff.commission_rate,
            "created_at":      aff.created_at.isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me")
def get_my_profile(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    aff = aff_svc.get_by_user_id(db, current_user.id)
    if not aff:
        raise HTTPException(status_code=404, detail="Not registered as affiliate")
    return {
        "user_name":       current_user.name,
        "affiliate_id":    aff.affiliate_id,
        "status":          aff.status,
        "commission_rate": aff.commission_rate,
        "created_at":      aff.created_at.isoformat(),
    }


@router.get("/stats")
def get_stats(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        return aff_svc.get_stats(db, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/applications")
def get_applications(
    limit: int = 20,
    offset: int = 0,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        apps = aff_svc.get_applications(db, current_user.id, limit, offset)
        return [
            {
                "id":           a.id,
                "name":         a.name,
                "role":         a.role,
                "email":        a.email,
                "phone":        a.phone,
                "status":       a.status,
                "submitted_at": a.submitted_at.isoformat(),
            }
            for a in apps
        ]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/earnings")
def get_earnings(
    limit: int = 20,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        earnings = aff_svc.get_earnings_list(db, current_user.id, limit)
        return [
            {
                "id":               e.id,
                "amount":           e.amount,
                "consultation_fee": e.consultation_fee,
                "status":           e.status,
                "earned_at":        e.earned_at.isoformat(),
            }
            for e in earnings
        ]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/withdraw")
def request_withdrawal(
    payload: WithdrawRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        w = aff_svc.request_withdrawal(db, current_user.id, payload.amount, payload.method)
        return {"id": w.id, "status": w.status, "amount": w.amount}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
