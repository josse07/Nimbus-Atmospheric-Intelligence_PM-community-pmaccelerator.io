import React from 'react';
import {
  Sun,
  SunMedium,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Snowflake,
  Wind,
  Droplets,
  CloudSunRain
} from 'lucide-react';
import { getWeatherInterpretation } from '../lib/weatherCodes';

interface WeatherIconProps {
  weatherCode?: number;
  className?: string;
  isDay?: boolean;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  weatherCode = 0,
  className = 'w-8 h-8',
  isDay = true
}) => {
  const interp = getWeatherInterpretation(weatherCode);

  switch (interp.category) {
    case 'clear':
      return isDay ? (
        <Sun className={`${className} text-amber-400`} />
      ) : (
        <SunMedium className={`${className} text-indigo-200`} />
      );
    case 'cloudy':
      return interp.code === 2 ? (
        <CloudSun className={`${className} text-sky-300`} />
      ) : (
        <Cloud className={`${className} text-slate-300`} />
      );
    case 'fog':
      return <CloudFog className={`${className} text-slate-400`} />;
    case 'drizzle':
      return <CloudDrizzle className={`${className} text-cyan-400`} />;
    case 'rain':
      return interp.code === 80 ? (
        <CloudSunRain className={`${className} text-sky-400`} />
      ) : (
        <CloudRain className={`${className} text-blue-400`} />
      );
    case 'snow':
      return <Snowflake className={`${className} text-cyan-200`} />;
    case 'thunderstorm':
      return <CloudLightning className={`${className} text-amber-400`} />;
    default:
      return <CloudSun className={`${className} text-sky-300`} />;
  }
};
