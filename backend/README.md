# SHIELDHER - Python Flask Backend

Modular backend service for the **SHIELDHER** Women's Safety Platform.

## 📁 Architecture

```text
backend/
├── app.py              # Main Flask server entry point & CORS configuration
├── evidence.py         # Pillar 2: SHA-256 Vault, tamper verification & storage
├── legal.py            # Pillar 3: AI Legal Rights Navigator (BNS, IPC, IT Act)
├── routes.py           # Pillar 1: Multi-factor Route Safety Risk Scoring
├── requirements.txt    # Python dependencies
└── data/               # Persistent JSON storage (Zero-database setup)
```

## 🚀 How to Run

1. Open a terminal inside the `backend` folder:
   ```bash
   cd backend
   ```

2. (Optional) Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```

3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```bash
   python app.py
   ```
   The server will run on `http://localhost:5000` (or your local network IP on port 5000).

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend status & health check |
| `POST` | `/api/vault/upload` | Upload evidence file & calculate SHA-256 |
| `GET` | `/api/vault/records` | Get all secured evidence records |
| `POST` | `/api/vault/verify` | Verify uploaded file integrity against vault hashes |
| `DELETE` | `/api/vault/records/<id>` | Delete an evidence record |
| `POST` | `/api/legal/analyze` | AI analysis of grievance under Indian Laws |
| `GET` | `/api/legal/categories` | List covered Indian legal provisions |
| `GET` | `/api/legal/helplines` | Emergency women helplines (112, 1091, 181, 1930) |
| `POST` | `/api/routes/risk-score` | Calculate route safety indicators |
| `GET` | `/api/routes/safe-havens` | Directory of nearby police booths & safe havens |
