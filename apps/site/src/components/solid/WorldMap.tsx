import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import type { EarthquakeFeature } from '../../lib/types';

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

export default function WorldMap() {
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [selectedCountry, setSelectedCountry] = createSignal<string | null>(null);

  let mapRef: HTMLDivElement | undefined;
  let map: MapInstance | undefined;
  const markers: Marker[] = [];
  let tileLayer: TileLayer | undefined;

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

      CAPITALS.forEach((cap) => {
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
      });

      const res = await fetch('/api/earthquakes');
      if (!res.ok) throw new Error('Failed to fetch earthquakes');
      const data = await res.json();

      if (data.features) {
        data.features.forEach((eq: EarthquakeFeature) => {
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
                <div style="color:#888">${eq.properties.place ?? 'Unknown'}</div>
                <div style="color:#888">${new Date(eq.properties.time).toLocaleString()}</div>
                <a href="${eq.properties.url}" target="_blank" style="color:#00e5ff">USGS Details</a>
              </div>`,
            )
            .addTo(leafletMap);
          markers.push(m);
        });
      }

      leafletMap.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        setSelectedCountry(`Lat: ${e.latlng.lat.toFixed(2)}, Lon: ${e.latlng.lng.toFixed(2)}`);
      });

      map = leafletMap;
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load map');
      setLoading(false);
    }
  });

  onCleanup(() => {
    markers.forEach((m) => m.remove());
    tileLayer?.remove();
    map?.remove();
  });

  return (
    <div class="relative w-full h-full">
      <Show when={!loading()}>
        <div
          ref={mapRef}
          class="w-full h-full"
          style="background: var(--bg-secondary);"
          role="region"
          aria-label="Interactive world map with earthquake markers and capital indicators"
        />
      </Show>

      <Show when={loading()}>
        <div
          class="absolute inset-0 flex items-center justify-center"
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
      </Show>

      <Show when={error()}>
        <div
          class="absolute inset-0 flex items-center justify-center p-6"
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
      </Show>

      <Show when={selectedCountry()}>
        <div
          class="absolute bottom-4 left-4 px-3 py-2 border font-mono text-xs"
          style="background: var(--bg-card); border-color: var(--border); color: var(--text-secondary); backdrop-filter: blur(8px);"
        >
          {selectedCountry()}
        </div>
      </Show>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
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
