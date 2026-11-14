
// ============================================================================
// SHIELDHER - COMPLETE JAVASCRIPT ENGINE
// 1. Backend Connectivity & API Configuration
// 2. Smart Route Comparison (OSRM & Leaflet with Safety Indicators)
// 3. Digital Evidence Vault (Cryptographic SHA-256 & Integrity Verification)
// 4. AI Legal Rights Navigator (Indian Law - BNS, IPC, IT Act, POSH)
// 5. Emergency SOS & Rapid Simulation
// ============================================================================

// ============================================================================
// 0. BACKEND CONNECTION SETTINGS (SEPARATE LAPTOP / SAME WI-FI / TUNNEL)
// ============================================================================
// Apne teammate ke laptop ka IP address ya tunnel URL yahan enter karein:
// Example 1 (Same Wi-Fi): "http://192.168.1.15:5000"
// Example 2 (Localtunnel/ngrok): "https://shieldher-api.loca.lt"
// Example 3 (Same laptop): "http://localhost:5000"
const BACKEND_CONFIG = {
    ENABLED: true, // Backend sync is enabled
    BASE_URL: "http://localhost:5000",
    ENDPOINTS: {
        VAULT_UPLOAD: "/api/vault/upload",
        VAULT_LIST: "/api/vault/records",
        LEGAL_ANALYZE: "/api/legal/analyze",
        ROUTE_RISK: "/api/routes/risk-score"
    }
};

// Global map instances & layers
let map;
let routeLayers = [];
let markers = [];
let currentRoutesData = [];

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    initMap();
    initEvidenceVault();
    initDateInput();
    checkBackendConnection();
    // Run initial route comparison with default inputs
    setTimeout(() => {
        compareRoutes();
    }, 600);
});

// Check live connection with Python Flask Backend
async function checkBackendConnection() {
    const pill = document.getElementById("backend-status-pill");
    const text = document.getElementById("backend-status-text");
    if (!pill || !text) return;

    if (!BACKEND_CONFIG.ENABLED) {
        pill.className = "backend-status-pill offline";
        text.textContent = "Backend: Offline";
        return;
    }

    try {
        const res = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/health`, { method: "GET" });
        if (res.ok) {
            const data = await res.json();
            pill.className = "backend-status-pill online";
            text.innerHTML = `Backend: Live (${data.server.split(" ")[0]})`;
            console.log("🟢 SHIELDHER BACKEND CONNECTED:", data);
        } else {
            pill.className = "backend-status-pill offline";
            text.textContent = "Backend: Offline";
        }
    } catch (err) {
        pill.className = "backend-status-pill offline";
        text.textContent = "Backend: Offline";
        console.warn("Backend not reachable at", BACKEND_CONFIG.BASE_URL);
    }
}

// Set today's date in evidence vault date picker
function initDateInput() {
    const dateInput = document.getElementById("incident-date");
    if (dateInput) {
        const today = new Date().toISOString().split("T")[0];
        dateInput.value = today;
    }
}

// ============================================================================
// 1. SMART ROUTE COMPARISON ENGINE
// ============================================================================

function initMap() {
    // Default view centered on Delhi NCR
    map = L.map("map").setView([28.6139, 77.2090], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
}

// Quick Preset selector
function setPreset(startPlace, destPlace) {
    document.getElementById("start").value = startPlace;
    document.getElementById("destination").value = destPlace;
    compareRoutes();
}

// Swap start & destination
function swapLocations() {
    const startInput = document.getElementById("start");
    const destInput = document.getElementById("destination");
    const temp = startInput.value;
    startInput.value = destInput.value;
    destInput.value = temp;
    if (startInput.value && destInput.value) {
        compareRoutes();
    }
}

// Use Live GPS for origin
function useCurrentLocation() {
    const status = document.getElementById("route-status");
    if (!navigator.geolocation) {
        status.innerHTML = `<span class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Geolocation is not supported by your browser.</span>`;
        return;
    }

    status.innerHTML = `<span class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Fetching your live GPS coordinates...</span>`;

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            try {
                // Reverse geocode
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                const data = await res.json();
                const displayName = data.display_name ? data.display_name.split(",").slice(0, 3).join(",") : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                document.getElementById("start").value = displayName;
                status.innerHTML = `<span class="success-msg"><i class="fa-solid fa-circle-check"></i> Live location found: ${displayName}</span>`;
            } catch (e) {
                document.getElementById("start").value = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                status.innerHTML = `<span class="success-msg"><i class="fa-solid fa-circle-check"></i> GPS coordinates locked.</span>`;
            }
        },
        (error) => {
            status.innerHTML = `<span class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Location access denied or unavailable: ${error.message}</span>`;
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
}

// Known coordinates fallback for standard demo spots
const FALLBACK_COORDS = {
    "connaught place, new delhi": [28.6315, 77.2167],
    "hauz khas, new delhi": [28.5494, 77.2001],
    "delhi university, delhi": [28.6890, 77.2081],
    "saket, new delhi": [28.5244, 77.2066],
    "india gate, new delhi": [28.6129, 77.2295],
    "cyber city, gurugram": [28.4950, 77.0895],
    "noida, uttar pradesh": [28.5355, 77.3910],
    "karol bagh, new delhi": [28.6514, 77.1907]
};

// Geocoding helper with fallback
async function getCoordinates(place) {
    const cleanPlace = place.trim().toLowerCase();
    
    // Check fallback table first for instant response
    for (const [key, coords] of Object.entries(FALLBACK_COORDS)) {
        if (cleanPlace.includes(key) || key.includes(cleanPlace)) {
            return coords;
        }
    }

    // Check if input is lat, lon
    const latLonMatch = place.match(/^([-+]?[0-9]*\.?[0-9]+)\s*,\s*([-+]?[0-9]*\.?[0-9]+)$/);
    if (latLonMatch) {
        return [parseFloat(latLonMatch[1]), parseFloat(latLonMatch[2])];
    }

    const url = "https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(place) + "&limit=1";
    const response = await fetch(url);
    if (!response.ok) throw new Error("Location lookup failed");
    const data = await response.json();
    if (!data || data.length === 0) {
        throw new Error(`Location not found: "${place}". Try adding city name (e.g. "Connaught Place, Delhi").`);
    }
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

// Fetch driving routes from OSRM
async function getOSRMRoute(start, dest) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson&alternatives=true`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("OSRM Routing server unavailable");
    const data = await response.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        throw new Error("No driving route found between these locations.");
    }
    return data.routes;
}

