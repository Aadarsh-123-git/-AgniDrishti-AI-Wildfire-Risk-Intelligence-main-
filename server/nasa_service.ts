import dotenv from 'dotenv';
dotenv.config();

export interface NasaFireDetection {
  id: string;
  latitude: number;
  longitude: number;
  brightness: number; // Brightness temperature I-4 (Kelvin)
  brightnessTi5?: number; // Brightness temperature I-5 (Kelvin)
  frp: number; // Fire Radiative Power (MW)
  acqDate: string; // YYYY-MM-DD
  acqTime: string; // HHMM
  timestampFormatted: string; // ISO or readable UTC string
  satellite: string; // 'Suomi NPP (VIIRS)', 'NOAA-20 (VIIRS)', 'NOAA-21 (VIIRS)', 'Terra (MODIS)', 'Aqua (MODIS)'
  satelliteCode: string; // 'N', '1', '21', 'T', 'A'
  instrument: string; // 'VIIRS' | 'MODIS'
  confidence: 'high' | 'nominal' | 'low' | string;
  confidenceScore: number; // 0 - 100%
  dayNight: 'D' | 'N'; // 'D' (Day) | 'N' (Night)
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

const DEFAULT_NASA_MAP_KEY = '7535355f8a82418d00fbbf3b24d44169';

export function getNasaMapKey(): string {
  return process.env.NASA_FIRMS_MAP_KEY || process.env.VITE_NASA_FIRMS_MAP_KEY || DEFAULT_NASA_MAP_KEY;
}

// In-memory telemetry cache
interface CacheEntry {
  data: NasaFireDetection[];
  stats: NasaSatelliteStats;
  cachedAt: number;
}

const telemetryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

/**
 * Format satellite code into readable satellite name
 */
function parseSatelliteName(sat: string, instrument: string): { name: string; code: string } {
  const code = (sat || '').toUpperCase().trim();
  if (instrument.toUpperCase().includes('MODIS')) {
    if (code === 'T' || code === 'TERRA') return { name: 'Terra (MODIS 1km)', code: 'Terra' };
    if (code === 'A' || code === 'AQUA') return { name: 'Aqua (MODIS 1km)', code: 'Aqua' };
    return { name: 'NASA MODIS (1km)', code };
  }

  if (code === 'N' || code === 'SNPP' || code === 'SUOMI-NPP') {
    return { name: 'Suomi NPP (VIIRS 375m)', code: 'SNPP' };
  }
  if (code === '1' || code === 'N20' || code === 'NOAA20' || code === 'JPSS-1') {
    return { name: 'NOAA-20 (VIIRS 375m)', code: 'NOAA-20' };
  }
  if (code === '21' || code === 'N21' || code === 'NOAA21' || code === 'JPSS-2') {
    return { name: 'NOAA-21 (VIIRS 375m)', code: 'NOAA-21' };
  }

  return { name: `VIIRS Satellite (${code})`, code };
}

/**
 * Normalize confidence indicator to score & label
 */
function parseConfidence(rawConf: string): { level: 'high' | 'nominal' | 'low'; score: number } {
  const val = (rawConf || '').toLowerCase().trim();
  if (val === 'h' || val === 'high') return { level: 'high', score: 95 };
  if (val === 'n' || val === 'nominal') return { level: 'nominal', score: 70 };
  if (val === 'l' || val === 'low') return { level: 'low', score: 40 };

  const num = parseFloat(val);
  if (!isNaN(num)) {
    if (num >= 80) return { level: 'high', score: num };
    if (num >= 50) return { level: 'nominal', score: num };
    return { level: 'low', score: num };
  }

  return { level: 'nominal', score: 65 };
}

/**
 * Determine severity based on FRP (MW) and Brightness (K)
 */
function calculateSeverity(frp: number, brightness: number): 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' {
  if (frp >= 25 || brightness >= 355) return 'CRITICAL';
  if (frp >= 10 || brightness >= 340) return 'HIGH';
  if (frp >= 3 || brightness >= 325) return 'MODERATE';
  return 'LOW';
}

/**
 * Parse NASA FIRMS CSV payload
 */
