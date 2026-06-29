from __future__ import annotations
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, field_validator, model_validator

VALID_ROLES = {"nutritionist", "fitness_trainer", "fitness_coach", "both", "coach", "affiliate", "user", "admin"}


# ── Auth ───────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"role must be one of: {', '.join(sorted(VALID_ROLES))}")
        return v

    @field_validator("email", "phone", mode="before")
    @classmethod
    def empty_to_none(cls, v: Any) -> Optional[str]:
        return v if v else None


class UserLogin(BaseModel):
    identifier: str   # email or phone number
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: Optional[str]
    phone: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    picture: Optional[str] = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class GoogleLoginRequest(BaseModel):
    email: str
    name: str
    photo_url: Optional[str] = None
    google_uid: str


# ── Profile ────────────────────────────────────────────────────────────────────

class ProfileUpsert(BaseModel):
    data: dict[str, Any] = {}
    completion_pct: Optional[int] = None
    is_published: Optional[bool] = None


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    role: str
    data: dict[str, Any]
    completion_pct: int
    is_published: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Opportunity ────────────────────────────────────────────────────────────────

class OpportunityCreate(BaseModel):
    title: str
    description: Optional[str] = None
    role_type: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    expires_at: Optional[datetime] = None


class OpportunityResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    role_type: str
    location: Optional[str]
    salary_range: Optional[str]
    posted_by: Optional[str]
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── Application ────────────────────────────────────────────────────────────────

class ApplicationCreate(BaseModel):
    opportunity_id: str
    notes: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: str
    user_id: str
    opportunity_id: str
    status: str
    applied_at: datetime
    notes: Optional[str]

    model_config = {"from_attributes": True}


# ── Affiliate ──────────────────────────────────────────────────────────────────

VALID_EXPERT_ROLES = {"nutritionist", "fitness_trainer", "fitness_coach", "coach", "both"}


class ExpertApplicationCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    affiliate_ref: Optional[str] = None
    form_data: dict[str, Any] = {}

    @field_validator("role")
    @classmethod
    def validate_expert_role(cls, v: str) -> str:
        if v not in VALID_EXPERT_ROLES:
            raise ValueError(f"role must be one of: {', '.join(sorted(VALID_EXPERT_ROLES))}")
        return v

    @field_validator("email", "phone", mode="before")
    @classmethod
    def empty_to_none_aff(cls, v: Any) -> Optional[str]:
        return v if v else None


class ExpertApplicationResponse(BaseModel):
    id: str
    name: str
    email: Optional[str]
    phone: Optional[str]
    role: str
    affiliate_ref: Optional[str]
    status: str
    submitted_at: datetime

    model_config = {"from_attributes": True}


class TrackClickRequest(BaseModel):
    affiliate_code: str


class WithdrawRequest(BaseModel):
    amount: float
    method: str = "bank"


# ── Expert ─────────────────────────────────────────────────────────────────────

VALID_EXPERT_TYPES = {"nutritionist", "fitness_trainer"}


class ExpertCreate(BaseModel):
    expert_type: str
    specializations: list[str] = []
    experience: Optional[str] = None
    qualification: Optional[str] = None
    fees: Optional[float] = None
    bio: Optional[str] = None
    languages: list[str] = []
    city: Optional[str] = None

    @field_validator("expert_type")
    @classmethod
    def validate_expert_type(cls, v: str) -> str:
        if v not in VALID_EXPERT_TYPES:
            raise ValueError(f"expert_type must be one of: {', '.join(sorted(VALID_EXPERT_TYPES))}")
        return v


class ExpertResponse(BaseModel):
    id: str
    user_id: str
    name: Optional[str] = None
    expert_type: str
    specializations: list[str]
    experience: Optional[str]
    qualification: Optional[str]
    fees: float
    rating: float
    bio: Optional[str]
    languages: list[str]
    city: Optional[str]
    verified: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def pull_user_name(cls, obj: Any) -> Any:
        if hasattr(obj, "user") and obj.user is not None:
            obj.__dict__["name"] = obj.user.name
        return obj


# ── Consultation ───────────────────────────────────────────────────────────────

class ConsultationCreate(BaseModel):
    expert_id: str
    consultation_type: str = "online"
    notes: Optional[str] = None


class ConsultationResponse(BaseModel):
    id: str
    user_id: str
    expert_id: str
    consultation_type: str
    status: str
    payment_status: str
    meeting_link: Optional[str]
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Review ─────────────────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    expert_id: str
    rating: float
    review: Optional[str] = None


class ReviewResponse(BaseModel):
    id: str
    user_id: str
    expert_id: str
    rating: float
    review: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── OTP ────────────────────────────────────────────────────────────────────────

def normalize_indian_phone(phone: str) -> str:
    """
    Strip country-code prefix from an Indian mobile number and return the
    bare 10-digit string.  Uses startswith() — NOT lstrip() — so digits that
    happen to start with '9' or '1' are never accidentally stripped.

    Accepted formats → normalized output:
      "9156321838"        → "9156321838"
      "+919156321838"     → "9156321838"
      "919156321838"      → "9156321838"  (12 chars with leading 91)
    """
    digits = phone.strip()
    if digits.startswith("+91"):
        digits = digits[3:]
    elif digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    return digits


def _check_indian_phone(digits: str, field_label: str = "mobile number") -> str:
    if not digits.isdigit() or len(digits) != 10 or digits[0] not in "6789":
        raise ValueError(f"Enter a valid 10-digit Indian {field_label} (must start with 6-9)")
    return digits


class SendOtpRequest(BaseModel):
    phone_number: str

    @field_validator("phone_number")
    @classmethod
    def validate_indian_phone(cls, v: str) -> str:
        return _check_indian_phone(normalize_indian_phone(v))


class VerifyOtpRequest(BaseModel):
    phone_number: str
    otp: str

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return _check_indian_phone(normalize_indian_phone(v))

    @field_validator("otp")
    @classmethod
    def validate_otp_format(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be exactly 6 digits")
        return v


# ── Admin / Application Approval ──────────────────────────────────────────────

class ApproveApplicationRequest(BaseModel):
    notes: Optional[str] = None


class RejectApplicationRequest(BaseModel):
    reason: str


class ExpertAccountResponse(BaseModel):
    id: str
    application_id: str
    email: str
    expert_type: str
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime]

    model_config = {"from_attributes": True}


class AdminApplicationResponse(BaseModel):
    id: str
    name: str
    email: Optional[str]
    phone: Optional[str]
    expert_type: str
    status: str
    submitted_at: datetime
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[str]
    approval_notes: Optional[str]
    affiliate_ref: Optional[str]
    profile_photo: Optional[str]

    model_config = {"from_attributes": True}


class AdminApplicationDetailResponse(AdminApplicationResponse):
    form_data: dict[str, Any] = {}


# ── Password Setup ─────────────────────────────────────────────────────────────

class SetPasswordRequest(BaseModel):
    token: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class VerifyTokenResponse(BaseModel):
    valid: bool
    email: Optional[str]
    expert_type: Optional[str]


# ── AI ─────────────────────────────────────────────────────────────────────────

class AssessmentRequest(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    fitness_goal: Optional[str] = None
    activity_level: Optional[str] = None
    health_conditions: list[str] = []
    dietary_preferences: list[str] = []
