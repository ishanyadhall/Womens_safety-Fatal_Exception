"""
SHIELDHER - AI Legal Rights Navigator Backend Service
Analyzes user grievances under Indian Penal Statutes (BNS 2023, IPC, IT Act, POSH, BNSS).
Includes rule-based NLP legal intelligence with optional Gemini API integration.
"""

import os
import json
from flask import Blueprint, request, jsonify

legal_bp = Blueprint("legal", __name__)

# ============================================================================
# COMPREHENSIVE INDIAN LEGAL KNOWLEDGE BASE
# ============================================================================

LEGAL_CATEGORIES = [
    {
        "id": "cyberstalking",
        "keywords": ["stalk", "cyberstalk", "instagram", "profile", "dm", "message", "whatsapp", "call", "online", "following", "facebook", "snapchat", "telegram", "picha", "msg", "fake id"],
        "title": "Cyberstalking, Repeated Online Harassment & Electronic Surveillance",
        "severity": "COGNIZABLE & NON-BAILABLE (Repeat Conviction)",
        "sections": [
            {
                "law": "Bharatiya Nyaya Sanhita, 2023 (BNS)",
                "section": "Section 78 BNS (Formerly Section 354D IPC)",
                "description": "Monitors the use by a woman of the internet, email, social media, or other electronic communication; repeatedly follows or contacts a woman despite clear disinterest.",
                "punishment": "1st conviction: Imprisonment up to 3 years + fine (Bailable). 2nd conviction: Imprisonment up to 5 years + fine (Non-bailable)."
            },
            {
                "law": "Information Technology Act, 2000",
                "section": "Section 66E & Section 67 IT Act",
                "description": "Transmitting offensive messages or capturing/publishing private communications without consent.",
                "punishment": "Imprisonment up to 3 years and fine up to ₹2 Lakh to ₹5 Lakh."
            }
        ],
        "rights": [
            "Right to Zero FIR: Register a complaint at ANY police station under Section 173 BNSS regardless of territorial boundaries.",
            "Victim Identity Protection: Disclosure of victim handle, name or address is strictly prohibited under Section 73 BNS.",
            "Right to have statements recorded before a female police officer or judicial magistrate."
        ],
        "steps": [
            "Capture complete screenshots showing offender's username, URL, exact timestamp, and message headers before blocking.",
            "Upload files to SHIELDHER Digital Evidence Vault to calculate cryptographic SHA-256 fingerprint.",
            "File an online complaint at the National Cyber Crime Reporting Portal: https://cybercrime.gov.in.",
            "Dial 1930 for Cyber Crime emergency tracking.",
            "Submit online petition to National Commission for Women (NCW) at ncwapps.nic.in."
        ],
        "emergency": "Dial 112 or 1091 (Women Helpline) if there is any threat of offline physical tracking."
    },
    {
        "id": "blackmail_morphing",
        "keywords": ["blackmail", "leak", "private photo", "nude", "morph", "intimate", "video", "extort", "money", "dhamki", "photo leak", "expose", "compromise", "deepfake"],
        "title": "Blackmail, Non-Consensual Image Abuse, Morphing & Extortion",
        "severity": "GRAVE COGNIZABLE & NON-BAILABLE OFFENSE",
        "sections": [
            {
                "law": "Bharatiya Nyaya Sanhita, 2023 (BNS)",
                "section": "Section 77 BNS (Formerly Section 354C IPC - Voyeurism) & Section 308 BNS (IPC 384 - Extortion)",
                "description": "Capturing, publishing or distributing intimate media without consent, or extorting money/favors by threatening reputational injury.",
                "punishment": "Section 77 BNS: 1 to 3 years (1st offense), 3 to 7 years (repeat). Section 308 BNS: Rigorous imprisonment up to 3 to 7 years."
            },
            {
                "law": "Information Technology Act, 2000",
                "section": "Section 66E, 67 & 67A IT Act",
                "description": "Publishing or transmitting sexually explicit material or private body images electronically.",
                "punishment": "Section 67A: Imprisonment up to 5 years and fine up to ₹10 Lakh on first conviction."
            }
        ],
        "rights": [
            "Mandatory Identity Protection: Section 73 BNS makes disclosing the victim's name a punishable offense.",
            "24-Hour Mandatory Takedown: Social media platforms are legally required under IT Rules 2021 to remove non-consensual intimate imagery within 24 hours of notice.",
            "Hash-Based Shielding: You can use StopNCII.org to generate hash-shields that block viral spread without sharing the raw picture."
        ],
        "steps": [
            "Do NOT transfer money or give in to blackmail demands—blackmailers demand more once paid.",
            "Take screenshots of the chat, UPI ID/phone numbers, blackmail messages, and URL handles.",
            "Secure evidence files in SHIELDHER Vault right now to compute SHA-256 fingerprint.",
            "File complaint under 'Report Cyber Crime Against Women/Children' at https://cybercrime.gov.in.",
            "Request immediate takedown on Meta, X, or Google reporting forms."
        ],
        "emergency": "Call 1930 (Cyber Extortion Cell) and 112 if you feel physically unsafe."
    },
    {
        "id": "workplace_posh",
        "keywords": ["workplace", "office", "boss", "colleague", "manager", "posh", "sexual harassment", "promotion", "favor", "unwanted touch", "comment", "company", "hr", "appraisal"],
        "title": "Workplace Sexual Harassment & POSH Act Violation",
        "severity": "STATUTORY VIOLATION & CRIMINAL COGNIZABLE OFFENSE",
        "sections": [
            {
                "law": "Sexual Harassment of Women at Workplace Act, 2013 (POSH Act)",
                "section": "Sections 4, 9, 11 & 12 POSH Act",
                "description": "Unwelcome physical contact, sexually colored remarks, demanding sexual favors, or creating an intimidating work environment.",
                "punishment": "Employment termination, disciplinary deduction from salary, and concurrent criminal liability."
            },
            {
                "law": "Bharatiya Nyaya Sanhita, 2023 (BNS)",
                "section": "Section 75 BNS (Formerly Section 354A IPC - Sexual Harassment)",
                "description": "Criminal provision covering unwelcome physical touch, demanding sexual favors, showing pornography against will.",
                "punishment": "Rigorous imprisonment up to 1 to 3 years, or fine, or both."
            }
        ],
        "rights": [
            "Mandatory ICC: Every establishment with 10+ employees must have an Internal Complaints Committee headed by a senior woman.",
            "Right to Interim Relief: You can request paid leave up to 3 months, transfer, or prohibiting respondent from evaluating your performance.",
            "Strict Non-Disclosure: Section 16 POSH penalizes publishing identity or inquiry proceedings."
        ],
        "steps": [
            "Submit a formal written complaint to the Presiding Officer of your organization's ICC within 3 months.",
            "Preserve all relevant communication (emails, Slack/Teams chats, call records).",
            "You have the simultaneous legal right to register a police FIR under Section 75 BNS independent of internal company proceedings.",
            "If organization has no ICC or is uncooperative, file on the Ministry of WCD portal: https://shebox.wcd.gov.in."
        ],
        "emergency": "Women in Distress: Call 1091 or 181 for legal support and counseling."
    },
    {
        "id": "street_harassment",
        "keywords": ["following", "street", "eve-teasing", "stranger", "metro", "bus", "road", "chhedchhad", "gesture", "pass comments", "groping", "touch", "auto", "cab", "piche"],
        "title": "Street Harassment, Eve-Teasing, Stalking & Outraging Modesty",
        "severity": "COGNIZABLE & NON-BAILABLE (Assault / Persistent Contact)",
        "sections": [
            {
                "law": "Bharatiya Nyaya Sanhita, 2023 (BNS)",
                "section": "Section 79 BNS (Formerly Section 509 IPC) - Insulting Modesty",
                "description": "Intentionally uttering words, making gestures, or exhibiting any object to intrude on a woman's privacy.",
                "punishment": "Simple imprisonment up to 3 years and liability to fine."
            },
            {
                "law": "Bharatiya Nyaya Sanhita, 2023 (BNS)",
                "section": "Section 74 BNS (Formerly Section 354 IPC) - Assault with Intent to Outrage Modesty",
                "description": "Assault or criminal force against a woman intending or knowing it likely to outrage her modesty.",
                "punishment": "Imprisonment of 1 to 5 years + fine (Non-bailable)."
            }
        ],
        "rights": [
            "Zero FIR: Police cannot refuse to register your FIR citing jurisdictional boundaries.",
            "Night Escort: Police PCR vans are required to assist and escort any woman stranded in distress at night.",
            "Warrantless Arrest: Cognizable offenses allow immediate police arrest of perpetrator."
        ],
        "steps": [
            "Move immediately toward crowded, well-lit spaces, metro stations, PCR booths, or open shops.",
            "Call 112 right away. Provide exact landmarks and vehicle registration numbers.",
            "Register Zero FIR at nearest police station or metro security post."
        ],
        "emergency": "CALL 112 IMMEDIATELY or use SHIELDHER Rapid Emergency SOS."
    },
    {
        "id": "domestic_violence",
        "keywords": ["husband", "in-laws", "domestic", "violence", "dowry", "marry", "beat", "abuse", "cruelty", "torture", "sasural", "ghar", "marpit", "shadi"],
        "title": "Domestic Violence, Marital Cruelty & Dowry Harassment",
        "severity": "NON-BAILABLE & COGNIZABLE OFFENSE",
        "sections": [
            {
                "law": "Bharatiya Nyaya Sanhita, 2023 (BNS)",
                "section": "Section 85 & 86 BNS (Formerly Section 498A IPC)",
                "description": "Husband or relative of husband subjecting woman to cruelty, mental agony, physical harm, or dowry harassment.",
                "punishment": "Imprisonment up to 3 years and liability to fine."
            },
            {
                "law": "Protection of Women from Domestic Violence Act, 2005 (PWDVA)",
                "section": "Sections 12, 18, 19, 20 & 22 PWDVA",
                "description": "Civil protection orders, residence orders (cannot be evicted from marital home), monetary relief, and child custody.",
                "punishment": "Breach of protection order leads to 1 year jail."
            }
        ],
        "rights": [
            "Right to Shared Household: Law prohibits unlawful eviction by husband or in-laws.",
            "Free Legal Aid: Under Section 12 Legal Services Authorities Act, all women are entitled to free legal representation via DLSA/NALSA.",
            "Protection Officer Support: Designated government protection officers assist in filing Domestic Incident Reports (DIR)."
        ],
        "steps": [
            "Call 181 (Women in Distress Helpline) or 1091 for emergency shelter, rescue, and counseling.",
            "Undergo medical examination (MLC) at nearest government hospital to document physical injuries.",
            "File DIR with District Protection Officer and register FIR under Section 85 BNS.",
            "Approach Judicial Magistrate Court for immediate restraining and maintenance orders."
        ],
        "emergency": "Call 181 (Women Helpline) or 112 for urgent emergency rescue."
    }
]

