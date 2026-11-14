# SHIELDHER — Women's Safety & Legal Empowerment Platform

> **Our USP:** SHIELDHER integrates three pillars into a single unified platform:
> 1. **Prevention** – Smart Route Comparison with Risk Scoring
> 2. **Evidence Protection** – Digital Evidence Vault with SHA-256 Tamper Verification
> 3. **Legal Empowerment** – AI Legal Rights Navigator for Indian Law

---

## 🚀 Key Features Built

### 1. 🛡️ Prevention: Smart Route Comparison
- **Dual-Route Engine:** Enter any starting location and destination to view the **Fastest Route (Blue)** and the **Recommended Safer Alternative (Green)**.
- **Estimated Time & Distance:** Side-by-side metric comparison with time difference tags.
- **Multi-Factor Route Safety Risk Scoring:**
  - Street Lighting Coverage index (%)
  - Public Activity & Transit Footfall density (%)
  - Police Patrol / PCR Booths & Safe Havens proximity
  - Historical Reported Incidents density
- **Interactive Tools:** One-click location presets (Connaught Place, Hauz Khas, India Gate, Cyber City), swap button, and live GPS locator.

### 2. 🔒 Evidence Protection: Digital Evidence Vault
- **Cryptographic SHA-256 Fingerprinting:** Real-time client-side hashing via Web Crypto API (`crypto.subtle.digest('SHA-256')`).
- **Zero-Knowledge Privacy:** Evidence files are fingerprinted in the browser; no private files leave the user's device.
- **Categorization & Metadata:** Store screenshots, audio, documents, and videos with incident categories (Cyberstalking, POSH, Extortion, Threats), dates, and suspect notes.
- **Tamper Detection & Integrity Verification:** Upload any file to verify if even a single byte or pixel has been altered against stored vault hashes.
- **Court-Ready Evidence Certificate:** One-click download of a structured Chain of Custody certificate aligned with **Section 63 of Bharatiya Sakshya Adhiniyam, 2023 (BSA)** (formerly Section 65B Indian Evidence Act).

### 3. ⚖️ Legal Empowerment: AI Legal Rights Navigator
- **Natural Language Query Engine:** Describe incidents in simple English, Hindi, or Hinglish.
- **Applicable Indian Statutes:**
  - **Bharatiya Nyaya Sanhita, 2023 (BNS):** Section 78 (Stalking), Section 75 (Sexual Harassment), Section 77 (Voyeurism), Section 79 (Modesty), Section 85/86 (Cruelty).
  - **Information Technology Act, 2000:** Section 66E (Privacy violation), Section 67 & 67A (Obscene/explicit material transmission).
  - **POSH Act, 2013:** Internal Complaints Committee (ICC) regulations, interim relief, and rights at work.
  - **Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS):** Mandatory **Zero FIR (Section 173 BNSS)** at any police station across India.
- **Actionable Roadmaps:** Step-by-step guidance for reporting to the **National Cyber Crime Portal (`cybercrime.gov.in`)**, **National Commission for Women (NCW)**, and local police.
- **Quick-Scenario Chips:** 1-click consultation for common threats (Instagram stalking, photo blackmail, workplace harassment, street eve-teasing, domestic violence).

### 4. 🚨 Emergency SOS & Helplines Hub
- Direct 1-tap dialer for **112 (National Emergency)**, **1091 (Women Helpline)**, **181 (Domestic Abuse)**, and **1930 (Cybercrime Helpline)**.
- **Rapid SOS Simulation:** Packages real-time GPS coordinates into a ready-to-dispatch emergency broadcast message with 1-click WhatsApp and call sharing.

---

## 💻 Tech Stack
- **Frontend:** Vanilla HTML5, Modern CSS3 (CSS Grid, Flexbox, Custom Properties), Vanilla JavaScript (ES6+).
- **Mapping & Routing:** [Leaflet.js](https://leafletjs.com/), [OpenStreetMap](https://www.openstreetmap.org/), [OSRM Driving API](https://project-osrm.org/), [Nominatim Geocoding](https://nominatim.org/).
- **Cryptography:** Native Browser [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) (`crypto.subtle.digest("SHA-256")`).
- **Icons:** [Font Awesome 6](https://fontawesome.com/).

---

## 🏃‍♂️ How to Run
1. Open the file `frontend/index.html` in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Brave).
2. No Node.js build steps or package installation required.
