import re
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.models import User
from app.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    AuthResponse,
    DemoAccountInfo,
)
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_token,
    verify_token,
    DEMO_ACCOUNTS,
    supabase_signup,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Helper to extract user from Bearer token if provided."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id, User.is_active == True).first()


@router.get("/demo-accounts", response_model=List[DemoAccountInfo])
def list_demo_accounts():
    """Return pre-configured demo credentials for instantaneous test login."""
    return [
        DemoAccountInfo(
            role=d["role"],
            label=d["label"],
            email=d["email"],
            password=d["password"],
            description=d["description"],
        )
        for d in DEMO_ACCOUNTS
    ]


@router.post("/register", response_model=AuthResponse)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new institutional user with immediate activation (no OTP or email confirmation required)."""
    email = payload.email.strip().lower()
    if not EMAIL_REGEX.match(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address format."
        )

    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    # Check for existing user
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in."
        )

    # Restrict assigned role to safe options; default to advisor
    role = (payload.role or "advisor").lower()
    if role not in ["advisor", "faculty", "admin"]:
        role = "advisor"

    hsh, salt = hash_password(payload.password)
    user = User(
        email=email,
        hashed_password=hsh,
        salt=salt,
        full_name=payload.full_name.strip() or "Campus Educator",
        role=role,
        department=payload.department.strip() if payload.department else None
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Optional background sync with Supabase Auth
    supabase_signup(email, payload.password, {"full_name": user.full_name, "role": user.role})

    token = create_token(user.id, user.email, user.role)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            department=user.department,
            created_at=user.created_at.isoformat() if user.created_at else None
        ),
        provider="local"
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """Log in with email and password without OTP. Issues a signed 7-day session token."""
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not verify_password(payload.password, user.hashed_password, user.salt):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user account has been disabled."
        )

    token = create_token(user.id, user.email, user.role)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            department=user.department,
            created_at=user.created_at.isoformat() if user.created_at else None
        ),
        provider="local"
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Retrieve current authenticated user session."""
    user = get_current_user_optional(authorization=authorization, db=db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please sign in."
        )
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department=user.department,
        created_at=user.created_at.isoformat() if user.created_at else None
    )


@router.post("/logout")
def logout():
    """Stateless logout endpoint."""
    return {"status": "ok", "message": "Logged out successfully."}
