"""Patient authentication: email+password, phone+OTP, and Google sign-in."""
import os
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.deps import get_current_patient
from auth.otp import issue_otp, verify_and_consume
from auth.security import create_access_token, hash_password, verify_password
from database import get_db
from logging_config import get_logger
from models.auth import (LoginRequest, OtpRequest, OtpVerifyRequest,
                         RegisterRequest, TokenResponse, UserPublic)
from models.user import new_user_doc, serialize_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
log = get_logger("auth")


def _token_response(user_doc: dict) -> TokenResponse:
    public = serialize_user(user_doc)
    token = create_access_token(sub=public["id"], role="patient")
    return TokenResponse(access_token=token, role="patient", user=UserPublic(**public))


@router.post("/register", response_model=TokenResponse)
async def register(payload: RegisterRequest) -> TokenResponse:
    db = get_db()
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered.")
    doc = new_user_doc(
        email=email,
        phone=payload.phone,
        name=payload.name,
        password_hash=hash_password(payload.password),
    )
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    log.info("Registered patient %s", email)
    return _token_response(doc)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest) -> TokenResponse:
    db = get_db()
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not user.get("password_hash") or not verify_password(
        payload.password, user["password_hash"]
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password.")
    await db.users.update_one(
        {"_id": user["_id"]}, {"$set": {"last_login": datetime.utcnow()}}
    )
    return _token_response(user)


@router.post("/otp/request")
async def otp_request(payload: OtpRequest) -> dict:
    await issue_otp(payload.phone)
    # Never reveal the code in the HTTP response; it's logged/sent via WhatsApp.
    return {"success": True, "message": "Verification code sent."}


@router.post("/otp/verify", response_model=TokenResponse)
async def otp_verify(payload: OtpVerifyRequest) -> TokenResponse:
    ok = await verify_and_consume(payload.phone, payload.code)
    if not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired code.")

    db = get_db()
    user = await db.users.find_one({"phone": payload.phone})
    if not user:
        doc = new_user_doc(phone=payload.phone, name=payload.name)
        result = await db.users.insert_one(doc)
        doc["_id"] = result.inserted_id
        user = doc
        log.info("Created patient via OTP for phone %s", payload.phone)
    else:
        await db.users.update_one(
            {"_id": user["_id"]}, {"$set": {"last_login": datetime.utcnow()}}
        )
    return _token_response(user)


class GoogleAuthRequest(BaseModel):
    credential: str  # Google Identity Services ID token


@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest) -> TokenResponse:
    """Verify a Google ID token and sign the patient in (creating the account
    on first sign-in). Requires GOOGLE_CLIENT_ID in the environment."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Google sign-in is not configured.")

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": payload.credential},
        )
    if res.status_code != 200:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google credential.")
    claims = res.json()
    if claims.get("aud") != client_id or claims.get("email_verified") not in ("true", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google credential.")

    email = claims["email"].lower()
    db = get_db()
    user = await db.users.find_one({"email": email})
    if not user:
        doc = new_user_doc(email=email, name=claims.get("name"))
        doc["auth_provider"] = "google"
        result = await db.users.insert_one(doc)
        doc["_id"] = result.inserted_id
        user = doc
        log.info("Created patient via Google sign-in: %s", email)
    else:
        await db.users.update_one(
            {"_id": user["_id"]}, {"$set": {"last_login": datetime.utcnow()}}
        )
    return _token_response(user)


@router.get("/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_patient)) -> UserPublic:
    return UserPublic(**user)
