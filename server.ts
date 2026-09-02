import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper: Check if string is valid GPS coordinate pair
function parseGpsCoordinates(input: string): { lat: number; lng: number } | null {
  const trimmed = input.trim();
  const gpsRegex = /^([-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)),\s*([-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?))$/;
  const match = trimmed.match(gpsRegex);
  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[5]);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng };
}

// 1. GEOCODING API
app.get('/api/geocode', async (req: Request, res: Response): Promise<void> => {
  try {
    const query = (req.query.q as string || '').trim();
    if (!query) {
      res.status(400).json({ error: 'QUERY_REQUIRED', message: 'Location query cannot be empty.' });
      return;
    }

    // Check if input is a direct GPS coordinate pair
    const coords = parseGpsCoordinates(query);
    if (coords) {
      // Reverse geocode to get human-readable location name
      let resolvedName = `Coordinates (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
      let country = '';
      let admin1 = '';

      try {
        const revRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=10&addressdetails=1`,
          { headers: { 'User-Agent': 'NimbusWeatherApp/1.0' } }
        );
        if (revRes.ok) {
          const revData = await revRes.json();
          if (revData && revData.display_name) {
            resolvedName = revData.name || revData.display_name.split(',')[0] || resolvedName;
            country = revData.address?.country || '';
            admin1 = revData.address?.state || revData.address?.region || '';
          }
        }
      } catch {
        // Fallback to coordinate string
      }

      res.json({
        exactMatch: {
          name: resolvedName,
          formattedName: `${resolvedName}${admin1 ? ', ' + admin1 : ''}${country ? ', ' + country : ''}`,
          latitude: coords.lat,
          longitude: coords.lng,
          country,
          admin1,
          timezone: 'auto'
        },
        suggestions: []
      });
      return;
    }

    // Try Google Geocoding API if key exists (great for landmarks and postal codes)
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    if (googleKey) {
      try {
        const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleKey}`);
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.status === 'OK' && gData.results && gData.results.length > 0) {
            const first = gData.results[0];
            const lat = first.geometry.location.lat;
            const lng = first.geometry.location.lng;
            const formatted = first.formatted_address;
            
            const suggestions = gData.results.slice(1, 5).map((r: any) => ({
              name: r.formatted_address.split(',')[0],
              displayText: r.formatted_address,
              latitude: r.geometry.location.lat,
              longitude: r.geometry.location.lng,
            }));

            res.json({
              exactMatch: {
                name: formatted.split(',')[0],
                formattedName: formatted,
                latitude: lat,
                longitude: lng,
                timezone: 'auto'
              },
              suggestions
            });
            return;
          }
        }
      } catch (err) {
        console.warn('Google Geocoding fallback to Open-Meteo:', err);
      }
    }

    // Use Open-Meteo Geocoding API (Fast, Free, No key needed)
    const openMeteoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
    const omRes = await fetch(openMeteoUrl);
    
    if (!omRes.ok) {
      res.status(502).json({
        error: 'GEOCODING_SERVICE_ERROR',
        message: 'Unable to reach the geocoding service. Please try again in a moment.'
      });
      return;
    }

    const omData = await omRes.json();
    const results = omData.results || [];

    if (results.length === 0) {
      // Return specific error message requested in requirements
      res.status(404).json({
        error: 'LOCATION_NOT_FOUND',
        message: "We couldn't find that location — try a nearby city or check the spelling",
        suggestions: []
      });
      return;
    }

    const first = results[0];
    const formatLocationName = (r: any) => {
      const parts = [r.name];
      if (r.admin1) parts.push(r.admin1);
      if (r.country) parts.push(r.country);
      return parts.join(', ');
    };

    const exactMatch = {
      name: first.name,
      formattedName: formatLocationName(first),
      latitude: first.latitude,
      longitude: first.longitude,
      country: first.country,
      admin1: first.admin1,
      postcode: first.postcodes?.[0] || '',
      timezone: first.timezone || 'auto',
      elevation: first.elevation
    };

    const suggestions = results.slice(1, 6).map((r: any) => ({
      name: r.name,
      admin1: r.admin1,
      country: r.country,
      latitude: r.latitude,
      longitude: r.longitude,
      displayText: formatLocationName(r)
    }));

    res.json({ exactMatch, suggestions });
  } catch (error: any) {
    console.error('Geocode error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An error occurred while resolving the location.',
      details: error.message
    });
  }
});

// 2. REVERSE GEOCODING (For "Use my location")
app.get('/api/reverse-geocode', async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      res.status(400).json({ error: 'INVALID_COORDINATES', message: 'Valid latitude and longitude are required.' });
      return;
    }

    let placeName = `Current Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
    let country = '';
    let admin1 = '';

    try {
      const revRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1`,
        { headers: { 'User-Agent': 'NimbusWeatherApp/1.0' } }
      );
      if (revRes.ok) {
        const data = await revRes.json();
        if (data && data.address) {
          const addr = data.address;
          const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || 'Current Location';
          country = addr.country || '';
          admin1 = addr.state || addr.region || '';
          placeName = city;
        }
      }
    } catch {
      // Ignore fallback
    }

    const formatted = [placeName, admin1, country].filter(Boolean).join(', ');

    res.json({
      name: placeName,
      formattedName: formatted || placeName,
      latitude: lat,
      longitude: lon,
      country,
      admin1,
      timezone: 'auto'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'REVERSE_GEOCODE_FAILED', message: err.message });
  }
});

// 3. CURRENT WEATHER + 5-DAY & 7-DAY FORECAST
app.get('/api/weather/current-forecast', async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      res.status(400).json({ error: 'INVALID_COORDINATES', message: 'Valid latitude and longitude are required.' });
      return;
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,is_day&timezone=auto&forecast_days=7`;

    const weatherRes = await fetch(url);
    if (!weatherRes.ok) {
      res.status(502).json({
        error: 'WEATHER_API_ERROR',
        message: 'Could not retrieve forecast from Open-Meteo. Please click retry.'
      });
      return;
    }

    const data = await weatherRes.json();
    const curr = data.current;
    const daily = data.daily;
    const hourly = data.hourly;

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Map daily data
    const formattedDaily = (daily?.time || []).map((dateStr: string, idx: number) => {
      const d = new Date(dateStr + 'T12:00:00Z');
      const dayName = idx === 0 ? 'Today' : (idx === 1 ? 'Tomorrow' : daysOfWeek[d.getUTCDay()]);

      return {
        date: dateStr,
        dayName,
        maxTemp: Math.round(daily.temperature_2m_max?.[idx] ?? 0),
        minTemp: Math.round(daily.temperature_2m_min?.[idx] ?? 0),
        weatherCode: daily.weather_code?.[idx] ?? 0,
        precipitationSum: daily.precipitation_sum?.[idx] ?? 0,
        precipitationProbability: daily.precipitation_probability_max?.[idx] ?? 0,
        windSpeedMax: Math.round(daily.wind_speed_10m_max?.[idx] ?? 0),
        uvIndexMax: daily.uv_index_max?.[idx] ?? 0,
        sunrise: daily.sunrise?.[idx] ? new Date(daily.sunrise[idx]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
        sunset: daily.sunset?.[idx] ? new Date(daily.sunset[idx]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'
      };
    });

    // Map hourly data for next 24 hours
    const currentHourIndex = hourly?.time ? Math.max(0, hourly.time.findIndex((t: string) => new Date(t) >= new Date(Date.now() - 3600000))) : 0;
    const formattedHourly = (hourly?.time || []).slice(currentHourIndex, currentHourIndex + 24).map((timeStr: string, idx: number) => {
      const actualIdx = currentHourIndex + idx;
      const d = new Date(timeStr);
      return {
        time: d.toLocaleTimeString([], { hour: 'numeric' }),
        temperature: Math.round(hourly.temperature_2m?.[actualIdx] ?? 0),
        apparentTemperature: Math.round(hourly.apparent_temperature?.[actualIdx] ?? 0),
        weatherCode: hourly.weather_code?.[actualIdx] ?? 0,
        precipitationProbability: hourly.precipitation_probability?.[actualIdx] ?? 0,
        isDay: hourly.is_day?.[actualIdx] === 1
      };
    });

    res.json({
      current: {
        temperature: Math.round(curr.temperature_2m),
        apparentTemperature: Math.round(curr.apparent_temperature),
        weatherCode: curr.weather_code,
        humidity: curr.relative_humidity_2m,
        windSpeed: Math.round(curr.wind_speed_10m),
        windDirection: curr.wind_direction_10m,
        surfacePressure: Math.round(curr.surface_pressure),
        precipitation: curr.precipitation,
        isDay: curr.is_day === 1,
        sunrise: formattedDaily[0]?.sunrise || '--:--',
        sunset: formattedDaily[0]?.sunset || '--:--',
        updatedAt: new Date().toISOString()
      },
      daily: formattedDaily,
      hourly: formattedHourly,
      timezone: data.timezone || 'auto'
    });
  } catch (error: any) {
    console.error('Weather forecast API error:', error);
    res.status(500).json({
      error: 'WEATHER_FETCH_FAILED',
      message: 'Failed to fetch weather data. Please click retry.'
    });
  }
});

// 4. RANGE WEATHER (Historical + Forecast combined, capped at 30 days)
app.get('/api/weather/range', async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const startDate = (req.query.startDate as string || '').trim();
    const endDate = (req.query.endDate as string || '').trim();

    if (isNaN(lat) || isNaN(lon)) {
      res.status(400).json({ error: 'INVALID_COORDINATES', message: 'Valid coordinates required.' });
      return;
    }

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'DATES_REQUIRED', message: 'Start date and end date are both required.' });
      return;
    }

    const startObj = new Date(startDate + 'T00:00:00Z');
    const endObj = new Date(endDate + 'T00:00:00Z');

    if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
      res.status(400).json({ error: 'INVALID_DATE_FORMAT', message: 'Dates must be valid YYYY-MM-DD format.' });
      return;
    }

    if (endObj < startObj) {
      res.status(400).json({ error: 'INVALID_DATE_ORDER', message: 'End date cannot be before the start date.' });
      return;
    }

    const diffDays = Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 30) {
      res.status(400).json({
        error: 'RANGE_EXCEEDED',
        message: `Requested date range is ${diffDays} days. The maximum supported range is 30 days.`
      });
      return;
    }

    // Today in UTC
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const forecastLimitDate = new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000);
    const forecastLimitStr = forecastLimitDate.toISOString().slice(0, 10);
    const historicalThreshold = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const daysMap = new Map<string, any>();
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Generate list of all dates in range
    const currentDate = new Date(startObj);
    while (currentDate <= endObj) {
      const dStr = currentDate.toISOString().slice(0, 10);
      const dayName = daysOfWeek[currentDate.getUTCDay()];
      daysMap.set(dStr, {
        date: dStr,
        dayName,
        source: 'forecast',
        maxTemp: null,
        minTemp: null,
        meanTemp: null,
        weatherCode: 0,
        precipitation: 0,
        windSpeedMax: 0
      });
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    // Partition dates into historical, forecast, and unsupported future
    let minHistDate: string | null = null;
    let maxHistDate: string | null = null;
    let minFcDate: string | null = null;
    let maxFcDate: string | null = null;

    let hasHistorical = false;
    let hasForecast = false;
    let hasUnsupportedFuture = false;

    for (const [dStr, item] of daysMap.entries()) {
      if (dStr < historicalThreshold) {
        item.source = 'historical';
        hasHistorical = true;
        if (!minHistDate || dStr < minHistDate) minHistDate = dStr;
        if (!maxHistDate || dStr > maxHistDate) maxHistDate = dStr;
      } else if (dStr <= forecastLimitStr) {
        item.source = 'forecast';
        hasForecast = true;
        if (!minFcDate || dStr < minFcDate) minFcDate = dStr;
        if (!maxFcDate || dStr > maxFcDate) maxFcDate = dStr;
      } else {
        item.source = 'unsupported_future';
        item.note = 'Beyond Open-Meteo 16-day forecast horizon (unpredictable atmospheric future)';
        hasUnsupportedFuture = true;
      }
    }

    // Fetch historical data if needed
    if (hasHistorical && minHistDate && maxHistDate) {
      try {
        const histUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${minHistDate}&end_date=${maxHistDate}&daily=weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max&timezone=auto`;
        const hRes = await fetch(histUrl);
        if (hRes.ok) {
          const hData = await hRes.json();
          const dTimes = hData.daily?.time || [];
          for (let i = 0; i < dTimes.length; i++) {
            const d = dTimes[i];
            if (daysMap.has(d)) {
              const obj = daysMap.get(d);
              obj.maxTemp = hData.daily.temperature_2m_max?.[i] != null ? Math.round(hData.daily.temperature_2m_max[i]) : null;
              obj.minTemp = hData.daily.temperature_2m_min?.[i] != null ? Math.round(hData.daily.temperature_2m_min[i]) : null;
              obj.meanTemp = hData.daily.temperature_2m_mean?.[i] != null ? Math.round(hData.daily.temperature_2m_mean[i]) : null;
              obj.weatherCode = hData.daily.weather_code?.[i] ?? 0;
              obj.precipitation = hData.daily.precipitation_sum?.[i] ?? 0;
              obj.windSpeedMax = hData.daily.wind_speed_10m_max?.[i] != null ? Math.round(hData.daily.wind_speed_10m_max[i]) : 0;
            }
          }
        }
      } catch (e) {
        console.warn('Historical archive fetch error:', e);
      }
    }

    // Fetch forecast data if needed
    if (hasForecast && minFcDate && maxFcDate) {
      try {
        const fcUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${minFcDate}&end_date=${maxFcDate}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto`;
        const fRes = await fetch(fcUrl);
        if (fRes.ok) {
          const fData = await fRes.json();
          const dTimes = fData.daily?.time || [];
          for (let i = 0; i < dTimes.length; i++) {
            const d = dTimes[i];
            if (daysMap.has(d)) {
              const obj = daysMap.get(d);
              obj.maxTemp = fData.daily.temperature_2m_max?.[i] != null ? Math.round(fData.daily.temperature_2m_max[i]) : null;
              obj.minTemp = fData.daily.temperature_2m_min?.[i] != null ? Math.round(fData.daily.temperature_2m_min[i]) : null;
              obj.meanTemp = obj.maxTemp != null && obj.minTemp != null ? Math.round((obj.maxTemp + obj.minTemp) / 2) : null;
              obj.weatherCode = fData.daily.weather_code?.[i] ?? 0;
              obj.precipitation = fData.daily.precipitation_sum?.[i] ?? 0;
              obj.windSpeedMax = fData.daily.wind_speed_10m_max?.[i] != null ? Math.round(fData.daily.wind_speed_10m_max[i]) : 0;
            }
          }
        }
      } catch (e) {
        console.warn('Forecast fetch error:', e);
      }
    }

    const dailyList = Array.from(daysMap.values());

    // Compute summary stats
    let totalMax = 0;
    let totalMin = 0;
    let countMax = 0;
    let countMin = 0;
    let maxRecorded = -999;
    let minRecorded = 999;
    let totalPrecip = 0;
    const conditionCounts: Record<string, number> = {};

    for (const d of dailyList) {
      if (d.maxTemp != null) {
        totalMax += d.maxTemp;
        countMax++;
        if (d.maxTemp > maxRecorded) maxRecorded = d.maxTemp;
      }
      if (d.minTemp != null) {
        totalMin += d.minTemp;
        countMin++;
        if (d.minTemp < minRecorded) minRecorded = d.minTemp;
      }
      if (d.precipitation != null) {
        totalPrecip += d.precipitation;
      }
      const code = d.weatherCode ?? 0;
      conditionCounts[code] = (conditionCounts[code] || 0) + 1;
    }

    const avgMax = countMax > 0 ? Math.round(totalMax / countMax) : 0;
    const avgMin = countMin > 0 ? Math.round(totalMin / countMin) : 0;
    const avgMean = Math.round((avgMax + avgMin) / 2);

    res.json({
      startDate,
      endDate,
      totalDays: dailyList.length,
      daily: dailyList,
      summary: {
        avgMaxTemp: avgMax,
        avgMinTemp: avgMin,
        avgMeanTemp: avgMean,
        maxRecordedTemp: maxRecorded !== -999 ? maxRecorded : avgMax,
        minRecordedTemp: minRecorded !== 999 ? minRecorded : avgMin,
        totalPrecipitation: Math.round(totalPrecip * 10) / 10,
        dominantCondition: 'Variable Conditions',
        hasHistorical,
        hasForecast,
        hasUnsupportedFuture
      }
    });
  } catch (error: any) {
    console.error('Range weather error:', error);
    res.status(500).json({ error: 'RANGE_WEATHER_ERROR', message: error.message });
  }
});

