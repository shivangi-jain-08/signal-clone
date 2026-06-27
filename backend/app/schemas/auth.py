from pydantic import BaseModel, Field

from app.schemas.user import UserMe


class RegisterRequest(BaseModel):
    phone_number: str = Field(
        ...,
        pattern=r"^\+91[6-9]\d{9}$",
        examples=["+919810000001"],
        description="Indian mobile number in E.164 format (no dashes).",
    )
    username: str = Field(
        ...,
        min_length=3,
        max_length=30,
        pattern=r"^[a-z0-9_]+$",
        examples=["alice"],
        description="Lowercase alphanumeric handle, underscores allowed.",
    )
    display_name: str = Field(
        ...,
        min_length=1,
        max_length=60,
        examples=["Alice"],
    )


class RegisterResponse(BaseModel):
    message: str
    phone_number: str


class SendOTPRequest(BaseModel):
    phone_number: str = Field(
        ...,
        pattern=r"^\+91[6-9]\d{9}$",
        examples=["+919810000001"],
    )


class SendOTPResponse(BaseModel):
    message: str


class VerifyOTPRequest(BaseModel):
    phone_number: str = Field(..., examples=["+919810000001"])
    otp: str = Field(
        ...,
        min_length=6,
        max_length=6,
        examples=["123456"],
        description="The 6-digit OTP. Always '123456' in this mock system.",
    )


class AuthResponse(BaseModel):
    """Returned after successful OTP verification. Contains the JWT and the caller's full profile."""

    token: str
    token_type: str = "bearer"
    user: UserMe
