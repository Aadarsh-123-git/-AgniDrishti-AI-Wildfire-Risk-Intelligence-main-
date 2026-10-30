import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  predictWildfireRisk,
  getTrainedModel,
  retrainModel,
} from './server/ml_engine';
import {
  getAllZones,
  getZoneById,
  getHistoricalFires,
  getHotspotClusters,
  getPopulationRiskSummary,
  generateAlerts,
  broadcastAlert,
  acknowledgeAlert,
  getEvacuationPlan,
  SUPPORTED_REGIONS,
  getActiveRegion,
  setActiveRegion,
  refreshZonesLiveWeather,
} from './server/gis_service';
import { fetchLiveWeather } from './server/weather_service';
import {
  fetchLiveFiresFromNasa,
  checkNasaKeyStatus,
  getNasaLayers,
  getNasaMapKey,
} from './server/nasa_service';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

app.use(express.json());

// Initialize AI SDK lazily
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// Ensure ML model is fitted at startup
getTrainedModel();

// ==========================================
// REST API ROUTES
// ==========================================

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    status: 'online',
    service: 'WildfireAI Prediction & Early Warning System',
    timestamp: new Date().toISOString(),
    version: '1.0.0-PROTOTYPE',
    environment: process.env.NODE_ENV || 'development',
    dataMode: 'DEMO / SIMULATION',
    mlEngine: 'Random Forest (35 Estimators, Gini Splits)',
  });
});

// 2. System status
app.get('/api/system-status', (req, res) => {
  const model = getTrainedModel();
  const zones = getAllZones();
  const region = getActiveRegion();
  const alerts = generateAlerts();

  res.json({
    systemStatus: 'OPERATIONAL',
    dataMode: 'DEMO / SIMULATION',
    activeRegion: region,
    totalMonitoredZones: zones.length,
    activeAlertsCount: alerts.length,
    mlMetrics: model.metrics,
    lastModelTraining: model.metrics?.trainedAt,
    serverTime: new Date().toISOString(),
  });
});

// 3. Regions
app.get('/api/regions', (req, res) => {
  res.json({
    activeRegion: getActiveRegion(),
    availableRegions: SUPPORTED_REGIONS,
  });
});

app.post('/api/regions/select', (req, res) => {
  const { regionId } = req.body;
  if (!regionId) {
    return res.status(400).json({ error: 'regionId is required' });
  }
  const region = setActiveRegion(regionId);
  res.json({
    message: `Active region changed to ${region.name}`,
    region,
  });
});

