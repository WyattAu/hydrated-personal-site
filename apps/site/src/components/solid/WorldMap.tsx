import { createSignal, onCleanup, onMount } from 'solid-js';
import { apiBase } from '../../lib/api-base';
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
  gdpPerCapita?: number;
  unemployment?: number;
  infantMortality?: number;
  healthExpenditure?: number;
  literacyRate?: number;
  giniIndex?: number;
  arableLand?: number;
  electricyPerCapita?: number;
  internetUsers?: number;
  manufacturing?: number;
  co2PerCapita?: number;
  urbanPopulation?: number;
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
  { name: 'Bangkok', lat: 13.7563, lon: 100.5018, country: 'TH' },
  { name: 'Hanoi', lat: 21.0285, lon: 105.8542, country: 'VN' },
  { name: 'Manila', lat: 14.5995, lon: 120.9842, country: 'PH' },
  { name: 'Kuala Lumpur', lat: 3.139, lon: 101.6869, country: 'MY' },
  { name: 'Tehran', lat: 35.6892, lon: 51.389, country: 'IR' },
  { name: 'Baghdad', lat: 33.3152, lon: 44.3661, country: 'IQ' },
  { name: 'Islamabad', lat: 33.6844, lon: 73.0479, country: 'PK' },
  { name: 'Dhaka', lat: 23.8103, lon: 90.4125, country: 'BD' },
  { name: 'Taipei', lat: 25.033, lon: 121.5654, country: 'TW' },
  { name: 'Madrid', lat: 40.4168, lon: -3.7038, country: 'ES' },
  { name: 'Lisbon', lat: 38.7223, lon: -9.1393, country: 'PT' },
  { name: 'Amsterdam', lat: 52.3676, lon: 4.9041, country: 'NL' },
  { name: 'Brussels', lat: 50.8503, lon: 4.3517, country: 'BE' },
  { name: 'Vienna', lat: 48.2082, lon: 16.3738, country: 'AT' },
  { name: 'Stockholm', lat: 59.3293, lon: 18.0686, country: 'SE' },
  { name: 'Oslo', lat: 59.9139, lon: 10.7522, country: 'NO' },
  { name: 'Copenhagen', lat: 55.6761, lon: 12.5683, country: 'DK' },
  { name: 'Helsinki', lat: 60.1699, lon: 24.9384, country: 'FI' },
  { name: 'Dublin', lat: 53.3498, lon: -6.2603, country: 'IE' },
  { name: 'Warsaw', lat: 52.2297, lon: 21.0122, country: 'PL' },
  { name: 'Prague', lat: 50.0755, lon: 14.4378, country: 'CZ' },
  { name: 'Budapest', lat: 47.4979, lon: 19.0402, country: 'HU' },
  { name: 'Bucharest', lat: 44.4268, lon: 26.1025, country: 'RO' },
  { name: 'Athens', lat: 37.9838, lon: 23.7275, country: 'GR' },
  { name: 'Sofia', lat: 42.6977, lon: 23.3219, country: 'BG' },
  { name: 'Belgrade', lat: 44.7866, lon: 20.4489, country: 'RS' },
  { name: 'Kyiv', lat: 50.4501, lon: 30.5234, country: 'UA' },
  { name: 'Buenos Aires', lat: -34.6037, lon: -58.3816, country: 'AR' },
  { name: 'Santiago', lat: -33.4489, lon: -70.6693, country: 'CL' },
  { name: 'Lima', lat: -12.0464, lon: -77.0428, country: 'PE' },
  { name: 'Bogota', lat: 4.711, lon: -74.0721, country: 'CO' },
  { name: 'Caracas', lat: 10.4806, lon: -66.9036, country: 'VE' },
  { name: 'Lagos', lat: 6.5244, lon: 3.3792, country: 'NG' },
  { name: 'Johannesburg', lat: -26.2041, lon: 28.0473, country: 'ZA' },
  { name: 'Cape Town', lat: -33.9249, lon: 18.4241, country: 'ZA' },
  { name: 'Addis Ababa', lat: 9.0249, lon: 38.7469, country: 'ET' },
  { name: 'Accra', lat: 5.6037, lon: -0.187, country: 'GH' },
  { name: 'Casablanca', lat: 33.5731, lon: -7.5898, country: 'MA' },
  { name: 'Lagos', lat: 6.5244, lon: 3.3792, country: 'NG' },
  { name: 'Algiers', lat: 36.7538, lon: 3.0588, country: 'DZ' },
  { name: 'Tunis', lat: 36.8065, lon: 10.1815, country: 'TN' },
  { name: 'Abu Dhabi', lat: 24.4539, lon: 54.3773, country: 'AE' },
  { name: 'Doha', lat: 25.2854, lon: 51.531, country: 'QA' },
  { name: 'Tel Aviv', lat: 32.0853, lon: 34.7818, country: 'IL' },
  { name: 'Amman', lat: 31.9454, lon: 35.9284, country: 'JO' },
  { name: 'Damascus', lat: 33.5138, lon: 36.2765, country: 'SY' },
  { name: 'Beirut', lat: 33.8938, lon: 35.5018, country: 'LB' },
  { name: 'Kabul', lat: 34.5553, lon: 69.2075, country: 'AF' },
  { name: 'Astana', lat: 51.1605, lon: 71.4704, country: 'KZ' },
  { name: 'Tashkent', lat: 41.2995, lon: 69.2401, country: 'UZ' },
  { name: 'Baku', lat: 40.4093, lon: 49.8671, country: 'AZ' },
  { name: 'Tbilisi', lat: 41.6938, lon: 44.8015, country: 'GE' },
  { name: 'Yerevan', lat: 40.1792, lon: 44.4991, country: 'AM' },
  { name: 'Reykjavik', lat: 64.1466, lon: -21.9426, country: 'IS' },
  { name: 'Bern', lat: 46.948, lon: 7.4474, country: 'CH' },
  { name: 'Luxembourg', lat: 49.6116, lon: 6.1319, country: 'LU' },
  { name: 'Valletta', lat: 35.8989, lon: 14.5146, country: 'MT' },
  { name: 'Nicosia', lat: 35.1856, lon: 33.3823, country: 'CY' },
  { name: 'Zagreb', lat: 45.815, lon: 15.9819, country: 'HR' },
  { name: 'Ljubljana', lat: 46.0569, lon: 14.5058, country: 'SI' },
  { name: 'Bratislava', lat: 48.1486, lon: 17.1077, country: 'SK' },
  { name: 'Vilnius', lat: 54.6872, lon: 25.2797, country: 'LT' },
  { name: 'Riga', lat: 56.9496, lon: 24.1052, country: 'LV' },
  { name: 'Tallinn', lat: 59.437, lon: 24.7536, country: 'EE' },
  { name: 'Kingston', lat: 18.0179, lon: -76.8099, country: 'JM' },
  { name: 'Havana', lat: 23.1136, lon: -82.3666, country: 'CU' },
  { name: 'Santo Domingo', lat: 18.4861, lon: -69.9312, country: 'DO' },
  { name: 'Panama City', lat: 8.9824, lon: -79.5199, country: 'PA' },
  { name: 'San Jose', lat: 9.9281, lon: -84.0907, country: 'CR' },
  { name: 'Quito', lat: -0.1807, lon: -78.4678, country: 'EC' },
  { name: 'La Paz', lat: -16.5, lon: -68.15, country: 'BO' },
  { name: 'Montevideo', lat: -34.9011, lon: -56.1645, country: 'UY' },
  { name: 'Asuncion', lat: -25.2637, lon: -57.5759, country: 'PY' },
  { name: 'Caracas', lat: 10.4806, lon: -66.9036, country: 'VE' },
  { name: 'Wellington', lat: -41.2865, lon: 174.7762, country: 'NZ' },
  { name: 'Port Moresby', lat: -9.4438, lon: 147.1803, country: 'PG' },
  { name: 'Suva', lat: -18.1416, lon: 178.4419, country: 'FJ' },
  { name: 'Honiara', lat: -9.4456, lon: 159.9729, country: 'SB' },
  { name: 'Apia', lat: -13.8333, lon: -171.7667, country: 'WS' },
  { name: "Nuku'alofa", lat: -21.1393, lon: -175.2046, country: 'TO' },
  { name: 'Funafuti', lat: -8.5211, lon: 179.1965, country: 'TV' },
  { name: 'Tarawa', lat: 1.4518, lon: 172.973, country: 'KI' },
  { name: 'Majuro', lat: 7.1167, lon: 171.1833, country: 'MH' },
  { name: 'Palikir', lat: 6.9248, lon: 158.1611, country: 'FM' },
  { name: 'Yaren', lat: -0.5477, lon: 166.9209, country: 'NR' },
  { name: 'Addis Ababa', lat: 9.0249, lon: 38.7469, country: 'ET' },
  { name: 'Kampala', lat: 0.3476, lon: 32.5825, country: 'UG' },
  { name: 'Dar es Salaam', lat: -6.7924, lon: 39.2083, country: 'TZ' },
  { name: 'Lusaka', lat: -15.3875, lon: 28.3228, country: 'ZM' },
  { name: 'Harare', lat: -17.8252, lon: 31.0335, country: 'ZW' },
  { name: 'Maputo', lat: -25.9692, lon: 32.5732, country: 'MZ' },
  { name: 'Windhoek', lat: -22.5609, lon: 17.0658, country: 'NA' },
  { name: 'Gaborone', lat: -24.6282, lon: 25.9231, country: 'BW' },
  { name: 'Maseru', lat: -29.3151, lon: 27.4869, country: 'LS' },
  { name: 'Mbabane', lat: -26.3054, lon: 31.1367, country: 'SZ' },
  { name: 'Antananarivo', lat: -18.8792, lon: 47.5079, country: 'MG' },
  { name: 'Mogadishu', lat: 2.0469, lon: 45.3182, country: 'SO' },
  { name: 'Khartoum', lat: 15.5007, lon: 32.5599, country: 'SD' },
  { name: 'Tripoli', lat: 32.8872, lon: 13.1913, country: 'LY' },
  { name: 'Nouakchott', lat: 18.0735, lon: -15.9582, country: 'MR' },
  { name: 'Bamako', lat: 12.6392, lon: -8.0029, country: 'ML' },
  { name: 'Ouagadougou', lat: 12.3714, lon: -1.5197, country: 'BF' },
  { name: 'Dakar', lat: 14.7167, lon: -17.4677, country: 'SN' },
  { name: 'Conakry', lat: 9.6412, lon: -13.5784, country: 'GN' },
  { name: 'Freetown', lat: 8.4657, lon: -13.2317, country: 'SL' },
  { name: 'Monrovia', lat: 6.3008, lon: -10.7969, country: 'LR' },
  { name: 'Abidjan', lat: 5.36, lon: -4.0083, country: 'CI' },
  { name: 'Lome', lat: 6.1725, lon: 1.2314, country: 'TG' },
  { name: 'Cotonou', lat: 6.3654, lon: 2.4183, country: 'BJ' },
  { name: 'Yaounde', lat: 3.848, lon: 11.5021, country: 'CM' },
  { name: 'Malabo', lat: 3.7523, lon: 8.7741, country: 'GQ' },
  { name: 'Libreville', lat: 0.4162, lon: 9.4673, country: 'GA' },
  { name: 'Brazzaville', lat: -4.2634, lon: 15.2429, country: 'CG' },
  { name: 'Kinshasa', lat: -4.4419, lon: 15.2663, country: 'CD' },
  { name: 'Luanda', lat: -8.839, lon: 13.2894, country: 'AO' },
  { name: 'Niamey', lat: 13.5117, lon: 2.1251, country: 'NE' },
  { name: "N'Djamena", lat: 12.1348, lon: 15.0557, country: 'TD' },
  { name: 'Bangui', lat: 4.3947, lon: 18.5582, country: 'CF' },
  { name: 'Bujumbura', lat: -3.3614, lon: 29.3599, country: 'BI' },
  { name: 'Kigali', lat: -1.9706, lon: 30.1044, country: 'RW' },
  { name: 'Djibouti', lat: 11.8251, lon: 42.5903, country: 'DJ' },
  { name: 'Asmara', lat: 15.3229, lon: 38.9251, country: 'ER' },
  { name: 'Antigua', lat: 17.121, lon: -61.8457, country: 'AG' },
  { name: 'Nassau', lat: 25.0343, lon: -77.3963, country: 'BS' },
  { name: 'Bridgetown', lat: 13.1939, lon: -59.5432, country: 'BB' },
  { name: 'Belmopan', lat: 17.2514, lon: -88.759, country: 'BZ' },
  { name: 'Port-au-Prince', lat: 18.5944, lon: -72.3074, country: 'HT' },
  { name: 'Tegucigalpa', lat: 14.0723, lon: -87.1921, country: 'HN' },
  { name: 'Managua', lat: 12.1149, lon: -86.2362, country: 'NI' },
  { name: 'San Salvador', lat: 13.6929, lon: -89.2182, country: 'SV' },
  { name: 'Guatemala City', lat: 14.6349, lon: -90.5069, country: 'GT' },
  { name: 'Vaduz', lat: 47.141, lon: 9.5209, country: 'LI' },
  { name: 'Monaco', lat: 43.7384, lon: 7.4246, country: 'MC' },
  { name: 'San Marino', lat: 43.9424, lon: 12.4578, country: 'SM' },
  { name: 'Andorra la Vella', lat: 42.5063, lon: 1.5218, country: 'AD' },
  { name: 'Vatican City', lat: 41.9029, lon: 12.4534, country: 'VA' },
  { name: 'Podgorica', lat: 42.4304, lon: 19.2594, country: 'ME' },
  { name: 'Tirana', lat: 41.3275, lon: 19.8187, country: 'AL' },
  { name: 'Skopje', lat: 41.9981, lon: 21.4254, country: 'MK' },
  { name: 'Sarajevo', lat: 43.8563, lon: 18.4131, country: 'BA' },
  { name: 'Pristina', lat: 42.6629, lon: 21.1655, country: 'XK' },
  { name: 'Chisinau', lat: 47.0105, lon: 28.8638, country: 'MD' },
  { name: 'Minsk', lat: 53.9006, lon: 27.5591, country: 'BY' },
  { name: 'Pyongyang', lat: 39.0392, lon: 125.7625, country: 'KP' },
  { name: 'Ulaanbaatar', lat: 47.8864, lon: 106.9057, country: 'MN' },
  { name: 'Phnom Penh', lat: 11.5564, lon: 104.9282, country: 'KH' },
  { name: 'Vientiane', lat: 17.9757, lon: 102.6331, country: 'LA' },
  { name: 'Yangon', lat: 16.8409, lon: 96.1735, country: 'MM' },
  { name: 'Kathmandu', lat: 27.7172, lon: 85.324, country: 'NP' },
  { name: 'Colombo', lat: 6.9271, lon: 79.8612, country: 'LK' },
  { name: 'Male', lat: 4.1755, lon: 73.5093, country: 'MV' },
  { name: 'Thimphu', lat: 27.4728, lon: 89.639, country: 'BT' },
  { name: 'Bandar Seri Begawan', lat: 4.9031, lon: 114.9398, country: 'BN' },
  { name: 'Dili', lat: -8.5569, lon: 125.5603, country: 'TL' },
  { name: 'Port Vila', lat: -17.7333, lon: 168.3217, country: 'VU' },
  { name: 'Ngerulmud', lat: 7.5006, lon: 134.6242, country: 'PW' },
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

