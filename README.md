# 🌤️ Nimbus Atmospheric Intelligence

> **Next-Generation Real-Time Meteorological Intelligence & Climate Analytics Suite**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.1-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black.svg?logo=vercel)](https://vercel.com/)

---

## 📌 Overview

**Nimbus Atmospheric Intelligence** is a full-stack, enterprise-grade weather forecasting and atmospheric analytics application. Built with **React 19**, **TypeScript**, **Tailwind CSS v4**, and **Express Serverless Functions**, Nimbus delivers precision meteorological data, 30-day climate range analytics, interactive location media (maps, walking tour videos, photography), and persistent query logging powered by **Firebase Firestore**.

---

## ✨ Key Features

- ⚡ **Live Meteorological Metrics**: Real-time ambient temperature, apparent temperature ("feels like"), humidity, surface pressure, wind velocity & direction, precipitation, UV index, and sunrise/sunset times.
- 🕒 **24-Hour Hourly Trajectory & 7-Day Forecast**: Interactive hour-by-hour forecast strip and extended 7-day outlook card deck.
- 🎯 **Smart Geocoding & GPS Resolution**: Multi-tiered search engine accepting city names, postal codes, global landmarks, or raw GPS coordinates (`latitude, longitude`) with seamless fallback across Open-Meteo, Nominatim, and Google Maps Geocoding APIs.
- 📍 **Browser Geolocation**: One-click location detection with automatic reverse-geocoding.
- 📊 **My Weather Log & Date Range Analytics**: Save, manage, and analyze historical and projected weather queries across custom date ranges (up to 30 days) with aggregated statistics (averages, recorded extremes, dominant conditions).
- ☁️ **Cloud Persistence (Firebase Firestore)**: Real-time query logging and history synchronization across devices.
- 🎬 **Rich Multi-Media Experience**: Location-aware media discovery featuring interactive maps (Google Maps / OpenStreetMap), YouTube walking tours & drone views, and Unsplash landscape photography.
- 🔄 **Dynamic Unit Toggle**: Instantly switch between Celsius (°C) and Fahrenheit (°F) with automatic unit recalculation.
- 🎨 **Modern Dark-Glass Design**: Sleek slate aesthetic built with glassmorphism, Lucide iconography, and responsive Framer Motion micro-animations.

---

## 🛠️ Tech Stack & Architecture

### Frontend
- **Framework**: React 19 (SPA)
- **Language**: TypeScript 5.8
- **Bundler & Dev Server**: Vite 6
- **Styling**: Tailwind CSS v4, Framer Motion
- **Icons**: Lucide React
- **Cloud Database**: Firebase JS SDK (Firestore)

### Backend / Serverless API
- **Framework**: Express.js
- **Runtime**: Node.js / Vercel Serverless Functions (`api/index.ts`)
- **Data Providers**:
  - [Open-Meteo API](https://open-meteo.com/) (Forecast & Historical Archive APIs - no API key required)
  - [Nominatim OpenStreetMap](https://nominatim.org/) (Reverse Geocoding)
  - [Google Maps Geocoding & Embed API](https://developers.google.com/maps) (Optional)
  - [YouTube Data API v3](https://developers.google.com/youtube/v3) (Optional)
  - [Unsplash API](https://unsplash.com/developers) (Optional)

---

## 📁 Directory Structure

```
Nimbus-Atmospheric-Intelligence/
├── api/
│   └── index.ts                 # Vercel Serverless API handler (Express)
├── public/                      # Static assets & applet config
├── src/
│   ├── components/              # React UI Components
│   │   ├── CurrentWeatherCard.tsx
│   │   ├── FiveDayForecast.tsx
│   │   ├── Footer.tsx
│   │   ├── HourlyForecastStrip.tsx
│   │   ├── Navbar.tsx
│   │   ├── SearchBar.tsx
│   │   ├── WeatherIcon.tsx
│   │   └── WeatherLogPage.tsx   # Query logs, date range analytics & media
│   ├── lib/
│   │   └── firebase.ts          # Firestore initialization & config
│   ├── App.tsx                  # Root application component
│   ├── main.tsx                 # Entrypoint
│   ├── types.ts                 # TypeScript interface definitions
│   └── index.css                # Global styles & Tailwind directives
├── .env.example                 # Environment variable template
├── firebase-applet-config.json  # Firebase client credentials
├── firestore.rules              # Security rules for Firestore
├── index.html                   # HTML template
├── package.json                 # Node dependencies & build scripts
├── server.ts                    # Local Express development server
├── tsconfig.json                # TypeScript configuration
├── vercel.json                  # Vercel deployment & routing config
└── vite.config.ts               # Vite bundler configuration
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm**, **yarn**, or **bun**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/Nimbus-Atmospheric-Intelligence.git
   cd Nimbus-Atmospheric-Intelligence
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *Optional API Keys*: You can populate optional keys in `.env` for enhanced media features (Google Maps, YouTube search, Unsplash photos).

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

---

## 🔑 Environment Variables

| Variable Name | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Key for Google Gemini AI calls |
| `GOOGLE_MAPS_API_KEY` | Optional | Enables Google Geocoding & Google Maps Place embeds |
| `YOUTUBE_API_KEY` | Optional | Enables YouTube Data API v3 location walking tour searches |
| `UNSPLASH_ACCESS_KEY` | Optional | Enables high-resolution Unsplash location landscape photos |

> 💡 *Note*: If optional API keys are omitted, Nimbus automatically uses graceful fallbacks (Open-Meteo, OpenStreetMap, curated video searches, and high-quality photography collections).

---

## ☁️ Deployment on Vercel

Nimbus is pre-configured for instant zero-downtime deployment on **Vercel**.

### Option A: Vercel Dashboard (Recommended)

1. Push your repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to [Vercel Dashboard](https://vercel.com/new) and click **Add New Project**.
3. Import your **Nimbus** repository.
4. Vercel will automatically detect `vercel.json` and Vite framework settings:
   - **Framework Preset**: Vite
   - **Build Command**: `vite build`
   - **Output Directory**: `dist`
5. *(Optional)* Add any environment variables (`GOOGLE_MAPS_API_KEY`, `YOUTUBE_API_KEY`, `UNSPLASH_ACCESS_KEY`) under **Environment Variables**.
6. Click **Deploy**.

### Option B: Vercel CLI

1. Install the Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```
2. Log in and deploy:
   ```bash
   vercel
   ```
3. Deploy to production:
   ```bash
   vercel --prod
   ```

---

## 📡 API Endpoint Reference

| Endpoint | Method | Description | Query Parameters |
|---|---|---|---|
| `/api/geocode` | `GET` | Resolves query to location coordinates | `q` (city, address, or `lat,lng`) |
| `/api/reverse-geocode` | `GET` | Reverse geocodes coordinates to location name | `lat`, `lon` |
| `/api/weather/current-forecast` | `GET` | Fetches live weather, 24h hourly, and 7-day outlook | `lat`, `lon` |
| `/api/weather/range` | `GET` | Combined archive + forecast metrics (up to 30 days) | `lat`, `lon`, `startDate`, `endDate` |
| `/api/bonus/media` | `GET` | Fetches map embed, YouTube videos, and Unsplash photo | `location`, `lat`, `lon` |

---

## 🔒 Firebase Firestore Setup

The project uses Firebase Firestore for persistent weather query logs.

### Collection Name
- `weatherQueries`

### Firestore Security Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /weatherQueries/{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<p center>
  Made with ❤️ by PM Community Accelerator
</p>
