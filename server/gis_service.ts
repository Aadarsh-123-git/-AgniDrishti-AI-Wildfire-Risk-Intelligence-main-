import {
  GeographicZone,
  HistoricalFireRecord,
  HotspotCluster,
  WildfireAlert,
  SafeZone,
  EvacuationRoute,
  EvacuationPlan,
  RegionConfig,
  RiskLevel,
} from '../src/types';
import { predictWildfireRisk } from './ml_engine';
import { fetchBatchLiveWeather, fetchLiveWeather } from './weather_service';

export const SUPPORTED_REGIONS: RegionConfig[] = [
  {
    id: 'nagpur-maharashtra',
    name: 'Nagpur & Vidarbha Forest Region',
    state: 'Maharashtra',
    country: 'India',
    center: { lat: 21.1458, lng: 79.0882 },
    defaultZoom: 10,
    description: 'Dry deciduous forest & teak woodlands with high summer heat and dry vegetation.',
  },
  {
    id: 'pench-tadoba-corridor',
    name: 'Pench — Tadoba Wildlife Corridor',
    state: 'Maharashtra / MP',
    country: 'India',
    center: { lat: 20.75, lng: 79.35 },
    defaultZoom: 9,
    description: 'Dense tiger reserve buffer forests with frequent bamboo flowering & surface fire history.',
  },
  {
    id: 'western-ghats-satara',
    name: 'Western Ghats Ridge & Valleys',
    state: 'Maharashtra',
    country: 'India',
    center: { lat: 17.6805, lng: 73.805 },
    defaultZoom: 9,
    description: 'Steep escarpment with dry grassland slopes during pre-monsoon dry season.',
  },
  {
    id: 'sierra-nevada-ca',
    name: 'Sierra Nevada Foothills',
    state: 'California',
    country: 'USA',
    center: { lat: 38.5816, lng: -120.9458 },
    defaultZoom: 9,
    description: 'Mediterranean climate with chaparral and dense conifer timber stands.',
  },
];

let activeRegionId = 'nagpur-maharashtra';
let cachedZones: GeographicZone[] = [];
let cachedHistoricalFires: HistoricalFireRecord[] = [];
let cachedClusters: HotspotCluster[] = [];
let cachedSafeZones: SafeZone[] = [];
let cachedAlerts: WildfireAlert[] = [];

export function getActiveRegion(): RegionConfig {
  return (
    SUPPORTED_REGIONS.find((r) => r.id === activeRegionId) || SUPPORTED_REGIONS[0]
  );
}

export function setActiveRegion(regionId: string): RegionConfig {
  const found = SUPPORTED_REGIONS.find((r) => r.id === regionId);
  if (found) {
    activeRegionId = regionId;
    initializeDataForActiveRegion();
    return found;
  }
  return getActiveRegion();
}

