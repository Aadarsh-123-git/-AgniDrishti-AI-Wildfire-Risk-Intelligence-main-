# AgniDrishti (WildfireAI) - Deployment Guide

## Live Production URL
- **Firebase Hosting URL:** `https://agnidrishti-e3de7.web.app` (or `https://agnidrishti-e3de7.firebaseapp.com`)

---

## Free Spark Plan Architecture (Zero-Cost Static Hosting)
The application has been converted to run as a 100% client-side Progressive Web App on **Firebase Hosting Free Spark Tier** without requiring Cloud Run, Cloud Functions, or Secret Manager:

| Feature | Execution Environment | Status |
| :--- | :--- | :--- |
| **Random Forest Risk Engine** | In-Browser Client | ✅ Active (35 Estimators, Gini splits) |
| **Live Weather Telemetry** | Browser Direct to Open-Meteo | ✅ Active (Real-time global weather) |
| **Voice Early Warning System** | Web Speech API | ✅ Active (Hindi, Bengali, Marathi, Telugu, Tamil, English) |
| **What-If Scenario Sandbox** | In-Browser ML Calculator | ✅ Active (Interactive parameter tuning) |
| **Model Retraining Sandbox** | In-Browser Synthetic Generator | ✅ Active (Real-time accuracy & F1 scores) |
| **NASA Satellite Telemetry** | Simulated VIIRS/MODIS Telemetry | ⚡ Demo Mode (No public key exposure) |
| **Gemini AI Incident Advisor** | Pre-computed Tactical Matrix | ⚡ Demo Mode (Free Spark fallback) |
| **Server MP3 IVR Telephony** | Cloud Run Backend | ❌ Disabled in Static Mode |

---

## Commands to Redeploy After Code Changes

Whenever you make frontend changes, run:

```bash
# 1. Build the production bundle
npm run build

# 2. Deploy to Firebase Hosting
npx firebase-tools deploy --only hosting
```

---

## Local Development (with Express Backend)

For local development with the full Express development server and Vite HMR:

```bash
npm run dev
```

Server runs locally at `http://localhost:8080`.

---

## Security & Secrets
- No API keys (`GEMINI_API_KEY`, etc.) are bundled or exposed in client assets.
- `.env*` is strictly excluded in `.gitignore`.
- Open-Meteo requires no API key and supports direct browser CORS requests.