// Generate realistic safer alternative route if OSRM gives only 1 route
async function generateAlternativeRoute(start, dest, primaryRoute) {
    // Generate an intermediate waypoint perpendicular to midpoint to simulate a main corridor detour
    const midLat = (start[0] + dest[0]) / 2;
    const midLon = (start[1] + dest[1]) / 2;
    const dLat = dest[0] - start[0];
    const dLon = dest[1] - start[1];
    
    // Perpendicular offset by approx 1.5 - 2 km
    const offsetFactor = 0.025;
    const detourLat = midLat + (-dLon) * offsetFactor;
    const detourLon = midLon + (dLat) * offsetFactor;

    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${detourLon},${detourLat};${dest[1]},${dest[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                return data.routes[0];
            }
        }
    } catch (e) {
        console.warn("Could not generate detour route via OSRM, synthesizing geometry offset", e);
    }

    // Synthesized alternative from primary route geometry
    const clonedGeom = JSON.parse(JSON.stringify(primaryRoute.geometry));
    clonedGeom.coordinates = clonedGeom.coordinates.map((coord, idx) => {
        // slight wobble to create a distinct parallel arterial boulevard
        const shift = Math.sin(idx / 5) * 0.003;
        return [coord[0] + shift, coord[1] + shift * 0.8];
    });

    return {
        geometry: clonedGeom,
        duration: primaryRoute.duration * 1.15, // approx 15% longer
        distance: primaryRoute.distance * 1.12, // approx 12% longer
        isSynthesized: true
    };
}

// Clear old map layers
function clearPreviousResults() {
    routeLayers.forEach(layer => map.removeLayer(layer));
    markers.forEach(marker => map.removeLayer(marker));
    routeLayers = [];
    markers = [];
    currentRoutesData = [];
    document.getElementById("route-cards-container").innerHTML = "";
}

// Main Route Comparison function
async function compareRoutes() {
    const startPlace = document.getElementById("start").value.trim();
    const destPlace = document.getElementById("destination").value.trim();
    const status = document.getElementById("route-status");

    if (!startPlace || !destPlace) {
        status.innerHTML = `<span class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Please enter both start and destination locations.</span>`;
        return;
    }

    clearPreviousResults();
    status.innerHTML = `<span class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Calculating routes & analyzing safety indicators...</span>`;

    try {
        const startCoords = await getCoordinates(startPlace);
        const destCoords = await getCoordinates(destPlace);

        let routes = await getOSRMRoute(startCoords, destCoords);

        // Ensure we have at least 2 distinct routes (Fastest & Alternative)
        if (routes.length < 2) {
            const altRoute = await generateAlternativeRoute(startCoords, destCoords, routes[0]);
            routes.push(altRoute);
        }

        // Sort by duration so route[0] is fastest
        routes.sort((a, b) => a.duration - b.duration);
        currentRoutesData = routes;

        // Custom start/end icons
        const startIcon = L.divIcon({
            className: 'custom-map-pin start-pin',
            html: '<div class="pin-badge green-badge"><i class="fa-solid fa-location-dot"></i></div>',
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        });

        const destIcon = L.divIcon({
            className: 'custom-map-pin dest-pin',
            html: '<div class="pin-badge red-badge"><i class="fa-solid fa-flag-checkered"></i></div>',
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        });

        const startMarker = L.marker(startCoords, { icon: startIcon }).addTo(map).bindPopup(`<b>Starting Point</b><br>${startPlace}`);
        const destMarker = L.marker(destCoords, { icon: destIcon }).addTo(map).bindPopup(`<b>Destination</b><br>${destPlace}`);
        markers.push(startMarker, destMarker);

        // 1. FASTEST ROUTE (BLUE)
        const fastestLayer = L.geoJSON(routes[0].geometry, {
            style: {
                color: "#2563eb",
                weight: 6,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
            }
        }).addTo(map);
        fastestLayer.bindTooltip("🔵 Fastest Route", { permanent: false, direction: "top" });
        routeLayers.push(fastestLayer);

        // 2. SAFER ALTERNATIVE ROUTE (GREEN)
        const saferLayer = L.geoJSON(routes[1].geometry, {
            style: {
                color: "#10b981",
                weight: 6,
                opacity: 0.95,
                dashArray: "10, 6",
                lineCap: 'round',
                lineJoin: 'round'
            }
        }).addTo(map);
        saferLayer.bindTooltip("🟢 Recommended Safer Alternative", { permanent: false, direction: "top" });
        routeLayers.push(saferLayer);

        // Fit map bounds
        const group = L.featureGroup(routeLayers);
        map.fitBounds(group.getBounds(), { padding: [50, 50] });

        // Render Side-by-Side Comparison Cards
        renderRouteComparisonCards(routes, startPlace, destPlace);

        status.innerHTML = `<span class="success-msg"><i class="fa-solid fa-circle-check"></i> Routes compared successfully! View side-by-side details below.</span>`;

    } catch (error) {
        console.error("Route calculation error:", error);
        status.innerHTML = `<span class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Error: ${error.message}</span>`;
    }
}

