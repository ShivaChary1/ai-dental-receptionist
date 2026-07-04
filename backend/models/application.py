"""Hospital application request schemas and constants."""
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field

APPLICATION_STATUSES = ["pending", "approved", "rejected", "info_requested"]


class GeoLocation(BaseModel):
    lat: float
    lng: float


class Contact(BaseModel):
    phone: str
    email: EmailStr
    poc_name: str


class DoctorIn(BaseModel):
    name: str
    photo: Optional[str] = None
    qualification: Optional[str] = None
    years_experience: Optional[int] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    email: Optional[str] = None
    # Google Calendar "Secret address in iCal format" — lets the agent read the
    # doctor's busy times and book straight into their calendar via email invites.
    calendar_ical_url: Optional[str] = None
    working_hours: Optional[dict] = None


class BookingConfig(BaseModel):
    # mode: "internal" (we store bookings) or "rest" (call the clinic's CRM)
    mode: str = "internal"
    endpoint_url: Optional[str] = None
    auth_type: Optional[str] = None  # e.g. "api_key" | "bearer" | "none"
    credentials: Optional[str] = None
    payload_template: Optional[dict[str, Any]] = None


class ApplicationIn(BaseModel):
    clinic_name: str
    description: Optional[str] = None
    address: str
    location: Optional[GeoLocation] = None
    maps_link: Optional[str] = None
    contact: Contact
    hours: dict[str, str] = Field(default_factory=dict)  # e.g. {"mon": "09:00-18:00"}
    services: list[str] = Field(default_factory=list)
    doctors: list[DoctorIn] = Field(default_factory=list)
    photos: list[str] = Field(default_factory=list)
    booking_config: BookingConfig = Field(default_factory=BookingConfig)
    registration_number: Optional[str] = None
    license_document: Optional[str] = None
    insurance_accepted: list[str] = Field(default_factory=list)


class ReviewDecision(BaseModel):
    notes: Optional[str] = None
