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
    # ---------- GENERAL DENTAL KNOWLEDGE (powers the triage agent's RAG) ----------
    {
        "category": "static",
        "key": "dental_sensitivity",
        "title": "Tooth Sensitivity",
        "content": (
            "Sensitivity to cold, hot, or sweet usually means exposed dentin — from enamel wear, "
            "gum recession, or a small cavity. Self-care: use a desensitizing toothpaste (potassium "
            "nitrate) twice daily for 2-4 weeks, brush gently with a soft brush, avoid acidic drinks. "
            "See a dentist if sensitivity lingers more than 30 seconds after the trigger, wakes you at "
            "night, or is localized to one tooth — those suggest a cavity or cracked tooth."
        ),
    },
    {
        "category": "static",
        "key": "dental_toothache",
        "title": "Toothache Guidance",
        "content": (
            "For a mild toothache: rinse with warm salt water, floss gently to remove trapped food, "
            "and take an over-the-counter pain reliever as directed. Do NOT put aspirin on the gum. "
            "See a dentist within 24-48 hours if pain is severe, throbbing, or worsening. Seek "
            "IMMEDIATE care for facial swelling, fever with tooth pain, or difficulty swallowing — "
            "these can signal a spreading infection."
        ),
    },
    {
        "category": "static",
        "key": "dental_abscess",
        "title": "Dental Abscess",
        "content": (
            "An abscess is a pocket of infection: throbbing pain, swelling, a pimple-like bump on the "
            "gum, bad taste, sometimes fever. It never heals on its own and needs a dentist urgently — "
            "usually drainage plus a root canal or extraction. Warm salt-water rinses ease discomfort "
            "but are not treatment. Facial swelling spreading toward the eye or neck, fever, or trouble "
            "swallowing/breathing is an EMERGENCY."
        ),
    },
    {
        "category": "static",
        "key": "dental_bleeding_gums",
        "title": "Bleeding Gums & Gum Disease",
        "content": (
            "Gums that bleed when brushing usually indicate gingivitis — plaque buildup inflaming the "
            "gumline. It is reversible: brush twice daily along the gumline, floss daily (bleeding "
            "often improves within 2 weeks of consistent flossing), and get a professional cleaning. "
            "Bleeding with loose teeth, receding gums, persistent bad breath, or pus suggests "
            "periodontitis and needs professional treatment. Patients on blood thinners bleed more "
            "easily and should mention their medication to the dentist."
        ),
    },
    {
        "category": "static",
        "key": "dental_knocked_out_tooth",
        "title": "Knocked-Out or Broken Tooth",
        "content": (
            "Knocked-out ADULT tooth: this is a race against time. Hold it by the crown (never the "
            "root), rinse briefly if dirty, try to reinsert it into the socket, or keep it in milk or "
            "inside the cheek. See a dentist within 30-60 minutes for the best chance of saving it. "
            "Do not reinsert baby teeth. Chipped tooth without pain can usually wait a day or two; "
            "a broken tooth with pain or a visible pink/red center needs care within 24 hours."
        ),
    },
    {
        "category": "static",
        "key": "dental_wisdom_teeth",
        "title": "Wisdom Teeth",
        "content": (
            "Wisdom teeth erupt between ages 17-25. Mild pressure or tenderness while erupting is "
            "normal — warm salt rinses help. See a dentist for: pain when opening the jaw, swelling "
            "behind the last molar, repeated food trapping, or a partly erupted tooth with red, "
            "inflamed gum (pericoronitis — needs prompt treatment). Not all wisdom teeth need removal; "
            "an X-ray determines whether they're impacted."
        ),
    },
    {
        "category": "static",
        "key": "dental_flossing_hygiene",
        "title": "Brushing & Flossing Basics",
        "content": (
            "Brush twice daily for two minutes with fluoride toothpaste, angling bristles 45° toward "
            "the gumline; replace the brush every 3 months. Floss once daily — curve the floss in a "
            "C-shape around each tooth and slide below the gumline. Bleeding during the first week of "
            "flossing is normal and improves; persistent bleeding means see a dentist. Mouthwash is a "
            "supplement, not a substitute. A dental check-up and cleaning every 6 months catches "
            "problems while they're small and cheap to fix."
        ),
    },
    {
        "category": "static",
        "key": "dental_whitening",
        "title": "Teeth Whitening",
        "content": (
            "Professional in-clinic whitening lightens teeth several shades in one visit; dentist-made "
            "take-home trays work over 1-2 weeks. Whitening toothpastes remove surface stains only. "
            "Temporary sensitivity after whitening is common and settles within days. Whitening does "
            "not work on crowns, veneers, or fillings, and internal (grey) discoloration needs a "
            "dentist's assessment. Avoid unregulated high-peroxide home kits — gum burns are common."
        ),
    },
    {
        "category": "static",
        "key": "dental_braces_aligners",
        "title": "Braces & Clear Aligners",
        "content": (
            "Braces and clear aligners both straighten teeth; aligners suit mild-to-moderate cases and "
            "are nearly invisible but must be worn 20-22 hours/day. Typical treatment runs 12-24 "
            "months. Mild soreness for a few days after adjustments is normal — soft foods and OTC "
            "pain relief help. A poking wire can be covered with orthodontic wax until the orthodontist "
            "fixes it. Clean around brackets carefully; decalcification stains are permanent."
        ),
    },
    {
        "category": "static",
        "key": "dental_root_canal",
        "title": "Root Canal Treatment",
        "content": (
            "A root canal removes infected pulp from inside a tooth, disinfects the canals, and seals "
            "them — saving a tooth that would otherwise be extracted. Modern root canals feel similar "
            "to getting a filling; the 'painful root canal' reputation is outdated. Signs you may need "
            "one: lingering pain after hot/cold, pain on biting, a darkened tooth, or a gum pimple. "
            "Most treated teeth need a crown afterward. Mild soreness for 2-3 days after is normal."
        ),
    },
    {
        "category": "static",
        "key": "dental_extraction_aftercare",
        "title": "After a Tooth Extraction",
        "content": (
            "First 24 hours: bite on gauze for 30-60 minutes, no rinsing or spitting, no straws, no "
            "smoking (suction dislodges the healing clot and causes painful dry socket), soft cool "
            "foods, and rest. From day 2: gentle warm salt-water rinses after meals. Mild swelling and "
            "discomfort peak around day 2-3. Call a dentist for: bleeding that won't stop with "
            "pressure, severe pain starting day 3-5 (dry socket), fever, or spreading swelling."
        ),
    },
    {
        "category": "static",
        "key": "dental_implants_dentures",
        "title": "Replacing Missing Teeth",
        "content": (
            "Options: implants (a titanium root plus crown — most natural feel, protects the jawbone, "
            "needs adequate bone and healthy gums), bridges (fixed, uses neighboring teeth for "
            "support), and dentures (removable, most affordable). Leaving a gap long-term lets "
            "neighboring teeth drift and bone shrink, which makes later treatment harder. An implant "
            "typically takes 3-6 months start to finish including healing."
        ),
    },
    {
        "category": "static",
        "key": "dental_children",
        "title": "Children's Dental Care",
        "content": (
            "First dental visit: by the first birthday or within 6 months of the first tooth. Baby "
            "teeth matter — decay in them harms the adult teeth underneath. Use a rice-grain smear of "
            "fluoride toothpaste under age 3, a pea-size amount after. Avoid bedtime bottles with "
            "milk or juice (bottle caries). Dental sealants on new molars (around age 6 and 12) are a "
            "cheap, painless way to prevent cavities. Thumb-sucking is fine to ignore before age 4."
        ),
    },
    {
        "category": "static",
        "key": "dental_pregnancy",
        "title": "Dental Care in Pregnancy",
        "content": (
            "Dental care during pregnancy is safe and important — hormones make gums more prone to "
            "inflammation ('pregnancy gingivitis'), and untreated gum disease is linked to preterm "
            "birth. Cleanings and necessary fillings are safe, ideally in the second trimester. Always "
            "tell the dentist you are pregnant so medications and X-rays are managed appropriately. "
            "Morning sickness: rinse with water or fluoride mouthwash after vomiting; wait 30 minutes "
            "before brushing to protect softened enamel."
        ),
    },
    {
        "category": "static",
        "key": "dental_bad_breath",
        "title": "Bad Breath (Halitosis)",
        "content": (
            "Most bad breath starts in the mouth: bacteria on the tongue, food trapped between teeth, "
            "gum disease, or dry mouth. Fixes: clean the tongue daily (scraper or brush), floss daily, "
            "stay hydrated, and treat any gum disease. Mints and mouthwash mask, not cure. Persistent "
            "bad breath despite good hygiene warrants a dental check — and if the mouth is healthy, "
            "a medical one (sinus, reflux, and other conditions can cause it)."
        ),
    },
    {
        "category": "static",
        "key": "dental_grinding",
        "title": "Teeth Grinding (Bruxism)",
        "content": (
            "Clues you grind at night: waking with jaw ache or dull headache, flattened or chipped "
            "teeth, tooth sensitivity, and a partner hearing grinding. Causes include stress and sleep "
            "disorders. A custom night guard from a dentist protects teeth (pharmacy boil-and-bite "
            "guards are a short-term stopgap). Also: reduce late caffeine/alcohol, and see a doctor if "
            "snoring or gasping accompanies it — sleep apnea and bruxism often travel together."
        ),
    },
    {
        "category": "static",
        "key": "dental_dry_mouth",
        "title": "Dry Mouth",
        "content": (
            "Saliva protects teeth; chronic dry mouth sharply raises cavity risk. Common causes: "
            "medications (antihistamines, antidepressants, blood-pressure drugs), mouth breathing, "
            "diabetes, and dehydration. Help: sip water often, chew sugar-free gum (xylitol), use "
            "saliva substitutes, avoid alcohol-based mouthwash, and ask a dentist about high-fluoride "
            "toothpaste. Mention all medications at your dental visit."
        ),
    },
    {
        "category": "static",
        "key": "dental_diabetes",
        "title": "Diabetes & Oral Health",
        "content": (
            "Diabetes and gum disease feed each other: high blood sugar worsens gum infection, and gum "
            "inflammation makes blood sugar harder to control. People with diabetes should have "
            "cleanings at least every 6 months (often more), watch for bleeding or receding gums, and "
            "tell the dentist their latest HbA1c before surgery or extractions since healing is "
            "slower. Dry mouth and fungal infections (thrush) are also more common."
        ),
    },
    {
        "category": "static",
        "key": "dental_cavity_prevention",
        "title": "Cavities & Prevention",
        "content": (
            "Cavities form when mouth bacteria turn sugar into acid that dissolves enamel. Frequency "
            "of sugar matters more than quantity — constant sipping/snacking never lets enamel "
            "recover. Prevention: fluoride toothpaste twice daily (spit, don't rinse), limit sugary "
            "drinks to mealtimes, water or milk between meals. Early decay (a white chalky spot) can "
            "re-harden with fluoride; once a hole forms, it needs a filling. Regular check-ups catch "
            "decay while it's small and painless."
        ),
    },
    {
        "category": "static",
        "key": "dental_mouth_ulcers",
        "title": "Mouth Ulcers & Sores",
        "content": (
            "Common canker sores heal on their own in 7-14 days; ease them with OTC numbing gels, "
            "salt-water rinses, and by avoiding spicy/acidic foods. Recurring crops of ulcers can "
            "relate to stress, vitamin B12/iron deficiency, or certain conditions. IMPORTANT: any "
            "mouth ulcer, white/red patch, or lump that has not healed after 3 weeks needs prompt "
            "professional evaluation to rule out oral cancer — especially for tobacco or heavy "
            "alcohol users."
        ),
    },
]
