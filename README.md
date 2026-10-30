# 🔥 WildfireAI — AI-Based Wildfire Prediction & Early Warning System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Open-Meteo](https://img.shields.io/badge/Weather%20API-Open--Meteo-orange.svg)](https://open-meteo.com/)
[![NASA FIRMS](https://img.shields.io/badge/Satellite-NASA%20FIRMS-red.svg)](https://firms.modaps.eosdis.nasa.gov/)


# Deployment link : Primary Live Domain:
👉 https://agnidrishti-e3de7.web.app
Secondary Firebase Domain:
👉 https://agnidrishti-e3de7.firebaseapp.com

**WildfireAI** is an end-to-end decision-support system built for disaster management, environmental monitoring agencies, and local emergency response teams. It integrates real-time satellite thermal detections from **NASA FIRMS**, high-precision zero-key meteorological telemetry from **Open-Meteo API**, a **Random Forest ML Risk Classifier**, and tactical AI Incident Advisory.

---


## 1. Real-Time Weather Integration (Open-Meteo API)

### Why Open-Meteo API?
We selected **[Open-Meteo](https://open-meteo.com/)** as the primary weather provider for WildfireAI due to:
- **Zero API Key Requirement**: High performance, zero secret management, no API key required for non-commercial and research usage.
- **High-Precision Global Telemetry**: Retrieves exact `temperature_2m`, `relative_humidity_2m`, `wind_speed_10m`, `wind_direction_10m`, and `precipitation` based on latitude and longitude coordinates.
- **Asynchronous Coordinate Batching**: Supports multi-sector batch queries for instantaneous GIS sector telemetry enrichment.

### Weather Telemetry Endpoints
- `GET /api/weather/live?lat={lat}&lng={lng}` — Fetch real-time Open-Meteo weather data for specified coordinates.
- `POST /api/weather/refresh` — Synchronize all GIS zones with live Open-Meteo weather telemetry and re-evaluate Random Forest risk predictions.

---

## 2. System Overview & Architecture

```
[ OPEN-METEO WEATHER API ] ──┐
                             ├─► [ FEATURE VECTOR & DATA PREPROCESSING ]
[ NASA FIRMS SATELLITE ] ────┘     • Temperature (°C)
                                   • Relative Humidity (%)
                                   • Wind Speed (km/h) & Direction
                                   • Precipitation / Rainfall (mm)
                                   • NDVI (Vegetation Dryness Index)
                                   • Historical Fire Recurrence
                                   • Topographic Elevation (m)
                                         │
                                         ▼
                           [ MACHINE LEARNING RANDOM FOREST ENGINE ]
                                         │
                                         ▼
                     [ RISK SCORE (0–100%) & 4-TIER CLASSIFICATION ]
                       • LOW (0–24%) | MODERATE (25–49%)
                       • HIGH (50–74%) | CRITICAL (75–100%)
                                         │
    ┌────────────────┬───────────────────┼───────────────────┬─────────────────┐
    ▼                ▼                   ▼                   ▼                 ▼
[ GIS RISK MAP ] [ DBSCAN HOTSPOTS ] [ POPULATION RISK ] [ EVACUATION PLAN ] [ AI ADVISOR ]
  • Grid Map       • Clusters          • Exposure Index    • Safe Havens       • Gemini 2.5
```

---

## 3. Step-by-Step Setup & Running Guide

Follow this step-by-step procedure to set up, run, and deploy the WildfireAI system on your local machine or server.

### Step 1: Verify Prerequisites
Ensure you have Node.js and Git installed:
```bash
node -v   # Should be v18.0.0 or higher
npm -v    # Should be v9.0.0 or higher
git --version
```

### Step 2: Clone the Repository
Clone the project from GitHub to your local machine:
```bash
git clone https://github.com/texhX/techX-15.git
cd techX-15
```

### Step 3: Configure Environment Variables
Create your local `.env` file from `.env.example`:
```bash
cp .env.example .env
```
*(Optional)* Add your Gemini AI API key or NASA MAP_KEY in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
NASA_MAP_KEY=your_nasa_firms_map_key_here
PORT=3000
```

### Step 4: Install Dependencies
Install all required Node.js dependencies:
```bash
npm install --legacy-peer-deps
```

### Step 5: Start the Local Server & App
Launch the full-stack server (Backend Express API + Vite Frontend):
```bash
npm run dev
```
Open your browser and navigate to:
👉 **`http://localhost:3000`**

### Step 6: Fetch Live Weather & NASA Telemetry
- Click **"Refresh Weather & ML"** in the top navigation bar to trigger live Open-Meteo API fetching.
- Click **"NASA Telemetry"** to view real-time VIIRS/MODIS satellite active thermal detections.

### Step 7: Expose a Live Public URL (Optional)
To share a public URL that anyone can access:
```bash
# Option A: Using SSH Tunneling (localhost.run)
ssh -R 80:localhost:3000 nokey@localhost.run

# Option B: Using Localtunnel
npx localtunnel --port 3000
```

---

## 4. API Endpoints Reference

- `GET /api/health` — Operational status & ML model engine info
- `GET /api/system-status` — System summary and active alerts
- `GET /api/weather/live` — Open-Meteo real-time weather query
- `POST /api/weather/refresh` — Refresh all GIS zones with live Open-Meteo telemetry
- `GET /api/nasa/live-fires` — Real-time satellite fire detections (VIIRS / MODIS)
- `GET /api/risk/map` — GIS sector grid zones with risk scoring
- `GET /api/risk/:zoneId` — In-depth sector analysis & contributing factors
- `GET /api/hotspots` — DBSCAN fire clusters & historical records
- `GET /api/population-risk` — Monitored population & vulnerable facilities
- `GET /api/alerts` — Dynamic wildfire warning alerts
- `GET /api/evacuation/:zoneId` — Evacuation routes & safe assembly havens
- `POST /api/simulation` — What-If atmospheric parameter simulator
- `POST /api/ai/advisor` — Tactical advisory (Gemini AI Incident Commander)

---

## 5. Multilingual Voice Alerts

### Supported Languages
| Code | Language | BCP47 Tag |
|------|----------|-----------|
| hi   | Hindi    | hi-IN     |
| bn   | Bengali  | bn-IN     |
| mr   | Marathi  | mr-IN     |
| te   | Telugu   | te-IN     |
| ta   | Tamil    | ta-IN     |
| en   | English  | en-IN (fallback) |

### Voice Alert Features
- **Fixed templates** for 4 risk levels (LOW, MODERATE, HIGH, CRITICAL) in all 5 languages
- **Browser TTS** via Web Speech API with automatic voice detection
- **Server TTS** via Google Cloud Text-to-Speech for phones/IVR
- **Audio caching** by SHA-256 hash of (language + text) to avoid repeat API calls
- **Audit logging** of every alert with timestamp, sector, language, risk level, and trigger source
- **CRITICAL confirmation dialog** before any CRITICAL alert broadcast
- **Test mode** that prefixes messages with "This is a test" in the selected language
- **IVR stub** ready for Twilio/Exotel integration

### Additional Environment Variables
```env
GOOGLE_CLOUD_TTS_API_KEY=your_gcp_tts_key_here

# IVR Integration (choose one)
IVR_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+91XXXXXXXXXX

# Or for Exotel:
# IVR_PROVIDER=exotel
# EXOTEL_SID=your_sid
# EXOTEL_TOKEN=your_token
# EXOTEL_PHONE_NUMBER=your_number
```

### Voice Alert API Endpoints
- `POST /api/alerts/voice` — Generate TTS audio (mp3) from template text
- `POST /api/alerts/generate-text` — Render an alert template with placeholders
- `POST /api/alerts/audit` — Log a voice alert event
- `GET /api/alerts/audit` — Retrieve the audit log
- `POST /api/alerts/voice-call` — IVR voice call stub (Twilio/Exotel)

### Running Unit Tests
```bash
npx tsx tests/alert_templates.test.ts
```

> **⚠️ IMPORTANT: Translation Review Required**
>
> All voice alert translations (Hindi, Bengali, Marathi, Telugu, Tamil) included in this
> codebase are **developer-supplied drafts**. Before using this system for real wildfire
> evacuation alerts, **every template MUST be reviewed and approved by native speakers
> or an official translation office**. Incorrect or unclear evacuation instructions in
> a real emergency could endanger lives. The development team is not responsible for
> mistranslations.

---

## 6. License & Disclaimer

Distributed under the **MIT License**.

*Disclaimer: WildfireAI is a decision-support prototype. Environmental inputs and telemetry are processed for simulation and decision-support modeling. Always follow instructions from local emergency authorities during active wildfire incidents.*

