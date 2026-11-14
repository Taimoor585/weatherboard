# WeatherBoard — Personal Weather Dashboard

> A high-performance, installable Progressive Web App (PWA) personal weather dashboard crafted for the Edspire Frontend Developer Technical Challenge. Powered by public REST APIs, real-time WebGL atmosphere simulations, tactile micro-interactions, offline resilience, and background push notifications.

---

## 🌟 Key Highlights & Innovations

- **Atmospheric WebGL & Canvas Engine**:
  - Custom WebGL fragment shader with procedural Fractional Brownian Motion (FBM) multi-layered clouds, dynamic sun/moon glow, twinkling night stars, and subtle cursor & scroll parallax.
  - Precipitation particle canvas responding to actual weather conditions (drizzle, rain, heavy snow, thunderstorm lightning bolts).
  - Reduced-motion compliant: gracefully simplifies animations for users with vestibular sensitivities.
- **Top-Left Radial View Transition**:
  - Theme switching (Light ⇄ Dark) utilizes the native View Transitions API with an expanding circular clip-path revealing from the top-left corner across the viewport.
- **Resilient Multi-Tier API Architecture**:
  - **City Autocomplete**: GeoDB Cities API (RapidAPI) with an automated, zero-latency fallback to Open-Meteo Geocoding to guard against rate limits or missing credentials.
  - **Weather Conditions & 5-Day Forecast**: OpenWeatherMap API with automatic failover to Open-Meteo's open endpoints.
  - **Air Quality**: Real-time US AQI and PM2.5 tracking.
- **Offline-First PWA**:
  - Fully offline-ready Service Worker caching the app shell, static assets, and last-viewed city forecast.
  - Detects network transitions with an intuitive "Offline Mode" banner and automatic background revalidation upon reconnecting.
- **Daily Morning Notification Reminder**:
  - Pre-permission explanation card explaining why the app requests notification access *before* triggering the browser prompt.
  - Service Worker background notification support with time selection, validation, and a live "Send Test Notification" trigger.
- **Accessible, Production-Grade Design**:
  - Typographic hierarchy using Geist Variable, Geist Mono, and Instrument Serif.
  - Calibrated glassmorphic surfaces (`backdrop-filter: blur(20px)`), high-contrast labels, and 44×44px minimum touch targets.
  - 100% responsive across mobile (375px), tablet (768px), and wide desktop (1280px+).

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (tested on Node v22)
- [npm](https://www.npmjs.com/) v9+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd weather

# Install dependencies
npm install

# Start local development server
npm run dev
```

The application will start on `http://localhost:5173`.

### Environment Configuration (Optional)

The application works **100% out-of-the-box** without any API keys by leveraging Open-Meteo's free, keyless endpoints.

To enable GeoDB Cities (RapidAPI) or OpenWeatherMap, copy the example environment file:

```bash
cp .env.example .env
```

And set your keys:

```env
# OpenWeatherMap API Key
VITE_OWM_API_KEY=your_openweather_api_key

# GeoDB Cities API Key via RapidAPI
VITE_GEODB_API_KEY=your_rapidapi_geodb_key
```

### Production Build & Preview

```bash
# Compile TypeScript and bundle with Vite PWA
npm run build

# Preview the production build locally
npm run preview
```

---

## 🏛️ Architecture & Technical Decisions

### 1. Client-Side Only Single Page Application
- Built with **React 19**, **TypeScript**, and **Vite 8** for instant HMR and optimized tree-shaken production bundles.
- No backend server required — all API querying, offline storage, geocoding, and background notifications operate strictly within browser standards and service worker threads.

### 2. State & Persistence Layer
- **Persistent Settings**: Unit choice (`°C` / `°F`), theme (`light` / `dark` / system preference), and up to 5 favourite cities are persisted in `localStorage`.
- **Graceful Storage Degradation**: Wrapped in an abstraction layer (`src/lib/storage.ts`) that falls back to in-memory maps if storage is restricted or full.
- **IndexedDB Sync**: Used for sharing notification reminder configurations and last-viewed city data between the window scope and the Service Worker thread.

### 3. Service Worker & Workbox Lifecycle
- Uses `vite-plugin-pwa` with `injectManifest` strategy (`src/sw.ts`).
- Pre-caches core HTML, JS, CSS, fonts, and icon assets.
- Implements `NetworkFirst` caching with expiration plugins for weather API endpoints so users can launch the app offline and instantly see their cached forecast.
- Listens for `periodicsync`, `push`, and client messages to trigger morning forecast reminders.

### 4. Human-Centered Form Validation
- Client-side validation runs on blur and on submit.
- Clear, actionable messages explaining the problem and next steps (e.g. "No cities found matching Tokyo123. Check your spelling or search for a nearby major city") rather than vague errors.

---

## 📡 Public APIs Used

| API | Purpose | Auth | Fallback Strategy |
| :--- | :--- | :--- | :--- |
| **GeoDB Cities API** (RapidAPI) | City search autocomplete as user types | RapidAPI Key | Open-Meteo Geocoding API (Zero-key fallback) |
| **Open-Meteo Geocoding** | Free, keyless city search | None | Active automatically if GeoDB is absent or rate-limited |
| **OpenWeatherMap** | Current conditions & 5-day weather forecast | Free API Key | Open-Meteo Forecast API |
| **Open-Meteo Weather API** | Comprehensive WMO weather data & hourly timeline | None | Primary / Fallback source |
| **Open-Meteo Air Quality** | US AQI, PM2.5, and PM10 pollutants | None | Gracefully omitted if unavailable |
| **BigDataCloud Geocoding** | Reverse geocoding for current GPS coordinates | None | Fallback to "Your location" coordinates |
| **Web Notifications API** | Native browser push reminders & alerts | Browser Native | User-friendly denied/unsupported state |

---

## ⚠️ Known Limitations & Edge Cases

1. **iOS Web Push / Notifications**:
   - On iOS (Safari), Apple requires web apps to be installed to the Home Screen ("Share" → "Add to Home Screen") before enabling Web Notifications. WeatherBoard visibly detects this and provides clear instructions.
2. **Periodic Background Sync**:
   - Chromium browsers only fire `periodicSync` in installed PWAs with sufficient site engagement score. A manual test trigger and fallback in-tab scheduler are provided.
3. **GeoDB Free Tier Rate Limit**:
   - GeoDB's free RapidAPI tier enforces a limit of 1 request/second. WeatherBoard automatically handles `429 Too Many Requests` by seamlessly serving results from Open-Meteo Geocoding without interrupting the user.

---

## 📄 License & Attribution

- Built as a technical challenge submission for **Edspire**.
- Weather data courtesy of [Open-Meteo](https://open-meteo.com/) and [OpenWeatherMap](https://openweathermap.org/).
