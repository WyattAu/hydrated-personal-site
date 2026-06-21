import { createSignal, onCleanup, onMount } from 'solid-js';
import type { EarthquakeFeature } from '../../lib/types';
import { recordFetch } from './StaleIndicator';

interface CountryData {
  name: string;
  capital?: string;
  population?: number;
  area?: number;
  region?: string;
  languages?: Record<string, string>;
  currencies?: Record<string, { name: string; symbol: string }>;
  gdp?: number;
  lifeExpectancy?: number;
}

interface MapInstance {
  remove: () => void;
  setView: (latlng: [number, number], zoom: number) => unknown;
}

interface TileLayer {
  remove: () => void;
}

interface Marker {
  remove: () => void;
}

const CAPITALS: { name: string; lat: number; lon: number; country: string }[] = [
  { name: 'London', lat: 51.5074, lon: -0.1278, country: 'GB' },
  { name: 'Washington D.C.', lat: 38.9072, lon: -77.0369, country: 'US' },
  { name: 'Beijing', lat: 39.9042, lon: 116.4074, country: 'CN' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'JP' },
  { name: 'Berlin', lat: 52.52, lon: 13.405, country: 'DE' },
  { name: 'Paris', lat: 48.8566, lon: 2.3522, country: 'FR' },
  { name: 'Moscow', lat: 55.7558, lon: 37.6173, country: 'RU' },
  { name: 'New Delhi', lat: 28.6139, lon: 77.209, country: 'IN' },
  { name: 'Canberra', lat: -35.2809, lon: 149.13, country: 'AU' },
  { name: 'Brasilia', lat: -15.7975, lon: -47.8919, country: 'BR' },
  { name: 'Seoul', lat: 37.5665, lon: 126.978, country: 'KR' },
  { name: 'Rome', lat: 41.9028, lon: 12.4964, country: 'IT' },
  { name: 'Ottawa', lat: 45.4215, lon: -75.6972, country: 'CA' },
  { name: 'Ankara', lat: 39.9334, lon: 32.8597, country: 'TR' },
  { name: 'Riyadh', lat: 24.7136, lon: 46.6753, country: 'SA' },
  { name: 'Cairo', lat: 30.0444, lon: 31.2357, country: 'EG' },
  { name: 'Nairobi', lat: -1.2921, lon: 36.8219, country: 'KE' },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198, country: 'SG' },
  { name: 'Mexico City', lat: 19.4326, lon: -99.1332, country: 'MX' },
  { name: 'Jakarta', lat: -6.2088, lon: 106.8456, country: 'ID' },
];

