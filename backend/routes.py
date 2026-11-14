"""
SHIELDHER - Smart Route Risk Scoring & Safe Havens Backend Service
Calculates multi-factor safety scoring based on lighting, public activity,
police presence, and historical incident indicators.
"""

import math
from flask import Blueprint, request, jsonify

routes_bp = Blueprint("routes", __name__)

# Sample Safe Havens Directory (Police Stations, Metro Stations, 24/7 Points)
SAFE_HAVENS_CATALOG = [
    {"name": "Connaught Place Police Station", "type": "Police Booth", "lat": 28.6328, "lon": 77.2195, "phone": "011-23363300"},
    {"name": "Rajiv Chowk Metro Security Post", "type": "Metro CISF", "lat": 28.6329, "lon": 77.2194, "phone": "011-23417910"},
    {"name": "Hauz Khas Police Station", "type": "Police Station", "lat": 28.5494, "lon": 77.2001, "phone": "011-26562000"},
    {"name": "AIIMS Emergency Trauma Centre", "type": "24/7 Hospital", "lat": 28.5672, "lon": 77.2100, "phone": "011-26588500"},
    {"name": "Saket Women Help Desk", "type": "Women Safety Desk", "lat": 28.5244, "lon": 77.2066, "phone": "1091"},
    {"name": "Cyber City Police Assistance Booth", "type": "Police Booth", "lat": 28.4950, "lon": 77.0895, "phone": "112"}
]


def calculate_safety_metrics(duration_minutes, distance_km, is_alternative=False):
    """
    Simulated multi-factor safety evaluation model.
    Safer alternative routes prioritize major arterial lit roads with higher public transit density.
    """
    if is_alternative:
        lighting_score = 94
        footfall_score = 88
        police_presence = 3
        incidents = 0
        safety_index = 9.2
        recommendation = "HIGH SAFETY RECOMMENDED: Well-lit arterial boulevards with active commercial footfall and CCTV."
    else:
        lighting_score = 68
        footfall_score = 62
        police_presence = 1
        incidents = 2
        safety_index = 6.8
        recommendation = "MODERATE RISK: Fastest direct route but passes through 2 dimly lit secondary stretches."

    return {
        "safetyIndex": safety_index,
        "lightingIndex": lighting_score,
        "publicFootfall": footfall_score,
        "policeBoothsEnroute": police_presence,
        "reportedIncidents90Days": incidents,
        "recommendation": recommendation
    }


# ============================================================================
# API ROUTES
# ============================================================================

@routes_bp.route("/api/routes/risk-score", methods=["POST"])
def score_route():
    """
    Calculate safety risk scoring for route coordinates or metrics.
    """
    data = request.get_json(silent=True) or {}
    duration_min = data.get("durationMinutes", 25)
    distance_km = data.get("distanceKm", 12.0)
    is_alt = data.get("isAlternative", False)

    metrics = calculate_safety_metrics(duration_min, distance_km, is_alt)

    return jsonify({
        "success": True,
        "metrics": metrics
    }), 200


@routes_bp.route("/api/routes/safe-havens", methods=["GET"])
def get_safe_havens():
    """
    Return nearby safe havens (police stations, metro assistance booths, 24/7 hospitals).
    """
    return jsonify({
        "safeHavens": SAFE_HAVENS_CATALOG
    }), 200
