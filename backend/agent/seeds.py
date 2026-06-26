"""Default knowledge base seed entries."""

DEFAULT_KNOWLEDGE = [
    # ---------- STATIC ----------
    {
        "category": "static",
        "key": "clinic_name",
        "title": "Clinic Name",
        "content": "SmileCare Dental Hospital — a modern, full-service dental clinic.",
    },
    {
        "category": "static",
        "key": "clinic_location",
        "title": "Location",
        "content": (
            "SmileCare Dental Hospital, 2nd Floor, Orchid Plaza, MG Road, near City Central Mall, "
            "Bengaluru, Karnataka 560001. Landmark: opposite the MG Road metro station. "
            "Google Maps: https://maps.google.com/?q=SmileCare+Dental+Hospital"
        ),
    },
    {
        "category": "static",
        "key": "clinic_about",
        "title": "About Us",
        "content": (
            "Established in 2008, SmileCare Dental Hospital has served over 50,000 patients. "
            "Our mission is to deliver painless, affordable, and world-class dental care. "
            "We specialize in cosmetic dentistry, implants, and pediatric care, using the latest "
            "digital X-ray and CAD/CAM technology."
        ),
    },
    {
        "category": "static",
        "key": "services_offered",
        "title": "Services Offered",
        "content": (
            "- General Dentistry: routine check-ups and preventive care\n"
            "- Teeth Cleaning (Scaling & Polishing): removal of plaque and tartar\n"
            "- Root Canal Treatment: saving infected or damaged teeth\n"
            "- Dental Implants: permanent replacement for missing teeth\n"
            "- Teeth Whitening: professional in-clinic and take-home whitening\n"
            "- Orthodontics: metal braces and Invisalign clear aligners\n"
            "- Pediatric Dentistry: gentle dental care for children\n"
            "- Oral Surgery: extractions and minor surgical procedures\n"
            "- Crowns & Bridges: restoring damaged or missing teeth"
        ),
    },
    {
        "category": "static",
        "key": "payment_methods",
        "title": "Payment Methods",
        "content": "We accept Cash, UPI (GPay/PhonePe/Paytm), Credit and Debit Cards, and Insurance.",
    },
    {
        "category": "static",
        "key": "parking_info",
        "title": "Parking",
        "content": "Free covered parking is available in the Orchid Plaza basement (Levels B1-B2) for patients.",
    },
    {
        "category": "static",
        "key": "emergency_policy",
        "title": "Emergency Policy",
        "content": (
            "For dental emergencies (severe pain, swelling, trauma, or knocked-out teeth), call our "
            "emergency line at +91-98000-12345. We reserve same-day emergency slots daily. "
            "If a tooth is knocked out, keep it moist in milk and come in immediately."
        ),
    },
    {
        "category": "static",
        "key": "insurance_accepted",
        "title": "Insurance Accepted",
        "content": (
            "We accept Star Health, HDFC ERGO, ICICI Lombard, New India Assurance, Bajaj Allianz, "
            "and most major cashless insurance providers. Please bring your insurance card."
        ),
    },
    # ---------- DYNAMIC ----------
    {
        "category": "dynamic",
        "key": "clinic_timings",
        "title": "Clinic Timings",
        "content": "Monday to Saturday: 9:00 AM - 7:00 PM. Sunday: 10:00 AM - 2:00 PM.",
    },
    {
        "category": "dynamic",
        "key": "doctor_availability",
        "title": "Doctor Availability",
        "content": (
            "Dr. Priya Sharma: Monday, Wednesday, Friday (9:00 AM - 5:00 PM)\n"
            "Dr. Rahul Mehta: Tuesday, Thursday, Saturday (10:00 AM - 6:00 PM)\n"
            "Dr. Ananya Rao: Monday to Saturday (afternoons only)"
        ),
    },
    {
        "category": "dynamic",
        "key": "doctors_list",
        "title": "Our Doctors",
        "content": (
            "Dr. Priya Sharma — Endodontist (Root Canal Specialist), BDS, MDS, 14 years experience.\n"
            "Dr. Rahul Mehta — Orthodontist (Braces & Invisalign), BDS, MDS, 11 years experience.\n"
            "Dr. Ananya Rao — Pediatric Dentist & General Dentistry, BDS, 7 years experience."
        ),
    },
    {
        "category": "dynamic",
        "key": "current_offers",
        "title": "Current Offers",
        "content": (
            "Monsoon Special: 20% off professional teeth whitening through this month. "
            "Free dental check-up and consultation for new patients."
        ),
    },
    {
        "category": "dynamic",
        "key": "holidays_closures",
        "title": "Holidays & Closures",
        "content": "Closed on Independence Day (Aug 15) and Diwali (Nov 8-9). Otherwise open as per regular timings.",
    },
]