// 5. BONUS MEDIA INTEGRATION (Google Maps Embed, YouTube search API, Unsplash photo)
app.get('/api/bonus/media', async (req: Request, res: Response): Promise<void> => {
  try {
    const location = (req.query.location as string || 'New York').trim();
    const lat = parseFloat(req.query.lat as string) || 40.7128;
    const lon = parseFloat(req.query.lon as string) || -74.0060;

    // 1. Google Maps Embed URL (or OSM fallback)
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    const mapEmbedUrl = googleKey
      ? `https://www.google.com/maps/embed/v1/place?key=${googleKey}&q=${encodeURIComponent(location)}&center=${lat},${lon}&zoom=11`
      : `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.08}%2C${lat - 0.08}%2C${lon + 0.08}%2C${lat + 0.08}&layer=mapnik&marker=${lat}%2C${lon}`;

    // 2. YouTube Search Videos
    let videos: any[] = [];
    const ytKey = process.env.YOUTUBE_API_KEY;
    if (ytKey) {
      try {
        const ytRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(location + ' travel walking weather atmosphere')}&type=video&maxResults=4&key=${ytKey}`
        );
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          if (ytData.items) {
            videos = ytData.items.map((item: any) => ({
              id: item.id?.videoId || item.id,
              title: item.snippet?.title || 'Location Video',
              thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
              channelTitle: item.snippet?.channelTitle || 'Travel Channel',
              videoUrl: `https://www.youtube.com/watch?v=${item.id?.videoId}`
            }));
          }
        }
      } catch (err) {
        console.warn('YouTube API error:', err);
      }
    }

    // Fallback curated video references if key not set
    if (videos.length === 0) {
      videos = [
        {
          id: 'v1',
          title: `Exploring ${location}: Scenic Walking Tour & Atmosphere`,
          thumbnail: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=600&auto=format&fit=crop&q=80',
          channelTitle: 'Atmospheric Journeys',
          videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(location + ' weather landscape tour')}`
        },
        {
          id: 'v2',
          title: `${location} Weather & Climate Highlights`,
          thumbnail: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80',
          channelTitle: 'Global Meteorological Watch',
          videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(location + ' aerial drone')}`
        }
      ];
    }

    // 3. Unsplash Photo
    let photo: any = null;
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashKey) {
      try {
        const uRes = await fetch(
          `https://api.unsplash.com/photos/random?query=${encodeURIComponent(location + ' cityscape landscape')}&orientation=landscape&client_id=${unsplashKey}`
        );
        if (uRes.ok) {
          const uData = await uRes.json();
          photo = {
            imageUrl: uData.urls?.regular || uData.urls?.small,
            photographerName: uData.user?.name || 'Unsplash Creator',
            photographerUrl: uData.user?.links?.html,
            description: uData.alt_description || uData.description || `View of ${location}`
          };
        }
      } catch (err) {
        console.warn('Unsplash API error:', err);
      }
    }

    // Dynamic Unsplash curated fallback image
    if (!photo) {
      photo = {
        imageUrl: `https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80`,
        photographerName: 'Unsplash Atmospheric Collection',
        photographerUrl: 'https://unsplash.com',
        description: `Atmospheric panorama around ${location}`
      };
    }

    res.json({
      mapEmbedUrl,
      videos,
      photo
    });
  } catch (error: any) {
    res.status(500).json({ error: 'BONUS_MEDIA_ERROR', message: error.message });
  }
});

// Vite Middleware for Full Stack React
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nimbus Weather server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
