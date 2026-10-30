import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  GeographicZone,
  HistoricalFireRecord,
  HotspotCluster,
  SafeZone,
  EvacuationPlan,
  RegionConfig,
  NasaFireDetection,
  NasaSatelliteStats,
} from '../types';
import { api } from '../services/api';
import {
  Layers,
  Flame,
  ShieldCheck,
  Compass,
  Maximize2,
  Radio,
  Satellite,
  RefreshCw,
  Eye,
  Info,
  Globe,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';

interface Props {
  zones: GeographicZone[];
  region: RegionConfig | null;
  selectedZone: GeographicZone | null;
  onSelectZone: (zone: GeographicZone) => void;
  historicalFires: HistoricalFireRecord[];
  clusters: HotspotCluster[];
  safeZones: SafeZone[];
  evacuationPlan: EvacuationPlan | null;
  filterLevel: 'CRITICAL' | 'HIGH' | 'ALL';
  nasaLiveFires?: NasaFireDetection[];
  nasaStats?: NasaSatelliteStats | null;
  onRefreshNasa?: () => void;
  isNasaLoading?: boolean;
}

export const RiskMap: React.FC<Props> = ({
  zones,
  region,
  selectedZone,
  onSelectZone,
  historicalFires,
  clusters,
  safeZones,
  evacuationPlan,
  filterLevel,
  nasaLiveFires = [],
  nasaStats = null,
  onRefreshNasa,
  isNasaLoading = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Basemap tile layer ref
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer groups refs
  const zonesLayerRef = useRef<L.LayerGroup | null>(null);
  const firesLayerRef = useRef<L.LayerGroup | null>(null);
  const clustersLayerRef = useRef<L.LayerGroup | null>(null);
  const safeZonesLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const windLayerRef = useRef<L.LayerGroup | null>(null);
  const nasaLiveLayerRef = useRef<L.LayerGroup | null>(null);
  const nasaWmsLayerRef = useRef<L.TileLayer.WMS | null>(null);

  // Basemap mode
  const [selectedBasemap, setSelectedBasemap] = useState<'dark' | 'satellite' | 'nasa-gibs' | 'nasa-night' | 'osm'>('dark');

  // Layer Visibility toggles
  const [showZones, setShowZones] = useState(true);
  const [showNasaLive, setShowNasaLive] = useState(true);
  const [showNasaWms, setShowNasaWms] = useState(true);
  const [wmsLayerType, setWmsLayerType] = useState<'fires_viirs_24' | 'fires_viirs_72' | 'fires_modis_24'>('fires_viirs_24');
  const [showFires, setShowFires] = useState(false);
  const [showClusters, setShowClusters] = useState(true);
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showWind, setShowWind] = useState(false);
  const [zoneOpacity, setZoneOpacity] = useState(0.5);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [hoveredNasaFire, setHoveredNasaFire] = useState<NasaFireDetection | null>(null);

  const NASA_MAP_KEY = '7535355f8a82418d00fbbf3b24d44169';

  // Helper for formatted dates for NASA GIBS (GIBS requires YYYY-MM-DD)
  const getGibsDate = () => {
    const d = new Date();
    // Use yesterday or today to ensure satellite mosaic tile availability
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  // Switch Basemap
  const applyBasemap = useCallback((basemapKey: 'dark' | 'satellite' | 'nasa-gibs' | 'nasa-night' | 'osm') => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    const gibsDate = getGibsDate();

    if (basemapKey === 'dark') {
      // High-performance Esri Dark Gray Canvas (Zero API key watermark)
      baseTileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
          attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors',
        }
      ).addTo(map);
    } else if (basemapKey === 'satellite') {
      // High-resolution Esri World Satellite Imagery (Zero API key watermark)
      baseTileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: '© Esri, Maxar, Earthstar Geographics',
        }
      ).addTo(map);
    } else if (basemapKey === 'nasa-gibs') {
      // NASA GIBS MODIS Terra True-Color Corrected Reflectance
      baseTileLayerRef.current = L.tileLayer(
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
        {
          maxZoom: 9,
          attribution: '© NASA EOSDIS GIBS / MODIS Terra',
        }
      ).addTo(map);
    } else if (basemapKey === 'nasa-night') {
      // NASA VIIRS Day/Night Band Earth at Night Radiance
      baseTileLayerRef.current = L.tileLayer(
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_DayNightBand_AtSensor_Radiance/default/${gibsDate}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
        {
          maxZoom: 8,
          attribution: '© NASA Earthdata / VIIRS Suomi NPP',
        }
      ).addTo(map);
    } else {
      baseTileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
    }

    // Bring base tile layer to back so data layers stay on top
    if (baseTileLayerRef.current) {
      baseTileLayerRef.current.bringToBack();
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const centerLat = region ? region.center.lat : 21.1458;
    const centerLng = region ? region.center.lng : 79.0882;
    const zoom = region ? region.defaultZoom : 10;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Layer groups
    zonesLayerRef.current = L.layerGroup().addTo(map);
    firesLayerRef.current = L.layerGroup().addTo(map);
    clustersLayerRef.current = L.layerGroup().addTo(map);
    safeZonesLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    windLayerRef.current = L.layerGroup().addTo(map);
    nasaLiveLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    applyBasemap(selectedBasemap);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update basemap when state changes
  useEffect(() => {
    applyBasemap(selectedBasemap);
  }, [selectedBasemap, applyBasemap]);

  // Update map view when active region changes
  useEffect(() => {
    if (!mapInstanceRef.current || !region) return;
    mapInstanceRef.current.setView([region.center.lat, region.center.lng], region.defaultZoom, {
      animate: true,
    });
  }, [region]);

  // Color helper
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return '#ef4444';
      case 'HIGH':
        return '#f97316';
      case 'MODERATE':
        return '#eab308';
      case 'LOW':
      default:
        return '#10b981';
    }
  };

  // Render NASA FIRMS WMS Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Remove existing WMS layer
    if (nasaWmsLayerRef.current) {
      map.removeLayer(nasaWmsLayerRef.current);
      nasaWmsLayerRef.current = null;
    }

    if (showNasaWms) {
      try {
        const wms = L.tileLayer.wms(
          `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/${NASA_MAP_KEY}/`,
          {
            layers: wmsLayerType,
            format: 'image/png',
            transparent: true,
            opacity: 0.85,
            attribution: '© NASA FIRMS Real-time WMS',
            zIndex: 400,
          }
        );
        wms.addTo(map);
        nasaWmsLayerRef.current = wms;
      } catch (err) {
        console.warn('NASA WMS layer init error:', err);
      }
    }
  }, [showNasaWms, wmsLayerType]);

  // Render NASA Near Real-Time Live Fire Hotspot Markers
  useEffect(() => {
    if (!nasaLiveLayerRef.current) return;
    nasaLiveLayerRef.current.clearLayers();

    if (!showNasaLive || !nasaLiveFires.length) return;

    nasaLiveFires.forEach((detection) => {
      const isCritical = detection.severity === 'CRITICAL' || detection.frp >= 20;
      const isHigh = detection.severity === 'HIGH' || detection.frp >= 8;

      const markerColor = isCritical
        ? '#ff1a1a'
        : isHigh
        ? '#ff6600'
        : detection.severity === 'MODERATE'
        ? '#ffaa00'
        : '#ffd000';

      const pulseRingColor = isCritical ? 'rgba(255, 26, 26, 0.7)' : 'rgba(255, 102, 0, 0.6)';

      const markerHtml = `
        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div class="nasa-hotspot-ripple" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${pulseRingColor};"></div>
          <div style="width: 12px; height: 12px; border-radius: 50%; background: ${markerColor}; border: 2px solid #ffffff; box-shadow: 0 0 10px ${markerColor}, 0 0 20px ${markerColor}; z-index: 2;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'nasa-live-fire-icon',
        html: markerHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([detection.latitude, detection.longitude], { icon: customIcon });

      const popupHtml = `
        <div style="font-family: ui-sans-serif, system-ui; min-width: 220px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ff2222;" class="satellite-live-dot"></span>
              <span style="font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">NASA LIVE HOTSPOT</span>
            </div>
            <span style="background: ${markerColor}33; color: ${markerColor}; border: 1px solid ${markerColor}66; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
              ${detection.severity}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            <div style="background: rgba(255,255,255,0.03); padding: 5px 7px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
              <div style="font-size: 9px; color: #9ca3af; text-transform: uppercase;">Thermal Radiative Power</div>
              <div style="font-size: 14px; font-weight: 800; color: #f97316;">${detection.frp} <span style="font-size: 10px;">MW</span></div>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 5px 7px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
              <div style="font-size: 9px; color: #9ca3af; text-transform: uppercase;">Sensor Temp (BT4)</div>
              <div style="font-size: 14px; font-weight: 800; color: #ffffff;">${Math.round(detection.brightness)} <span style="font-size: 10px;">K</span></div>
            </div>
          </div>

          <div style="space-y: 4px; color: #d1d5db; font-size: 10px;">
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="color: #9ca3af;">Satellite:</span>
              <span style="font-weight: 700; color: #60a5fa;">${detection.satellite}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="color: #9ca3af;">Instrument:</span>
              <span style="font-weight: 600; color: #e5e7eb;">${detection.instrument} (375m NRT)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="color: #9ca3af;">Detected Time:</span>
              <span style="font-weight: 600; color: #fef08a;">${detection.timestampFormatted}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="color: #9ca3af;">Orbital Pass:</span>
              <span style="font-weight: 600;">${detection.dayNight === 'D' ? '☀️ Daytime Pass' : '🌙 Nighttime Pass'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="color: #9ca3af;">Coordinates:</span>
              <span style="font-family: monospace; color: #93c5fd;">${detection.latitude.toFixed(4)}°, ${detection.longitude.toFixed(4)}°</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="color: #9ca3af;">Confidence:</span>
              <span style="font-weight: 700; color: #34d399;">${detection.confidence.toUpperCase()} (${detection.confidenceScore}%)</span>
            </div>
          </div>

          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 9px; color: #6b7280; text-align: center;">
            Direct Ingestion: NASA FIRMS EOSDIS Near Real-Time Satellite Feed
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });

      marker.on('mouseover', () => {
        setHoveredNasaFire(detection);
      });

      marker.addTo(nasaLiveLayerRef.current!);
    });
  }, [showNasaLive, nasaLiveFires]);

  // Render Risk Grid Zones
  useEffect(() => {
    if (!zonesLayerRef.current) return;
    zonesLayerRef.current.clearLayers();

    if (!showZones) return;

    zones.forEach((zone) => {
      if (filterLevel === 'CRITICAL' && zone.riskLevel !== 'CRITICAL') return;
      if (filterLevel === 'HIGH' && zone.riskLevel !== 'HIGH' && zone.riskLevel !== 'CRITICAL') return;

      const isSelected = selectedZone?.id === zone.id;
      const riskColor = getRiskColor(zone.riskLevel);

      const bounds: L.LatLngBoundsExpression = [
        [zone.bounds.south, zone.bounds.west],
        [zone.bounds.north, zone.bounds.east],
      ];

      const rect = L.rectangle(bounds, {
        color: isSelected ? '#ffffff' : riskColor,
        weight: isSelected ? 2.5 : zone.riskLevel === 'CRITICAL' ? 1.5 : 0.8,
        fillColor: riskColor,
        fillOpacity: isSelected ? 0.85 : zoneOpacity,
      });

      rect.on('click', () => {
        onSelectZone(zone);
      });

      const popupHtml = `
        <div style="font-family: ui-sans-serif, system-ui; min-width: 180px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 6px;">
            <span style="font-weight: 700; color: #ffffff; font-size: 12px;">${zone.id}</span>
            <span style="background: ${riskColor}33; color: ${riskColor}; border: 1px solid ${riskColor}66; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 3px;">
              ${zone.riskLevel} (${zone.riskScore}%)
            </span>
          </div>
          <div style="font-size: 10px; color: #9ca3af; margin-bottom: 6px;">${zone.name}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px; color: #d1d5db;">
            <div>Temp: <span style="color: #fff; font-weight:600;">${zone.weather.temperature}°C</span></div>
            <div>Humidity: <span style="color: #fff; font-weight:600;">${zone.weather.humidity}%</span></div>
            <div>Wind: <span style="color: #fff; font-weight:600;">${zone.weather.windSpeed} km/h</span></div>
            <div>Pop: <span style="color: #fff; font-weight:600;">${zone.population.toLocaleString()}</span></div>
          </div>
        </div>
      `;

      rect.bindPopup(popupHtml, { maxWidth: 220 });
      rect.addTo(zonesLayerRef.current!);
    });
  }, [zones, selectedZone, showZones, filterLevel, zoneOpacity, onSelectZone]);

  // Render Historical Fires
  useEffect(() => {
    if (!firesLayerRef.current) return;
    firesLayerRef.current.clearLayers();

    if (!showFires) return;

    historicalFires.forEach((fire) => {
      const color =
        fire.severity === 'EXTREME'
          ? '#ef4444'
          : fire.severity === 'HIGH'
          ? '#f97316'
          : fire.severity === 'MEDIUM'
          ? '#eab308'
          : '#10b981';

      const marker = L.circleMarker([fire.lat, fire.lng], {
        radius: fire.severity === 'EXTREME' ? 7 : fire.severity === 'HIGH' ? 5 : 4,
        color: color,
        weight: 1,
        fillColor: color,
        fillOpacity: 0.8,
      });

      marker.bindPopup(`
        <div style="font-size: 10px; font-family: ui-sans-serif;">
          <div style="font-weight: 700; color: ${color};">Past Ignition: ${fire.date}</div>
          <div style="color: #bbb;">Cause: ${fire.cause}</div>
          <div style="color: #bbb;">Burn Area: ${fire.areaHectares} ha</div>
        </div>
      `);

      marker.addTo(firesLayerRef.current!);
    });
  }, [historicalFires, showFires]);

  // Render Hotspot DBSCAN Clusters
  useEffect(() => {
    if (!clustersLayerRef.current) return;
    clustersLayerRef.current.clearLayers();

    if (!showClusters) return;

    clusters.forEach((c) => {
      const circle = L.circle([c.centroid.lat, c.centroid.lng], {
        radius: c.radiusKm * 1000,
        color: '#f97316',
        weight: 1.5,
        fillColor: '#ea580c',
        fillOpacity: 0.18,
        dashArray: '4, 4',
      });

      circle.bindPopup(`
        <div style="font-size: 11px; font-family: ui-sans-serif; min-width: 160px;">
          <div style="font-weight: 700; color: #f97316;">${c.name}</div>
          <div style="font-size: 10px; color: #aaa; margin-top: 2px;">DBSCAN Spatial Cluster</div>
          <div style="margin-top: 6px; font-size: 10px; color: #e5e7eb;">
            <div>Historical Fires: <b>${c.fireCount}</b></div>
            <div>Dominant Trigger: <b>${c.dominantCause}</b></div>
            <div>Avg Severity: <b>${c.avgSeverity}</b></div>
          </div>
        </div>
      `);

      circle.addTo(clustersLayerRef.current!);
    });
  }, [clusters, showClusters]);

  // Render Safe Zones
  useEffect(() => {
    if (!safeZonesLayerRef.current) return;
    safeZonesLayerRef.current.clearLayers();

    if (!showSafeZones) return;

    safeZones.forEach((sz) => {
      const icon = L.divIcon({
        className: 'safe-zone-marker',
        html: `<div style="background: #0284c7; color: white; border: 1.5px solid #ffffff; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; box-shadow: 0 0 10px rgba(2, 132, 199, 0.8);">S</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([sz.lat, sz.lng], { icon });
      marker.bindPopup(`
        <div style="font-size: 11px; font-family: ui-sans-serif; min-width: 170px;">
          <div style="font-weight: 700; color: #38bdf8;">${sz.name}</div>
          <div style="font-size: 10px; color: #94a3b8;">${sz.type}</div>
          <div style="margin-top: 6px; font-size: 10px; color: #e2e8f0;">
            <div>Capacity: <b>${sz.capacity.toLocaleString()}</b></div>
            <div>Current Occupancy: <b>${sz.currentOccupancy.toLocaleString()}</b></div>
          </div>
        </div>
      `);
      marker.addTo(safeZonesLayerRef.current!);
    });
  }, [safeZones, showSafeZones]);

  // Render Evacuation Routes
  useEffect(() => {
    if (!routesLayerRef.current) return;
    routesLayerRef.current.clearLayers();

    if (!showRoutes || !evacuationPlan) return;

    evacuationPlan.evacuationRoutes.forEach((route) => {
      const color =
        route.status === 'CLEAR'
          ? '#10b981'
          : route.status === 'CAUTION'
          ? '#f59e0b'
          : route.status === 'CONGESTED'
          ? '#f97316'
          : '#ef4444';

      const polyline = L.polyline(route.path, {
        color: color,
        weight: 3,
        opacity: 0.85,
        dashArray: '6, 6',
      });

      polyline.bindPopup(`
        <div style="font-size: 10px; font-family: ui-sans-serif;">
          <div style="font-weight: 700; color: ${color};">${route.name}</div>
          <div>Status: <b>${route.status}</b></div>
          <div>Est. Time: <b>${route.estimatedTravelTimeMinutes} mins</b></div>
        </div>
      `);

      polyline.addTo(routesLayerRef.current!);
    });
  }, [evacuationPlan, showRoutes]);

  // Reset view button handler
  const handleResetView = () => {
    if (!mapInstanceRef.current || !region) return;
    mapInstanceRef.current.setView([region.center.lat, region.center.lng], region.defaultZoom, {
      animate: true,
    });
  };

  // Zoom to live fire cluster
  const handleZoomToLiveFires = () => {
    if (!mapInstanceRef.current || !nasaLiveFires.length) return;
    const group = L.featureGroup(
      nasaLiveFires.map((d) => L.marker([d.latitude, detectionLng(d)]))
    );
    mapInstanceRef.current.fitBounds(group.getBounds().pad(0.2), { animate: true });
  };

  const detectionLng = (d: NasaFireDetection) => d.longitude;

  return (
    <div className="relative isolate w-full h-full bg-[#0a0a0a] overflow-hidden rounded-xl border border-white/10 shadow-2xl">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Left NASA Live Telemetry Stream Indicator HUD */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-[#0a0a0a]/90 backdrop-blur-md px-3.5 py-2.5 rounded-lg border border-red-500/30 shadow-2xl flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 satellite-live-dot" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-white uppercase">
                <Satellite className="w-3.5 h-3.5 text-red-400" />
                <span>NASA FIRMS Live Telemetry</span>
                <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/40 px-1.5 py-0.2 rounded font-mono">
                  375m NRT
                </span>
              </div>
              <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                <span>Active Detections: <b className="text-red-400">{nasaLiveFires.length}</b></span>
                <span>•</span>
                <span>Max FRP: <b className="text-amber-400">{nasaStats?.maxFrp || 0} MW</b></span>
                <span>•</span>
                <span>Key: <span className="text-emerald-400 font-mono">7535...4169</span></span>
              </div>
            </div>
          </div>

          <button
            onClick={onRefreshNasa}
            disabled={isNasaLoading}
            className="p-1.5 bg-white/5 hover:bg-white/15 text-gray-200 hover:text-white rounded-md border border-white/10 transition-all disabled:opacity-50"
            title="Poll NASA Satellites Now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isNasaLoading ? 'animate-spin text-red-400' : ''}`} />
          </button>
        </div>

        {/* Quick Basemap Selector Chips */}
        <div className="bg-[#0a0a0a]/85 backdrop-blur-md p-1 rounded-lg border border-white/10 shadow-lg flex items-center gap-1 text-[10px]">
          <span className="text-gray-500 font-bold px-2 py-0.5 uppercase tracking-wider text-[9px]">Basemap:</span>
          <button
            onClick={() => setSelectedBasemap('dark')}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
              selectedBasemap === 'dark'
                ? 'bg-white/20 text-white font-bold border border-white/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Moon className="w-3 h-3" />
            <span>Dark Grid</span>
          </button>

          <button
            onClick={() => setSelectedBasemap('satellite')}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
              selectedBasemap === 'satellite'
                ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-400/50'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Satellite className="w-3 h-3 text-emerald-400" />
            <span>Satellite</span>
          </button>

          <button
            onClick={() => setSelectedBasemap('nasa-gibs')}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
              selectedBasemap === 'nasa-gibs'
                ? 'bg-blue-500/30 text-blue-300 font-bold border border-blue-400/50'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-3 h-3 text-blue-400" />
            <span>NASA True-Color</span>
          </button>

          <button
            onClick={() => setSelectedBasemap('nasa-night')}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
              selectedBasemap === 'nasa-night'
                ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-400/50'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>NASA Night Lights</span>
          </button>
        </div>
      </div>

      {/* Top Right Controls & Layer Management */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        {/* Navigation / Tool Buttons */}
        <div className="flex bg-[#0a0a0a]/90 backdrop-blur p-1 rounded-lg border border-white/10 shadow-xl space-x-1">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-200 rounded text-xs transition-all font-bold"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-200 rounded text-xs transition-all font-bold"
            title="Zoom Out"
          >
            -
          </button>
          <button
            onClick={handleResetView}
            className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-200 rounded text-xs transition-all"
            title="Reset Map to Regional Center"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          {nasaLiveFires.length > 0 && (
            <button
              onClick={handleZoomToLiveFires}
              className="w-7 h-7 flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-xs transition-all border border-red-500/40"
              title="Zoom to NASA Hotspots"
            >
              <Flame className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-all ${
              showLayerMenu ? 'bg-white text-black font-bold' : 'bg-white/5 hover:bg-white/10 text-gray-200'
            }`}
            title="Toggle Layers Menu"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expandable Sleek Layers Selector */}
        {showLayerMenu && (
          <div className="bg-[#0a0a0a]/95 backdrop-blur border border-white/10 rounded-lg p-3 shadow-2xl text-[11px] text-gray-300 min-w-[210px] space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-white/10 pb-1 flex items-center justify-between">
              <span>NASA & GIS Layers</span>
              <span className="text-red-400 font-mono text-[9px]">LIVE</span>
            </p>

            {/* NASA FIRMS Live Points */}
            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={showNasaLive}
                onChange={(e) => setShowNasaLive(e.target.checked)}
                className="rounded accent-red-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 text-red-300 font-bold">
                <Satellite className="w-3 h-3 text-red-400" />
                NASA Hotspots ({nasaLiveFires.length})
              </span>
            </label>

            {/* NASA FIRMS WMS Overlay */}
            <div className="space-y-1 pl-4 border-l border-red-500/30">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showNasaWms}
                  onChange={(e) => setShowNasaWms(e.target.checked)}
                  className="rounded accent-orange-500 cursor-pointer"
                />
                <span className="text-orange-300 font-medium">NASA WMS Fire Tiles</span>
              </label>

              {showNasaWms && (
                <div className="flex gap-1 pt-1">
                  <button
                    onClick={() => setWmsLayerType('fires_viirs_24')}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                      wmsLayerType === 'fires_viirs_24'
                        ? 'bg-orange-500 text-white font-bold'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    VIIRS 24h
                  </button>
                  <button
                    onClick={() => setWmsLayerType('fires_viirs_72')}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                      wmsLayerType === 'fires_viirs_72'
                        ? 'bg-orange-500 text-white font-bold'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    VIIRS 72h
                  </button>
                  <button
                    onClick={() => setWmsLayerType('fires_modis_24')}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                      wmsLayerType === 'fires_modis_24'
                        ? 'bg-orange-500 text-white font-bold'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    MODIS
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-1 space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showZones}
                  onChange={(e) => setShowZones(e.target.checked)}
                  className="rounded accent-red-500 cursor-pointer"
                />
                <span>AI Wildfire Risk Grid ({zones.length})</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showClusters}
                  onChange={(e) => setShowClusters(e.target.checked)}
                  className="rounded accent-orange-500 cursor-pointer"
                />
                <span>DBSCAN Hotspot Clusters ({clusters.length})</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showSafeZones}
                  onChange={(e) => setShowSafeZones(e.target.checked)}
                  className="rounded accent-sky-500 cursor-pointer"
                />
                <span>Safe Zones & Relinquish Havens</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showRoutes}
                  onChange={(e) => setShowRoutes(e.target.checked)}
                  className="rounded accent-emerald-500 cursor-pointer"
                />
                <span>Evacuation Corridors</span>
              </label>
            </div>

            <div className="pt-2 border-t border-white/5">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Risk Grid Opacity</span>
                <span>{Math.round(zoneOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={zoneOpacity}
                onChange={(e) => setZoneOpacity(parseFloat(e.target.value))}
                className="w-full accent-white h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Left NASA Satellite & Grid Telemetry */}
      <div className="absolute bottom-4 left-4 z-20 bg-[#0a0a0a]/90 backdrop-blur-md p-3 rounded-lg border border-white/10 text-[10px] font-mono text-gray-300 shadow-2xl space-y-1 min-w-[210px]">
        <div className="flex items-center justify-between text-gray-400 font-bold border-b border-white/10 pb-1 mb-1">
          <span className="flex items-center gap-1 text-white">
            <Radio className="w-3 h-3 text-red-400 animate-pulse" /> SATELLITE TELEMETRY
          </span>
          <span className="text-[9px] text-emerald-400">ONLINE</span>
        </div>
        <p>
          ACTIVE REGION:{' '}
          <span className="text-white font-bold">{region ? region.name : 'Nagpur & Vidarbha'}</span>
        </p>
        <p>
          COORDINATES:{' '}
          <span className="text-blue-300">
            {selectedZone
              ? `${selectedZone.centroid.lat.toFixed(4)}°N, ${selectedZone.centroid.lng.toFixed(4)}°E`
              : `${region?.center.lat || 21.1458}°N, ${region?.center.lng || 79.0882}°E`}
          </span>
        </p>
        <p>
          FIRMS DETECTIONS:{' '}
          <span className="text-red-400 font-bold">
            {nasaLiveFires.length > 0 ? `${nasaLiveFires.length} Thermal Hotspots` : 'Scanning swath...'}
          </span>
        </p>
        <p>
          ORBITAL SENSORS:{' '}
          <span className="text-yellow-300">VIIRS (SNPP/N20) + MODIS</span>
        </p>
      </div>

      {/* Bottom Right Legend Pill with NASA Hotspot Indicator */}
      <div className="absolute bottom-4 right-4 z-20 bg-[#0a0a0a]/90 backdrop-blur-md px-3.5 py-2 rounded-lg border border-white/10 text-[10px] text-gray-300 flex items-center gap-4 shadow-xl">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
          <span className="font-semibold text-white">NASA Hotspot</span>
        </div>
        <div className="h-3 w-px bg-white/20" />
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Low</span>
        </div>
      </div>
    </div>
  );
};