DEFAULT_LEGAL_ANALYSIS = {
    "title": "General Grievance & Women Safety Legal Assessment",
    "severity": "LEGAL ADVISORY & INCIDENT ASSESSMENT",
    "sections": [
        {
            "law": "Bharatiya Nyaya Sanhita, 2023 (BNS)",
            "section": "Chapter V: Crimes Against Women and Children",
            "description": "Consolidated criminal statutes covering stalking, assault, voyeurism, sexual harassment, and intimidation.",
            "punishment": "Ranging from 1 to 7+ years imprisonment based on offense."
        },
        {
            "law": "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)",
            "section": "Section 173 BNSS (Zero FIR Provision)",
            "description": "Cognizable complaints can be registered at ANY police station in India without jurisdictional refusal.",
            "punishment": "Mandatory FIR registration and immediate jurisdictional transfer."
        }
    ],
    "rights": [
        "Right to Zero FIR under Section 173 BNSS.",
        "Protection of victim identity under Section 73 BNS.",
        "Right to free legal aid from DLSA / NALSA."
    ],
    "steps": [
        "Document and preserve all screenshots, chats, timestamps, and witness details.",
        "Save evidence in SHIELDHER Vault to calculate SHA-256 fingerprint.",
        "File online complaint on https://cybercrime.gov.in (cyber offenses) or nearest police station."
    ],
    "emergency": "For immediate danger to life or personal safety, dial 112 or 1091."
}