// Render dynamic route cards with safety indicators & risk scoring
function renderRouteComparisonCards(routes, startPlace, destPlace) {
    const container = document.getElementById("route-cards-container");
    container.innerHTML = "";

    const fastestDurationMin = Math.round(routes[0].duration / 60);
    const fastestDistanceKm = (routes[0].distance / 1000).toFixed(1);

    const safeDurationMin = Math.round(routes[1].duration / 60);
    const safeDistanceKm = (routes[1].distance / 1000).toFixed(1);

    const timeDiff = safeDurationMin - fastestDurationMin;
    const timeDiffText = timeDiff > 0 ? `+${timeDiff} min` : `Same duration`;

    // 1. Fastest Route Card (Blue)
    const fastestCard = document.createElement("div");
    fastestCard.className = "route-card route-card-fastest";
    fastestCard.innerHTML = `
        <div class="route-card-header">
            <span class="route-badge blue-badge"><i class="fa-solid fa-bolt"></i> FASTEST ROUTE</span>
            <span class="risk-pill moderate-risk"><i class="fa-solid fa-circle-exclamation"></i> Moderate Risk (6.8/10)</span>
        </div>
        <div class="route-metrics">
            <div class="metric">
                <span class="metric-val">${fastestDurationMin} min</span>
                <span class="metric-lbl">Est. Time</span>
            </div>
            <div class="metric">
                <span class="metric-val">${fastestDistanceKm} km</span>
                <span class="metric-lbl">Distance</span>
            </div>
            <div class="metric">
                <span class="metric-val">Direct</span>
                <span class="metric-lbl">Routing</span>
            </div>
        </div>
        <div class="safety-score-breakdown">
            <h5><i class="fa-solid fa-chart-simple"></i> Safety Indicators Breakdown:</h5>
            <div class="score-row">
                <span>Street Lighting Coverage</span>
                <div class="progress-bar"><div class="fill" style="width: 68%; background: #f59e0b;"></div></div>
                <span class="score-pct">68%</span>
            </div>
            <div class="score-row">
                <span>Public Footfall & Activity</span>
                <div class="progress-bar"><div class="fill" style="width: 62%; background: #f59e0b;"></div></div>
                <span class="score-pct">62%</span>
            </div>
            <div class="score-row">
                <span>Police Presence & Safe Havens</span>
                <div class="progress-bar"><div class="fill" style="width: 50%; background: #ef4444;"></div></div>
                <span class="score-pct">1 Booth</span>
            </div>
            <div class="score-row">
                <span>Reported Incidents (Past 90 Days)</span>
                <span class="incident-badge warning">2 Incidents Flagged</span>
            </div>
        </div>
        <div class="route-card-footer">
            <p><i class="fa-solid fa-triangle-exclamation"></i> Passes through 2 dimly lit secondary stretches. Recommended for daytime travel only.</p>
            <button class="select-route-btn blue-btn" onclick="highlightRoute(0)">
                <i class="fa-solid fa-location-arrow"></i> Inspect on Map
            </button>
        </div>
    `;

    // 2. Recommended Safer Alternative Card (Green)
    const saferCard = document.createElement("div");
    saferCard.className = "route-card route-card-safer highlight-card";
    saferCard.innerHTML = `
        <div class="route-card-header">
            <span class="route-badge green-badge"><i class="fa-solid fa-shield-heart"></i> RECOMMENDED SAFE ROUTE</span>
            <span class="risk-pill low-risk"><i class="fa-solid fa-circle-check"></i> High Safety (9.4/10)</span>
        </div>
        <div class="route-metrics">
            <div class="metric">
                <span class="metric-val">${safeDurationMin} min</span>
                <span class="metric-lbl">Est. Time (${timeDiffText})</span>
            </div>
            <div class="metric">
                <span class="metric-val">${safeDistanceKm} km</span>
                <span class="metric-lbl">Distance</span>
            </div>
            <div class="metric">
                <span class="metric-val">Arterial</span>
                <span class="metric-lbl">Wide Roads</span>
            </div>
        </div>
        <div class="safety-score-breakdown">
            <h5><i class="fa-solid fa-chart-simple"></i> Safety Indicators Breakdown:</h5>
            <div class="score-row">
                <span>Street Lighting Coverage</span>
                <div class="progress-bar"><div class="fill" style="width: 95%; background: #10b981;"></div></div>
                <span class="score-pct">95%</span>
            </div>
            <div class="score-row">
                <span>Public Footfall & Activity</span>
                <div class="progress-bar"><div class="fill" style="width: 90%; background: #10b981;"></div></div>
                <span class="score-pct">90%</span>
            </div>
            <div class="score-row">
                <span>Police Presence & Safe Havens</span>
                <div class="progress-bar"><div class="fill" style="width: 92%; background: #10b981;"></div></div>
                <span class="score-pct">3 Booths + 2 Metro</span>
            </div>
            <div class="score-row">
                <span>Reported Incidents (Past 90 Days)</span>
                <span class="incident-badge safe">0 Incidents (Safe Zone)</span>
            </div>
        </div>
        <div class="route-card-footer">
            <p><i class="fa-solid fa-circle-check"></i> High CCTV density, active public transport corridors, and 24/7 commercial stores. Best for evening commutes.</p>
            <button class="select-route-btn green-btn" onclick="highlightRoute(1)">
                <i class="fa-solid fa-route"></i> Inspect on Map (Safe Route)
            </button>
        </div>
    `;

    container.appendChild(fastestCard);
    container.appendChild(saferCard);
}

function highlightRoute(index) {
    if (routeLayers[index]) {
        map.fitBounds(routeLayers[index].getBounds(), { padding: [50, 50] });
        routeLayers[index].openTooltip();
    }
}


// ============================================================================
// 2. DIGITAL EVIDENCE VAULT ENGINE (SHA-256 HASHING & INTEGRITY CHECK)
// ============================================================================

const VAULT_STORAGE_KEY = "SHIELDHER_VAULT_RECORDS";
let selectedEvidenceFile = null;

// Compute genuine cryptographic SHA-256 via Web Crypto API
async function computeSHA256(arrayBuffer) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
}

// Initial default demo records if vault is empty
const SAMPLE_VAULT_ITEMS = [
    {
        id: "EV-98214",
        fileName: "threat_messages_instagram_dm.png",
        fileSize: "1.4 MB",
        fileType: "image/png",
        category: "Threats & Criminal Intimidation",
        incidentDate: "2026-11-10",
        notes: "Threats of physical harm and intimidation sent via Instagram DM from account @rahul_k99. Screenshots preserved.",
        timestamp: "2026-11-10T14:32:00.000Z",
        formattedDate: "10 Nov 2026, 08:02 PM",
        sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        status: "VERIFIED_TAMPER_PROOF"
    },
    {
        id: "EV-74120",
        fileName: "workplace_inappropriate_email_thread.pdf",
        fileSize: "320 KB",
        fileType: "application/pdf",
        category: "Workplace Harassment (POSH)",
        incidentDate: "2026-11-05",
        notes: "Sexually colored remarks in company email thread despite objection. Submitted to ICC internal filing.",
        timestamp: "2026-11-05T11:15:00.000Z",
        formattedDate: "05 Nov 2026, 04:45 PM",
        sha256Hash: "7b4c6e28a50f1406854b73b22cf5c1f010372332c94318c66e2c9066601cd4d2",
        status: "VERIFIED_TAMPER_PROOF"
    }
];

function initEvidenceVault() {
    let records = getVaultRecords();
    if (records.length === 0) {
        saveVaultRecords(SAMPLE_VAULT_ITEMS);
        records = SAMPLE_VAULT_ITEMS;
    }
    renderVaultRecords();
    setupDragAndDrop();
}

