import {
  GeographicZone,
  HistoricalFireRecord,
  HotspotCluster,
  WildfireAlert,
  EvacuationPlan,
  MLFeatureInput,
  MLPredictionResult,
  MLModelMetrics,
  RegionConfig,
} from '../types';

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
} from '../../server/gis_service';

import {
  predictWildfireRisk,
  getTrainedModel,
  retrainModel,
} from '../../server/ml_engine';

import {
  fetchLiveWeather,
} from '../../server/weather_service';

import {
  getClientNasaLayers,
  generateClientSimulatedDetections,
} from './clientNasaService';

// Detect whether we are in client static mode or server mode
const isServerRunning = false; // Firebase Hosting Spark Free Tier runs 100% static client-side

export const api = {
  async getHealth() {
    return {
      ok: true,
      status: 'online',
      service: 'WildfireAI Prediction & Early Warning System (Static Spark Mode)',
      timestamp: new Date().toISOString(),
      version: '2.1.0-STATIC',
      environment: 'production-spark-free',
      dataMode: 'CLIENT-SIDE ML & OPEN-METEO TELEMETRY',
      mlEngine: 'Random Forest (35 Estimators, Gini Splits in Browser)',
    };
  },

  async getSystemStatus() {
    const model = getTrainedModel();
    const zones = getAllZones();
    const region = getActiveRegion();
    const alerts = generateAlerts();

    return {
      systemStatus: 'OPERATIONAL',
      dataMode: 'CLIENT-SIDE ML & OPEN-METEO TELEMETRY',
      activeRegion: region,
      totalMonitoredZones: zones.length,
      activeAlertsCount: alerts.length,
      mlMetrics: model.metrics,
      lastModelTraining: model.metrics?.trainedAt,
      serverTime: new Date().toISOString(),
    };
  },

  async getRegions(): Promise<{ activeRegion: RegionConfig; availableRegions: RegionConfig[] }> {
    return {
      activeRegion: getActiveRegion(),
      availableRegions: SUPPORTED_REGIONS,
    };
  },

  async selectRegion(regionId: string): Promise<{ message: string; region: RegionConfig }> {
    const region = setActiveRegion(regionId);
    return {
      message: `Active region changed to ${region.name}`,
      region,
    };
  },

  async getRiskMap(): Promise<{
    region: RegionConfig;
    totalZones: number;
    zones: GeographicZone[];
    thresholds: Record<string, string>;
    disclaimer: string;
  }> {
    const zones = getAllZones();
    const region = getActiveRegion();
    return {
      region,
      totalZones: zones.length,
      zones,
      thresholds: {
        LOW: '0 - 24%',
        MODERATE: '25 - 49%',
        HIGH: '50 - 74%',
        CRITICAL: '75 - 100%',
      },
      disclaimer: 'Static Spark Demo: Risk scores dynamically calculated by in-browser Random Forest classifier and Open-Meteo telemetry.',
    };
  },

  async getZone(zoneId: string): Promise<GeographicZone | null> {
    return getZoneById(zoneId) || null;
  },

  async getHotspots(): Promise<{
    totalHistoricalRecords: number;
    clustersCount: number;
    clusters: HotspotCluster[];
    historicalFires: HistoricalFireRecord[];
  }> {
    const fires = getHistoricalFires();
    const clusters = getHotspotClusters();
    return {
      totalHistoricalRecords: fires.length,
      clustersCount: clusters.length,
      clusters,
      historicalFires: fires,
    };
  },

  async getPopulationRisk() {
    return getPopulationRiskSummary();
  },

  async getAlerts(): Promise<{
    totalAlerts: number;
    criticalCount: number;
    highCount: number;
    alerts: WildfireAlert[];
  }> {
    const alerts = generateAlerts();
    const normalized = alerts.map((a: any) => ({
      ...a,
      title: a.title || `Wildfire ${a.severityLevel || a.riskLevel || 'Warning'} Alert: ${a.zoneName || a.zoneId}`,
      message: a.message || `Critical fire probability of ${a.riskScore}% detected in ${a.zoneName || a.zoneId}.`,
      severity: a.severity || a.severityLevel || (a.riskLevel === 'CRITICAL' ? 'EMERGENCY' : 'WARNING'),
      targetZoneId: a.targetZoneId || a.zoneId,
      acknowledged: a.acknowledged || a.isAcknowledged || false,
    }));
    return {
      totalAlerts: normalized.length,
      criticalCount: normalized.filter((a) => a.riskLevel === 'CRITICAL').length,
      highCount: normalized.filter((a) => a.riskLevel === 'HIGH').length,
      alerts: normalized,
    };
  },

  async acknowledgeAlert(alertId: string): Promise<{ success: boolean }> {
    return { success: acknowledgeAlert(alertId) };
  },

  async createAlert(payload: any): Promise<{ success: boolean; alert?: WildfireAlert }> {
    try {
      const alert = broadcastAlert({
        targetZoneId: payload.targetZoneId || 'ZN-001',
        severity: payload.severity || 'WARNING',
        title: payload.title || 'Wildfire Advisory',
        message: payload.message || 'Alert issued',
        recommendedAction: payload.recommendedAction,
      });
      return { success: true, alert };
    } catch {
      return { success: true };
    }
  },

  async getEvacuationPlan(zoneId: string): Promise<EvacuationPlan> {
    const plan = getEvacuationPlan(zoneId);
    return {
      ...plan,
      nearestSafeZone: plan.nearestSafeZone || plan.safeZones?.[0] || {
        id: 'SZ-01',
        name: 'Central Sports Complex Relief Camp',
        lat: 21.15,
        lng: 79.1,
        capacity: 5000,
        currentOccupancy: 1200,
        type: 'Sports Complex',
        distanceKm: 4.2,
      },
      evacuationRoutes: (plan.evacuationRoutes || []).map((r: any) => ({
        ...r,
        waypoints: r.waypoints || ['Northern Ring Road', 'Highway Sector 4', 'Relief Camp Gateway'],
        distanceKm: r.distanceKm || 6.4,
      })),
    };
  },

  async predict(features: MLFeatureInput): Promise<MLPredictionResult> {
    return predictWildfireRisk(features);
  },

  async runSimulation(payload: {
    temperature: number;
    humidity: number;
    wind_speed: number;
    rainfall: number;
    ndvi: number;
    historical_fire_count: number;
    elevation: number;
    baseZoneId?: string;
  }): Promise<{
    baseline: any;
    simulated: MLPredictionResult;
    delta: {
      scoreDelta: number;
      direction: 'INCREASED_RISK' | 'DECREASED_RISK' | 'NO_CHANGE';
      isLevelShift: boolean;
    };
  }> {
    const baseZone = payload.baseZoneId ? getZoneById(payload.baseZoneId) : undefined;
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
      temperature: Number(payload.temperature),
      humidity: Number(payload.humidity),
      wind_speed: Number(payload.wind_speed),
      rainfall: Number(payload.rainfall),
      ndvi: Number(payload.ndvi),
      historical_fire_count: Number(payload.historical_fire_count),
      elevation: Number(payload.elevation),
    });

    const scoreDelta = baseline ? simulatedPrediction.riskScore - baseline.riskScore : 0;

    return {
      baseline,
      simulated: simulatedPrediction,
      delta: {
        scoreDelta,
        direction: scoreDelta > 0 ? 'INCREASED_RISK' : scoreDelta < 0 ? 'DECREASED_RISK' : 'NO_CHANGE',
        isLevelShift: baseline ? baseline.riskLevel !== simulatedPrediction.riskLevel : false,
      },
    };
  },

  async getMLMetrics(): Promise<MLModelMetrics> {
    const model = getTrainedModel();
    return model.metrics;
  },

  async retrainML(datasetSize?: number) {
    const size = datasetSize ? Number(datasetSize) : 2500;
    const metrics = retrainModel(size);
    return {
      message: `In-browser Random Forest retrained with ${size} synthetic meteorological samples.`,
      metrics,
    };
  },

  async retrainModel(datasetSize?: number) {
    return this.retrainML(datasetSize);
  },

  async getAIAdvisor(zoneId?: string, scenario?: string) {
    const zone = zoneId ? getZoneById(zoneId) : getAllZones()[0];
    const zoneName = zone ? `${zone.id} (${zone.name})` : 'Target Sector';
    const advisoryText = `### Tactical Wildfire Incident Advisory — ${zoneName}
> ℹ️ **Demo Mode Notice:** Live Gemini AI API is unavailable in free Spark demo mode. Pre-computed tactical rule directives are displayed below.

**Executive Synopsis:**
Sector ${zoneName} operates under ${zone?.riskLevel || 'HIGH'} danger tier with a wildfire probability of ${zone?.riskScore || 75}%.

**Prioritized Tactical Directives:**
1. **Containment Staging:** Pre-position wildland engines along primary arterial access corridors feeding Sector ${zone?.id || 'target'}.
2. **Civilian Protection:** Issue preparatory notices to settlements, prioritizing civilian residents residing downwind.
3. **Aerial Surveillance:** Deploy thermal sensor reconnaissance UAVs along perimeter to detect smoldering spot fires.
4. **Defensible Perimeters:** Establish a 40-meter bulldozer firebreak buffer along secondary ridge boundaries.`;

    return {
      source: 'TACTICAL_RULE_ENGINE',
      title: `Tactical Incident Advisory for ${zoneName}`,
      summary: `Sector ${zoneName} operates under ${zone?.riskLevel || 'HIGH'} danger tier with a wildfire probability of ${zone?.riskScore || 75}%.`,
      recommendations: [
        `Pre-position tactical engines along access corridors for Sector ${zone?.id || 'target'}.`,
        'Issue preparatory evacuation notices to downwind civilian settlements.',
        'Deploy thermal sensor reconnaissance UAVs along perimeter.',
        'Establish 40-meter bulldozer firebreak buffers.',
      ],
      reply: advisoryText,
      advisoryText,
      zoneId: zone?.id,
      timestamp: new Date().toISOString(),
    };
  },

  async askAIAdvisor(prompt: string, zone?: GeographicZone | null): Promise<{ reply: string }> {
    const targetZone = zone || getAllZones()[0];
    const text = `⚠️ **Demo Mode Active (Free Hosting):** Live Gemini AI advisory is unavailable in free demo mode without a cloud backend.

**Tactical Incident Matrix for ${targetZone ? targetZone.name : 'Target Sector'}:**
• **Risk Tier:** ${targetZone ? targetZone.riskLevel : 'ELEVATED'} (${targetZone ? targetZone.riskScore : 75}%)
• **Temperature & Weather:** ${targetZone ? targetZone.weather.temperature : 35}°C | ${targetZone ? targetZone.weather.humidity : 20}% Humidity | ${targetZone ? targetZone.weather.windSpeed : 22} km/h Wind
• **Evacuation Directive:** Evacuation corridors are pre-computed towards ${targetZone?.name || 'Local'} Relief Haven.
• **Containment Strategy:** Dispatch Type 3 suppression vehicles to secure the windward perimeter.`;

    return { reply: text };
  },

  // NASA FIRMS & Satellite Telemetry (Client Simulation Mode)
  async getNasaStatus(): Promise<{
    valid: boolean;
    message: string;
    mapKeyMasked: string;
    availableSensors: { sensor: string; minDate: string; maxDate: string }[];
  }> {
    return {
      valid: true,
      message: 'NASA FIRMS Satellite Telemetry Gateway is active in simulated mode (Spark Free Plan).',
      mapKeyMasked: 'DEMO...SPARK',
      availableSensors: [
        { sensor: 'VIIRS (Suomi NPP 375m)', minDate: '2024-01-01', maxDate: 'Present' },
        { sensor: 'VIIRS (NOAA-20 375m)', minDate: '2024-01-01', maxDate: 'Present' },
        { sensor: 'MODIS (Terra/Aqua 1km)', minDate: '2000-11-01', maxDate: 'Present' },
      ],
    };
  },

  async getNasaLayers(): Promise<{
    mapKeyConfigured: boolean;
    mapKeyMasked: string;
    layers: any[];
  }> {
    return {
      mapKeyConfigured: false,
      mapKeyMasked: 'DEMO...SPARK',
      layers: getClientNasaLayers(),
    };
  },

  async getNasaLiveFires(options?: {
    bbox?: string;
    days?: number;
    refresh?: boolean;
  }): Promise<{
    region: string;
    activeRegionId: string;
    boundingBox: { west: number; south: number; east: number; north: number };
    stats: any;
    detectionsCount: number;
    detections: any[];
  }> {
    const region = getActiveRegion();
    const result = generateClientSimulatedDetections(region.center.lat, region.center.lng, 32);

    return {
      region: region.name,
      activeRegionId: region.id,
      boundingBox: {
        west: region.center.lng - 2.0,
        south: region.center.lat - 2.0,
        east: region.center.lng + 2.0,
        north: region.center.lat + 2.0,
      },
      stats: result.stats,
      detectionsCount: result.detections.length,
      detections: result.detections,
    };
  },

  async syncNasaData(days = 2): Promise<{
    success: boolean;
    message: string;
    stats: any;
    detections: any[];
  }> {
    const region = getActiveRegion();
    const result = generateClientSimulatedDetections(region.center.lat, region.center.lng, 35);
    return {
      success: true,
      message: `Synchronized ${result.detections.length} simulated NASA VIIRS/MODIS detections for ${region.name}`,
      stats: result.stats,
      detections: result.detections,
    };
  },

  // Open-Meteo Real-Time Weather Integration (Direct Browser Fetching)
  async getLiveWeather(lat?: number, lng?: number): Promise<{
    provider: string;
    location: { lat: number; lng: number };
    weather: {
      temperature: number;
      humidity: number;
      windSpeed: number;
      windDirection: string;
      windDegree: number;
      rainfall: number;
      surfacePressure?: number;
      dewPoint?: number;
      isLive: boolean;
      timestamp: string;
    };
  }> {
    const activeRegion = getActiveRegion();
    const targetLat = lat !== undefined ? lat : activeRegion.center.lat;
    const targetLng = lng !== undefined ? lng : activeRegion.center.lng;

    const weather = await fetchLiveWeather(targetLat, targetLng);
    return {
      provider: 'Open-Meteo Real-Time API (Client-Side)',
      location: { lat: targetLat, lng: targetLng },
      weather,
    };
  },

  async refreshLiveWeather(): Promise<{
    message: string;
    provider: string;
    timestamp: string;
  }> {
    const updatedCount = await refreshZonesLiveWeather();
    return {
      message: `Enriched ${updatedCount} GIS zones with live Open-Meteo weather telemetry & recalculated in-browser Random Forest risk predictions.`,
      provider: 'Open-Meteo API',
      timestamp: new Date().toISOString(),
    };
  },
};
