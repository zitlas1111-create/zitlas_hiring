import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship

from database.connection import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id            = Column(String(36),  primary_key=True, default=_uuid)
    email         = Column(String(255), unique=True, nullable=True, index=True)
    phone         = Column(String(20),  unique=True, nullable=True, index=True)
    name          = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(50),  nullable=False)
    google_uid    = Column(String(255), unique=True, nullable=True, index=True)
    picture       = Column(String(500), nullable=True)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    profile              = relationship("Profile",      back_populates="user", uselist=False, cascade="all, delete-orphan")
    applications         = relationship("Application",  back_populates="user", cascade="all, delete-orphan")
    opportunities_posted = relationship("Opportunity",  back_populates="posted_by_user")
    affiliate_profile    = relationship("Affiliate",    back_populates="user", uselist=False, cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    id             = Column(String(36), primary_key=True, default=_uuid)
    user_id        = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    role           = Column(String(50))
    data           = Column(JSON, default=dict)     # flexible JSON blob for role-specific fields
    completion_pct = Column(Integer, default=0)
    is_published   = Column(Boolean, default=False)
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")


class Opportunity(Base):
    __tablename__ = "opportunities"

    id           = Column(String(36),  primary_key=True, default=_uuid)
    title        = Column(String(255), nullable=False)
    description  = Column(Text)
    role_type    = Column(String(50),  index=True)   # coach, player, nutritionist, etc.
    location     = Column(String(255))
    salary_range = Column(String(100))
    posted_by    = Column(String(36),  ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    expires_at   = Column(DateTime, nullable=True)

    posted_by_user = relationship("User", back_populates="opportunities_posted")
    applications   = relationship("Application", back_populates="opportunity", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"

    id             = Column(String(36), primary_key=True, default=_uuid)
    user_id        = Column(String(36), ForeignKey("users.id",        ondelete="CASCADE"), nullable=False)
    opportunity_id = Column(String(36), ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False)
    status         = Column(String(50), default="pending")  # pending | reviewed | shortlisted | rejected
    applied_at     = Column(DateTime, default=datetime.utcnow)
    notes          = Column(Text, nullable=True)

    user        = relationship("User",        back_populates="applications")
    opportunity = relationship("Opportunity", back_populates="applications")


# ── OTP ───────────────────────────────────────────────────────────────────────

class PhoneOtp(Base):
    """One OTP record per phone, replaced on each new send."""
    __tablename__ = "phone_otps"

    id           = Column(String(36),  primary_key=True, default=_uuid)
    phone_number = Column(String(20),  nullable=False, index=True)
    otp_code     = Column(String(6),   nullable=False)
    is_verified  = Column(Boolean,     default=False)
    attempts     = Column(Integer,     default=0)
    created_at   = Column(DateTime,    default=datetime.utcnow)
    expires_at   = Column(DateTime,    nullable=False)


# ── Expert System ─────────────────────────────────────────────────────────────

class Expert(Base):
    """Verified expert profile (Nutritionist or Fitness Trainer)."""
    __tablename__ = "experts"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    user_id         = Column(String(36),  ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    expert_type     = Column(String(50),  nullable=False, index=True)  # nutritionist | fitness_trainer
    specializations = Column(JSON,        default=list)
    experience      = Column(String(50),  nullable=True)   # e.g. "5-10"
    qualification   = Column(String(255), nullable=True)
    fees            = Column(Float,       default=500.0)
    rating          = Column(Float,       default=0.0)
    bio             = Column(Text,        nullable=True)
    languages       = Column(JSON,        default=list)
    city            = Column(String(100), nullable=True)
    verified        = Column(Boolean,     default=False)
    is_active       = Column(Boolean,     default=True)
    created_at      = Column(DateTime,    default=datetime.utcnow)

    user          = relationship("User",         foreign_keys=[user_id])
    consultations = relationship("Consultation", back_populates="expert", cascade="all, delete-orphan")
    reviews       = relationship("Review",       back_populates="expert", cascade="all, delete-orphan")


class Consultation(Base):
    __tablename__ = "consultations"

    id                = Column(String(36), primary_key=True, default=_uuid)
    user_id           = Column(String(36), ForeignKey("users.id",   ondelete="CASCADE"), nullable=False)
    expert_id         = Column(String(36), ForeignKey("experts.id", ondelete="CASCADE"), nullable=False)
    consultation_type = Column(String(50), default="online")   # online | offline
    status            = Column(String(30), default="pending")  # pending | confirmed | completed | cancelled
    payment_status    = Column(String(30), default="unpaid")   # unpaid | paid | refunded
    meeting_link      = Column(String(500), nullable=True)
    notes             = Column(Text,        nullable=True)
    created_at        = Column(DateTime,    default=datetime.utcnow)

    user   = relationship("User",   foreign_keys=[user_id])
    expert = relationship("Expert", back_populates="consultations")


class Review(Base):
    __tablename__ = "reviews"

    id         = Column(String(36), primary_key=True, default=_uuid)
    user_id    = Column(String(36), ForeignKey("users.id",   ondelete="CASCADE"), nullable=False)
    expert_id  = Column(String(36), ForeignKey("experts.id", ondelete="CASCADE"), nullable=False)
    rating     = Column(Float,  nullable=False)
    review     = Column(Text,   nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user   = relationship("User",   foreign_keys=[user_id])
    expert = relationship("Expert", back_populates="reviews")


# ── Affiliate System ───────────────────────────────────────────────────────────

class Affiliate(Base):
    __tablename__ = "affiliates"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    user_id         = Column(String(36),  ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    affiliate_id    = Column(String(30),  unique=True, nullable=False, index=True)  # AFF-RAMESH01
    status          = Column(String(20),  default="pending")  # pending | active | suspended
    commission_rate = Column(Float,       default=0.03)        # 3% per consultation
    created_at      = Column(DateTime,    default=datetime.utcnow)
    updated_at      = Column(DateTime,    default=datetime.utcnow, onupdate=datetime.utcnow)

    user         = relationship("User",            back_populates="affiliate_profile")
    clicks       = relationship("AffiliateClick",  back_populates="affiliate", cascade="all, delete-orphan")
    applications = relationship("ExpertApplication", back_populates="affiliate")
    earnings     = relationship("AffiliateEarning",  back_populates="affiliate", cascade="all, delete-orphan")
    withdrawals  = relationship("AffiliateWithdrawal", back_populates="affiliate", cascade="all, delete-orphan")


class AffiliateClick(Base):
    __tablename__ = "affiliate_clicks"

    id           = Column(String(36), primary_key=True, default=_uuid)
    affiliate_id = Column(String(36), ForeignKey("affiliates.id", ondelete="CASCADE"), nullable=False)
    clicked_at   = Column(DateTime,   default=datetime.utcnow, index=True)
    ip_address   = Column(String(45), nullable=True)
    user_agent   = Column(String(500), nullable=True)

    affiliate = relationship("Affiliate", back_populates="clicks")


class ExpertApplication(Base):
    """Expert application submitted via apply form or referral link."""
    __tablename__ = "expert_applications"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    name            = Column(String(255), nullable=False)
    email           = Column(String(255), nullable=True,  index=True)
    phone           = Column(String(20),  nullable=True,  index=True)
    role            = Column(String(50),  nullable=False)
    affiliate_ref   = Column(String(30),  nullable=True,  index=True)  # AFF-RAMESH01
    affiliate_id    = Column(String(36),  ForeignKey("affiliates.id", ondelete="SET NULL"), nullable=True)
    form_data       = Column(JSON,        default=dict)   # full form payload
    profile_photo   = Column(String(500), nullable=True)  # stored file path
    status          = Column(String(20),  default="pending")  # pending | approved | rejected
    submitted_at    = Column(DateTime,    default=datetime.utcnow)
    reviewed_at     = Column(DateTime,    nullable=True)
    reviewed_by     = Column(String(255), nullable=True)   # admin user id or name
    approval_notes  = Column(Text,        nullable=True)

    affiliate   = relationship("Affiliate",    back_populates="applications")
    account     = relationship("ExpertAccount", back_populates="application", uselist=False)


class ExpertAccount(Base):
    """Login credentials created for an approved expert."""
    __tablename__ = "expert_accounts"

    id             = Column(String(36),  primary_key=True, default=_uuid)
    application_id = Column(String(36),  ForeignKey("expert_applications.id", ondelete="CASCADE"), unique=True, nullable=False)
    email          = Column(String(255), unique=True, nullable=False, index=True)
    password_hash  = Column(String(255), nullable=True)   # null until set via setup link
    expert_type    = Column(String(50),  nullable=False)
    is_verified    = Column(Boolean,     default=True)
    created_at     = Column(DateTime,    default=datetime.utcnow)
    last_login     = Column(DateTime,    nullable=True)

    application = relationship("ExpertApplication", back_populates="account")
    tokens      = relationship("PasswordSetupToken", back_populates="expert", cascade="all, delete-orphan")


class PasswordSetupToken(Base):
    """One-time password setup token sent to approved expert."""
    __tablename__ = "password_setup_tokens"

    id         = Column(String(36),  primary_key=True, default=_uuid)
    expert_id  = Column(String(36),  ForeignKey("expert_accounts.id", ondelete="CASCADE"), nullable=False)
    token      = Column(String(100), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime,    nullable=False)
    used       = Column(Boolean,     default=False)

    expert = relationship("ExpertAccount", back_populates="tokens")


class AffiliateEarning(Base):
    __tablename__ = "affiliate_earnings"

    id                       = Column(String(36), primary_key=True, default=_uuid)
    affiliate_id             = Column(String(36), ForeignKey("affiliates.id", ondelete="CASCADE"), nullable=False)
    application_id           = Column(String(36), ForeignKey("expert_applications.id", ondelete="SET NULL"), nullable=True)
    consultation_fee         = Column(Float,  default=500.0)
    platform_commission_rate = Column(Float,  default=0.20)   # 20%
    affiliate_commission_rate = Column(Float, default=0.03)   # 3%
    amount                   = Column(Float,  nullable=False)  # = fee * affiliate_rate
    status                   = Column(String(20), default="pending")  # pending | paid
    earned_at                = Column(DateTime,   default=datetime.utcnow, index=True)

    affiliate = relationship("Affiliate", back_populates="earnings")


class AffiliateWithdrawal(Base):
    __tablename__ = "affiliate_withdrawals"

    id           = Column(String(36), primary_key=True, default=_uuid)
    affiliate_id = Column(String(36), ForeignKey("affiliates.id", ondelete="CASCADE"), nullable=False)
    amount       = Column(Float,      nullable=False)
    method       = Column(String(20), default="bank")     # bank | upi
    status       = Column(String(20), default="pending")  # pending | processed | rejected
    requested_at = Column(DateTime,   default=datetime.utcnow)
    processed_at = Column(DateTime,   nullable=True)
    notes        = Column(Text,       nullable=True)

    affiliate = relationship("Affiliate", back_populates="withdrawals")