// GeoJSON borders loaded at runtime
let geojsonLayer: any = null;

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
  } catch (e) {
    console.error('[WorldMap:loadCachedEarthquakes]', e);
    return [];
  }
}

function storeCachedEarthquakes(features: EarthquakeFeature[]): void {
  try {
    localStorage.setItem(EQ_CACHE_KEY, JSON.stringify({ features, timestamp: Date.now() }));
  } catch (e) {
    console.error('[WorldMap:storeCachedEarthquakes]', e);
  }
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
    'United States of America': 'US',
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
    'Russian Federation': 'RU',
    China: 'CN',
    Japan: 'JP',
    'South Korea': 'KR',
    'Republic of Korea': 'KR',
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
    'Islamic Republic of Iran': 'IR',
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
    Czechia: 'CZ',
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
    'United Arab Emirates': 'AE',
    Nepal: 'NP',
    'Sri Lanka': 'LK',
    Myanmar: 'MM',
    Cambodia: 'KH',
    Laos: 'LA',
    Mongolia: 'MN',
    Afghanistan: 'AF',
    Belarus: 'BY',
    Kazakhstan: 'KZ',
    Uzbekistan: 'UZ',
    Azerbaijan: 'AZ',
    Georgia: 'GE',
    Armenia: 'AM',
    Moldova: 'MD',
    'North Macedonia': 'MK',
    Albania: 'AL',
    'Bosnia and Herzegovina': 'BA',
    Montenegro: 'ME',
    Kosovo: 'XK',
    Senegal: 'SN',
    Cameroon: 'CM',
    Angola: 'AO',
    Sudan: 'SD',
    Tunisia: 'TN',
    Libya: 'LY',
    Uganda: 'UG',
    Zambia: 'ZM',
    Zimbabwe: 'ZW',
    Mozambique: 'MZ',
    Namibia: 'NA',
    Botswana: 'BW',
    Madagascar: 'MG',
    Mali: 'ML',
    'Burkina Faso': 'BF',
    Niger: 'NE',
    Chad: 'TD',
    Mauritania: 'MR',
    Liberia: 'LR',
    'Sierra Leone': 'SL',
    Togo: 'TG',
    Benin: 'BJ',
    Gabon: 'GA',
    Congo: 'CG',
    'Democratic Republic of the Congo': 'CD',
    'DR Congo': 'CD',
    Rwanda: 'RW',
    Burundi: 'BI',
    Djibouti: 'DJ',
    Eritrea: 'ER',
    'South Sudan': 'SS',
    'Central African Republic': 'CF',
    'Equatorial Guinea': 'GQ',
    Somalia: 'SO',
    Malawi: 'MW',
    Lesotho: 'LS',
    Eswatini: 'SZ',
    Comoros: 'KM',
    'Costa Rica': 'CR',
    Panama: 'PA',
    Guatemala: 'GT',
    Honduras: 'HN',
    'El Salvador': 'SV',
    Nicaragua: 'NI',
    Belize: 'BZ',
    'Dominican Republic': 'DO',
    Haiti: 'HT',
    Jamaica: 'JM',
    Bahamas: 'BS',
    Barbados: 'BB',
    Trinidad: 'TT',
    'Trinidad and Tobago': 'TT',
    Ecuador: 'EC',
    Bolivia: 'BO',
    Paraguay: 'PY',
    Uruguay: 'UY',
    Guyana: 'GY',
    Suriname: 'SR',
    Taiwan: 'TW',
    'Republic of China': 'TW',
    Brunei: 'BN',
    'Papua New Guinea': 'PG',
    Fiji: 'FJ',
    'Solomon Islands': 'SB',
    Vanuatu: 'VU',
    Samoa: 'WS',
    Tonga: 'TO',
    Tuvalu: 'TV',
    Kiribati: 'KI',
    'Marshall Islands': 'MH',
    Micronesia: 'FM',
    Palau: 'PW',
    Nauru: 'NR',
    'Antigua and Barbuda': 'AG',
    'Saint Lucia': 'LC',
    'Saint Vincent': 'VC',
    Dominica: 'DM',
    Grenada: 'GD',
    'Saint Kitts': 'KN',
    Seychelles: 'SC',
    Mauritius: 'MU',
    'Cape Verde': 'CV',
    'Cabo Verde': 'CV',
    'Sao Tome': 'ST',
    'East Timor': 'TL',
    Timor: 'TL',
    Yemen: 'YE',
    Syria: 'SY',
    Liechtenstein: 'LI',
    Monaco: 'MC',
    'San Marino': 'SM',
    Andorra: 'AD',
    'Vatican City': 'VA',
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

  function loadCountryBorders(L: typeof import('leaflet'), leafletMap: any) {
    fetch(
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
    )
      .then((r) => r.json())
      .then((geojson) => {
        geojsonLayer = L.geoJSON(geojson, {
          style: {
            color: 'var(--accent)',
            weight: 1,
            opacity: 0.3,
            fillColor: 'transparent',
            fillOpacity: 0,
          },
          onEachFeature: (feature: any, layer: any) => {
            const name = feature.properties?.NAME || feature.properties?.ADMIN || 'Unknown';
            const iso = feature.properties?.ISO_A2 || feature.properties?.ISO_A2_EH || '';
            layer.on('click', async () => {
              setSelectedCountry(name);
              setCountryData(null);
              setCountryLoading(true);
              if (!iso || iso === '-99') {
                setCountryLoading(false);
                return;
              }
              try {
                // Phase 1: Fast basic data (capital, region) - show immediately
                const countryRes = await fetch(`${apiBase()}/api/restcountries?code=${iso}`);
                const cData = countryRes.ok ? await countryRes.json() : null;
                if (cData) {
                  setCountryData({
                    name: cData.name?.common || name,
                    capital: Array.isArray(cData.capital) ? cData.capital[0] : cData.capital,
                    region: cData.region,
                    languages: cData.languages || {},
                    currencies: cData.currencies || {},
                  });
                  setCountryLoading(false);
                }

                // Phase 2: Key indicators (population, GDP, life exp) - load next
                const wbKeyRes = await fetch(
                  `/api/world-bank?country=${iso}&indicators=SP.POP.TOTL,NY.GDP.MKTP.CD,SP.DYN.LE00.IN,NY.GDP.PCAP.CD`,
                );
                const wbKey = wbKeyRes.ok ? await wbKeyRes.json() : {};
                setCountryData((prev) =>
                  prev
                    ? {
                        ...prev,
                        population:
                          typeof wbKey['SP.POP.TOTL'] === 'number'
                            ? wbKey['SP.POP.TOTL']
                            : undefined,
                        gdp:
                          typeof wbKey['NY.GDP.MKTP.CD'] === 'number'
                            ? wbKey['NY.GDP.MKTP.CD']
                            : undefined,
                        lifeExpectancy:
                          typeof wbKey['SP.DYN.LE00.IN'] === 'number'
                            ? wbKey['SP.DYN.LE00.IN']
                            : undefined,
                        gdpPerCapita:
                          typeof wbKey['NY.GDP.PCAP.CD'] === 'number'
                            ? wbKey['NY.GDP.PCAP.CD']
                            : undefined,
                      }
                    : prev,
                );

                // Phase 3: Extended indicators - load in background
                const wbExtRes = await fetch(
                  `/api/world-bank?country=${iso}&indicators=SL.UEM.TOTL.ZS,SH.DYN.MORT,SH.XPD.CHEX.GD.ZS,SE.ADT.LITR.ZS,SI.POV.GINI,AG.LND.ARBL.HA.PC,EG.USE.ELEC.KH.PC,IT.NET.USER.ZS,NV.IND.MANF.ZS,EN.ATM.CO2E.PC,SP.URB.TOTL.IN.ZS`,
                );
                const wbExt = wbExtRes.ok ? await wbExtRes.json() : {};
                setCountryData((prev) =>
                  prev
                    ? {
                        ...prev,
                        unemployment:
                          typeof wbExt['SL.UEM.TOTL.ZS'] === 'number'
                            ? wbExt['SL.UEM.TOTL.ZS']
                            : undefined,
                        infantMortality:
                          typeof wbExt['SH.DYN.MORT'] === 'number'
                            ? wbExt['SH.DYN.MORT']
                            : undefined,
                        healthExpenditure:
                          typeof wbExt['SH.XPD.CHEX.GD.ZS'] === 'number'
                            ? wbExt['SH.XPD.CHEX.GD.ZS']
                            : undefined,
                        literacyRate:
                          typeof wbExt['SE.ADT.LITR.ZS'] === 'number'
                            ? wbExt['SE.ADT.LITR.ZS']
                            : undefined,
                        giniIndex:
                          typeof wbExt['SI.POV.GINI'] === 'number'
                            ? wbExt['SI.POV.GINI']
                            : undefined,
                        arableLand:
                          typeof wbExt['AG.LND.ARBL.HA.PC'] === 'number'
                            ? wbExt['AG.LND.ARBL.HA.PC']
                            : undefined,
                        electricyPerCapita:
                          typeof wbExt['EG.USE.ELEC.KH.PC'] === 'number'
                            ? wbExt['EG.USE.ELEC.KH.PC']
                            : undefined,
                        internetUsers:
                          typeof wbExt['IT.NET.USER.ZS'] === 'number'
                            ? wbExt['IT.NET.USER.ZS']
                            : undefined,
                        manufacturing:
                          typeof wbExt['NV.IND.MANF.ZS'] === 'number'
                            ? wbExt['NV.IND.MANF.ZS']
                            : undefined,
                        co2PerCapita:
                          typeof wbExt['EN.ATM.CO2E.PC'] === 'number'
                            ? wbExt['EN.ATM.CO2E.PC']
                            : undefined,
                        urbanPopulation:
                          typeof wbExt['SP.URB.TOTL.IN.ZS'] === 'number'
                            ? wbExt['SP.URB.TOTL.IN.ZS']
                            : undefined,
                      }
                    : prev,
                );

                recordFetch('restcountries');
              } catch (e) {
                console.error('[WorldMap:countryDataFetch]', e);
              }
              setCountryLoading(false);
            });
            // Highlight on hover
            layer.on('mouseover', (e: any) => {
              e.target.setStyle({
                weight: 2,
                opacity: 0.8,
                fillColor: 'var(--accent)',
                fillOpacity: 0.1,
              });
            });
            layer.on('mouseout', (e: any) => {
              geojsonLayer.resetStyle(e.target);
            });
          },
        }).addTo(leafletMap);
      })
      .catch(() => {});
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
        const res = await fetch(`${apiBase()}/api/earthquakes`);
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
      } catch (e) {
        console.error('[WorldMap:earthquakeFetch]', e);
      }

      // Country click handled by GeoJSON layer
      loadCountryBorders(L, leafletMap);

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
    geojsonLayer?.remove();
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
          class="absolute inset-0 flex items-center justify-center"
          style="z-index: 1000; background: var(--bg-secondary);"
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
          class="absolute inset-0 flex items-center justify-center p-6"
          style="z-index: 1000; background: var(--bg-secondary);"
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
          class="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-sm p-4 border font-mono text-xs"
          style="background: var(--bg-card); border-color: var(--border); color: var(--text-secondary); backdrop-filter: blur(12px); z-index: 1000;"
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
            <div class="space-y-1.5 max-h-[40vh] overflow-y-auto">
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
              {countryData()?.gdpPerCapita && (
                <div class="flex justify-between">
                  <span>GDP/Capita</span>
                  <span style="color: var(--accent);">
                    $
                    {countryData()?.gdpPerCapita?.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              )}
              {countryData()?.unemployment && (
                <div class="flex justify-between">
                  <span>Unemployment</span>
                  <span style="color: var(--text-primary);">
                    {countryData()?.unemployment?.toFixed(1)}%
                  </span>
                </div>
              )}
              {countryData()?.infantMortality && (
                <div class="flex justify-between">
                  <span>Infant Mortality</span>
                  <span style="color: var(--text-primary);">
                    {countryData()?.infantMortality?.toFixed(1)}/1k
                  </span>
                </div>
              )}
              {countryData()?.healthExpenditure && (
                <div class="flex justify-between">
                  <span>Health Spending</span>
                  <span style="color: var(--text-primary);">
                    {countryData()?.healthExpenditure?.toFixed(1)}% GDP
                  </span>
                </div>
              )}
              {countryData()?.literacyRate && (
                <div class="flex justify-between">
                  <span>Literacy</span>
                  <span style="color: var(--text-primary);">
                    {countryData()?.literacyRate?.toFixed(1)}%
                  </span>
                </div>
              )}
              {countryData()?.giniIndex && (
                <div class="flex justify-between">
                  <span>Gini Index</span>
                  <span style="color: var(--text-primary);">
                    {countryData()?.giniIndex?.toFixed(1)}
                  </span>
                </div>
              )}
              {countryData()?.arableLand && (
                <div class="flex justify-between">
                  <span>Arable Land</span>
                  <span style="color: var(--text-primary);">
                    {countryData()?.arableLand?.toFixed(2)} ha/person
                  </span>
                </div>
              )}
              {countryData()?.electricyPerCapita && (
                <div class="flex justify-between">
                  <span>Electricity</span>
                  <span style="color: var(--text-primary);">
                    {countryData()?.electricyPerCapita?.toFixed(0)} kWh/cap
                  </span>
                </div>
              )}
              {countryData()?.internetUsers && (
                <div class="flex justify-between">
                  <span>Internet Users</span>
                  <span style="color: var(--text-primary);">
                    {countryData()?.internetUsers?.toFixed(1)}%
                  </span>
                </div>
              )}
              {countryData()?.manufacturing && (
                <div class="flex justify-between">
                  <span>Manufacturing</span>
                  <span style="color: var(--text-primary);">
                    {countryData()?.manufacturing?.toFixed(1)}% GDP
                  </span>
                </div>
              )}
              {countryData()?.co2PerCapita && (
                <div class="flex justify-between">
                  <span>CO2/Capita</span>
                  <span style="color: var(--accent-warm);">
                    {countryData()?.co2PerCapita?.toFixed(1)} t
                  </span>
                </div>
              )}
              {countryData()?.urbanPopulation && (
                <div class="flex justify-between">
                  <span>Urban Pop.</span>
                  <span style="color: var(--text-primary);">
                    {countryData()?.urbanPopulation?.toFixed(1)}%
                  </span>
                </div>
              )}
              {countryData()?.languages &&
                Object.keys(countryData()?.languages ?? {}).length > 0 && (
                  <div class="pt-1 border-t" style="border-color: var(--border);">
                    <span class="block mb-1">Languages</span>
                    <span style="color: var(--text-primary);">
                      {Object.values(countryData()?.languages ?? {}).join(', ')}
                    </span>
                  </div>
                )}
              {countryData()?.currencies &&
                Object.keys(countryData()?.currencies ?? {}).length > 0 && (
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
