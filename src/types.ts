export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface WeatherData {
  temperature: number; // Celsius
  humidity: number; // %
  windSpeed: number; // km/h
  windDirection: string; // N, NE, E, SE, S, SW, W, NW
  windDegree: number;
  rainfall: number; // mm (past 24h)
}

export interface ZoneCoordinates {
  lat: number;
  lng: number;
}

export interface ZoneBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeographicZone {
  id: string;
  name: string;
  region: string;
  centroid: ZoneCoordinates;
  bounds: ZoneBounds;
  elevation: number; // meters
  vegetationType: string;
  ndvi: number; // -0.1 to 1.0
  vegetationCondition: 'VERY DRY' | 'DRY' | 'MODERATE' | 'DENSE & MOIST';
  historicalFireCount: number;
  population: number;
  schools: number;
  hospitals: number;
  settlements: number;
  weather: WeatherData;
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  confidence: number; // 0 - 100%
  contributingFactors: {
    factor: string;
    weight: number; // percentage impact
    direction: 'increases_risk' | 'decreases_risk';
    description: string;
  }[];
}

export interface HistoricalFireRecord {
  id: string;
  lat: number;
  lng: number;
  date: string;
  confidence: number; // %
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  areaHectares: number;
  cause: 'Lightning' | 'Agricultural Burning' | 'Human Negligence' | 'Heatwave/Spontaneous' | 'Under Investigation';
  clusterId?: number;
}

export interface HotspotCluster {
  id: number;
  name: string;
  centroid: ZoneCoordinates;
  fireCount: number;
  avgSeverity: string;
  radiusKm: number;
  dominantCause: string;
}

export interface WildfireAlert {
  id: string;
  zoneId: string;
  zoneName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  timestamp: string;
  populationExposed: number;
  keyFactors: string[];
  recommendedAction: string;
  severityLevel: 'INFO' | 'WARNING' | 'EMERGENCY';
  isAcknowledged?: boolean;
  severity?: string;
  title?: string;
  message?: string;
  targetZoneId?: string;
  acknowledged?: boolean;
}

export type AlertMessage = WildfireAlert;

export interface SafeZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  currentOccupancy: number;
  type: 'Community Hall' | 'Sports Complex' | 'Open Ground' | 'Designated Relief Camp';
  distanceKm: number;
}

export interface EvacuationRoute {
  id: string;
  name: string;
  fromZone: string;
  toSafeZone: string;
  status: 'CLEAR' | 'CAUTION' | 'CONGESTED' | 'BLOCKED';
  estimatedTravelTimeMinutes: number;
  distanceKm?: number;
  waypoints?: string[];
  path: [number, number][];
}

export interface EvacuationPlan {
  zoneId: string;
  zoneName: string;
  riskLevel: RiskLevel;
  riskScore: number;
  urgency: 'IMMEDIATE' | 'PREPARE' | 'MONITOR' | 'NORMAL';
  affectedPopulation: number;
  vulnerableFacilities: {
    schools: number;
    hospitals: number;
    settlements: number;
  };
  safeZones: SafeZone[];
  nearestSafeZone?: SafeZone;
  evacuationRoutes: EvacuationRoute[];
  priorityActions: string[];
  disclaimer: string;
}

export interface MLFeatureInput {
  temperature: number;
  humidity: number;
  wind_speed: number;
  rainfall: number;
  ndvi: number;
  historical_fire_count: number;
  elevation: number;
}

export interface MLPredictionResult {
  riskScore: number;
  riskLevel: RiskLevel;
  probability: number;
  contributingFactors: {
    feature: string;
    displayName: string;
    value: number;
    unit: string;
    impactScore: number; // 0 to 100
    status: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'PROTECTIVE';
  }[];
  isDemoModel: boolean;
  modelConfidence: number;
  timestamp: string;
}

export interface MLModelMetrics {
  algorithm: string;
  numberOfTrees: number;
  datasetSize: number;
  trainSamples: number;
  testSamples: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: {
    truePositive: number;
    falsePositive: number;
    falseNegative: number;
    trueNegative: number;
  };
  featureImportance: {
    feature: string;
    name: string;
    importance: number; // percentage
  }[];
  trainedAt: string;
  isDemoData: boolean;
}

export interface RegionConfig {
  id: string;
  name: string;
  state: string;
  country: string;
  center: ZoneCoordinates;
  defaultZoom: number;
  description: string;
}

export interface NasaFireDetection {
  id: string;
  latitude: number;
  longitude: number;
  brightness: number; // Brightness temperature (Kelvin)
  brightnessTi5?: number;
  frp: number; // Fire Radiative Power (MW)
  acqDate: string; // YYYY-MM-DD
  acqTime: string; // HHMM
  timestampFormatted: string;
  satellite: string;
  satelliteCode: string;
  instrument: string;
  confidence: 'high' | 'nominal' | 'low' | string;
  confidenceScore: number;
  dayNight: 'D' | 'N';
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
}

export interface NasaSatelliteStats {
  keyValid: boolean;
  mapServiceAvailable: boolean;
  totalActiveDetections: number;
  highConfidenceCount: number;
  maxFrp: number;
  avgBrightnessKelvin: number;
  dayPasses: number;
  nightPasses: number;
  activeSatellites: string[];
  lastSync: string;
  sourceRegion: string;
  boundingBox: string;
  dataRangeDays: number;
}

export interface NasaLayerInfo {
  id: string;
  name: string;
  type: 'WMS' | 'GIBS_WMTS' | 'GEOJSON_HOTSPOTS';
  url: string;
  attribution: string;
  description: string;
  layers?: string;
  format?: string;
  transparent?: boolean;
}

export interface NasaLiveFireResponse {
  region: string;
  activeRegionId: string;
  boundingBox: { west: number; south: number; east: number; north: number };
  stats: NasaSatelliteStats;
  detectionsCount: number;
  detections: NasaFireDetection[];
}

export interface NasaStatusResponse {
  valid: boolean;
  message: string;
  mapKeyMasked: string;
  availableSensors: { sensor: string; minDate: string; maxDate: string }[];
}
