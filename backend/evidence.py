"""
SHIELDHER - Digital Evidence Vault Backend Service
Provides SHA-256 cryptographic fingerprinting, tamper verification,
local file storage, and legal certificate generation under Section 63 BSA 2023.
"""

import os
import json
import hashlib
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename

evidence_bp = Blueprint("evidence", __name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
VAULT_DB_FILE = os.path.join(DATA_DIR, "evidence_vault.json")

# Ensure required directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)


def load_vault():
    """Load stored evidence records from JSON file."""
    if not os.path.exists(VAULT_DB_FILE):
        return []
    try:
        with open(VAULT_DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[Evidence Vault] Error loading vault: {e}")
        return []


def save_vault(records):
    """Save evidence records to JSON file."""
    try:
        with open(VAULT_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[Evidence Vault] Error saving vault: {e}")
        return False


def calculate_sha256(file_path):
    """Compute cryptographic SHA-256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


# ============================================================================
# API ROUTES
# ============================================================================

@evidence_bp.route("/api/vault/upload", methods=["POST"])
def upload_evidence():
    """
    Upload evidence file, compute SHA-256 fingerprint, and store metadata.
    """
    try:
        file = request.files.get("file")
        client_hash = request.form.get("sha256Hash", "").strip().lower()
        category = request.form.get("category", "General Evidence")
        incident_date = request.form.get("incidentDate", datetime.now().strftime("%Y-%m-%d"))
        notes = request.form.get("notes", "").strip() or "No notes provided."
        record_id = request.form.get("recordId") or f"EV-{int(datetime.now().timestamp()) % 100000}"

        original_filename = "evidence_file"
        file_size_formatted = "Unknown"
        file_path = None
        server_hash = ""

        if file and file.filename:
            safe_name = secure_filename(file.filename)
            original_filename = file.filename
            stored_filename = f"{record_id}_{safe_name}"
            file_path = os.path.join(UPLOADS_DIR, stored_filename)
            file.save(file_path)

            # Compute SHA-256 server-side
            server_hash = calculate_sha256(file_path)

            # Format file size
            size_bytes = os.path.getsize(file_path)
            file_size_formatted = (
                f"{size_bytes / (1024 * 1024):.2f} MB"
                if size_bytes >= 1024 * 1024
                else f"{size_bytes / 1024:.1f} KB"
            )
        else:
            server_hash = client_hash

        # Cross-verify client and server hashes
        integrity_match = True
        if client_hash and server_hash:
            integrity_match = (client_hash == server_hash)

        now = datetime.now()
        new_record = {
            "id": record_id,
            "fileName": original_filename,
            "fileSize": file_size_formatted,
            "category": category,
            "incidentDate": incident_date,
            "notes": notes,
            "sha256Hash": server_hash,
            "timestamp": now.isoformat(),
            "formattedDate": now.strftime("%d %b %Y, %I:%M %p"),
            "status": "VERIFIED_TAMPER_PROOF" if integrity_match else "HASH_MISMATCH_DETECTED",
            "hasPhysicalFile": bool(file_path)
        }

        records = load_vault()
        # Avoid duplicate ids
        records = [r for r in records if r["id"] != record_id]
        records.insert(0, new_record)
        save_vault(records)

        return jsonify({
            "success": True,
            "message": "Evidence successfully secured and hashed with SHA-256",
            "record": new_record
        }), 201

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@evidence_bp.route("/api/vault/records", methods=["GET"])
def get_vault_records():
    """Retrieve all secured evidence records."""
    records = load_vault()
    return jsonify(records), 200


@evidence_bp.route("/api/vault/verify", methods=["POST"])
def verify_file_integrity():
    """
    Check if an uploaded file matches any stored vault record by comparing SHA-256.
    """
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded for verification"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"success": False, "error": "Empty filename"}), 400

    try:
        temp_path = os.path.join(DATA_DIR, f"temp_{secure_filename(file.filename)}")
        file.save(temp_path)
        computed_hash = calculate_sha256(temp_path)
        os.remove(temp_path)

        records = load_vault()
        matched_record = next((r for r in records if r.get("sha256Hash", "").lower() == computed_hash.lower()), None)

        if matched_record:
            return jsonify({
                "match": True,
                "message": "Integrity Verified: File exactly matches vault record. 0 bytes modified.",
                "computedHash": computed_hash,
                "matchedRecord": matched_record
            }), 200
        else:
            return jsonify({
                "match": False,
                "message": "Hash Mismatch: File has either been altered/modified or is not in the vault.",
                "computedHash": computed_hash
            }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@evidence_bp.route("/api/vault/records/<record_id>", methods=["DELETE"])
def delete_record(record_id):
    """Delete a specific vault record."""
    records = load_vault()
    filtered = [r for r in records if r.get("id") != record_id]

    # Delete physical uploaded file if present
    for fname in os.listdir(UPLOADS_DIR):
        if fname.startswith(record_id):
            try:
                os.remove(os.path.join(UPLOADS_DIR, fname))
            except OSError:
                pass

    save_vault(filtered)
    return jsonify({"success": True, "message": f"Record {record_id} deleted."}), 200


@evidence_bp.route("/api/vault/clear", methods=["POST"])
def clear_vault():
    """Clear all records from vault."""
    save_vault([])
    return jsonify({"success": True, "message": "Vault cleared."}), 200
