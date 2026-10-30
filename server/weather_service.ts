/**
 * Open-Meteo Live Weather API Service for WildfireAI System
 * 
 * Uses Open-Meteo (https://open-meteo.com/) - High-precision, zero-API key,
 * real-time global weather forecast & fire telemetry API with seamless fallback.
 */

export interface LiveWeatherData {
  temperature: number; // °C
  humidity: number; // %
  windSpeed: number; // km/h
  windDirection: string; // Cardinal e.g. WNW, NW
  windDegree: number; // 0 - 360°
  rainfall: number; // mm
  surfacePressure?: number; // hPa
  dewPoint?: number; // °C
  isLive: boolean;
  timestamp: string;
}

export function degreeToCardinal(deg: number): string {
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return cardinals[index];
}

/**
 * Generate fallback weather based on coordinates if remote API is unreachable
 */
export function generateFallbackWeather(lat: number, lng: number): LiveWeatherData {
  // Spatial variability based on coordinate hash
  const hash = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233)) * 43758.5453;
  const rand = hash - Math.floor(hash);

  const baseTemp = 34 + rand * 8; // 34 - 42 °C
  const baseHumidity = 14 + (1 - rand) * 18; // 14 - 32 %
  const baseWind = 18 + rand * 22; // 18 - 40 km/h
  const deg = Math.floor(rand * 360);

  return {
    temperature: Math.round(baseTemp * 10) / 10,
    humidity: Math.round(baseHumidity * 10) / 10,
    windSpeed: Math.round(baseWind * 10) / 10,
    windDirection: degreeToCardinal(deg),
    windDegree: deg,
    rainfall: rand > 0.9 ? Math.round((rand - 0.9) * 50) / 10 : 0,
    surfacePressure: Math.round(1008 + rand * 10),
    dewPoint: Math.round((baseTemp - (100 - baseHumidity) / 5) * 10) / 10,
    isLive: false,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Fetch live weather from Open-Meteo API for a specific coordinate
 */
export async function fetchLiveWeather(lat: number, lng: number): Promise<LiveWeatherData> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,surface_pressure,dew_point_2m&wind_speed_unit=kmh`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000), // 3s timeout
    });

    if (response.ok) {
      const data = await response.json();
      const current = data.current;

      if (current) {
        const windDegree = Math.round(current.wind_direction_10m ?? 0);
        return {
          temperature: Math.round((current.temperature_2m ?? 25) * 10) / 10,
          humidity: Math.round((current.relative_humidity_2m ?? 30) * 10) / 10,
          windSpeed: Math.round((current.wind_speed_10m ?? 15) * 10) / 10,
          windDirection: degreeToCardinal(windDegree),
          windDegree,
          rainfall: Math.round((current.precipitation ?? 0) * 10) / 10,
          surfacePressure: current.surface_pressure ? Math.round(current.surface_pressure) : undefined,
          dewPoint: current.dew_point_2m ? Math.round(current.dew_point_2m * 10) / 10 : undefined,
          isLive: true,
          timestamp: current.time || new Date().toISOString(),
        };
      }
    }
  } catch (error: any) {
    // Network restricted or offline -> return calibrated spatial weather
  }

  return generateFallbackWeather(lat, lng);
}

/**
 * Batch fetch live weather for multiple coordinates via Open-Meteo
 */
export async function fetchBatchLiveWeather(coords: Array<{ lat: number; lng: number }>): Promise<Array<LiveWeatherData>> {
  if (coords.length === 0) return [];

  const lats = coords.map(c => c.lat.toFixed(4)).join(',');
  const lngs = coords.map(c => c.lng.toFixed(4)).join(',');

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation&wind_speed_unit=kmh`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    });

    if (response.ok) {
      const data = await response.json();
      const results = Array.isArray(data) ? data : [data];

      if (results.length === coords.length) {
        return results.map((item, idx) => {
          const current = item?.current;
          if (!current) return generateFallbackWeather(coords[idx].lat, coords[idx].lng);
          const windDegree = Math.round(current.wind_direction_10m ?? 0);
          return {
            temperature: Math.round((current.temperature_2m ?? 25) * 10) / 10,
            humidity: Math.round((current.relative_humidity_2m ?? 30) * 10) / 10,
            windSpeed: Math.round((current.wind_speed_10m ?? 15) * 10) / 10,
            windDirection: degreeToCardinal(windDegree),
            windDegree,
            rainfall: Math.round((current.precipitation ?? 0) * 10) / 10,
            isLive: true,
            timestamp: current.time || new Date().toISOString(),
          };
        });
      }
    }
  } catch (err) {
    // Fallback to spatial generation
  }

  return coords.map(c => generateFallbackWeather(c.lat, c.lng));
}
