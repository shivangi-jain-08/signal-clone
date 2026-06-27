from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+91[6-9]\d{9}$")
    username: str = Field(..., min_length=3, max_length=30, pattern=r"^[a-z0-9_]+$")
    display_name: str = Field(..., min_length=1, max_length=60)


class RegisterResponse(BaseModel):
    message: str
    phone_number: str


class SendOTPRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+91[6-9]\d{9}$")


class SendOTPResponse(BaseModel):
    message: str


class VerifyOTPRequest(BaseModel):
    phone_number: str
    otp_code: str = Field(..., min_length=6, max_length=6)


class TokenResponse(BaseModel):
    token: str
    token_type: str = "bearer"