const COUNTRIES = [
  { name: 'United States', lat: 39.8, lon: -98.5, radius: 25 },
  { name: 'Canada', lat: 56.1, lon: -106.3, radius: 25 },
  { name: 'Mexico', lat: 23.6, lon: -102.5, radius: 12 },
  { name: 'Brazil', lat: -14.2, lon: -51.9, radius: 22 },
  { name: 'Argentina', lat: -38.4, lon: -63.6, radius: 15 },
  { name: 'United Kingdom', lat: 55.4, lon: -3.4, radius: 8 },
  { name: 'France', lat: 46.2, lon: 2.2, radius: 8 },
  { name: 'Germany', lat: 51.2, lon: 10.4, radius: 7 },
  { name: 'Italy', lat: 41.9, lon: 12.6, radius: 7 },
  { name: 'Spain', lat: 40.5, lon: -3.7, radius: 8 },
  { name: 'Poland', lat: 51.9, lon: 19.1, radius: 6 },
  { name: 'Ukraine', lat: 48.4, lon: 31.2, radius: 9 },
  { name: 'Russia', lat: 61.5, lon: 105.3, radius: 50 },
  { name: 'China', lat: 35.9, lon: 104.2, radius: 20 },
  { name: 'Japan', lat: 36.2, lon: 138.3, radius: 8 },
  { name: 'South Korea', lat: 35.9, lon: 127.8, radius: 5 },
  { name: 'India', lat: 20.6, lon: 78.9, radius: 18 },
  { name: 'Australia', lat: -25.3, lon: 133.8, radius: 28 },
  { name: 'South Africa', lat: -30.6, lon: 22.9, radius: 12 },
  { name: 'Nigeria', lat: 9.1, lon: 8.7, radius: 10 },
  { name: 'Egypt', lat: 26.8, lon: 30.8, radius: 10 },
  { name: 'Turkey', lat: 38.9, lon: 35.2, radius: 10 },
  { name: 'Saudi Arabia', lat: 23.9, lon: 45.1, radius: 14 },
  { name: 'Indonesia', lat: -0.8, lon: 113.9, radius: 18 },
  { name: 'Thailand', lat: 15.9, lon: 100.9, radius: 8 },
  { name: 'Vietnam', lat: 14.1, lon: 108.3, radius: 8 },
  { name: 'Pakistan', lat: 30.4, lon: 69.3, radius: 10 },
  { name: 'Bangladesh', lat: 23.7, lon: 90.4, radius: 5 },
  { name: 'Colombia', lat: 4.6, lon: -74.3, radius: 10 },
  { name: 'Chile', lat: -35.7, lon: -71.5, radius: 12 },
  { name: 'Peru', lat: -9.2, lon: -75.0, radius: 10 },
  { name: 'Kenya', lat: -0.02, lon: 37.9, radius: 6 },
  { name: 'Ethiopia', lat: 9.1, lon: 40.5, radius: 8 },
  { name: 'Morocco', lat: 31.8, lon: -7.1, radius: 7 },
  { name: 'Congo', lat: -4.0, lon: 21.8, radius: 10 },
  { name: 'Tanzania', lat: -6.4, lon: 34.9, radius: 8 },
  { name: 'Sweden', lat: 60.1, lon: 18.6, radius: 8 },
  { name: 'Norway', lat: 60.5, lon: 8.5, radius: 8 },
  { name: 'Finland', lat: 61.9, lon: 25.7, radius: 7 },
  { name: 'Iceland', lat: 64.9, lon: -19.0, radius: 5 },
  { name: 'New Zealand', lat: -40.9, lon: 174.9, radius: 7 },
  { name: 'Mongolia', lat: 46.9, lon: 103.8, radius: 12 },
  { name: 'Kazakhstan', lat: 48.0, lon: 66.9, radius: 15 },
  { name: 'Iran', lat: 32.4, lon: 53.7, radius: 12 },
  { name: 'Iraq', lat: 33.2, lon: 43.7, radius: 7 },
  { name: 'Syria', lat: 34.8, lon: 39.0, radius: 5 },
  { name: 'Israel', lat: 31.0, lon: 34.8, radius: 3 },
  { name: 'Greece', lat: 39.1, lon: 21.8, radius: 5 },
  { name: 'Portugal', lat: 39.4, lon: -8.2, radius: 4 },
  { name: 'Netherlands', lat: 52.1, lon: 5.3, radius: 4 },
  { name: 'Belgium', lat: 50.5, lon: 4.5, radius: 3 },
  { name: 'Switzerland', lat: 46.8, lon: 8.2, radius: 3 },
  { name: 'Austria', lat: 47.5, lon: 14.6, radius: 4 },
  { name: 'Czech Republic', lat: 49.8, lon: 15.5, radius: 4 },
];