export function parseFirmsCsv(csvText: string, defaultInstrument = 'VIIRS'): NasaFireDetection[] {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const latIdx = header.indexOf('latitude');
  const lngIdx = header.indexOf('longitude');
  const bt4Idx = header.indexOf('bright_ti4');
  const bt5Idx = header.indexOf('bright_ti5');
  const brightnessIdx = header.indexOf('brightness'); // For MODIS
  const scanIdx = header.indexOf('scan');
  const trackIdx = header.indexOf('track');
  const dateIdx = header.indexOf('acq_date');
  const timeIdx = header.indexOf('acq_time');
  const satIdx = header.indexOf('satellite');
  const instIdx = header.indexOf('instrument');
  const confIdx = header.indexOf('confidence');
  const frpIdx = header.indexOf('frp');
  const dayNightIdx = header.indexOf('daynight');

  if (latIdx === -1 || lngIdx === -1) return [];

  const detections: NasaFireDetection[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map((c) => c.trim());
    if (row.length < header.length) continue;

    const lat = parseFloat(row[latIdx]);
    const lng = parseFloat(row[lngIdx]);
    if (isNaN(lat) || isNaN(lng)) continue;

    const bt4 = bt4Idx !== -1 ? parseFloat(row[bt4Idx]) : brightnessIdx !== -1 ? parseFloat(row[brightnessIdx]) : 330;
    const bt5 = bt5Idx !== -1 ? parseFloat(row[bt5Idx]) : undefined;
    const frp = frpIdx !== -1 ? parseFloat(row[frpIdx]) || 0 : 0;
    const acqDate = dateIdx !== -1 ? row[dateIdx] : new Date().toISOString().split('T')[0];
    const acqTime = timeIdx !== -1 ? row[timeIdx].padStart(4, '0') : '0000';
    const satCode = satIdx !== -1 ? row[satIdx] : 'N';
    const instrument = instIdx !== -1 ? row[instIdx] : defaultInstrument;
    const rawConf = confIdx !== -1 ? row[confIdx] : 'n';
    const dayNight = (dayNightIdx !== -1 ? row[dayNightIdx].toUpperCase() : 'D') as 'D' | 'N';

    const { name: satName, code: cleanCode } = parseSatelliteName(satCode, instrument);
    const { level: confLevel, score: confScore } = parseConfidence(rawConf);
    const severity = calculateSeverity(frp, bt4);

    const hh = acqTime.substring(0, 2);
    const mm = acqTime.substring(2, 4);
    const timestampFormatted = `${acqDate} ${hh}:${mm} UTC`;

    detections.push({
      id: `NASA-FIRMS-${acqDate}-${acqTime}-${i}`,
      latitude: lat,
      longitude: lng,
      brightness: bt4,
      brightnessTi5: bt5,
      frp: Math.round(frp * 100) / 100,
      acqDate,
      acqTime,
      timestampFormatted,
      satellite: satName,
      satelliteCode: cleanCode,
      instrument,
      confidence: confLevel,
      confidenceScore: confScore,
      dayNight,
      severity,
    });
  }

  return detections;
}

/**
 * Fetch Near Real-Time Active Fires from NASA FIRMS Area API
 */