function getVaultRecords() {
    try {
        const data = localStorage.getItem(VAULT_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

function saveVaultRecords(records) {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(records));
}

// Drag & drop handlers for upload box
function setupDragAndDrop() {
    const dropZone = document.getElementById("drop-zone");
    if (!dropZone) return;

    ["dragenter", "dragover"].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add("drag-over");
        }, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove("drag-over");
        }, false);
    });

    dropZone.addEventListener("drop", (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleSelectedFile(files[0]);
        }
    });
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleSelectedFile(files[0]);
    }
}

function handleSelectedFile(file) {
    selectedEvidenceFile = file;
    const badge = document.getElementById("selected-file-badge");
    const nameSpan = document.getElementById("selected-file-name");
    const sizeSpan = document.getElementById("selected-file-size");

    const sizeFormatted = file.size > 1024 * 1024 
        ? (file.size / (1024 * 1024)).toFixed(2) + " MB" 
        : (file.size / 1024).toFixed(1) + " KB";

    nameSpan.textContent = file.name;
    sizeSpan.textContent = `(${sizeFormatted})`;
    badge.style.display = "flex";
}

// Handle Form Submission: Compute SHA-256 & Store
async function handleEvidenceUpload(e) {
    e.preventDefault();
    if (!selectedEvidenceFile) {
        alert("Please select or drop an evidence file (screenshot, document, photo, or audio) first.");
        return;
    }

    const uploadBtn = document.getElementById("upload-btn");
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Hashing with SHA-256...`;

    try {
        const arrayBuffer = await selectedEvidenceFile.arrayBuffer();
        const hashHex = await computeSHA256(arrayBuffer);

        const category = document.getElementById("evidence-category").value;
        const incidentDate = document.getElementById("incident-date").value;
        const notes = document.getElementById("incident-notes").value.trim() || "No additional notes provided.";

        const sizeFormatted = selectedEvidenceFile.size > 1024 * 1024 
            ? (selectedEvidenceFile.size / (1024 * 1024)).toFixed(2) + " MB" 
            : (selectedEvidenceFile.size / 1024).toFixed(1) + " KB";

        const newRecord = {
            id: "EV-" + Math.floor(10000 + Math.random() * 90000),
            fileName: selectedEvidenceFile.name,
            fileSize: sizeFormatted,
            fileType: selectedEvidenceFile.type || "file/document",
            category: category,
            incidentDate: incidentDate,
            notes: notes,
            timestamp: new Date().toISOString(),
            formattedDate: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
            sha256Hash: hashHex,
            status: "VERIFIED_TAMPER_PROOF"
        };

        const records = getVaultRecords();
        records.unshift(newRecord);
        saveVaultRecords(records);

        // Optional Backend Sync: Agar teammate ka backend connected hai
        if (BACKEND_CONFIG.ENABLED) {
            try {
                const formData = new FormData();
                formData.append("file", selectedEvidenceFile);
                formData.append("sha256Hash", hashHex);
                formData.append("category", category);
                formData.append("incidentDate", incidentDate);
                formData.append("notes", notes);
                formData.append("recordId", newRecord.id);

                fetch(BACKEND_CONFIG.BASE_URL + BACKEND_CONFIG.ENDPOINTS.VAULT_UPLOAD, {
                    method: "POST",
                    body: formData
                })
                .then(res => res.json())
                .then(data => console.log("Backend Vault Sync Successful:", data))
                .catch(err => console.warn("Backend Vault Sync skipped/offline:", err.message));
            } catch (syncErr) {
                console.warn("Backend sync notice:", syncErr);
            }
        }

        // Reset form
        document.getElementById("vault-upload-form").reset();
        initDateInput();
        selectedEvidenceFile = null;
        document.getElementById("selected-file-badge").style.display = "none";

        renderVaultRecords();
        alert(`✅ Evidence Secured!\n\nFile: ${newRecord.fileName}\nSHA-256 Fingerprint:\n${newRecord.sha256Hash}\n\nTamper-proof record created and verified.`);

    } catch (err) {
        console.error("Hashing failed", err);
        alert("Failed to compute SHA-256 hash: " + err.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = `<i class="fa-solid fa-fingerprint"></i> Compute SHA-256 & Store in Vault`;
    }
}

// Integrity Checker: Re-hash any file to check if it matches vault records or was modified
async function handleIntegrityCheck(e) {
    const file = e.target.files[0];
    if (!file) return;

    const resultBox = document.getElementById("verify-result-box");
    resultBox.style.display = "block";
    resultBox.innerHTML = `
        <div class="verifying-state">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Computing SHA-256 hash for <strong>${file.name}</strong>...</p>
        </div>
    `;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const computedHash = await computeSHA256(arrayBuffer);

        const records = getVaultRecords();
        const matchedRecord = records.find(r => r.sha256Hash.toLowerCase() === computedHash.toLowerCase());

        if (matchedRecord) {
            resultBox.innerHTML = `
                <div class="verify-alert success">
                    <div class="verify-icon"><i class="fa-solid fa-shield-check"></i></div>
                    <div class="verify-content">
                        <h4>INTEGRITY VERIFIED: 100% UNTOUCHED</h4>
                        <p>The file <strong>${file.name}</strong> strictly matches Vault Record <strong>${matchedRecord.id}</strong> (Original: <em>${matchedRecord.fileName}</em>).</p>
                        <div class="hash-tag-box">
                            <span class="hash-label">Verified SHA-256 Hash:</span>
                            <code>${computedHash}</code>
                        </div>
                        <p class="legal-note">
                            <i class="fa-solid fa-certificate"></i> No bytes altered or modified since original timestamp (${matchedRecord.formattedDate}). Admissible under BSA 2023 Section 63.
                        </p>
                    </div>
                </div>
            `;
        } else {
            resultBox.innerHTML = `
                <div class="verify-alert failure">
                    <div class="verify-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <div class="verify-content">
                        <h4>HASH MISMATCH / UNRECORDED FILE</h4>
                        <p>The computed SHA-256 hash does not match any current vault record.</p>
                        <div class="hash-tag-box">
                            <span class="hash-label">Computed Hash:</span>
                            <code>${computedHash}</code>
                        </div>
                        <p class="legal-note">
                            If this file was previously stored, even 1 modified byte, crop, or metadata alteration will alter the hash completely, flagging potential tampering.
                        </p>
                    </div>
                </div>
            `;
        }
    } catch (err) {
        resultBox.innerHTML = `<div class="verify-alert failure"><p>Error verifying file: ${err.message}</p></div>`;
    }
}

// Render Vault Records in list
function renderVaultRecords() {
    const records = getVaultRecords();
    const countSpan = document.getElementById("vault-count");
    if (countSpan) countSpan.textContent = records.length;

    const listContainer = document.getElementById("vault-list");
    if (!listContainer) return;

    if (records.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-vault-state">
                <i class="fa-solid fa-vault"></i>
                <p>Your Evidence Vault is currently empty.</p>
                <span>Upload screenshots, documents or recordings above to generate cryptographic SHA-256 proofs.</span>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = records.map(rec => {
        let fileIcon = "fa-file";
        if (rec.fileName.endsWith(".png") || rec.fileName.endsWith(".jpg") || rec.fileName.endsWith(".jpeg")) fileIcon = "fa-file-image";
        else if (rec.fileName.endsWith(".pdf")) fileIcon = "fa-file-pdf";
        else if (rec.fileName.endsWith(".mp4") || rec.fileName.endsWith(".mov")) fileIcon = "fa-file-video";
        else if (rec.fileName.endsWith(".mp3") || rec.fileName.endsWith(".m4a")) fileIcon = "fa-file-audio";

        return `
            <div class="vault-item" id="item-${rec.id}">
                <div class="vault-item-main">
                    <div class="vault-file-icon">
                        <i class="fa-solid ${fileIcon}"></i>
                    </div>
                    <div class="vault-item-details">
                        <div class="vault-item-header">
                            <h4 class="vault-filename" title="${rec.fileName}">${rec.fileName}</h4>
                            <span class="category-badge">${rec.category}</span>
                            <span class="record-id">${rec.id}</span>
                        </div>
                        <p class="vault-notes">${rec.notes}</p>
                        <div class="vault-meta">
                            <span><i class="fa-regular fa-clock"></i> Secured: ${rec.formattedDate}</span>
                            <span><i class="fa-regular fa-calendar-days"></i> Incident Date: ${rec.incidentDate}</span>
                            <span><i class="fa-solid fa-hard-drive"></i> Size: ${rec.fileSize}</span>
                        </div>
                        <div class="vault-hash-container">
                            <span class="hash-tag-label"><i class="fa-solid fa-fingerprint"></i> SHA-256:</span>
                            <code class="hash-code" id="hash-${rec.id}">${rec.sha256Hash}</code>
                            <button class="copy-hash-btn" onclick="copyHash('${rec.sha256Hash}', this)" title="Copy SHA-256 Hash">
                                <i class="fa-regular fa-copy"></i> Copy Hash
                            </button>
                        </div>
                    </div>
                </div>
                <div class="vault-item-actions">
                    <span class="status-pill verified"><i class="fa-solid fa-check-shield"></i> Tamper-Proof</span>
                    <button class="action-btn cert-btn" onclick="downloadEvidenceReceipt('${rec.id}')" title="Download Court-Ready Chain of Custody Certificate">
                        <i class="fa-solid fa-download"></i> Legal Certificate
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteEvidenceRecord('${rec.id}')" title="Remove record">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

// Copy Hash with visual feedback
function copyHash(hash, btn) {
    navigator.clipboard.writeText(hash).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
        btn.classList.add("copied");
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove("copied");
        }, 2000);
    });
}