// Open-Meteo Live Weather Endpoints
app.get('/api/weather/live', async (req, res) => {
  try {
    const activeRegion = getActiveRegion();
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : activeRegion.center.lat;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : activeRegion.center.lng;

    const weather = await fetchLiveWeather(lat, lng);
    if (!weather) {
      return res.status(503).json({
        error: 'Unable to reach Open-Meteo API',
        fallbackRegion: activeRegion.name,
      });
    }

    res.json({
      provider: 'Open-Meteo API',
      location: { lat, lng },
      weather,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/weather/refresh', async (req, res) => {
  try {
    const updatedCount = await refreshZonesLiveWeather();
    res.json({
      message: `Enriched ${updatedCount} GIS zones with real-time Open-Meteo weather telemetry & updated Random Forest risk predictions`,
      provider: 'Open-Meteo API',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. ML Prediction endpoint
app.post('/api/predict', (req, res) => {
  try {
    const {
      temperature = 35,
      humidity = 25,
      wind_speed = 20,
      rainfall = 0,
      ndvi = 0.25,
      historical_fire_count = 3,
      elevation = 400,
    } = req.body;

    const prediction = predictWildfireRisk({
      temperature: Number(temperature),
      humidity: Number(humidity),
      wind_speed: Number(wind_speed),
      rainfall: Number(rainfall),
      ndvi: Number(ndvi),
      historical_fire_count: Number(historical_fire_count),
      elevation: Number(elevation),
    });

    res.json(prediction);
  } catch (error: any) {
    res.status(500).json({ error: 'Prediction error', details: error.message });
  }
});

// 5. GIS Risk Map (all zones)
app.get('/api/risk/map', (req, res) => {
  const zones = getAllZones();
  const region = getActiveRegion();
  res.json({
    region,
    totalZones: zones.length,
    zones,
    thresholds: {
      LOW: '0 - 24%',
      MODERATE: '25 - 49%',
      HIGH: '50 - 74%',
      CRITICAL: '75 - 100%',
    },
    disclaimer: 'Prototype Demonstration: Wildfire risk scores calculated from synthetic spatial meteorological & fuel moisture models.',
  });
});

// 6. Zone details by ID
app.get('/api/risk/:zoneId', (req, res) => {
  const zone = getZoneById(req.params.zoneId);
  if (!zone) {
    return res.status(404).json({ error: `Zone ${req.params.zoneId} not found` });
  }
  res.json(zone);
});

// 7. Historical Hotspots & Clusters
app.get('/api/hotspots', (req, res) => {
  const fires = getHistoricalFires();
  const clusters = getHotspotClusters();
  res.json({
    totalHistoricalRecords: fires.length,
    clustersCount: clusters.length,
    clusters,
    historicalFires: fires,
  });
});

// 8. Population at Risk
app.get('/api/population-risk', (req, res) => {
  const summary = getPopulationRiskSummary();
  res.json(summary);
});

// 9. Alerts
app.get('/api/alerts', (req, res) => {
  const alerts = generateAlerts();
  res.json({
    totalAlerts: alerts.length,
    criticalCount: alerts.filter((a) => a.riskLevel === 'CRITICAL').length,
    highCount: alerts.filter((a) => a.riskLevel === 'HIGH').length,
    alerts,
  });
});

app.post('/api/alerts/broadcast', (req, res) => {
  try {
    const { targetZoneId, severity, title, message, recommendedAction } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }
    const alert = broadcastAlert({
      targetZoneId: targetZoneId || 'ZN-001',
      severity: severity || 'WARNING',
      title,
      message,
      recommendedAction,
    });
    res.json({ success: true, alert });
  } catch (error: any) {
    res.status(500).json({ error: 'Broadcast error', details: error.message });
  }
});

app.post('/api/alerts/ack', (req, res) => {
  const { alertId } = req.body;
  if (!alertId) {
    return res.status(400).json({ error: 'alertId is required' });
  }
  const success = acknowledgeAlert(alertId);
  res.json({ success });
});

app.post('/api/alerts/:alertId/ack', (req, res) => {
  const success = acknowledgeAlert(req.params.alertId);
  res.json({ success });
});

// 10. Evacuation Plan for Zone
app.get('/api/evacuation/:zoneId', (req, res) => {
  const plan = getEvacuationPlan(req.params.zoneId);
  res.json(plan);
});

// 11. What-If Simulator
app.post('/api/simulation', (req, res) => {
  try {
    const {
      temperature,
      humidity,
      wind_speed,
      rainfall,
      ndvi,
      historical_fire_count,
      elevation,
      baseZoneId,
    } = req.body;

    const baseZone = baseZoneId ? getZoneById(baseZoneId) : undefined;

    const baseline = baseZone
      ? {
          temperature: baseZone.weather.temperature,
          humidity: baseZone.weather.humidity,
          wind_speed: baseZone.weather.windSpeed,
          rainfall: baseZone.weather.rainfall,
          ndvi: baseZone.ndvi,
          historical_fire_count: baseZone.historicalFireCount,
          elevation: baseZone.elevation,
          riskScore: baseZone.riskScore,
          riskLevel: baseZone.riskLevel,
        }
      : null;

    const simulatedPrediction = predictWildfireRisk({
      temperature: Number(temperature),
      humidity: Number(humidity),
      wind_speed: Number(wind_speed),
      rainfall: Number(rainfall),
      ndvi: Number(ndvi),
      historical_fire_count: Number(historical_fire_count),
      elevation: Number(elevation),
    });

    const scoreDelta = baseline ? simulatedPrediction.riskScore - baseline.riskScore : 0;

    res.json({
      baseline,
      simulated: simulatedPrediction,
      delta: {
        scoreDelta,
        direction: scoreDelta > 0 ? 'INCREASED_RISK' : scoreDelta < 0 ? 'DECREASED_RISK' : 'NO_CHANGE',
        isLevelShift: baseline ? baseline.riskLevel !== simulatedPrediction.riskLevel : false,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Simulation error', details: error.message });
  }
});

// 12. ML Metrics & Feature Importance
app.get('/api/ml/metrics', (req, res) => {
  const model = getTrainedModel();
  res.json(model.metrics);
});

app.post('/api/ml/retrain', (req, res) => {
  const datasetSize = req.body.datasetSize ? Number(req.body.datasetSize) : 2500;
  const metrics = retrainModel(datasetSize);
  res.json({
    message: `Random Forest model retrained with ${datasetSize} synthetic meteorological samples.`,
    metrics,
  });
});

// 13. NASA Live Map & FIRMS Satellite Endpoints
app.get('/api/nasa/status', async (req, res) => {
  try {
    const status = await checkNasaKeyStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: 'NASA status check failed', details: error.message });
  }
});

app.get('/api/nasa/layers', (req, res) => {
  const layers = getNasaLayers();
  const mapKey = getNasaMapKey();
  res.json({
    mapKeyConfigured: !!mapKey,
    mapKeyMasked: `${mapKey.substring(0, 4)}...${mapKey.substring(mapKey.length - 4)}`,
    layers,
  });
});

app.get('/api/nasa/live-fires', async (req, res) => {
  try {
    const region = getActiveRegion();
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 2;
    const force = req.query.refresh === 'true';

    let bbox: { west: number; south: number; east: number; north: number };

    if (req.query.bbox) {
      if (req.query.bbox === 'world' || req.query.bbox === 'global') {
        bbox = { west: -180, south: -85, east: 180, north: 85 };
      } else {
        const parts = (req.query.bbox as string).split(',').map((p) => parseFloat(p.trim()));
        if (parts.length === 4 && !parts.some(isNaN)) {
          bbox = { west: parts[0], south: parts[1], east: parts[2], north: parts[3] };
        } else {
          bbox = {
            west: region.center.lng - 2.0,
            south: region.center.lat - 2.0,
            east: region.center.lng + 2.0,
            north: region.center.lat + 2.0,
          };
        }
      }
    } else {
      // Default to active region with ±2.5 degree satellite swath padding
      bbox = {
        west: region.center.lng - 2.5,
        south: region.center.lat - 2.5,
        east: region.center.lng + 2.5,
        north: region.center.lat + 2.5,
      };
    }

    const result = await fetchLiveFiresFromNasa(bbox, days, force);

    res.json({
      region: region.name,
      activeRegionId: region.id,
      boundingBox: bbox,
      stats: result.stats,
      detectionsCount: result.detections.length,
      detections: result.detections,
    });
  } catch (error: any) {
    console.error('NASA live fire fetch error:', error);
    res.status(500).json({ error: 'Failed to retrieve NASA live fire telemetry', details: error.message });
  }
});

app.post('/api/nasa/sync', async (req, res) => {
  try {
    const region = getActiveRegion();
    const days = req.body.days ? parseInt(req.body.days, 10) : 2;
    const bbox = {
      west: region.center.lng - 2.5,
      south: region.center.lat - 2.5,
      east: region.center.lng + 2.5,
      north: region.center.lat + 2.5,
    };

    const result = await fetchLiveFiresFromNasa(bbox, days, true);

    res.json({
      success: true,
      message: `Synchronized ${result.detections.length} live NASA satellite detections for ${region.name}`,
      stats: result.stats,
      detections: result.detections,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'NASA sync failed', details: error.message });
  }
});

// 14. AI Incident Commander Advisory (Gemini API server-side route)
app.post('/api/ai/advisor', async (req, res) => {
  try {
    const { zoneId, scenario } = req.body;
    const zone = zoneId ? getZoneById(zoneId) : getAllZones()[0];
    const ai = getAIClient();

    const zoneName = zone ? `${zone.id} (${zone.name})` : 'Target Sector';
    const riskScore = zone ? zone.riskScore : 82;
    const riskLevel = zone ? zone.riskLevel : 'CRITICAL';
    const temp = zone ? zone.weather.temperature : 41;
    const humidity = zone ? zone.weather.humidity : 16;
    const windSpeed = zone ? zone.weather.windSpeed : 28;
    const windDir = zone ? zone.weather.windDirection : 'WNW';
    const pop = zone ? zone.population.toLocaleString() : '12,400';
    const schools = zone ? zone.schools : 3;
    const hospitals = zone ? zone.hospitals : 1;

    if (!ai) {
      // Formulate detailed context-aware tactical advisory
      const synopsis = `Sector ${zoneName} is currently operating under a ${riskLevel} danger tier with a predicted wildfire probability of ${riskScore}%. Extreme conditions driven by ${temp}°C ambient temperature, ${humidity}% relative humidity, and ${windSpeed} km/h ${windDir} wind vectors significantly elevate active ignition and crowning potential.`;

      const directives = [
        `Pre-position Type 3 & Type 6 wildland tactical engines along primary arterial access corridors feeding Sector ${zone?.id || 'target'}.`,
        `Issue immediate preparatory advisory notices to ${zone?.settlements || 4} human settlements, prioritizing the ${pop} civilian residents residing downwind of primary ridge lines.`,
        `Deploy thermal sensor reconnaissance UAVs along the ${windDir} perimeter to detect smoldering spot fires and dry lightning ignition seeds.`,
        `Establish a 40-meter bulldozer firebreak buffer along the secondary ridge boundary to safeguard critical access routes.`,
      ];

      const triageGuidance = `Initiate priority transport protocols for ${hospitals} healthcare post(s) and ${schools} educational facility(ies). Designate emergency convoy escorts towards primary network relief havens.`;

      const advisoryText = `### Tactical Wildfire Incident Advisory — ${zoneName}
**Executive Synopsis:**
${synopsis}

**Prioritized Tactical Directives:**
1. **Containment Staging:** ${directives[0]}
2. **Civilian Protection:** ${directives[1]}
3. **Aerial Surveillance:** ${directives[2]}
4. **Defensible Perimeters:** ${directives[3]}

**Evacuation & Facility Triage:**
${triageGuidance}

**Containment Strategy:**
Deploy multi-agency response teams to secure the windward flanks, preventing spread toward dense dry vegetation sectors.`;

      return res.json({
        source: 'TACTICAL_RULE_ENGINE',
        title: `Tactical Incident Advisory for ${zoneName}`,
        summary: synopsis,
        recommendations: directives,
        reply: advisoryText,
        advisoryText: advisoryText,
        disclaimer: 'Generated via WildfireAI tactical incident rule matrix.',
        zoneId: zone?.id,
        timestamp: new Date().toISOString(),
      });
    }

    const prompt = `You are a Senior Wildfire Incident Commander and Disaster Operations Chief analyzing an early warning prediction.
Zone details:
- ID: ${zone?.id || 'Unknown'}
- Name: ${zone?.name || 'Monitoring Sector'}
- Wildfire Risk: ${riskScore}% (${riskLevel})
- Weather: Temp ${temp}°C, Relative Humidity ${humidity}%, Wind ${windSpeed} km/h ${windDir}, Rain ${zone?.weather.rainfall || 0}mm
- Vegetation: ${zone?.vegetationType || 'Dry Deciduous'}, NDVI ${zone?.ndvi || 0.18} (${zone?.vegetationCondition || 'DRY'})
- Exposed Population: ${pop} across ${zone?.settlements || 4} settlements with ${schools} schools and ${hospitals} healthcare units.
- Tactical Query / Scenario: ${scenario || 'Standard pre-ignition dry season surveillance and mitigation command.'}

Provide an emergency management advisory response formatted with clear Markdown headings:
1. Executive Hazard Synopsis (2 sentences)
2. 4 Prioritized Tactical Command Directives
3. Evacuation Triage Guidance for Healthcare & Educational Facilities
4. Containment & Firebreak Priority Recommendations`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || 'Advisory generated successfully.';

    res.json({
      source: 'GEMINI_AI_INCIDENT_COMMANDER',
      title: `Tactical Wildfire Incident Advisory — ${zone?.id || 'Sector'}`,
      advisoryText: text,
      reply: text,
      zoneId: zone?.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'AI advisor error', details: error.message });
  }
});
// 15. Voice Alert TTS & Audit Endpoints
import {
  generateAlertText as serverGenerateAlertText,
  getAudioCacheKey,
  logAlert,
  getAuditLog,
  sendVoiceCall,
  SUPPORTED_VOICE_LANGUAGES,
  type AlertRiskLevel,
  type AlertLanguage as ServerAlertLanguage,
} from './server/alert_service';

// In-memory audio cache: hash -> Buffer
const audioCache: Record<string, Buffer> = {};

// POST /api/alerts/voice - Generate TTS audio (mp3)
app.post('/api/alerts/voice', async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text || !language) {
      return res.status(400).json({ error: 'text and language are required' });
    }

    const cacheKey = getAudioCacheKey(language, text);

    // Check cache
    if (audioCache[cacheKey]) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('X-Cache', 'HIT');
      return res.send(audioCache[cacheKey]);
    }

    // Google Cloud TTS
    const gcpKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;
    if (!gcpKey) {
      return res.status(503).json({
        error: 'Google Cloud TTS not configured. Set GOOGLE_CLOUD_TTS_API_KEY env variable.',
        fallback: 'Use browser Web Speech API instead.',
      });
    }

    // Map language to BCP47
    const langMap: Record<string, string> = {
      hi: 'hi-IN', bn: 'bn-IN', mr: 'mr-IN', te: 'te-IN', ta: 'ta-IN', en: 'en-IN',
    };
    const languageCode = langMap[language] || 'en-IN';

    const ttsResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${gcpKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode, ssmlGender: 'FEMALE' },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errBody = await ttsResponse.text();
      console.error('[TTS] Google Cloud error:', errBody);
      return res.status(502).json({ error: 'Google Cloud TTS failed', details: errBody });
    }

    const ttsData = await ttsResponse.json();
    const audioBuffer = Buffer.from(ttsData.audioContent, 'base64');

    // Cache it
    audioCache[cacheKey] = audioBuffer;
    // Bound cache at ~100 entries
    const keys = Object.keys(audioCache);
    if (keys.length > 100) {
      delete audioCache[keys[0]];
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-Cache', 'MISS');
    res.send(audioBuffer);
  } catch (error: any) {
    console.error('[TTS] Error:', error);
    res.status(500).json({ error: 'TTS generation failed', details: error.message });
  }
});

// POST /api/alerts/audit - Log an alert event
app.post('/api/alerts/audit', (req, res) => {
  try {
    const entry = logAlert(req.body);
    res.json({ success: true, entry });
  } catch (error: any) {
    res.status(500).json({ error: 'Audit logging failed', details: error.message });
  }
});

// GET /api/alerts/audit - Retrieve audit log
app.get('/api/alerts/audit', (req, res) => {
  res.json({ entries: getAuditLog() });
});

// POST /api/alerts/voice-call - IVR voice call stub
app.post('/api/alerts/voice-call', async (req, res) => {
  try {
    const { phoneNumber, audioUrl } = req.body;
    if (!phoneNumber || !audioUrl) {
      return res.status(400).json({ error: 'phoneNumber and audioUrl are required' });
    }
    const result = await sendVoiceCall(phoneNumber, audioUrl);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Voice call failed', details: error.message });
  }
});

// POST /api/alerts/generate-text - Generate alert text from template
app.post('/api/alerts/generate-text', (req, res) => {
  try {
    const { sector, riskLevel, language, safeZoneName, timeToReach, isTest } = req.body;
    const text = serverGenerateAlertText(
      sector || 'Sector',
      (riskLevel || 'HIGH') as AlertRiskLevel,
      (language || 'hi') as ServerAlertLanguage,
      { safeZoneName, timeToReach, isTest }
    );
    res.json({ text, language, riskLevel });
  } catch (error: any) {
    res.status(500).json({ error: 'Text generation failed', details: error.message });
  }
});

// 16. Project Archive ZIP Download Endpoint
app.get(['/download/zip', '/api/download/zip', '/download'], (req, res) => {
  const possiblePaths = [
    path.resolve(process.cwd(), '..', 'wildfire-ai-full-project.zip'),
    path.resolve(process.cwd(), 'wildfire-ai-full-project.zip'),
    path.resolve(process.cwd(), 'dist', 'wildfire-ai-full-project.zip'),
  ];

  for (const zipPath of possiblePaths) {
    if (fs.existsSync(zipPath)) {
      return res.download(zipPath, 'wildfire-ai-full-project.zip');
    }
  }

  res.status(404).json({ error: 'ZIP file not found on server' });
});

// ==========================================
// VITE / STATIC SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true as const },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 WildfireAI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