export function initializeDataForActiveRegion(): void {
  const region = getActiveRegion();
  const center = region.center;

  // Generate 100 Geographic Zones in a 10x10 GIS Grid
  const rows = 10;
  const cols = 10;
  const latStep = 0.045; // ~5 km step
  const lngStep = 0.055; // ~5.5 km step

  const startLat = center.lat - (rows / 2) * latStep;
  const startLng = center.lng - (cols / 2) * lngStep;

  const vegetationTypes = [
    'Dry Deciduous Teak',
    'Mixed Scrub & Bamboo',
    'Open Grassland & Savannah',
    'Agricultural Fallow & Shrub',
    'Dense Sal & Broadleaf',
    'Riparian Woodland',
  ];

  const zones: GeographicZone[] = [];
  let zoneCount = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const south = startLat + r * latStep;
      const north = south + latStep;
      const west = startLng + c * lngStep;
      const east = west + lngStep;
      const centroidLat = (south + north) / 2;
      const centroidLng = (west + east) / 2;

      // Spatial gradient: create a believable weather & fuel moisture hot pocket (e.g. northeast & center-east zones)
      const distFromHotCenter = Math.hypot(r - 6, c - 7);
      const isHotspotArea = distFromHotCenter < 3.2;

      const baseTemp = isHotspotArea ? 41.5 + Math.random() * 4 : 33.5 + Math.random() * 5;
      const baseHumidity = isHotspotArea ? 13 + Math.random() * 9 : 28 + Math.random() * 22;
      const baseWind = isHotspotArea ? 28 + Math.random() * 18 : 12 + Math.random() * 14;
      const baseRain = Math.random() < (isHotspotArea ? 0.96 : 0.7) ? 0 : Math.random() * 8;
      const baseNdvi = isHotspotArea ? 0.12 + Math.random() * 0.11 : 0.32 + Math.random() * 0.35;
      const histFires = isHotspotArea ? Math.floor(Math.random() * 11 + 6) : Math.floor(Math.random() * 4);
      const elevation = Math.round(280 + Math.random() * 320 + (isHotspotArea ? 150 : 0));

      const vegIdx = (r + c * 3) % vegetationTypes.length;
      const vegType = vegetationTypes[vegIdx];

      let vegCond: 'VERY DRY' | 'DRY' | 'MODERATE' | 'DENSE & MOIST' = 'MODERATE';
      if (baseNdvi < 0.18) vegCond = 'VERY DRY';
      else if (baseNdvi < 0.3) vegCond = 'DRY';
      else if (baseNdvi < 0.5) vegCond = 'MODERATE';
      else vegCond = 'DENSE & MOIST';

      const population = Math.floor(Math.random() * 14000 + (isHotspotArea ? 4000 : 8000));
      const schools = Math.floor(population / 3200) + (Math.random() > 0.4 ? 1 : 0);
      const hospitals = Math.floor(population / 7500);
      const settlements = Math.floor(Math.random() * 5 + 2);

      const zoneId = `ZN-${String(zoneCount).padStart(3, '0')}`;
      const zoneName = `Zone ${zoneCount} (${vegType.split(' ')[0]} Sector)`;

      const weather = {
        temperature: Math.round(baseTemp * 10) / 10,
        humidity: Math.round(baseHumidity * 10) / 10,
        windSpeed: Math.round(baseWind * 10) / 10,
        windDirection: isHotspotArea ? 'WNW' : ['NW', 'W', 'SW', 'N'][Math.floor(Math.random() * 4)],
        windDegree: isHotspotArea ? 295 : Math.floor(Math.random() * 360),
        rainfall: Math.round(baseRain * 10) / 10,
      };

      // Run ML Prediction for this zone
      const prediction = predictWildfireRisk({
        temperature: weather.temperature,
        humidity: weather.humidity,
        wind_speed: weather.windSpeed,
        rainfall: weather.rainfall,
        ndvi: baseNdvi,
        historical_fire_count: histFires,
        elevation: elevation,
      });

      const contributingFactors = prediction.contributingFactors.map((f) => ({
        factor: f.displayName,
        weight: f.impactScore,
        direction: (f.status === 'PROTECTIVE' ? 'decreases_risk' : 'increases_risk') as any,
        description: `${f.displayName}: ${f.value} ${f.unit} (${f.status})`,
      }));

      zones.push({
        id: zoneId,
        name: zoneName,
        region: region.name,
        centroid: { lat: centroidLat, lng: centroidLng },
        bounds: { north, south, east, west },
        elevation,
        vegetationType: vegType,
        ndvi: Math.round(baseNdvi * 100) / 100,
        vegetationCondition: vegCond,
        historicalFireCount: histFires,
        population,
        schools,
        hospitals,
        settlements,
        weather,
        riskScore: prediction.riskScore,
        riskLevel: prediction.riskLevel,
        confidence: prediction.modelConfidence,
        contributingFactors,
      });

      zoneCount++;
    }
  }

  cachedZones = zones;

  // Generate 80 Historical Wildfire Records
  const fires: HistoricalFireRecord[] = [];
  const causes: HistoricalFireRecord['cause'][] = [
    'Heatwave/Spontaneous',
    'Agricultural Burning',
    'Human Negligence',
    'Lightning',
    'Under Investigation',
  ];
  const severities: HistoricalFireRecord['severity'][] = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'];

  for (let i = 1; i <= 85; i++) {
    // Bias historical fires toward high-risk zone centroids
    const pickHighRisk = Math.random() < 0.65;
    const sampleZone = pickHighRisk
      ? zones.filter((z) => z.riskLevel === 'CRITICAL' || z.riskLevel === 'HIGH')[
          Math.floor(Math.random() * (zones.filter((z) => z.riskLevel === 'CRITICAL' || z.riskLevel === 'HIGH').length || 1))
        ] || zones[0]
      : zones[Math.floor(Math.random() * zones.length)];

    const fireLat = sampleZone.centroid.lat + (Math.random() - 0.5) * latStep * 0.7;
    const fireLng = sampleZone.centroid.lng + (Math.random() - 0.5) * lngStep * 0.7;

    const daysAgo = Math.floor(Math.random() * 900);
    const date = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];

    fires.push({
      id: `FIRE-${String(i).padStart(3, '0')}`,
      lat: fireLat,
      lng: fireLng,
      date,
      confidence: Math.floor(Math.random() * 25 + 75), // 75% to 99%
      severity:
        sampleZone.riskScore > 70
          ? severities[Math.floor(Math.random() * 2 + 2)]
          : severities[Math.floor(Math.random() * 3)],
      areaHectares: Math.round(Math.random() * 480 + 15),
      cause: causes[Math.floor(Math.random() * causes.length)],
    });
  }

  cachedHistoricalFires = fires;

  // Run Spatial DBSCAN / Grid Clustering for Hotspot Identification
  cachedClusters = computeSpatialClusters(fires);

  // Generate Safe Zones / Emergency Relief Camps
  cachedSafeZones = [
    {
      id: 'SAFE-01',
      name: 'North Divisional Sports Complex & Stadium',
      lat: center.lat + latStep * 3.8,
      lng: center.lng - lngStep * 1.5,
      capacity: 12000,
      currentOccupancy: 350,
      type: 'Sports Complex',
      distanceKm: 14.2,
    },
    {
      id: 'SAFE-02',
      name: 'Central District Community Center & High Ground',
      lat: center.lat - latStep * 2.5,
      lng: center.lng - lngStep * 3.2,
      capacity: 8500,
      currentOccupancy: 120,
      type: 'Community Hall',
      distanceKm: 18.5,
    },
    {
      id: 'SAFE-03',
      name: 'Eastern Agriculture University Open Grounds',
      lat: center.lat + latStep * 1.2,
      lng: center.lng + lngStep * 4.2,
      capacity: 15000,
      currentOccupancy: 0,
      type: 'Open Ground',
      distanceKm: 22.1,
    },
    {
      id: 'SAFE-04',
      name: 'Southern Riverfront Safe Relief Camp',
      lat: center.lat - latStep * 4.1,
      lng: center.lng + lngStep * 0.8,
      capacity: 6000,
      currentOccupancy: 80,
      type: 'Designated Relief Camp',
      distanceKm: 24.8,
    },
  ];
}

