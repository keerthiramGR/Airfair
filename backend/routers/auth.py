from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
from backend.services.auth_service import generate_otp, send_otp_email, verify_otp_code

router = APIRouter(prefix="/api/auth", tags=["Authentication & SMTP"])


class SendOTPRequest(BaseModel):
    email: str = Field(..., example="analyst@civilaviation.gov.in", description="Recipient email for SMTP OTP")


class SendOTPResponse(BaseModel):
    status: str = Field(..., example="ok")
    message: str = Field(..., example="OTP sent successfully")


class VerifyOTPRequest(BaseModel):
    email: str = Field(..., example="analyst@civilaviation.gov.in")
    otp: str = Field(..., min_length=4, max_length=8, example="123456")


class VerifyOTPResponse(BaseModel):
    verified: bool = Field(..., example=True)
    message: str = Field(..., example="Access granted")
    token: str = Field(..., example="session_airfair_authenticated")


@router.post(
    "/send-otp",
    response_model=SendOTPResponse,
    summary="Send OTP via SMTP to email",
    description="Generates a 6-digit verification code and dispatches it via SMTP to the provided email address."
)
def request_otp(payload: SendOTPRequest):
    email = payload.email.strip()
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    code = generate_otp(email)
    success, message = send_otp_email(email, code)

    if not success:
        raise HTTPException(status_code=502, detail=message)

    return SendOTPResponse(
        status="ok",
        message=message
    )


@router.post(
    "/verify-otp",
    response_model=VerifyOTPResponse,
    summary="Verify OTP code",
    description="Validates the submitted 6-digit OTP code against the active session."
)
def verify_otp(payload: VerifyOTPRequest):
    verified, message = verify_otp_code(payload.email, payload.otp)
    if not verified:
        raise HTTPException(status_code=400, detail=message)

    return VerifyOTPResponse(
        verified=True,
        message=message,
        token=f"airfair_auth_{payload.email}"
    )
