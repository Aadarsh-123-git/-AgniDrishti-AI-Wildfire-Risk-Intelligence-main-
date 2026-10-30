import { NasaFireDetection, NasaSatelliteStats, NasaLayerInfo } from '../types';

export function getClientNasaLayers(): NasaLayerInfo[] {
  return [
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
    {
      id: 'nasa-firms-wms-viirs-24',
      name: 'NASA FIRMS Live Thermal Anomaly (VIIRS 24h)',
      type: 'WMS',
      url: 'https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/7535355f8a82418d00fbbf3b24d44169/',
      layers: 'fires_viirs_24',
      format: 'image/png',
      transparent: true,
      attribution: '© NASA FIRMS / Earthdata / EOSDIS',
      description: 'Near real-time fire detection points from Suomi NPP and NOAA-20/21 satellites past 24 hours.',
    },
  ];
}

export function generateClientSimulatedDetections(
  centerLat = 21.1458,
  centerLng = 79.0882,
  count = 28
): { detections: NasaFireDetection[]; stats: NasaSatelliteStats } {
  const detections: NasaFireDetection[] = [];
  const satellites = [
    { name: 'Suomi NPP (VIIRS 375m)', code: 'SNPP', inst: 'VIIRS' },
    { name: 'NOAA-20 (VIIRS 375m)', code: 'NOAA-20', inst: 'VIIRS' },
    { name: 'NOAA-21 (VIIRS 375m)', code: 'NOAA-21', inst: 'VIIRS' },
    { name: 'Terra (MODIS 1km)', code: 'Terra', inst: 'MODIS' },
  ];

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  for (let i = 0; i < count; i++) {
    // Generate clusters around center
    const angle = (i / count) * 2 * Math.PI + (i % 3) * 0.4;
    const distance = 0.08 + (Math.sin(i * 1.7) * 0.5 + 0.5) * 0.75;
    const lat = centerLat + Math.sin(angle) * distance;
    const lng = centerLng + Math.cos(angle) * distance;

    const sat = satellites[i % satellites.length];
    const frp = Math.round((2.5 + Math.abs(Math.sin(i * 3.14)) * 32) * 10) / 10;
    const brightness = Math.round(315 + Math.abs(Math.cos(i * 2.1)) * 48);
    const dayNight: 'D' | 'N' = i % 2 === 0 ? 'D' : 'N';
    const confLevel: 'high' | 'nominal' | 'low' = frp > 15 ? 'high' : frp > 6 ? 'nominal' : 'low';
    const severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' =
      frp >= 25 ? 'CRITICAL' : frp >= 10 ? 'HIGH' : frp >= 4 ? 'MODERATE' : 'LOW';

    const hour = (14 - (i % 8)).toString().padStart(2, '0');
    const minute = ((i * 7) % 60).toString().padStart(2, '0');

    detections.push({
      id: `NASA-SIM-${dateStr}-${hour}${minute}-${i + 1}`,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lng * 10000) / 10000,
      brightness,
      brightnessTi5: brightness - 18,
      frp,
      acqDate: dateStr,
      acqTime: `${hour}${minute}`,
      timestampFormatted: `${dateStr} ${hour}:${minute} UTC`,
      satellite: sat.name,
      satelliteCode: sat.code,
      instrument: sat.inst,
      confidence: confLevel,
      confidenceScore: confLevel === 'high' ? 88 : confLevel === 'nominal' ? 65 : 35,
      dayNight,
      severity,
    });
  }

  // Sort by frp descending
  detections.sort((a, b) => b.frp - a.frp);

  const stats: NasaSatelliteStats = {
    keyValid: true,
    mapServiceAvailable: true,
    totalActiveDetections: detections.length,
    highConfidenceCount: detections.filter((d) => d.confidence === 'high').length,
    maxFrp: Math.max(...detections.map((d) => d.frp)),
    avgBrightnessKelvin: Math.round(
      detections.reduce((s, d) => s + d.brightness, 0) / detections.length
    ),
    dayPasses: detections.filter((d) => d.dayNight === 'D').length,
    nightPasses: detections.filter((d) => d.dayNight === 'N').length,
    activeSatellites: ['Suomi NPP (VIIRS 375m)', 'NOAA-20 (VIIRS 375m)', 'Terra (MODIS 1km)'],
    lastSync: now.toISOString(),
    sourceRegion: 'Active Spatial Coverage Bounding Box',
    boundingBox: `${(centerLng - 1).toFixed(2)},${(centerLat - 1).toFixed(2)},${(centerLng + 1).toFixed(2)},${(centerLat + 1).toFixed(2)}`,
    dataRangeDays: 2,
  };

  return { detections, stats };
}