// DBSCAN-inspired Spatial Clustering
function computeSpatialClusters(fires: HistoricalFireRecord[]): HotspotCluster[] {
  const eps = 0.06; // degrees distance threshold (~6.5km)
  const minPts = 4;
  const clusters: HotspotCluster[] = [];
  const visited = new Set<string>();

  let clusterId = 1;

  for (const fire of fires) {
    if (visited.has(fire.id)) continue;
    visited.add(fire.id);

    const neighbors = fires.filter(
      (other) => Math.hypot(other.lat - fire.lat, other.lng - fire.lng) <= eps
    );

    if (neighbors.length >= minPts) {
      neighbors.forEach((n) => {
        visited.add(n.id);
        n.clusterId = clusterId;
      });

      const avgLat = neighbors.reduce((sum, n) => sum + n.lat, 0) / neighbors.length;
      const avgLng = neighbors.reduce((sum, n) => sum + n.lng, 0) / neighbors.length;

      clusters.push({
        id: clusterId,
        name: `Hotspot Cluster #${clusterId} (${neighbors.length} recorded events)`,
        centroid: { lat: avgLat, lng: avgLng },
        fireCount: neighbors.length,
        avgSeverity: 'HIGH',
        radiusKm: Math.round(eps * 111 * 10) / 10,
        dominantCause: 'Heatwave & Dry Scrub Combustion',
      });

      clusterId++;
    }
  }

  return clusters;
}

// Ensure data is ready on start
initializeDataForActiveRegion();

export function getAllZones(): GeographicZone[] {
  if (cachedZones.length === 0) initializeDataForActiveRegion();
  return cachedZones;
}