export async function fetchLiveFiresFromNasa(
  bbox: { west: number; south: number; east: number; north: number },
  dayRange = 2,
  forceRefresh = false
): Promise<{ detections: NasaFireDetection[]; stats: NasaSatelliteStats }> {
  const mapKey = getNasaMapKey();
  const bboxKey = `${bbox.west.toFixed(2)},${bbox.south.toFixed(2)},${bbox.east.toFixed(2)},${bbox.north.toFixed(2)}`;
  const cacheKey = `${bboxKey}_d${dayRange}`;

  if (!forceRefresh) {
    const cached = telemetryCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return { detections: cached.data, stats: cached.stats };
    }
  }

  // Multi-source querying: VIIRS SNPP + VIIRS NOAA-20 + MODIS NRT
  const sources = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'MODIS_NRT'];
  const allDetections: NasaFireDetection[] = [];
  const activeSats = new Set<string>();

  for (const source of sources) {
    try {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${bbox.west},${bbox.south},${bbox.east},${bbox.north}/${dayRange}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'WildfireAI-DisasterPlatform/1.0' },
      });

      if (response.ok) {
        const csv = await response.text();
        const inst = source.includes('MODIS') ? 'MODIS' : 'VIIRS';
        const parsed = parseFirmsCsv(csv, inst);
        parsed.forEach((d) => {
          allDetections.push(d);
          activeSats.add(d.satellite);
        });
      } else {
        console.warn(`NASA FIRMS API returned status ${response.status} for ${source}`);
      }
    } catch (err: any) {
      console.error(`Error querying NASA FIRMS source ${source}:`, err?.message || err);
    }
  }

  // Deduplicate overlapping detections (same satellite + lat/lng rounded to 3 decimals + time)
  const uniqueMap = new Map<string, NasaFireDetection>();
  for (const d of allDetections) {
    const key = `${d.latitude.toFixed(3)}_${d.longitude.toFixed(3)}_${d.acqDate}_${d.acqTime}_${d.instrument}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, d);
    }
  }

  const detections = Array.from(uniqueMap.values()).sort(
    (a, b) => b.frp - a.frp || b.brightness - a.brightness
  );

  // Compute telemetry metrics
  const total = detections.length;
  const highConf = detections.filter((d) => d.confidence === 'high').length;
  const maxFrp = detections.reduce((max, d) => Math.max(max, d.frp), 0);
  const avgBt = total > 0 ? detections.reduce((sum, d) => sum + d.brightness, 0) / total : 0;
  const dayPasses = detections.filter((d) => d.dayNight === 'D').length;
  const nightPasses = detections.filter((d) => d.dayNight === 'N').length;

  const stats: NasaSatelliteStats = {
    keyValid: true,
    mapServiceAvailable: true,
    totalActiveDetections: total,
    highConfidenceCount: highConf,
    maxFrp: Math.round(maxFrp * 10) / 10,
    avgBrightnessKelvin: Math.round(avgBt * 10) / 10,
    dayPasses,
    nightPasses,
    activeSatellites: Array.from(activeSats),
    lastSync: new Date().toISOString(),
    sourceRegion: bboxKey,
    boundingBox: bboxKey,
    dataRangeDays: dayRange,
  };

  telemetryCache.set(cacheKey, {
    data: detections,
    stats,
    cachedAt: Date.now(),
  });

  return { detections, stats };
}

/**
 * Get available NASA Layer configurations including WMS & GIBS Tile layers
 */
export function getNasaLayers(): NasaLayerInfo[] {
  const mapKey = getNasaMapKey();

  return [
    {
      id: 'nasa-firms-wms-viirs-24',
      name: 'NASA FIRMS Live Thermal Anomaly (VIIRS 24h)',
      type: 'WMS',
      url: `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/${mapKey}/`,
      layers: 'fires_viirs_24',
      format: 'image/png',
      transparent: true,
      attribution: '© NASA FIRMS / Earthdata / EOSDIS',
      description: 'Ultra-high resolution (375m) near real-time fire detection points from Suomi NPP and NOAA-20/21 satellites past 24 hours.',
    },
    {
      id: 'nasa-firms-wms-viirs-72',
      name: 'NASA FIRMS Fire History (VIIRS 72h)',
      type: 'WMS',
      url: `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/${mapKey}/`,
      layers: 'fires_viirs_72',
      format: 'image/png',
      transparent: true,
      attribution: '© NASA FIRMS / Earthdata',
      description: 'Active fire detections spanning the past 3 days to visualize burn progression.',
    },
    {
      id: 'nasa-firms-wms-modis-24',
      name: 'NASA FIRMS MODIS Thermal Anomalies (24h)',
      type: 'WMS',
      url: `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/${mapKey}/`,
      layers: 'fires_modis_24',
      format: 'image/png',
      transparent: true,
      attribution: '© NASA FIRMS / MODIS',
      description: 'Global 1km MODIS thermal anomaly records from Terra & Aqua satellites.',
    },
    {
      id: 'nasa-gibs-truecolor',
      name: 'NASA GIBS True-Color Earth Satellite Imagery',
      type: 'GIBS_WMTS',
      url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
      attribution: '© NASA Earthdata / GIBS',
      description: 'Daily global true-color satellite surface reflectance from NASA Terra/MODIS.',
    },
    {
      id: 'nasa-gibs-nightlights',
      name: 'NASA VIIRS Nighttime Thermal & City Lights',
      type: 'GIBS_WMTS',
      url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_DayNightBand_AtSensor_Radiance/default/{time}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png',
      attribution: '© NASA Earthdata / Suomi NPP',
      description: 'High sensitivity Day/Night band radiance capturing nocturnal fires and power infrastructure.',
    },
  ];
}

/**
 * Health check & data availability check for NASA MAP_KEY
 */
export async function checkNasaKeyStatus(): Promise<{
  valid: boolean;
  message: string;
  mapKeyMasked: string;
  availableSensors: { sensor: string; minDate: string; maxDate: string }[];
}> {
  const mapKey = getNasaMapKey();
  const masked = `${mapKey.substring(0, 4)}...${mapKey.substring(mapKey.length - 4)}`;

  try {
    const url = `https://firms.modaps.eosdis.nasa.gov/api/data_availability/csv/${mapKey}/all`;
    const res = await fetch(url, { headers: { 'User-Agent': 'WildfireAI/1.0' } });

    if (!res.ok) {
      return {
        valid: false,
        message: `NASA FIRMS returned HTTP ${res.status}. Key may be invalid or quota exceeded.`,
        mapKeyMasked: masked,
        availableSensors: [],
      };
    }

    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);
    const sensors: { sensor: string; minDate: string; maxDate: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 3) {
        sensors.push({
          sensor: parts[0].trim(),
          minDate: parts[1].trim(),
          maxDate: parts[2].trim(),
        });
      }
    }

    return {
      valid: true,
      message: 'NASA FIRMS Satellite Telemetry Gateway is fully operational and authenticated.',
      mapKeyMasked: masked,
      availableSensors: sensors,
    };
  } catch (err: any) {
    return {
      valid: false,
      message: `NASA Connection Error: ${err?.message || 'Unknown network error'}`,
      mapKeyMasked: masked,
      availableSensors: [],
    };
  }
}
