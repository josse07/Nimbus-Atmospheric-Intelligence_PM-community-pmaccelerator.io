export interface WeatherInterpretation {
  code: number;
  label: string;
  category: 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunderstorm';
  icon: string;
  bgGradient: string;
}

export const WMO_CODE_MAP: Record<number, WeatherInterpretation> = {
  0: { code: 0, label: 'Clear sky', category: 'clear', icon: 'Sun', bgGradient: 'from-amber-500/20 via-sky-500/10 to-slate-900' },
  1: { code: 1, label: 'Mainly clear', category: 'clear', icon: 'SunMedium', bgGradient: 'from-amber-400/20 via-sky-500/10 to-slate-900' },
  2: { code: 2, label: 'Partly cloudy', category: 'cloudy', icon: 'CloudSun', bgGradient: 'from-sky-500/20 via-slate-700/20 to-slate-900' },
  3: { code: 3, label: 'Overcast', category: 'cloudy', icon: 'Cloud', bgGradient: 'from-slate-600/30 via-slate-800/20 to-slate-900' },
  45: { code: 45, label: 'Foggy', category: 'fog', icon: 'CloudFog', bgGradient: 'from-slate-500/20 via-zinc-700/20 to-slate-900' },
  48: { code: 48, label: 'Depositing rime fog', category: 'fog', icon: 'CloudFog', bgGradient: 'from-slate-500/20 via-zinc-700/20 to-slate-900' },
  51: { code: 51, label: 'Light drizzle', category: 'drizzle', icon: 'CloudDrizzle', bgGradient: 'from-cyan-600/20 via-sky-800/20 to-slate-900' },
  53: { code: 53, label: 'Moderate drizzle', category: 'drizzle', icon: 'CloudDrizzle', bgGradient: 'from-cyan-600/20 via-sky-800/20 to-slate-900' },
  55: { code: 55, label: 'Dense drizzle', category: 'drizzle', icon: 'CloudRain', bgGradient: 'from-blue-600/20 via-indigo-900/20 to-slate-900' },
  56: { code: 56, label: 'Light freezing drizzle', category: 'drizzle', icon: 'CloudSnow', bgGradient: 'from-indigo-400/20 via-slate-800/20 to-slate-900' },
  57: { code: 57, label: 'Dense freezing drizzle', category: 'drizzle', icon: 'CloudSnow', bgGradient: 'from-indigo-400/20 via-slate-800/20 to-slate-900' },
  61: { code: 61, label: 'Slight rain', category: 'rain', icon: 'CloudRain', bgGradient: 'from-blue-500/20 via-sky-900/20 to-slate-900' },
  63: { code: 63, label: 'Moderate rain', category: 'rain', icon: 'CloudRain', bgGradient: 'from-blue-600/20 via-indigo-950/30 to-slate-900' },
  65: { code: 65, label: 'Heavy rain', category: 'rain', icon: 'CloudRain', bgGradient: 'from-indigo-600/20 via-blue-950/40 to-slate-900' },
  66: { code: 66, label: 'Light freezing rain', category: 'rain', icon: 'CloudSnow', bgGradient: 'from-cyan-700/20 via-slate-900 to-slate-950' },
  67: { code: 67, label: 'Heavy freezing rain', category: 'rain', icon: 'CloudSnow', bgGradient: 'from-cyan-700/20 via-slate-900 to-slate-950' },
  71: { code: 71, label: 'Slight snow fall', category: 'snow', icon: 'Snowflake', bgGradient: 'from-sky-300/20 via-slate-800/20 to-slate-900' },
  73: { code: 73, label: 'Moderate snow fall', category: 'snow', icon: 'Snowflake', bgGradient: 'from-sky-200/20 via-slate-800/20 to-slate-900' },
  75: { code: 75, label: 'Heavy snow fall', category: 'snow', icon: 'Snowflake', bgGradient: 'from-cyan-100/20 via-slate-800/20 to-slate-900' },
  77: { code: 77, label: 'Snow grains', category: 'snow', icon: 'Snowflake', bgGradient: 'from-sky-200/20 via-slate-800/20 to-slate-900' },
  80: { code: 80, label: 'Slight rain showers', category: 'rain', icon: 'CloudSunRain', bgGradient: 'from-blue-500/20 via-sky-900/20 to-slate-900' },
  81: { code: 81, label: 'Moderate rain showers', category: 'rain', icon: 'CloudRain', bgGradient: 'from-blue-600/20 via-sky-950/30 to-slate-900' },
  82: { code: 82, label: 'Violent rain showers', category: 'rain', icon: 'CloudLightning', bgGradient: 'from-indigo-600/20 via-slate-900 to-slate-950' },
  85: { code: 85, label: 'Slight snow showers', category: 'snow', icon: 'Snowflake', bgGradient: 'from-sky-300/20 via-slate-800/20 to-slate-900' },
  86: { code: 86, label: 'Heavy snow showers', category: 'snow', icon: 'Snowflake', bgGradient: 'from-sky-200/20 via-slate-800/20 to-slate-900' },
  95: { code: 95, label: 'Thunderstorm', category: 'thunderstorm', icon: 'Zap', bgGradient: 'from-amber-600/20 via-purple-950/30 to-slate-950' },
  96: { code: 96, label: 'Thunderstorm with slight hail', category: 'thunderstorm', icon: 'Zap', bgGradient: 'from-amber-600/20 via-purple-950/30 to-slate-950' },
  99: { code: 99, label: 'Thunderstorm with heavy hail', category: 'thunderstorm', icon: 'Zap', bgGradient: 'from-amber-700/20 via-purple-950/30 to-slate-950' },
};

export function getWeatherInterpretation(code: number | undefined | null): WeatherInterpretation {
  if (code === undefined || code === null || !WMO_CODE_MAP[code]) {
    return {
      code: code ?? -1,
      label: 'Partly Cloudy',
      category: 'cloudy',
      icon: 'CloudSun',
      bgGradient: 'from-slate-700/20 via-slate-800/20 to-slate-900'
    };
  }
  return WMO_CODE_MAP[code];
}

export function formatTemp(tempC: number | undefined | null, unit: 'celsius' | 'fahrenheit'): string {
  if (tempC === undefined || tempC === null || isNaN(tempC)) return '--';
  if (unit === 'fahrenheit') {
    const tempF = Math.round((tempC * 9) / 5 + 32);
    return `${tempF}°F`;
  }
  return `${Math.round(tempC)}°C`;
}

export function formatWindSpeed(kmh: number | undefined | null, unit: 'celsius' | 'fahrenheit'): string {
  if (kmh === undefined || kmh === null || isNaN(kmh)) return '--';
  if (unit === 'fahrenheit') {
    const mph = Math.round(kmh * 0.621371);
    return `${mph} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}