export async function refreshZonesLiveWeather(): Promise<number> {
  const zones = getAllZones();
  if (zones.length === 0) return 0;

  const coords = zones.map((z) => ({ lat: z.centroid.lat, lng: z.centroid.lng }));
  const weatherResults = await fetchBatchLiveWeather(coords);

  let updatedCount = 0;
  weatherResults.forEach((liveWeather, idx) => {
    if (liveWeather) {
      const zone = zones[idx];
      zone.weather = {
        temperature: liveWeather.temperature,
        humidity: liveWeather.humidity,
        windSpeed: liveWeather.windSpeed,
        windDirection: liveWeather.windDirection,
        windDegree: liveWeather.windDegree,
        rainfall: liveWeather.rainfall,
      };

      const prediction = predictWildfireRisk({
        temperature: liveWeather.temperature,
        humidity: liveWeather.humidity,
        wind_speed: liveWeather.windSpeed,
        rainfall: liveWeather.rainfall,
        ndvi: zone.ndvi,
        historical_fire_count: zone.historicalFireCount,
        elevation: zone.elevation,
      });

      zone.riskScore = prediction.riskScore;
      zone.riskLevel = prediction.riskLevel;
      zone.confidence = prediction.modelConfidence;

      updatedCount++;
    }
  });

  return updatedCount;
}

export function getZoneById(zoneId: string): GeographicZone | undefined {
  const zones = getAllZones();
  return zones.find((z) => z.id.toUpperCase() === zoneId.toUpperCase());
}

export function getHistoricalFires(): HistoricalFireRecord[] {
  if (cachedHistoricalFires.length === 0) initializeDataForActiveRegion();
  return cachedHistoricalFires;
}

export function getHotspotClusters(): HotspotCluster[] {
  if (cachedClusters.length === 0) initializeDataForActiveRegion();
  return cachedClusters;
}

export function getPopulationRiskSummary(): {
  totalPopulationMonitored: number;
  criticalZonePopulation: number;
  highRiskPopulation: number;
  moderateRiskPopulation: number;
  lowRiskPopulation: number;
  totalSchoolsAtRisk: number;
  totalHospitalsAtRisk: number;
  totalSettlementsAtRisk: number;
  criticalZonesCount: number;
  highRiskZonesCount: number;
  zoneBreakdown: {
    zoneId: string;
    zoneName: string;
    riskLevel: RiskLevel;
    riskScore: number;
    population: number;
    schools: number;
    hospitals: number;
    settlements: number;
  }[];
} {
  const zones = getAllZones();
  let totalPop = 0;
  let critPop = 0;
  let highPop = 0;
  let modPop = 0;
  let lowPop = 0;
  let schoolsRisk = 0;
  let hospitalsRisk = 0;
  let settlementsRisk = 0;
  let critCount = 0;
  let highCount = 0;

  for (const z of zones) {
    totalPop += z.population;
    if (z.riskLevel === 'CRITICAL') {
      critPop += z.population;
      schoolsRisk += z.schools;
      hospitalsRisk += z.hospitals;
      settlementsRisk += z.settlements;
      critCount++;
    } else if (z.riskLevel === 'HIGH') {
      highPop += z.population;
      schoolsRisk += z.schools;
      hospitalsRisk += z.hospitals;
      settlementsRisk += z.settlements;
      highCount++;
    } else if (z.riskLevel === 'MODERATE') {
      modPop += z.population;
    } else {
      lowPop += z.population;
    }
  }

  const sortedZones = [...zones]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 20)
    .map((z) => ({
      zoneId: z.id,
      zoneName: z.name,
      riskLevel: z.riskLevel,
      riskScore: z.riskScore,
      population: z.population,
      schools: z.schools,
      hospitals: z.hospitals,
      settlements: z.settlements,
    }));

  return {
    totalPopulationMonitored: totalPop,
    criticalZonePopulation: critPop,
    highRiskPopulation: highPop,
    moderateRiskPopulation: modPop,
    lowRiskPopulation: lowPop,
    totalSchoolsAtRisk: schoolsRisk,
    totalHospitalsAtRisk: hospitalsRisk,
    totalSettlementsAtRisk: settlementsRisk,
    criticalZonesCount: critCount,
    highRiskZonesCount: highCount,
    zoneBreakdown: sortedZones,
  };
}

