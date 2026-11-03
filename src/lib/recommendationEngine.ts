import { CurrentWeather, DailyForecast, HourlyForecast, TemperatureUnit, AppLanguage } from '../types';

export interface SmartRecommendation {
  id: string;
  category: 'heat' | 'uv' | 'rain' | 'cold' | 'storm' | 'humidity' | 'wind' | 'hydration' | 'comfort';
  title: string;
  description: string;
  iconName: 'Flame' | 'Sun' | 'Umbrella' | 'ThermometerSnowflake' | 'CloudLightning' | 'Droplets' | 'Wind' | 'Sparkles' | 'ShieldAlert' | 'GlassWater';
  severity: 'alert' | 'warning' | 'info' | 'tip';
  badge: string;
  actionText?: string;
  relevanceScore: number; // Higher means more critical / shown first
}

export interface RecommendationAnalysis {
  recommendations: SmartRecommendation[];
  heatAlertLevel: 'extreme' | 'high' | 'moderate' | 'normal' | 'cold';
  heatAdvisoryText: string | null;
  recommendedHydrationIntervalMinutes: number;
  weatherSummarySpeechText: string;
  recommendationsSpeechText: string;
  hydrationPromptSpeechText: string;
  language: AppLanguage;
}

export function generateSmartRecommendations(
  current: CurrentWeather,
  daily: DailyForecast[] = [],
  hourly: HourlyForecast[] = [],
  locationName: string = 'your location',
  unit: TemperatureUnit = 'celsius',
  language: AppLanguage = 'en'
): RecommendationAnalysis {
  const recommendations: SmartRecommendation[] = [];

  const tempC = current.temperature;
  const apparentTempC = current.apparentTemperature;
  const humidity = current.humidity;
  const weatherCode = current.weatherCode;
  const windSpeed = current.windSpeed;
  const precipitation = current.precipitation;
  const todayForecast = daily[0];
  const uvIndex = current.uvIndex > 0 ? current.uvIndex : (todayForecast?.uvIndexMax ?? 0);

  // Helper for temperature speech formatting
  const tempDisplay = unit === 'fahrenheit' 
    ? `${Math.round((tempC * 9) / 5 + 32)}°F`
    : `${Math.round(tempC)}°C`;
  const apparentDisplay = unit === 'fahrenheit'
    ? `${Math.round((apparentTempC * 9) / 5 + 32)}°F`
    : `${Math.round(apparentTempC)}°C`;
  const highDisplay = todayForecast 
    ? (unit === 'fahrenheit' ? `${Math.round((todayForecast.maxTemp * 9) / 5 + 32)}°F` : `${Math.round(todayForecast.maxTemp)}°C`)
    : tempDisplay;
  const lowDisplay = todayForecast 
    ? (unit === 'fahrenheit' ? `${Math.round((todayForecast.minTemp * 9) / 5 + 32)}°F` : `${Math.round(todayForecast.minTemp)}°C`)
    : tempDisplay;

  // 1. HEAT & THERMAL STRESS ANALYSIS
  let heatAlertLevel: 'extreme' | 'high' | 'moderate' | 'normal' | 'cold' = 'normal';
  let heatAdvisoryText: string | null = null;
  let recommendedHydrationIntervalMinutes = 60;

  if (apparentTempC >= 35 || tempC >= 36) {
    heatAlertLevel = 'extreme';
    heatAdvisoryText = `Extreme Heat Warning: Perceived temperatures of ${apparentDisplay}. High risk of heat exhaustion and rapid dehydration.`;
    recommendedHydrationIntervalMinutes = 30;

    recommendations.push({
      id: 'extreme-heat-alert',
      category: 'heat',
      title: 'Extreme Heat Warning',
      description: `Hazardous heat index (${apparentDisplay}). Carry an insulated water flask, seek air-conditioned shelter, wear lightweight light-colored clothing, and avoid strenuous outdoor exercise between 11 AM and 4 PM.`,
      iconName: 'Flame',
      severity: 'alert',
      badge: 'Heat Alert',
      actionText: 'Keep flask chilled',
      relevanceScore: 100
    });
  } else if (apparentTempC >= 30 || tempC >= 30) {
    heatAlertLevel = 'high';
    heatAdvisoryText = `High Heat Advisory: Temperatures reaching ${tempDisplay} (feels like ${apparentDisplay}).`;
    recommendedHydrationIntervalMinutes = 45;

    recommendations.push({
      id: 'high-heat-advisory',
      category: 'heat',
      title: 'Elevated Heat & Sunshine',
      description: `Hot conditions today (${tempDisplay}). Wear loose, breathable cotton or linen apparel, stay in shaded areas whenever possible, and hydrate regularly throughout the day.`,
      iconName: 'Flame',
      severity: 'warning',
      badge: 'Heat Advisory',
      actionText: 'Stay in shade',
      relevanceScore: 90
    });
  } else if (apparentTempC >= 25 || tempC >= 25) {
    heatAlertLevel = 'moderate';
    recommendedHydrationIntervalMinutes = 50;

    recommendations.push({
      id: 'warm-weather-tip',
      category: 'comfort',
      title: 'Warm & Sunny Weather',
      description: `Pleasant warmth today (${tempDisplay}). Dress in light layers, maintain comfortable room ventilation, and keep water on hand.`,
      iconName: 'Sun',
      severity: 'info',
      badge: 'Warm Day',
      relevanceScore: 60
    });
  } else if (tempC <= 0 || apparentTempC <= 0) {
    heatAlertLevel = 'cold';
    recommendedHydrationIntervalMinutes = 75;

    recommendations.push({
      id: 'sub-zero-freeze',
      category: 'cold',
      title: 'Freezing Conditions & Frost',
      description: `Freezing temperatures (${tempDisplay}, wind chill ${apparentDisplay}). Wear a heavy thermal winter coat, insulated gloves, scarf, and beanie. Watch out for black ice on sidewalks.`,
      iconName: 'ThermometerSnowflake',
      severity: 'alert',
      badge: 'Freeze Alert',
      actionText: 'Bundle up warmly',
      relevanceScore: 95
    });
  } else if (tempC <= 12) {
    heatAlertLevel = 'cold';
    recommendedHydrationIntervalMinutes = 65;

    recommendations.push({
      id: 'cold-weather-layering',
      category: 'cold',
      title: 'Chilly Atmospheric Chill',
      description: `Cool temperatures (${tempDisplay}). Wear an insulating jacket, wind-resistant outer layer, or wool sweater to stay warm outdoors.`,
      iconName: 'ThermometerSnowflake',
      severity: 'info',
      badge: 'Chilly',
      relevanceScore: 65
    });
  }

  // 2. THUNDERSTORMS & SEVERE WEATHER
  const isThunderstorm = [95, 96, 99].includes(weatherCode);
  if (isThunderstorm) {
    recommendations.push({
      id: 'thunderstorm-warning',
      category: 'storm',
      title: 'Severe Thunderstorm Warning',
      description: 'Active lightning and electrical storms detected. Avoid open fields, metal fences, and tall exposed trees. Stay indoors in a secure building until the storm passes.',
      iconName: 'CloudLightning',
      severity: 'alert',
      badge: 'Severe Alert',
      actionText: 'Seek indoor shelter',
      relevanceScore: 98
    });
  }

  // 3. RAIN & PRECIPITATION
  const isRainingNow = precipitation > 0 || [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode);
  const rainExpectedLater = !isRainingNow && todayForecast && (
    (todayForecast.precipitationProbability ?? 0) >= 40 ||
    todayForecast.precipitationSum >= 1.0
  );
  const isSnowing = [71, 73, 75, 77, 85, 86].includes(weatherCode);

  if (isSnowing) {
    recommendations.push({
      id: 'snow-winter-footwear',
      category: 'cold',
      title: 'Snowfall & Slick Pavement',
      description: 'Snow is falling. Wear waterproof footwear with slip-resistant soles, allow extra transit time, and keep your extremities dry.',
      iconName: 'ThermometerSnowflake',
      severity: 'warning',
      badge: 'Snow Alert',
      relevanceScore: 88
    });
  } else if (isRainingNow) {
    recommendations.push({
      id: 'active-rain-umbrella',
      category: 'rain',
      title: 'Active Rainfall — Carry Umbrella',
      description: `Rain is actively occurring (${precipitation > 0 ? `${precipitation} mm recorded` : 'wet conditions'}). Grab a waterproof raincoat or sturdy umbrella and wear water-resistant shoes.`,
      iconName: 'Umbrella',
      severity: 'warning',
      badge: 'Rain Gear',
      actionText: 'Grab an umbrella',
      relevanceScore: 85
    });
  } else if (rainExpectedLater) {
    recommendations.push({
      id: 'rain-probability-alert',
      category: 'rain',
      title: `Rain Likely Today (${todayForecast?.precipitationProbability ?? 50}% Chance)`,
      description: `Showers are forecast later today. Pack a compact travel umbrella in your bag so you are not caught off guard by sudden precipitation.`,
      iconName: 'Umbrella',
      severity: 'info',
      badge: 'Pack Umbrella',
      actionText: 'Pack umbrella',
      relevanceScore: 75
    });
  }

  // 4. UV INDEX & SUNSCREEN
  if (uvIndex >= 8) {
    recommendations.push({
      id: 'extreme-uv-protection',
      category: 'uv',
      title: `Very High UV Index (${uvIndex.toFixed(1)})`,
      description: 'Intense ultraviolet radiation. Apply broad-spectrum SPF 50+ sunscreen, wear UV400 sunglasses to protect eyesight, and wear a wide-brimmed sun hat.',
      iconName: 'Sun',
      severity: 'warning',
      badge: 'High UV',
      actionText: 'SPF 50+ Sunscreen',
      relevanceScore: 82
    });
  } else if (uvIndex >= 4.5) {
    recommendations.push({
      id: 'moderate-uv-protection',
      category: 'uv',
      title: `Moderate UV Exposure (${uvIndex.toFixed(1)})`,
      description: 'Noticeable sun exposure. Sunscreen (SPF 30+) and sunglasses are recommended if spending more than 25 minutes outdoors.',
      iconName: 'Sun',
      severity: 'info',
      badge: 'UV Protection',
      relevanceScore: 68
    });
  }

  // 5. HUMIDITY & AIR QUALITY COMFORT
  if (humidity >= 72 && tempC >= 23) {
    if (recommendedHydrationIntervalMinutes > 45) {
      recommendedHydrationIntervalMinutes = 45;
    }
    recommendations.push({
      id: 'high-humidity-muggy',
      category: 'humidity',
      title: `High Humidity (${humidity}%)`,
      description: 'Elevated air moisture impedes the body’s natural evaporative cooling. Stay well-hydrated, choose loose cotton clothes, and spend time in well-ventilated rooms.',
      iconName: 'Droplets',
      severity: 'info',
      badge: 'Muggy Air',
      relevanceScore: 70
    });
  } else if (humidity <= 25) {
    recommendations.push({
      id: 'dry-air-hydration',
      category: 'humidity',
      title: `Very Dry Air (${humidity}%)`,
      description: 'Low atmospheric moisture accelerates throat dryness and skin dehydration. Sip water frequently, use lip balm, and consider an indoor humidifier.',
      iconName: 'Droplets',
      severity: 'info',
      badge: 'Dry Air',
      relevanceScore: 65
    });
  }

  // 6. WIND & GUST ADVISORY
  const maxWindToday = Math.max(windSpeed, todayForecast?.windSpeedMax ?? 0);
  if (maxWindToday >= 35) {
    recommendations.push({
      id: 'high-wind-advisory',
      category: 'wind',
      title: `Brisk Wind Speeds (${maxWindToday} km/h)`,
      description: 'Gusty conditions may invert umbrellas and blow light objects around. Wear a windbreaker jacket and exercise caution if cycling or driving high-profile vehicles.',
      iconName: 'Wind',
      severity: 'info',
      badge: 'Wind Advisory',
      relevanceScore: 62
    });
  }

  // 7. HYDRATION RECOMMENDATION (Tailored to temperature)
  if (heatAlertLevel === 'extreme' || heatAlertLevel === 'high') {
    recommendations.push({
      id: 'proactive-hydration-high',
      category: 'hydration',
      title: 'Proactive Hydration Alert',
      description: 'High heat accelerates insensible fluid loss. Take regular sips of cool water or electrolyte-rich fluids before you feel thirsty.',
      iconName: 'GlassWater',
      severity: 'warning',
      badge: 'Hydration',
      actionText: 'Log a drink',
      relevanceScore: 89
    });
  } else {
    recommendations.push({
      id: 'daily-hydration-baseline',
      category: 'hydration',
      title: 'Hydration Wellness Baseline',
      description: 'Keep water nearby to support mental focus and energy. Steady hourly intake helps sustain bodily fluid balance in all climates.',
      iconName: 'GlassWater',
      severity: 'tip',
      badge: 'Wellness',
      relevanceScore: 50
    });
  }

  // 8. OPTIMAL OUTDOOR WINDOW (If mild, dry and pleasant)
  if (
    tempC >= 18 &&
    tempC <= 26 &&
    !isRainingNow &&
    !rainExpectedLater &&
    !isThunderstorm &&
    uvIndex < 8 &&
    windSpeed < 25
  ) {
    recommendations.push({
      id: 'pleasant-outdoor-window',
      category: 'comfort',
      title: 'Excellent Outdoor Conditions',
      description: `Mild ${tempDisplay} temperatures and calm winds make this an ideal window for outdoor strolls, running, or outdoor lunches. Enjoy the clear weather!`,
      iconName: 'Sparkles',
      severity: 'tip',
      badge: 'Great Outside',
      relevanceScore: 55
    });
  }

  // Sort by relevance score descending
  recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Sort by relevance score descending
  recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // If language is Nigerian Pidgin English, translate recommendations to natural Pidgin
  if (language === 'pcm') {
    recommendations.forEach((r) => {
      switch (r.category) {
        case 'heat':
          if (r.id === 'extreme-heat-alert') {
            r.title = 'Sun Dey Burn Ground (Heavy Heat)';
            r.description = `Heat index high well well (${apparentDisplay}). Carry chilled water bottle, wear light cloth, waka under shade, and stay indoor from 11 AM to 4 PM.`;
            r.badge = 'Heavy Heat';
            r.actionText = 'Carry chilled water';
          } else {
            r.title = 'Weather Hot Well Well';
            r.description = `Today go hot (${tempDisplay}). Wear light cotton cloth, no stay under hot sun for long, and drink water well well.`;
            r.badge = 'Hot Weather';
            r.actionText = 'Waka under shade';
          }
          break;
        case 'storm':
          r.title = 'Thunder & Heavy Breeze Warning';
          r.description = 'Heavy lightning and storm dey outside. No waka near open ground, tall trees, or wire poles. Stay safe inside house.';
          r.badge = 'Heavy Storm';
          r.actionText = 'Stay inside';
          break;
        case 'rain':
          if (r.id === 'active-rain-umbrella') {
            r.title = 'Rain Dey Drop Now Now';
            r.description = 'Rain dey fall! Grab your umbrella or raincoat make water no soak you, and watch road for water-log.';
            r.badge = 'Rain Gear';
            r.actionText = 'Hold umbrella';
          } else {
            r.title = 'Rain Fit Fall Today';
            r.description = `Rain fit fall later today (${todayForecast?.precipitationProbability ?? 50}% chance). Pack small umbrella inside your bag so surprise no go catch you.`;
            r.badge = 'Hold Umbrella';
            r.actionText = 'Pack umbrella';
          }
          break;
        case 'uv':
          r.title = 'Sun Hot Plenty (High UV)';
          r.description = 'Strong sun rays dey outside. Rub skin cream (sunscreen), wear sunglasses, and put on cap if you dey go outside.';
          r.badge = 'Strong Sun';
          r.actionText = 'Rub cream';
          break;
        case 'humidity':
          if (r.id === 'high-humidity-muggy') {
            r.title = `Air Heavy & Sweaty (${humidity}%)`;
            r.description = 'Air dey moist and heavy, body go sweat well well. Stay inside well-ventilated room, wear light singlet or cloth, and drink plenty water.';
            r.badge = 'Sweaty Air';
          } else {
            r.title = `Harmattan / Dry Air (${humidity}%)`;
            r.description = 'Air dry well well. Lip fit crack and throat fit dry quickly. Sip water often and rub lip balm.';
            r.badge = 'Dry Air';
          }
          break;
        case 'cold':
          r.title = 'Cold Breeze Dey Blow';
          r.description = `Weather cool well well (${tempDisplay}). Put on thick jacket or sweater so breeze no go enter your body.`;
          r.badge = 'Cold Weather';
          break;
        case 'wind':
          r.title = 'Breeze Dey Blow Strong';
          r.description = 'Strong breeze dey blow outside. Hold your umbrella tight and hold light things well.';
          r.badge = 'Strong Wind';
          break;
        case 'hydration':
          r.title = 'Make You Drink Water';
          r.description = 'Sun and sweat dey drain body quick. Grab cold cup of water drink now before thirst catch you.';
          r.badge = 'Drink Water';
          r.actionText = 'Log drink';
          break;
        case 'comfort':
          r.title = 'Weather Soft & Fine';
          r.description = `Pleasant breeze and gentle ${tempDisplay}. Weather nice to waka outside, do market run, or relax. Enjoy your day!`;
          r.badge = 'Weather Good';
          break;
      }
    });
  }

  // BUILD NATURAL SPEECH TEXT FOR VOICE ASSISTANT
  const conditionLabel = current.condition || 'clear weather';
  let speechSummary = '';
  let speechRecommendations = '';
  let speechHydration = '';

  if (language === 'pcm') {
    // Nigerian Pidgin Speech
    speechSummary = `How far! Here na your weather update for ${locationName}. Current weather na ${tempDisplay}, and e feel like ${apparentDisplay}. Today high go reach ${highDisplay}, low na ${lowDisplay}.`;
    if (isThunderstorm) {
      speechSummary += ` Caution: heavy thunder and lightning dey outside. Abeg stay safe inside house.`;
    } else if (isRainingNow) {
      speechSummary += ` Rain dey fall right now, make sure you carry your umbrella.`;
    } else if (rainExpectedLater) {
      speechSummary += ` Rain fit fall later today, about ${todayForecast?.precipitationProbability ?? 50} percent chance.`;
    }

    if (heatAlertLevel === 'extreme') {
      speechSummary += ` Warning: today go hot well well! No forget to drink water and avoid too much sun.`;
    } else if (heatAlertLevel === 'cold') {
      speechSummary += ` Cold dey outside today. Wear warm cloth.`;
    }

    const topRecs = recommendations.slice(0, 3);
    const recsLines = topRecs.map((r, i) => {
      const num = i === 0 ? 'Number one' : i === 1 ? 'Number two' : 'Number three';
      return `${num}, for ${r.title}: ${r.description}`;
    });
    speechRecommendations = `Here na weather advice for you today: ${recsLines.join(' ')}`;

    if (heatAlertLevel === 'extreme' || heatAlertLevel === 'high') {
      speechHydration = `How far! Sun dey hot well well today at ${tempDisplay}. Take moment drink cold water now, no let throat dry!`;
    } else {
      speechHydration = `Time don reach to drink water! Grab cup of water drink now to keep your body fresh.`;
    }
  } else {
    // Simple Concise AI English Speech
    speechSummary = `Here is your weather briefing for ${locationName}. Currently ${tempDisplay} with ${conditionLabel}, feeling like ${apparentDisplay}. Expected high of ${highDisplay} and low of ${lowDisplay}.`;

    if (isThunderstorm) {
      speechSummary += ` Thunderstorms are active. Stay safe indoors.`;
    } else if (isRainingNow) {
      speechSummary += ` Rain is falling now. Remember your umbrella.`;
    } else if (rainExpectedLater) {
      speechSummary += ` Rain is likely later today with a ${todayForecast?.precipitationProbability ?? 50} percent chance.`;
    }

    if (heatAlertLevel === 'extreme') {
      speechSummary += ` Extreme heat warning in effect. Stay hydrated and seek shade.`;
    } else if (heatAlertLevel === 'cold') {
      speechSummary += ` Chilly weather today. Dress warmly.`;
    }

    const topRecs = recommendations.slice(0, 3);
    const recsSpeechLines = topRecs.map((r, i) => {
      const ordinal = i === 0 ? 'First' : i === 1 ? 'Second' : 'Third';
      return `${ordinal}, regarding ${r.title}: ${r.description}`;
    });
    speechRecommendations = `Here are today's practical recommendations. ${recsSpeechLines.join(' ')}`;

    if (heatAlertLevel === 'extreme' || heatAlertLevel === 'high') {
      speechHydration = `Hydration reminder: It's hot outside at ${tempDisplay}, feeling like ${apparentDisplay}. Drink some water now to stay hydrated.`;
    } else if (humidity >= 70 && tempC >= 22) {
      speechHydration = `Time to hydrate! Humid air increases fluid loss. Take a moment to drink a glass of fresh water.`;
    } else {
      speechHydration = `Time to hydrate! Take a moment to drink some water and stay refreshed.`;
    }
  }

  return {
    recommendations,
    heatAlertLevel,
    heatAdvisoryText,
    recommendedHydrationIntervalMinutes,
    weatherSummarySpeechText: speechSummary,
    recommendationsSpeechText: speechRecommendations,
    hydrationPromptSpeechText: speechHydration,
    language
  };
}
