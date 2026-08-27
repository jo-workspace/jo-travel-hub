'use client';

import React from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
} from 'lucide-react';

interface WeatherIconProps {
  code?: number;
  className?: string;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({ code = 0, className = 'w-4 h-4' }) => {
  // WMO Weather Interpretation Codes (WW)
  // 0: Clear sky
  if (code === 0) {
    return <Sun className={`${className} text-amber-500`} />;
  }

  // 1, 2: Mainly clear, partly cloudy
  if (code === 1 || code === 2) {
    return <CloudSun className={`${className} text-amber-400`} />;
  }

  // 3: Overcast
  if (code === 3) {
    return <Cloud className={`${className} text-slate-400`} />;
  }

  // 45, 48: Fog
  if (code === 45 || code === 48) {
    return <CloudFog className={`${className} text-slate-400`} />;
  }

  // 51, 53, 55: Drizzle
  if (code >= 51 && code <= 55) {
    return <CloudDrizzle className={`${className} text-sky-400`} />;
  }

  // 61, 63, 65, 80, 81, 82: Rain & Rain showers
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) {
    return <CloudRain className={`${className} text-sky-500`} />;
  }

  // 71, 73, 75, 77, 85, 86: Snow
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return <Snowflake className={`${className} text-indigo-300`} />;
  }

  // 95, 96, 99: Thunderstorm
  if (code >= 95 && code <= 99) {
    return <CloudLightning className={`${className} text-amber-600`} />;
  }

  return <Sun className={`${className} text-amber-500`} />;
};