export function generateAlerts(): WildfireAlert[] {
  if (cachedAlerts.length > 0) {
    return cachedAlerts;
  }

  const zones = getAllZones();
  const alerts: WildfireAlert[] = [];

  for (const z of zones) {
    if (z.riskLevel === 'CRITICAL' || z.riskLevel === 'HIGH') {
      const isCritical = z.riskLevel === 'CRITICAL';
      const keyFactors: string[] = [];

      if (z.weather.temperature >= 38) keyFactors.push(`Extreme ambient heat (${z.weather.temperature}°C)`);
      if (z.weather.humidity <= 22) keyFactors.push(`Critically dry air (RH: ${z.weather.humidity}%)`);
      if (z.weather.windSpeed >= 28) keyFactors.push(`High spread velocity winds (${z.weather.windSpeed} km/h ${z.weather.windDirection})`);
      if (z.ndvi <= 0.22) keyFactors.push(`Dry combustible fuel moisture (NDVI ${z.ndvi})`);
      if (z.historicalFireCount >= 6) keyFactors.push(`Elevated past fire recurrence (${z.historicalFireCount} incidents)`);
      if (z.weather.rainfall === 0) keyFactors.push(`Zero precipitation over 72h`);

      const recAction = isCritical
        ? `Immediate surveillance dispatch, stage aerial/ground suppression units, and issue preparatory evacuation notices to ${z.settlements} settlements (${z.population.toLocaleString()} residents).`
        : `Heighten lookout watch, restrict agricultural burning, and pre-position water tenders near vulnerable schools and healthcare posts.`;

      alerts.push({
        id: `ALT-${z.id}-${Date.now().toString().slice(-4)}`,
        zoneId: z.id,
        zoneName: z.name,
        title: `Wildfire ${isCritical ? 'Emergency' : 'Warning'} Alert: ${z.id} (${z.name.split('(')[0].trim()})`,
        message: `High risk score of ${z.riskScore}% detected with extreme fire weather conditions in Sector ${z.id}.`,
        severity: isCritical ? 'EMERGENCY' : 'WARNING',
        severityLevel: isCritical ? 'EMERGENCY' : 'WARNING',
        riskScore: z.riskScore,
        riskLevel: z.riskLevel,
        timestamp: new Date().toISOString(),
        populationExposed: z.population,
        keyFactors,
        recommendedAction: recAction,
        targetZoneId: z.id,
        acknowledged: false,
      });
    }
  }

  cachedAlerts = alerts.sort((a, b) => b.riskScore - a.riskScore);
  return cachedAlerts;
}

export function broadcastAlert(customAlert: {
  targetZoneId: string;
  severity: 'EMERGENCY' | 'WARNING' | 'WATCH';
  title: string;
  message: string;
  recommendedAction?: string;
}): WildfireAlert {
  const zone = getZoneById(customAlert.targetZoneId) || getAllZones()[0];
  const newAlert: WildfireAlert = {
    id: `MANUAL-ALT-${Date.now().toString().slice(-6)}`,
    zoneId: zone.id,
    zoneName: zone.name,
    targetZoneId: zone.id,
    title: customAlert.title,
    message: customAlert.message,
    severity: customAlert.severity,
    severityLevel: customAlert.severity === 'EMERGENCY' ? 'EMERGENCY' : 'WARNING',
    riskScore: zone.riskScore,
    riskLevel: zone.riskLevel,
    timestamp: new Date().toISOString(),
    populationExposed: zone.population,
    keyFactors: [
      `Ambient Temperature: ${zone.weather.temperature}°C`,
      `Relative Humidity: ${zone.weather.humidity}%`,
      `Wind Velocity: ${zone.weather.windSpeed} km/h ${zone.weather.windDirection}`,
    ],
    recommendedAction: customAlert.recommendedAction || 'Execute immediate evacuation procedure according to local command protocols.',
    acknowledged: false,
  };

  cachedAlerts = [newAlert, ...cachedAlerts];
  return newAlert;
}

