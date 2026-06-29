import re
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.models import Affiliate, AffiliateClick, ExpertApplication, AffiliateEarning, AffiliateWithdrawal, User


def _generate_affiliate_id(db: Session, name: str) -> str:
    first_word = (name.strip().split()[0] if name.strip() else "PARTNER")
    slug = re.sub(r"[^A-Za-z]", "", first_word).upper()[:6] or "PARTNER"
    prefix = "AFF-" + slug
    count = db.query(Affiliate).filter(Affiliate.affiliate_id.like(prefix + "%")).count()
    return prefix + str(count + 1).zfill(2)


def register(db: Session, user_id: str) -> Affiliate:
    existing = db.query(Affiliate).filter(Affiliate.user_id == user_id).first()
    if existing:
        return existing
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")
    aff = Affiliate(
        user_id=user_id,
        affiliate_id=_generate_affiliate_id(db, user.name),
        status="pending",
        commission_rate=0.03,
    )
    db.add(aff)
    db.commit()
    db.refresh(aff)
    return aff


def get_by_user_id(db: Session, user_id: str) -> Optional[Affiliate]:
    return db.query(Affiliate).filter(Affiliate.user_id == user_id).first()


def get_by_code(db: Session, code: str) -> Optional[Affiliate]:
    return db.query(Affiliate).filter(Affiliate.affiliate_id == code).first()


def track_click(db: Session, code: str, ip: Optional[str], ua: Optional[str]) -> None:
    aff = get_by_code(db, code)
    if not aff:
        return
    db.add(AffiliateClick(affiliate_id=aff.id, ip_address=ip, user_agent=ua))
    db.commit()


def submit_expert_application(db: Session, name: str, email: Optional[str],
                               phone: Optional[str], role: str,
                               affiliate_ref: Optional[str], form_data: dict) -> ExpertApplication:
    aff = get_by_code(db, affiliate_ref) if affiliate_ref else None
    app = ExpertApplication(
        name=name,
        email=email or None,
        phone=phone or None,
        role=role,
        affiliate_ref=affiliate_ref or None,
        affiliate_id=aff.id if aff else None,
        form_data=form_data,
        status="pending",
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


def get_stats(db: Session, user_id: str) -> dict:
    aff = get_by_user_id(db, user_id)
    if not aff:
        raise ValueError("Not registered as affiliate")

    total_clicks = db.query(AffiliateClick).filter(AffiliateClick.affiliate_id == aff.id).count()

    q = db.query(ExpertApplication).filter(ExpertApplication.affiliate_id == aff.id)
    total_apps = q.count()
    approved   = q.filter(ExpertApplication.status == "approved").count()
    active     = q.filter(ExpertApplication.status == "active").count()
    rejected   = q.filter(ExpertApplication.status == "rejected").count()

    eq = db.query(AffiliateEarning).filter(AffiliateEarning.affiliate_id == aff.id)
    total_earned  = eq.with_entities(func.sum(AffiliateEarning.amount)).scalar() or 0.0
    pending_earn  = eq.filter(AffiliateEarning.status == "pending").with_entities(func.sum(AffiliateEarning.amount)).scalar() or 0.0
    paid_earn     = total_earned - pending_earn

    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    month_earn  = eq.filter(AffiliateEarning.earned_at >= month_start).with_entities(func.sum(AffiliateEarning.amount)).scalar() or 0.0

    total_withdrawn = db.query(func.sum(AffiliateWithdrawal.amount)).filter(
        AffiliateWithdrawal.affiliate_id == aff.id,
        AffiliateWithdrawal.status == "processed",
    ).scalar() or 0.0

    available = max(0.0, paid_earn - total_withdrawn)

    return {
        "affiliate_id":       aff.affiliate_id,
        "status":             aff.status,
        "commission_rate":    aff.commission_rate,
        "created_at":         aff.created_at.isoformat(),
        "total_clicks":       total_clicks,
        "total_applications": total_apps,
        "approved_experts":   approved,
        "active_experts":     active,
        "rejected_experts":   rejected,
        "total_earnings":     round(total_earned, 2),
        "available_balance":  round(available, 2),
        "pending_balance":    round(pending_earn, 2),
        "month_earnings":     round(month_earn, 2),
    }


def get_applications(db: Session, user_id: str, limit: int = 20, offset: int = 0) -> List[ExpertApplication]:
    aff = get_by_user_id(db, user_id)
    if not aff:
        raise ValueError("Not registered as affiliate")
    return (
        db.query(ExpertApplication)
        .filter(ExpertApplication.affiliate_id == aff.id)
        .order_by(ExpertApplication.submitted_at.desc())
        .offset(offset).limit(limit).all()
    )


def get_earnings_list(db: Session, user_id: str, limit: int = 20) -> List[AffiliateEarning]:
    aff = get_by_user_id(db, user_id)
    if not aff:
        raise ValueError("Not registered as affiliate")
    return (
        db.query(AffiliateEarning)
        .filter(AffiliateEarning.affiliate_id == aff.id)
        .order_by(AffiliateEarning.earned_at.desc())
        .limit(limit).all()
    )


def request_withdrawal(db: Session, user_id: str, amount: float, method: str = "bank") -> AffiliateWithdrawal:
    aff = get_by_user_id(db, user_id)
    if not aff:
        raise ValueError("Not registered as affiliate")
    if aff.status != "active":
        raise ValueError("Affiliate account must be active to withdraw")
    stats = get_stats(db, user_id)
    if amount < 100:
        raise ValueError("Minimum withdrawal amount is ₹100")
    if amount > stats["available_balance"]:
        raise ValueError(f"Amount exceeds available balance of ₹{stats['available_balance']:.2f}")
    w = AffiliateWithdrawal(
        affiliate_id=aff.id,
        amount=round(amount, 2),
        method=method,
        status="pending",
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    return w