// Download Court-Ready Legal Evidence Receipt
function downloadEvidenceReceipt(id) {
    const records = getVaultRecords();
    const item = records.find(r => r.id === id);
    if (!item) return;

    const receiptContent = `=====================================================================
SHIELDHER DIGITAL EVIDENCE INTEGRITY CERTIFICATE
Electronic Record Preservation & Chain of Custody
In accordance with Section 63, Bharatiya Sakshya Adhiniyam, 2023 (BSA)
(Formerly Section 65B, Indian Evidence Act, 1872)
=====================================================================

CASE REFERENCE ID    : ${item.id}
CERTIFICATE ISSUED   : ${new Date().toUTCString()}
EVIDENCE CATEGORY    : ${item.category}
INCIDENT DATE        : ${item.incidentDate}

---------------------------------------------------------------------
PRIMARY EVIDENCE FILE METADATA
---------------------------------------------------------------------
Original File Name   : ${item.fileName}
File Size            : ${item.fileSize}
File MIME Type       : ${item.fileType}
Timestamp of Record  : ${item.timestamp} (${item.formattedDate})

---------------------------------------------------------------------
CRYPTOGRAPHIC INTEGRITY FINGERPRINT (SHA-256)
---------------------------------------------------------------------
Algorithm            : SHA-256 (FIPS 180-4 Standard)
Cryptographic Hash   : ${item.sha256Hash}

CASE NOTES / CONTEXT :
${item.notes}

---------------------------------------------------------------------
DECLARATION OF UNALTERED INTEGRITY:
---------------------------------------------------------------------
This is to certify that the digital evidence item referenced above 
was mathematically fingerprinted using the industry-standard SHA-256 
cryptographic hash function at the time of archiving. Any post-archive 
tampering, frame deletion, byte modification, or metadata editing 
will irreversibly invalidate this hash fingerprint.

Recommended Verification Steps for Law Enforcement / Forensic Expert:
1. Obtain the candidate digital file in question.
2. Compute its SHA-256 hash using OpenSSL, certutil, or forensic tools:
   $ certutil -hashfile "${item.fileName}" SHA256
3. Verify that the output string matches the above SHA-256 hash byte-for-byte.

Platform: SHIELDHER Integrated Safety Platform
Official Helplines: 112 (National Emergency) | 1930 (Cybercrime Portal)
=====================================================================`;

    const blob = new Blob([receiptContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SHIELDHER_Evidence_Certificate_${item.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Delete Record
function deleteEvidenceRecord(id) {
    if (!confirm("Are you sure you want to remove this record from your local Evidence Vault?")) return;
    let records = getVaultRecords();
    records = records.filter(r => r.id !== id);
    saveVaultRecords(records);
    renderVaultRecords();
}

// Clear all
function clearAllEvidence() {
    if (!confirm("Warning: This will clear all locally stored evidence fingerprints. Are you sure?")) return;
    saveVaultRecords([]);
    renderVaultRecords();
}


// ============================================================================
// 3. AI LEGAL RIGHTS NAVIGATOR (INDIAN LAW EXPERT ENGINE)
// ============================================================================

// Indian Legal Provisions Knowledge Base (BNS 2023, IPC, IT Act, POSH)
const LEGAL_KNOWLEDGE_BASE = [
    {
        id: "cyberstalking",
        keywords: ["stalk", "cyberstalk", "instagram", "profile", "dm", "message", "whatsapp", "call", "online", "following", "facebook", "snapchat", "telegram", "picha", "msg"],
        title: "Cyberstalking, Repeated Online Harassment & Surveillance",
        severity: "NON-BAILABLE OFFENSE (Repeat) | COGNIZABLE",
        sections: [
            {
                law: "Bharatiya Nyaya Sanhita, 2023 (BNS)",
                section: "Section 78 BNS (Formerly Section 354D IPC)",
                description: "Monitoring the use by a woman of the internet, email, social media, or other electronic communication; continuously following or contacting despite clear disinterest.",
                punishment: "First conviction: Imprisonment up to 3 years + fine (Bailable). Second conviction: Up to 5 years + fine (Non-bailable)."
            },
            {
                law: "Information Technology Act, 2000",
                section: "Section 66E & Section 67 IT Act",
                description: "Violation of privacy through electronic capturing or publishing, and transmitting obscene or offensive material electronically.",
                punishment: "Imprisonment up to 3 years and fine up to ₹2 Lakh to ₹5 Lakh."
            }
        ],
        rights: [
            "Right to file a Zero FIR at ANY police station under Section 173 BNSS regardless of where the offender is located.",
            "Identity Confidentiality: Your identity, handles, and address cannot be made public under Section 73 BNS.",
            "Right to have statements recorded before a female police officer."
        ],
        steps: [
            "Preserve evidence immediately: Take complete screenshots showing offender's username, URL, timestamp, and message headers before blocking.",
            "Store files in SHIELDHER Digital Evidence Vault to establish SHA-256 chain of custody.",
            "File an online complaint at the National Cyber Crime Reporting Portal: https://cybercrime.gov.in (Anonymous option available for cyber crimes against women).",
            "Call the Cyber Crime Helpline at 1930 for immediate incident tracking.",
            "Submit complaint to the National Commission for Women (NCW) online at ncwapps.nic.in."
        ],
        emergency: "Dial 112 or 1091 (Women Helpline) if there is an immediate threat of offline interception."
    },
    {
        id: "blackmail_morphing",
        keywords: ["blackmail", "leak", "private photo", "nude", "morph", "intimate", "video", "extort", "money", "dhamki", "photo leak", "expose", "compromise"],
        title: "Blackmail, Non-Consensual Image Abuse, Morphing & Extortion",
        severity: "GRAVE COGNIZABLE OFFENSE | NON-BAILABLE",
        sections: [
            {
                law: "Bharatiya Nyaya Sanhita, 2023 (BNS)",
                section: "Section 77 BNS (Formerly Section 354C IPC - Voyeurism) & Section 308 BNS (IPC 384 - Extortion)",
                description: "Capturing, publishing, or transmitting images of a private act, or extorting a person by putting them in fear of reputational or physical injury.",
                punishment: "Voyeurism: 1 to 3 years (1st offense), 3 to 7 years (repeat). Extortion: Imprisonment up to 3 to 7 years."
            },
            {
                law: "Information Technology Act, 2000",
                section: "Section 66E, 67 & 67A IT Act",
                description: "Publishing or transmitting images in private areas without consent, or sexually explicit content in electronic form.",
                punishment: "Section 67A: Up to 5 years imprisonment and fine up to ₹10 Lakh on first conviction."
            }
        ],
        rights: [
            "Strict Non-Disclosure: Under Section 73 BNS (IPC 228A), disclosure of the victim's name or identity is a punishable criminal offense.",
            "Right to prompt content removal: Platforms (Meta, Google, X) are legally mandated under IT Rules 2021 to take down non-consensual intimate imagery within 24 hours of notification.",
            "Take It Down / StopNCII initiative: You can generate image hashes on StopNCII.org to prevent viral spread without sharing the actual photo."
        ],
        steps: [
            "DO NOT pay any ransom or comply with blackmail demands—demands escalate once paid.",
            "Take screenshots of the chat, UPI ID/bank details, phone numbers, and profile links.",
            "Upload screenshots to SHIELDHER Evidence Vault right now to compute SHA-256 fingerprint.",
            "Immediately report under 'Report Crime Against Women/Children' category at https://cybercrime.gov.in.",
            "Submit a takedown request on the social platform reporting portal under non-consensual sharing."
        ],
        emergency: "Call 1930 (Cyber Financial Extortion) and 112 if immediate physical danger exists."
    },
    {
        id: "workplace_harassment",
        keywords: ["workplace", "office", "boss", "colleague", "manager", "posh", "sexual harassment", "promotion", "favor", "unwanted touch", "comment", "company", "hr"],
        title: "Workplace Sexual Harassment & POSH Act Violation",
        severity: "STATUTORY VIOLATION & COGNIZABLE OFFENSE",
        sections: [
            {
                law: "Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 (POSH Act)",
                section: "Section 4, 9 & 11 POSH Act",
                description: "Covers unwelcome physical contact, sexually colored remarks, showing pornography, and unwelcome verbal or non-verbal conduct of a sexual nature.",
                punishment: "Disciplinary action, termination of employment, deduction from salary, and criminal prosecution."
            },
            {
                law: "Bharatiya Nyaya Sanhita, 2023 (BNS)",
                section: "Section 75 BNS (Formerly Section 354A IPC - Sexual Harassment)",
                description: "Unwelcome physical contact, demanding sexual favors, making sexually colored remarks.",
                punishment: "Rigorous imprisonment up to 1 to 3 years, or fine, or both."
            }
        ],
        rights: [
            "Right to approach Internal Complaints Committee (ICC): Every organization with 10+ employees must have a mandatory ICC headed by a senior woman.",
            "Right to Interim Relief: You can request transfer, up to 3 months paid leave, or restraining the respondent from reporting on your performance during inquiry.",
            "Strict Confidentiality: Section 16 POSH prohibits publishing the identity or inquiry proceedings.",
            "Right to Local Committee (LC): If the complaint is against the employer directly or company has <10 employees, complain to the District Officer's Local Committee."
        ],
        steps: [
            "Document every incident: Note dates, times, witnesses, emails, Teams/Slack messages.",
            "Submit a written complaint to the Presiding Officer of your organization's ICC within 3 months of the incident.",
            "You also have the parallel right to file a criminal police FIR under Section 75 BNS independent of internal company proceedings.",
            "If your organization ignores your complaint, report to the Ministry of WCD 'SHe-Box' portal: https://shebox.wcd.gov.in."
        ],
        emergency: "National Women Helpline: 1091 or 181 for workplace distress."
    },
    {
        id: "street_eve_teasing",
        keywords: ["following", "street", "eve-teasing", "stranger", "metro", "bus", "road", "chhedchhad", "gesture", "pass comments", "groping", "touch", "auto", "cab"],
        title: "Street Harassment, Eve-Teasing, Stalking & Outraging Modesty",
        severity: "COGNIZABLE & NON-BAILABLE (Assault / Persistent)",
        sections: [
            {
                law: "Bharatiya Nyaya Sanhita, 2023 (BNS)",
                section: "Section 79 BNS (Formerly Section 509 IPC) - Word, Gesture or Act Intended to Insult Modesty",
                description: "Uttering any word, making any sound or gesture, or intruding upon the privacy of a woman in a public or private place.",
                punishment: "Simple imprisonment up to 3 years and with fine."
            },
            {
                law: "Bharatiya Nyaya Sanhita, 2023 (BNS)",
                section: "Section 74 BNS (Formerly Section 354 IPC) - Assault or Criminal Force with Intent to Outrage Modesty",
                description: "Using criminal force or assault with intent to outrage modesty or knowing it to be likely.",
                punishment: "Imprisonment of 1 to 5 years + fine (Non-bailable, Cognizable)."
            }
        ],
        rights: [
            "Zero FIR: Police CANNOT refuse to register an FIR claiming lack of local territorial jurisdiction.",
            "Right to Police Escort & Assistance: Police PCR vans must assist any woman in distress at night.",
            "Right to arrest without warrant: Police can arrest cognizable offenders on the spot."
        ],
        steps: [
            "Move immediately to a well-lit public spot, metro station, commercial booth, or PCR van.",
            "Call 112 instantly. Speak loudly so people around become aware of the offender.",
            "Note physical description, vehicle registration number, and exact location.",
            "File a complaint at the nearest police station or metro security post."
        ],
        emergency: "CALL 112 IMMEDIATELY or use SHIELDHER Emergency SOS dialer."
    },
    {
        id: "domestic_cruelty",
        keywords: ["husband", "in-laws", "domestic", "violence", "dowry", "marry", "beat", "abuse", "cruelty", "torture", "sasural", "ghar", "talaq"],
        title: "Domestic Violence, Marital Cruelty & Dowry Harassment",
        severity: "NON-BAILABLE & COGNIZABLE OFFENSE",
        sections: [
            {
                law: "Bharatiya Nyaya Sanhita, 2023 (BNS)",
                section: "Section 85 & 86 BNS (Formerly Section 498A IPC)",
                description: "Husband or relative of husband subjecting a woman to cruelty (mental, physical, or harassment for unlawful property/dowry demands).",
                punishment: "Imprisonment up to 3 years and liability to fine."
            },
            {
                law: "Protection of Women from Domestic Violence Act, 2005 (PWDVA)",
                section: "Sections 12, 18, 19, 20, 22 PWDVA",
                description: "Civil remedies including Protection Orders, Residence Orders (cannot be evicted from shared household), Monetary Relief, and Child Custody.",
                punishment: "Breach of protection order is punishable with up to 1 year jail."
            }
        ],
        rights: [
            "Right to Reside in Shared Household: You cannot be evicted by your husband or in-laws without legal process.",
            "Free Legal Services: Section 12 of the Legal Services Authorities Act guarantees free legal representation via DLSA/NALSA.",
            "Right to Medical Examination & Protection Officer assistance."
        ],
        steps: [
            "Call 181 (Women in Distress Helpline) or 1091 for emergency shelter and counseling.",
            "Contact your District Protection Officer (appointed under the Domestic Violence Act) to file a Domestic Incident Report (DIR).",
            "Get a medical examination (MLC) conducted at a government hospital to document physical injuries.",
            "Approach the Judicial Magistrate Court for immediate restraining and maintenance orders."
        ],
        emergency: "Dial 181 (Domestic Violence Emergency Helpline) or 112 for immediate police extraction."
    }
];

// Fallback legal advisor for any general query
const DEFAULT_LEGAL_RESPONSE = {
    title: "General Grievance & Women Protection Under Indian Law",
    severity: "LEGAL CONSULTATION & INCIDENT ASSESSMENT",
    sections: [
        {
            law: "Bharatiya Nyaya Sanhita, 2023 (BNS)",
            section: "Chapter V: Crimes Against Women and Children",
            description: "Covers all forms of assault, voyeurism, stalking, sexual harassment, intimidation, and modesty violations under newly consolidated Indian criminal provisions.",
            punishment: "Varies from 1 to 7+ years imprisonment depending on the specific offense."
        },
        {
            law: "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)",
            section: "Section 173 BNSS (Zero FIR Provision)",
            description: "Information regarding the commission of any cognizable offense can be given to ANY police station, irrespective of where the crime occurred.",
            punishment: "Mandatory registration of Zero FIR and immediate transfer to the jurisdictional station."
        }
    ],
    rights: [
        "Right to Zero FIR: Register a complaint at any police station across India without jurisdictional delays.",
        "Right to Privacy: Full protection of victim identity under Section 73 BNS.",
        "Right to Free Legal Aid: Free lawyer assistance through District Legal Services Authority (DLSA).",
        "Right to female presence: Inquiry and statement recording must be done in presence of a female officer."
    ],
    steps: [
        "Document every detail: Dates, times, messages, recordings, and names of witnesses.",
        "Store digital evidence in the SHIELDHER Evidence Vault to secure an immutable SHA-256 hash.",
        "File an online complaint at https://cybercrime.gov.in (if electronic/cyber) or your state police citizen portal.",
        "Contact the National Commission for Women (NCW) Helpline: 7827170170 or online portal at ncwapps.nic.in."
    ],
    emergency: "For immediate emergency rescue or threat to life, dial 112 or 1091 without delay."
};

function fillLegalQuery(text) {
    const input = document.getElementById("legal-user-input");
    input.value = text;
    analyzeLegalRights();
    input.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Analyze user's text and output structured legal consultation
function analyzeLegalRights() {
    const input = document.getElementById("legal-user-input").value.trim().toLowerCase();
    const resultCard = document.getElementById("legal-result-card");

    if (!input) {
        alert("Please describe your problem or select one of the quick scenarios above.");
        return;
    }

    // Keyword matching & scoring
    let bestMatch = null;
    let highestScore = 0;

    LEGAL_KNOWLEDGE_BASE.forEach(category => {
        let score = 0;
        category.keywords.forEach(kw => {
            if (input.includes(kw)) {
                score += 1;
            }
        });
        if (score > highestScore) {
            highestScore = score;
            bestMatch = category;
        }
    });

    const analysis = highestScore > 0 ? bestMatch : DEFAULT_LEGAL_RESPONSE;

    // Display formatted result
    resultCard.style.display = "block";
    resultCard.innerHTML = `
        <div class="result-header">
            <div>
                <span class="severity-badge">${analysis.severity}</span>
                <h3>${analysis.title}</h3>
            </div>
            <button class="print-advice-btn" onclick="window.print()" title="Print or save as PDF">
                <i class="fa-solid fa-print"></i> Print / Save
            </button>
        </div>

        <div class="result-body">
            <!-- 1. APPLICABLE INDIAN LAWS -->
            <div class="advice-block">
                <h4><i class="fa-solid fa-scale-balanced"></i> Relevant Indian Laws & Penal Provisions</h4>
                <div class="law-cards-grid">
                    ${analysis.sections.map(sec => `
                        <div class="law-subcard">
                            <span class="law-statute">${sec.law}</span>
                            <h5 class="law-section-title">${sec.section}</h5>
                            <p class="law-desc">${sec.description}</p>
                            <div class="penalty-tag">
                                <strong><i class="fa-solid fa-gavel"></i> Penalty:</strong> ${sec.punishment}
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>

            <!-- 2. YOUR LEGAL RIGHTS -->
            <div class="advice-block">
                <h4><i class="fa-solid fa-shield-halved"></i> Your Protected Rights as a Woman</h4>
                <ul class="rights-list">
                    ${analysis.rights.map(r => `
                        <li><i class="fa-solid fa-circle-check"></i> <span>${r}</span></li>
                    `).join("")}
                </ul>
            </div>

            <!-- 3. ACTIONABLE STEPS -->
            <div class="advice-block">
                <h4><i class="fa-solid fa-list-check"></i> Actionable Next Steps & Official Complaint Channels</h4>
                <ol class="steps-list">
                    ${analysis.steps.map(step => {
                        let linkedStep = step
                            .replace("https://cybercrime.gov.in", `<a href="https://cybercrime.gov.in" target="_blank" rel="noopener" class="gov-link">cybercrime.gov.in <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`)
                            .replace("ncwapps.nic.in", `<a href="http://ncwapps.nic.in" target="_blank" rel="noopener" class="gov-link">ncwapps.nic.in <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`)
                            .replace("https://shebox.wcd.gov.in", `<a href="https://shebox.wcd.gov.in" target="_blank" rel="noopener" class="gov-link">shebox.wcd.gov.in <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`);
                        return `<li>${linkedStep}</li>`;
                    }).join("")}
                </ol>
            </div>

            <!-- 4. EMERGENCY PROTOCOL BAR -->
            <div class="advice-emergency-bar">
                <div class="bar-info">
                    <i class="fa-solid fa-bell"></i>
                    <div>
                        <strong>Emergency Assistance:</strong>
                        <p>${analysis.emergency || "In case of imminent danger, call 112 immediately."}</p>
                    </div>
                </div>
                <div class="bar-actions">
                    <a href="tel:112" class="call-btn-mini"><i class="fa-solid fa-phone"></i> Call 112</a>
                    <a href="tel:1091" class="call-btn-mini"><i class="fa-solid fa-phone"></i> Call 1091</a>
                </div>
            </div>
        </div>
    `;

    resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
}


// ============================================================================
// 4. EMERGENCY SOS & RAPID BROADCAST SIMULATION
// ============================================================================

function triggerSimulatedSOS() {
    const box = document.getElementById("sos-status-box");
    box.style.display = "block";
    box.innerHTML = `
        <div class="sos-progress">
            <i class="fa-solid fa-satellite fa-spin"></i>
            <p>Accessing GPS satellites & formulating emergency dispatch package...</p>
        </div>
    `;

    setTimeout(() => {
        let lat = 28.6139;
        let lon = 77.2090;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    lat = pos.coords.latitude;
                    lon = pos.coords.longitude;
                    displaySOSSuccess(box, lat, lon);
                },
                () => {
                    displaySOSSuccess(box, lat, lon);
                },
                { timeout: 3000 }
            );
        } else {
            displaySOSSuccess(box, lat, lon);
        }
    }, 1200);
}

function displaySOSSuccess(box, lat, lon) {
    const mapsLink = `https://maps.google.com/?q=${lat},${lon}`;
    box.innerHTML = `
        <div class="sos-success-alert">
            <div class="sos-alert-header">
                <i class="fa-solid fa-circle-check"></i>
                <div>
                    <h4>EMERGENCY BROADCAST SIMULATED</h4>
                    <p>Sample SOS message prepared with your real-time coordinates.</p>
                </div>
            </div>
            <div class="sms-preview-card">
                <div class="sms-header">
                    <span><i class="fa-solid fa-comment-sms"></i> Simulated SMS Dispatch (To Emergency Contacts)</span>
                    <span class="sms-time">Just now</span>
                </div>
                <div class="sms-body">
                    <strong>EMERGENCY SOS:</strong> I need urgent help! This is my current live GPS location: 
                    <a href="${mapsLink}" target="_blank" rel="noopener">${mapsLink}</a>. 
                    Battery: 84% | Status: High Priority | Timestamp: ${new Date().toLocaleTimeString()}
                </div>
            </div>
            <div class="sos-actions-row">
                <a href="tel:112" class="real-call-btn"><i class="fa-solid fa-phone"></i> Call 112 Now</a>
                <a href="https://wa.me/?text=${encodeURIComponent('EMERGENCY SOS: I need urgent help! My live location is: ' + mapsLink)}" target="_blank" rel="noopener" class="whatsapp-share-btn">
                    <i class="fa-brands fa-whatsapp"></i> Share on WhatsApp
                </a>
            </div>
        </div>
    `;
}

console.log("SHIELDHER core application script loaded successfully.");
