"""Triage additions to synthesis, and the deterministic emergency response."""

TRIAGE_ADDENDUM = """
TRIAGE MODE
The user is describing their own current symptoms (assessed urgency: {urgency}/3).
- First acknowledge, then assess: what it could be consistent with, what to do right now, and
  exactly when professional care is needed.
- Urgency 2: tell them clearly to be seen within 24-48 hours and offer to find an open clinic.
- Urgency 1: recommend booking a visit soon; give interim self-care.
- Urgency 0: practical guidance plus what changes would make it worth seeing a dentist.
- Keep it tight: acknowledge in one line, then only the most useful guidance. A worried person
  won't read paragraphs.
"""

EMERGENCY_RESPONSE = """**This sounds like a dental emergency — please seek care immediately.**

{reason}

What to do right now:
- Contact an emergency dentist or go to the nearest emergency department **now** — do not wait.
- Facial swelling with fever, or any trouble swallowing or breathing, can mean a spreading
  infection that needs urgent treatment.
- Knocked-out adult tooth: hold it by the crown (not the root), keep it in milk or inside the
  cheek, and be seen within 30–60 minutes.
- Uncontrolled bleeding: bite firmly on clean gauze for 15 minutes; if it hasn't slowed, go to
  emergency care.

I can show you nearby clinics, but for these symptoms please do not wait for an appointment —
call ahead and go now. *This is guidance, not a diagnosis.*"""
