import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from database.models import User
from schemas import UserCreate, UserLogin, Token, UserResponse, GoogleLoginRequest

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SECRET_KEY                 = os.getenv("SECRET_KEY", "CHANGE_THIS_IN_PRODUCTION")
ALGORITHM                  = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire  = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload["exp"] = expire
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def signup(db: Session, payload: UserCreate) -> Token:
    if not payload.email and not payload.phone:
        raise ValueError("Email or phone number is required")
    if payload.email and db.query(User).filter(User.email == payload.email).first():
        raise ValueError("Email is already registered")
    if payload.phone and db.query(User).filter(User.phone == payload.phone).first():
        raise ValueError("Phone number is already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _build_token(user)


def login(db: Session, payload: UserLogin) -> Token:
    identifier = payload.identifier.strip()
    user = (
        db.query(User).filter(User.email == identifier).first()
        or db.query(User).filter(User.phone == identifier).first()
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise ValueError("Invalid credentials")
    if not user.is_active:
        raise ValueError("Account is deactivated")
    return _build_token(user)


def google_login(db: Session, payload: GoogleLoginRequest) -> Token:
    """Find-or-create user from Google OAuth credentials, return JWT."""
    # Prefer google_uid match (stable even if email changes), fall back to email
    user = (
        db.query(User).filter(User.google_uid == payload.google_uid).first()
        or db.query(User).filter(User.email == payload.email).first()
    )
    if user:
        # Link google_uid if this was an existing email/password account
        if not user.google_uid:
            user.google_uid = payload.google_uid
        if payload.photo_url:
            user.picture = payload.photo_url
        db.commit()
        db.refresh(user)
    else:
        # New Google user — placeholder password (can't be used for password login)
        user = User(
            name=payload.name,
            email=payload.email,
            password_hash=hash_password(secrets.token_hex(32)),
            role="affiliate",
            google_uid=payload.google_uid,
            picture=payload.photo_url or None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return _build_token(user)


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def _build_token(user: User) -> Token:
    token = create_access_token({"sub": user.id, "role": user.role})
    return Token(access_token=token, user=UserResponse.model_validate(user))