function findCountry(lat: number, lon: number): string {
  let closest = 'Unknown Location';
  let minDist = Number.POSITIVE_INFINITY;
  for (const c of COUNTRIES) {
    const dist = Math.sqrt((lat - c.lat) ** 2 + (lon - c.lon) ** 2);
    if (dist < minDist) {
      minDist = dist;
      closest = c.name;
    }
  }
  if (minDist > 30) return `Near ${closest}`;
  return closest;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EQ_CACHE_KEY = 'earthquake_cache';
const EQ_CACHE_TTL_MS = 10 * 60 * 1000;

function loadCachedEarthquakes(): EarthquakeFeature[] {
  try {
    const raw = localStorage.getItem(EQ_CACHE_KEY);
    if (!raw) return [];
    const { features, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > EQ_CACHE_TTL_MS) return [];
    return features;
  } catch {
    return [];
  }
}

function storeCachedEarthquakes(features: EarthquakeFeature[]): void {
  try {
    localStorage.setItem(EQ_CACHE_KEY, JSON.stringify({ features, timestamp: Date.now() }));
  } catch {}
}

export default function WorldMap() {
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [selectedCountry, setSelectedCountry] = createSignal<string | null>(null);
  const [countryData, setCountryData] = createSignal<CountryData | null>(null);
  const [countryLoading, setCountryLoading] = createSignal(false);

  let mapRef: HTMLDivElement | undefined;
  let map: MapInstance | undefined;
  const markers: Marker[] = [];
  const earthquakeMarkers: Marker[] = [];
  let tileLayer: TileLayer | undefined;

  const COUNTRY_NAME_TO_CODE: Record<string, string> = {
    'United States': 'US',
    Canada: 'CA',
    Mexico: 'MX',
    Brazil: 'BR',
    Argentina: 'AR',
    'United Kingdom': 'GB',
    France: 'FR',
    Germany: 'DE',
    Italy: 'IT',
    Spain: 'ES',
    Poland: 'PL',
    Ukraine: 'UA',
    Russia: 'RU',
    China: 'CN',
    Japan: 'JP',
    'South Korea': 'KR',
    India: 'IN',
    Australia: 'AU',
    'South Africa': 'ZA',
    Nigeria: 'NG',
    Egypt: 'EG',
    Turkey: 'TR',
    'Saudi Arabia': 'SA',
    Indonesia: 'ID',
    Pakistan: 'PK',
    Bangladesh: 'BD',
    Vietnam: 'VN',
    Thailand: 'TH',
    Iran: 'IR',
    Iraq: 'IQ',
    Israel: 'IL',
    Sweden: 'SE',
    Norway: 'NO',
    Finland: 'FI',
    Denmark: 'DK',
    Ireland: 'IE',
    Switzerland: 'CH',
    Austria: 'AT',
    Belgium: 'BE',
    Netherlands: 'NL',
    Portugal: 'PT',
    Greece: 'GR',
    'Czech Republic': 'CZ',
    Colombia: 'CO',
    Peru: 'PE',
    Chile: 'CL',
    Kenya: 'KE',
    Ethiopia: 'ET',
    Morocco: 'MA',
    Algeria: 'DZ',
    Tanzania: 'TZ',
    Cuba: 'CU',
    Venezuela: 'VE',
    Philippines: 'PH',
    Malaysia: 'MY',
    Singapore: 'SG',
    'New Zealand': 'NZ',
    Iceland: 'IS',
    Croatia: 'HR',
    Serbia: 'RS',
    Romania: 'RO',
    Hungary: 'HU',
    Bulgaria: 'BG',
    Slovakia: 'SK',
    Lithuania: 'LT',
    Latvia: 'LV',
    Estonia: 'EE',
    Slovenia: 'SI',
    Cyprus: 'CY',
    Luxembourg: 'LU',
    Malta: 'MT',
    Lebanon: 'LB',
    Jordan: 'JO',
    Kuwait: 'KW',
    Qatar: 'QA',
    Bahrain: 'BH',
    Oman: 'OM',
    UAE: 'AE',
    Nepal: 'NP',
    'Sri Lanka': 'LK',
    Myanmar: 'MM',
    Cambodia: 'KH',
    Laos: 'LA',
    Mongolia: 'MN',
    Afghanistan: 'AF',
  };

  function getMagnitudeColor(mag: number | null): string {
    if (mag === null) return '#888888';
    if (mag < 1) return '#00e5ff';
    if (mag < 2) return '#69f0ae';
    if (mag < 3) return '#ffff00';
    if (mag < 4) return '#ff9800';
    if (mag < 5) return '#ff6b35';
    if (mag < 6) return '#f44336';
    return '#e91e63';
  }

  function getMagnitudeRadius(mag: number | null): number {
    if (mag === null) return 3;
    return Math.max(3, mag * 3);
  }

  function addEarthquakeMarkers(
    leafletMap: import('leaflet').Map,
    features: EarthquakeFeature[],
    L: typeof import('leaflet'),
  ) {
    for (const eq of features) {
      const [lon, lat] = eq.geometry.coordinates;
      const mag = eq.properties.mag;
      const color = getMagnitudeColor(mag);

      const m = L.circleMarker([lat, lon], {
        radius: getMagnitudeRadius(mag),
        color,
        fillColor: color,
        fillOpacity: 0.5,
        weight: 1,
      })
        .bindPopup(
          `<div class="font-mono text-xs">
            <div><strong>M${mag ?? '?'}</strong></div>
            <div style="color:#888">${escapeHtml(eq.properties.place ?? 'Unknown')}</div>
            <div style="color:#888">${new Date(eq.properties.time).toLocaleString()}</div>
            <a href="${escapeHtml(eq.properties.url ?? '')}" target="_blank" style="color:#00e5ff">USGS Details</a>
          </div>`,
        )
        .addTo(leafletMap);
      earthquakeMarkers.push(m);
    }
  }

  onMount(async () => {
    if (!mapRef) return;

    try {
      const L = await import('leaflet');

      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const leafletMap = L.map(mapRef, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 12,
        zoomControl: true,
        attributionControl: true,
        worldCopyJump: true,
      });

      tileLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        },
      ).addTo(leafletMap);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        pane: 'overlayPane',
      }).addTo(leafletMap);

      for (const cap of CAPITALS) {
        const m = L.circleMarker([cap.lat, cap.lon], {
          radius: 4,
          color: '#00e5ff',
          fillColor: '#00e5ff',
          fillOpacity: 0.8,
          weight: 1,
        })
          .bindTooltip(`${cap.name} (${cap.country})`, {
            permanent: false,
            direction: 'top',
            className: 'font-mono text-xs',
          })
          .addTo(leafletMap);
        markers.push(m);
      }

      // Load cached earthquakes immediately
      const cached = loadCachedEarthquakes();
      if (cached.length > 0) {
        addEarthquakeMarkers(leafletMap, cached, L);
        setLoading(false);
      }

      // Fetch fresh data
      try {
        const res = await fetch('/api/earthquakes');
        if (!res.ok) throw new Error('Failed to fetch earthquakes');
        const data = await res.json();

        if (data.features) {
          storeCachedEarthquakes(data.features);
          // Clear old earthquake markers (keep capitals), add fresh ones
          for (const m of earthquakeMarkers) m.remove();
          earthquakeMarkers.length = 0;
          addEarthquakeMarkers(leafletMap, data.features, L);
          setLoading(false);
          recordFetch('earthquakes');
        }
      } catch {
        // Cache fallback already displayed
      }

      leafletMap.on('click', async (e: { latlng: { lat: number; lng: number } }) => {
        const country = findCountry(e.latlng.lat, e.latlng.lng);
        setSelectedCountry(country);
        setCountryData(null);
        setCountryLoading(true);

        const code = COUNTRY_NAME_TO_CODE[country];
        if (!code) {
          setCountryLoading(false);
          return;
        }

        try {
          const [countryRes, wbRes] = await Promise.all([
            fetch(`/api/restcountries?code=${code}`),
            fetch(
              `/api/world-bank?country=${code}&indicators=SP.DYN.LE00.IN,SP.POP.TOTL,NY.GDP.MKTP.CD,EN.ATM.CO2E.PC,SP.URB.TOTL.IN.ZS`,
            ),
          ]);

          const cData = countryRes.ok ? await countryRes.json() : null;
          const wbData = wbRes.ok ? await wbRes.json() : {};

          if (cData) {
            setCountryData({
              name: cData.name?.common || country,
              capital: cData.capital?.[0],
              population: cData.population,
              area: cData.area,
              region: cData.region,
              languages: cData.languages,
              currencies: cData.currencies,
              gdp: wbData['NY.GDP.MKTP.CD']?.value,
              lifeExpectancy: wbData['SP.DYN.LE00.IN']?.value,
            });
          }
          recordFetch('restcountries');
        } catch {}
        setCountryLoading(false);
      });

      map = leafletMap;
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load map');
      setLoading(false);
    }
  });

  onCleanup(() => {
    for (const m of markers) m.remove();
    for (const m of earthquakeMarkers) m.remove();
    tileLayer?.remove();
    map?.remove();
  });

  return (
    <div class="relative w-full h-full">
      <div
        ref={mapRef}
        class="w-full h-full"
        style="background: var(--bg-secondary);"
        role="region"
        aria-label="Interactive world map with earthquake markers and capital indicators"
      />

      {loading() && (
        <div
          class="absolute inset-0 flex items-center justify-center z-10"
          style="background: var(--bg-secondary);"
        >
          <div class="text-center">
            <div
              class="w-8 h-8 border-2 mb-3 mx-auto"
              style="border-color: var(--border); border-top-color: var(--accent); animation: spin 1s linear infinite;"
            />
            <p class="code-text" style="color: var(--text-secondary);">
              Loading map...
            </p>
          </div>
        </div>
      )}

      {error() && (
        <div
          class="absolute inset-0 flex items-center justify-center p-6 z-10"
          style="background: var(--bg-secondary);"
        >
          <div class="text-center">
            <p class="code-text mb-2" style="color: var(--accent-warm);">
              MAP ERROR
            </p>
            <p class="text-sm" style="color: var(--text-secondary);">
              {error()}
            </p>
          </div>
        </div>
      )}

      {selectedCountry() && (
        <div
          class="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-sm p-4 border font-mono text-xs z-10"
          style="background: var(--bg-card); border-color: var(--border); color: var(--text-secondary); backdrop-filter: blur(12px);"
        >
          <div class="flex items-center justify-between mb-3">
            <p class="font-mono text-sm font-bold" style="color: var(--accent);">
              {countryData()?.name || selectedCountry()}
            </p>
            <button
              type="button"
              class="text-xs cursor-pointer"
              style="color: var(--text-secondary);"
              onClick={() => {
                setSelectedCountry(null);
                setCountryData(null);
              }}
            >
              Close
            </button>
          </div>

          {countryLoading() && (
            <div class="space-y-2">
              <div
                class="h-2 w-full"
                style="background: var(--border); animation: pulse 1.5s infinite;"
              />
              <div
                class="h-2 w-2/3"
                style="background: var(--border); animation: pulse 1.5s infinite;"
              />
              <div
                class="h-2 w-1/2"
                style="background: var(--border); animation: pulse 1.5s infinite;"
              />
            </div>
          )}

          {!countryLoading() && countryData() && (
            <div class="space-y-1.5">
              {countryData()?.capital && (
                <div class="flex justify-between">
                  <span>Capital</span>
                  <span style="color: var(--text-primary);">{countryData()?.capital}</span>
                </div>
              )}
              {countryData()?.population && (
                <div class="flex justify-between">
                  <span>Population</span>
                  <span style="color: var(--text-primary);">
                    {((countryData()?.population ?? 0) / 1e6).toFixed(1)}M
                  </span>
                </div>
              )}
              {countryData()?.area && (
                <div class="flex justify-between">
                  <span>Area</span>
                  <span style="color: var(--text-primary);">
                    {(countryData()?.area ?? 0).toLocaleString()} km²
                  </span>
                </div>
              )}
              {countryData()?.region && (
                <div class="flex justify-between">
                  <span>Region</span>
                  <span style="color: var(--text-primary);">{countryData()?.region}</span>
                </div>
              )}
              {countryData()?.lifeExpectancy && (
                <div class="flex justify-between">
                  <span>Life Exp.</span>
                  <span style="color: var(--text-primary);">
                    {countryData()?.lifeExpectancy?.toFixed(1)} yrs
                  </span>
                </div>
              )}
              {countryData()?.gdp && (
                <div class="flex justify-between">
                  <span>GDP</span>
                  <span style="color: var(--accent);">
                    ${((countryData()?.gdp ?? 0) / 1e12).toFixed(2)}T
                  </span>
                </div>
              )}
              {countryData()?.languages && (
                <div class="pt-1 border-t" style="border-color: var(--border);">
                  <span class="block mb-1">Languages</span>
                  <span style="color: var(--text-primary);">
                    {Object.values(countryData()?.languages ?? {}).join(', ')}
                  </span>
                </div>
              )}
              {countryData()?.currencies && (
                <div class="pt-1 border-t" style="border-color: var(--border);">
                  <span class="block mb-1">Currency</span>
                  <span style="color: var(--text-primary);">
                    {Object.values(countryData()?.currencies ?? {})
                      .map((c) => `${c.name} (${c.symbol || ''})`)
                      .join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {!countryLoading() && !countryData() && selectedCountry() && (
            <p style="color: var(--text-secondary);">No data available for this location.</p>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        .leaflet-popup-content-wrapper {
          background: var(--bg-card) !important;
          color: var(--text-primary) !important;
          border: 1px solid var(--border) !important;
          border-radius: 0 !important;
        }
        .leaflet-popup-tip {
          background: var(--bg-card) !important;
        }
      `}</style>
    </div>
  );
}