export function acknowledgeAlert(alertId: string): boolean {
  let found = false;
  cachedAlerts = cachedAlerts.map((a) => {
    if (a.id === alertId) {
      found = true;
      return { ...a, acknowledged: true, isAcknowledged: true };
    }
    return a;
  });
  return found;
}

export function getEvacuationPlan(zoneId: string): EvacuationPlan {
  const zone = getZoneById(zoneId) || getAllZones()[0];
  const safeZones: SafeZone[] = cachedSafeZones.length > 0 ? cachedSafeZones : [
    {
      id: 'SAFE-01',
      name: 'North Regional Stadium & Relief Complex',
      lat: zone.centroid.lat + 0.05,
      lng: zone.centroid.lng + 0.04,
      capacity: 12000,
      currentOccupancy: 350,
      type: 'Sports Complex' as const,
      distanceKm: 8.5,
    },
    {
      id: 'SAFE-02',
      name: 'District Community Shelter Ground',
      lat: zone.centroid.lat - 0.04,
      lng: zone.centroid.lng - 0.05,
      capacity: 6500,
      currentOccupancy: 120,
      type: 'Designated Relief Camp' as const,
      distanceKm: 11.2,
    }
  ];

  // Calculate routes to nearby safe zones
  const routes: EvacuationRoute[] = safeZones.map((sz, idx) => {
    const waypointsGeo: [number, number][] = [
      [zone.centroid.lat, zone.centroid.lng],
      [(zone.centroid.lat + sz.lat) / 2 + (idx % 2 === 0 ? 0.01 : -0.01), (zone.centroid.lng + sz.lng) / 2],
      [sz.lat, sz.lng],
    ];

    const distKm = Math.round(Math.hypot(zone.centroid.lat - sz.lat, zone.centroid.lng - sz.lng) * 111 * 10) / 10;
    const isCongested = zone.riskLevel === 'CRITICAL' && idx === 0;

    const waypointNames = [
      `Sector ${zone.id} Access Road`,
      idx % 2 === 0 ? 'State Arterial Bypass Route 4' : 'Eastern Ring Perimeter Highway',
      `${sz.name.split('&')[0].trim()} Gateway`,
    ];

    return {
      id: `RTE-${zone.id}-${sz.id}`,
      name: `Corridor ${idx + 1}: ${zone.id} to ${sz.name.split('&')[0].trim()}`,
      fromZone: zone.id,
      toSafeZone: sz.id,
      status: isCongested ? 'CAUTION' : 'CLEAR',
      estimatedTravelTimeMinutes: Math.round((distKm / 35) * 60 + (isCongested ? 20 : 5)),
      distanceKm: distKm,
      waypoints: waypointNames,
      path: waypointsGeo,
    };
  });

  const priorityActions = [
    `Prioritize emergency assessment and drone reconnaissance for Sector ${zone.id}.`,
    `Prepare phased evacuation planning for ${zone.settlements} settlements (${zone.population.toLocaleString()} residents).`,
    `Ensure critical transfer protocols for ${zone.hospitals} healthcare post(s) and ${zone.schools} educational facility(ies).`,
    `Designate ${safeZones[0].name} as primary candidate assembly point with capacity for ${safeZones[0].capacity.toLocaleString()} evacuees.`,
    `Pre-position water tenders and bulldozer firebreak teams along Corridor 1.`,
  ];

  let urgency: EvacuationPlan['urgency'] = 'NORMAL';
  if (zone.riskLevel === 'CRITICAL') urgency = 'IMMEDIATE';
  else if (zone.riskLevel === 'HIGH') urgency = 'PREPARE';
  else if (zone.riskLevel === 'MODERATE') urgency = 'MONITOR';

  return {
    zoneId: zone.id,
    zoneName: zone.name,
    riskLevel: zone.riskLevel,
    riskScore: zone.riskScore,
    urgency,
    affectedPopulation: zone.population,
    vulnerableFacilities: {
      schools: zone.schools,
      hospitals: zone.hospitals,
      settlements: zone.settlements,
    },
    safeZones,
    nearestSafeZone: safeZones[0],
    evacuationRoutes: routes,
    priorityActions,
    disclaimer:
      'PROTOTYPE DECISION SUPPORT: These evacuation corridors and assembly points are generated for simulation and tactical drill planning. Always verify with local emergency management authorities before active deployment.',
  };
}