def analyze_query(query_text):
    """Keyword-based NLP matching for legal consultation."""
    clean_query = query_text.lower().strip()
    best_match = None
    highest_score = 0

    for cat in LEGAL_CATEGORIES:
        score = sum(1 for kw in cat["keywords"] if kw in clean_query)
        if score > highest_score:
            highest_score = score
            best_match = cat

    return best_match if highest_score > 0 else DEFAULT_LEGAL_ANALYSIS


# ============================================================================
# API ROUTES
# ============================================================================

@legal_bp.route("/api/legal/analyze", methods=["POST"])
def analyze_legal_issue():
    """
    Analyze user-described grievance in simple language and return applicable Indian laws.
    """
    data = request.get_json(silent=True) or {}
    query = data.get("query", "").strip()

    if not query:
        return jsonify({"success": False, "error": "Query cannot be empty"}), 400

    analysis = analyze_query(query)

    return jsonify({
        "success": True,
        "query": query,
        "analysis": analysis
    }), 200


@legal_bp.route("/api/legal/categories", methods=["GET"])
def get_categories():
    """Return all covered legal categories and rights."""
    return jsonify({
        "categories": [
            {"id": c["id"], "title": c["title"], "severity": c["severity"]}
            for c in LEGAL_CATEGORIES
        ]
    }), 200


@legal_bp.route("/api/legal/helplines", methods=["GET"])
def get_helplines():
    """Return verified Indian emergency helpline directory."""
    return jsonify({
        "helplines": [
            {"name": "National Emergency Helpline", "number": "112", "service": "Police, Fire, Medical"},
            {"name": "Women in Distress Helpline", "number": "1091", "service": "24x7 Women Safety Cell"},
            {"name": "Women Helpline (Domestic Abuse)", "number": "181", "service": "Counseling, Shelter & Rescue"},
            {"name": "National Cyber Crime Helpline", "number": "1930", "service": "Financial Fraud & Cyber Extortion"},
            {"name": "Women Power Line (UP)", "number": "1090", "service": "Dedicated Anti-Harassment Cell"}
        ]
    }), 200
