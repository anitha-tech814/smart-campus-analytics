import os
import hmac
import hashlib
import secrets
import json
import base64
import time
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.models import User
from app.config import AUTH_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

# Token expiration: 7 days in seconds
TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60

# Safe demo accounts pre-seeded for instantaneous evaluation
DEMO_ACCOUNTS = [
    {
        "role": "advisor",
        "label": "Academic Advisor",
        "email": "advisor@campus.edu",
        "password": "Advisor123!",
        "full_name": "Dr. Sarah Chen (Senior Academic Advisor)",
        "department": "All Departments",
        "description": "Full access to early warning signals, student profiles, interventions, and recommendations."
    },
    {
        "role": "faculty",
        "label": "Faculty Mentor",
        "email": "faculty@campus.edu",
        "password": "Faculty123!",
        "full_name": "Prof. Michael Torres (Faculty Lead)",
        "department": "Computer Science",
        "description": "Branch-specific analytics, student counseling logs, and attendance review tracking."
    },
    {
        "role": "admin",
        "label": "Dean / Administrator",
        "email": "admin@campus.edu",
        "password": "Admin123!",
        "full_name": "Dean Eleanor Vance (Institutional Leadership)",
        "department": "Institutional Administration",
        "description": "Executive oversight, model weight configuration, data governance, and cohort exports."
    }
]


def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    """PBKDF2-HMAC-SHA256 password hashing with individual cryptographic salt."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return key.hex(), salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """Constant-time password comparison to prevent timing attacks."""
    calculated_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(calculated_hash, stored_hash)


def create_token(user_id: int, email: str, role: str) -> str:
    """Create a signed, base64url-encoded bearer session token."""
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_TTL_SECONDS
    }
    header = {"alg": "HS256", "typ": "JWT"}
    
    b64_header = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    b64_payload = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    message = f"{b64_header}.{b64_payload}".encode()
    signature = hmac.new(AUTH_SECRET_KEY.encode(), message, hashlib.sha256).digest()
    b64_sig = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{b64_header}.{b64_payload}.{b64_sig}"


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode bearer session token."""
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            return None
        b64_header, b64_payload, b64_sig = parts
        message = f"{b64_header}.{b64_payload}".encode()
        expected_sig = hmac.new(AUTH_SECRET_KEY.encode(), message, hashlib.sha256).digest()
        actual_sig = base64.urlsafe_b64decode(b64_sig + "==")
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload_bytes = base64.urlsafe_b64decode(b64_payload + "==")
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        # Check expiration
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def ensure_demo_users(db: Session) -> None:
    """Pre-seed default demo accounts if no users exist in the database."""
    try:
        user_count = db.query(User).count()
        if user_count > 0:
            return
        
        for demo in DEMO_ACCOUNTS:
            hsh, salt = hash_password(demo["password"])
            user = User(
                email=demo["email"].lower(),
                hashed_password=hsh,
                salt=salt,
                full_name=demo["full_name"],
                role=demo["role"],
                department=demo.get("department")
            )
            db.add(user)
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"[Smart Campus Analytics] Notice initializing demo users: {exc}")


def supabase_signup(email: str, password: str, metadata: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Optional sync to Supabase GoTrue Auth REST API without email confirmation."""
    if not (SUPABASE_URL and SUPABASE_ANON_KEY):
        return None
    try:
        url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/signup"
        payload = {
            "email": email,
            "password": password,
            "data": metadata
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                "Content-Type": "application/json",
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception:
        return None
