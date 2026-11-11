import {
  addDeprecationHeaders,
  addVersionHeaders,
  handleAurora,
  handleBinanceKlines,
  handleCoinGeckoGlobal,
  handleCryptoTicker,
  handleCspReport,
  handleEarthquakes,
  handleEtfPrice,
  handleExchangeRates,
  handleFearGreed,
  handleFred,
  handleGithubTrending,
  handleGuestbookDelete,
  handleGuestbookGet,
  handleGuestbookPost,
  handleHackerNews,
  handleKpIndex,
  handleLlmBenchmarks,
  handleMempool,
  handleMetrics,
  handleRestCountries,
  handleSocialSentiment,
  handleSpaceLaunches,
  handleStockChart,
  handleStockQuote,
  handleSwpcAlerts,
  handleVersions,
  handleWeather,
  handleWorldBank,
  resolveVersionedRoute,
} from './handlers';
import { handleCryptoTickerSSE, handleMetricsSSE } from './handlers/sse';
import { clearTraceId, log, setTraceId } from './logger';
import { checkAlerts, metrics, recordResponseTime } from './metrics';
import { error, json } from './security';
import type { Env } from './types';

const LATEST_VERSION = 'v1';

export type { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const start = Date.now();
    metrics.requests++;
    const traceId = request.headers.get('cf-ray') || crypto.randomUUID();
    setTraceId(traceId);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      let response: Response;
      let isVersioned = false;
      let apiVersion = LATEST_VERSION;

      const { version, route, isVersioned: versioned } = resolveVersionedRoute(path);
      isVersioned = versioned;
      if (version) apiVersion = version;

      const routePath = isVersioned ? `/api${route}` : path;

      if (routePath === '/api/versions') {
        response = handleVersions();
      } else if (routePath === '/api/health') {
        response = json({ status: 'ok', environment: env.ENVIRONMENT, timestamp: Date.now() });
      } else if (routePath === '/api/weather') {
        response = await handleWeather(request);
      } else if (routePath === '/api/stock-chart') {
        response = await handleStockChart(request);
      } else if (routePath === '/api/crypto-ticker') {
        response = await handleCryptoTicker();
      } else if (routePath === '/api/coingecko-global') {
        response = await handleCoinGeckoGlobal();
      } else if (routePath === '/api/earthquakes') {
        response = await handleEarthquakes();
      } else if (routePath === '/api/fear-greed') {
        response = await handleFearGreed();
      } else if (routePath === '/api/kp-index') {
        response = await handleKpIndex();
      } else if (routePath === '/api/swpc-alerts') {
        response = await handleSwpcAlerts();
      } else if (routePath === '/api/aurora') {
        response = await handleAurora(request);
      } else if (routePath === '/api/space-launches') {
        response = await handleSpaceLaunches();
      } else if (routePath === '/api/mempool') {
        response = await handleMempool();
      } else if (routePath === '/api/binance-klines') {
        response = await handleBinanceKlines(request);
      } else if (routePath === '/api/hacker-news') {
        response = await handleHackerNews();
      } else if (routePath === '/api/github-trending') {
        response = await handleGithubTrending();
      } else if (routePath === '/api/llm-benchmarks') {
        response = await handleLlmBenchmarks(env);
      } else if (routePath === '/api/exchange-rates') {
        response = await handleExchangeRates();
      } else if (routePath === '/api/stock-quote') {
        response = await handleStockQuote(new URL(request.url));
      } else if (routePath === '/api/fred') {
        response = await handleFred();
      } else if (routePath === '/api/social-sentiment') {
        response = await handleSocialSentiment();
      } else if (routePath === '/api/restcountries') {
        const code = new URL(request.url).searchParams.get('code') || '';
        response = await handleRestCountries(code);
      } else if (routePath === '/api/world-bank') {
        response = await handleWorldBank(new URL(request.url));
      } else if (routePath === '/api/etf-price') {
        response = await handleEtfPrice(request);
      } else if (routePath === '/api/metrics') {
        response = handleMetrics();
      } else if (routePath === '/api/csp-report') {
        response = await handleCspReport(request);
      } else if (routePath === '/api/guestbook') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (request.method === 'GET') {
          response = await handleGuestbookGet(request, env);
        } else if (request.method === 'POST') {
          response = await handleGuestbookPost(request, env, ip);
        } else if (request.method === 'DELETE') {
          response = await handleGuestbookDelete(request, env);
        } else {
          response = error('Method not allowed', 405);
        }
      } else if (routePath === '/api/crypto-ticker/stream') {
        response = await handleCryptoTickerSSE(request);
      } else if (routePath === '/api/metrics/stream') {
        response = await handleMetricsSSE(request);
      } else {
        response = error('Not found', 404);
      }

      response = addVersionHeaders(response, apiVersion);

      if (!isVersioned && path.startsWith('/api/') && path !== '/api/versions') {
        response = addDeprecationHeaders(response);
      }

      const duration = Date.now() - start;
      recordResponseTime(path, duration);
      response.headers.set('X-Response-Time', `${duration}ms`);
      log('info', 'request', { path, status: response.status, duration, method: request.method });
      clearTraceId();
      return response;
    } catch (e) {
      metrics.errors++;
      checkAlerts();
      log('error', 'unhandled error', { path, error: String(e) });
      clearTraceId();
      return error('Internal server error', 500);
    }
  },
};
