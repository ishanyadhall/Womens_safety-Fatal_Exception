"""
SHIELDHER - Main Flask Application Server
Integrates:
1. Evidence Vault Blueprint (evidence.py)
2. AI Legal Rights Navigator Blueprint (legal.py)
3. Safe Routes Risk Scoring Blueprint (routes.py)
"""

import os
import sys

# Ensure backend directory is in python search path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask, jsonify
from flask_cors import CORS
# Load environment variables if python-dotenv is installed
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Import blueprints
from evidence import evidence_bp
from legal import legal_bp
from routes import routes_bp

def create_app():
    app = Flask(__name__)

    # Allow CORS from all origins so frontend on another laptop can connect smoothly
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Register modular blueprints
    app.register_blueprint(evidence_bp)
    app.register_blueprint(legal_bp)
    app.register_blueprint(routes_bp)

    # Root endpoint
    @app.route("/", methods=["GET"])
    def root():
        return jsonify({
            "platform": "SHIELDHER API Server",
            "status": "Online",
            "version": "1.0.0",
            "usp": [
                "Prevention: Smart Route Comparison & Risk Scoring",
                "Evidence Protection: Digital Evidence Vault with SHA-256",
                "Legal Empowerment: AI Legal Rights Navigator"
            ],
            "endpoints": [
                "/api/health",
                "/api/vault/upload",
                "/api/vault/records",
                "/api/vault/verify",
                "/api/legal/analyze",
                "/api/legal/categories",
                "/api/legal/helplines",
                "/api/routes/risk-score",
                "/api/routes/safe-havens"
            ]
        }), 200

    # Health check endpoint for testing connection
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "healthy",
            "server": "SHIELDHER Backend (Python/Flask)",
            "database": "Local JSON / Zero-DB Mode Active",
            "cors": "Enabled"
        }), 200

    # 404 Error handler
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": "Endpoint not found"}), 404

    # 500 Error handler
    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"success": False, "error": "Internal server error"}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    print("==================================================================")
    print("🚀 SHIELDHER BACKEND SERVER STARTING")
    print("==================================================================")
    print(f"👉 Local Access    : http://localhost:{port}")
    print(f"👉 Network Access  : http://0.0.0.0:{port} (Accessible by other laptops on Wi-Fi)")
    print("👉 CORS Mode       : Permissive (All Origins Allowed)")
    print("👉 Storage Mode    : Zero-DB / Local Persistent JSON")
    print("==================================================================")
    app.run(host="0.0.0.0", port=port, debug=True)
