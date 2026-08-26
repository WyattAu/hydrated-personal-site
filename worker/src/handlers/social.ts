import { getCached, setCache } from '../cache';
import { fetchJson } from '../fetch';
import { log } from '../logger';
import { error, json } from '../security';

export async function handleHackerNews(): Promise<Response> {
  const cached = getCached('hacker-news');
  if (cached) return json(cached);

  try {
    const ids = (await fetchJson(
      'https://hacker-news.firebaseio.com/v0/topstories.json',
      'hn-top',
    )) as number[];
    const topIds = ids.slice(0, 30);

    // Batched fetch with allSettled
    const batchSize = 10;
    const stories: Array<{
      id: number;
      title: string;
      url?: string;
      score: number;
      author: string;
      time: number;
      comments: number;
    }> = [];

    for (let i = 0; i < topIds.length; i += batchSize) {
      const batch = topIds.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((id) =>
          fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, `hn-item-${id}`),
        ),
      );
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const story = result.value as {
            id: number;
            title: string;
            url?: string;
            score: number;
            by: string;
            time: number;
            descendants?: number;
          };
          stories.push({
            id: story.id,
            title: story.title,
            url: story.url,
            score: story.score,
            author: story.by,
            time: story.time,
            comments: story.descendants ?? 0,
          });
        }
      }
    }

    setCache('hacker-news', stories, 5 * 60 * 1000);
    return json(stories);
  } catch (e) {
    log('error', 'hacker news fetch failed', { error: String(e) });
    return error('Upstream HN API unavailable', 502);
  }
}

export async function handleGithubTrending(): Promise<Response> {
  const cached = getCached('github-trending');
  if (cached) return json(cached);

  try {
    const data = await fetchJson(
      'https://api.github.com/search/repositories?q=stars:>1000&sort=stars&order=desc&per_page=25',
      'github-trending',
      { headers: { 'User-Agent': 'hydrated-worker/1.0' } },
    );
    setCache('github-trending', data, 30 * 60 * 1000);
    return json(data);
  } catch (e) {
    log('error', 'github trending fetch failed', { error: String(e) });
    return error('Upstream GitHub API unavailable', 502);
  }
}

export async function handleSocialSentiment(): Promise<Response> {
  const cached = getCached('social-sentiment');
  if (cached) return json(cached);

  const positive = new Set([
    'bullish',
    'moon',
    'hodl',
    'buy',
    'long',
    'gain',
    'profit',
    'pump',
    'surge',
    'rally',
    'breakout',
    'ath',
    'undervalued',
    'opportunity',
    'growth',
    'adoption',
    'milestone',
    'record',
    'soar',
    'boom',
    'strong',
    'upgrade',
    'accumulation',
    'bottom',
    'recovery',
  ]);
  const negative = new Set([
    'bearish',
    'dump',
    'crash',
    'sell',
    'short',
    'loss',
    'scam',
    'rug',
    'fear',
    'panic',
    'bubble',
    'overvalued',
    'collapse',
    'plunge',
    'correction',
    'downturn',
    'fraud',
    'hack',
    'exploit',
    'ponzi',
    'decline',
    'risk',
    'warning',
    'lawsuit',
    'ban',
  ]);

  try {
    const data = (await fetchJson(
      'https://www.reddit.com/r/cryptocurrency/hot.json?limit=50',
      'social-sentiment',
      { headers: { 'User-Agent': 'hydrated-worker/1.0' } },
    )) as {
      data?: {
        children: Array<{
          data: { title: string; selftext?: string; score?: number };
        }>;
      };
    };

    let posCount = 0;
    let negCount = 0;
    const posts: Array<{ title: string; score: number; sentiment: string }> = [];

    const children = data?.data?.children ?? [];
    for (const child of children) {
      const text = `${child.data.title} ${child.data.selftext || ''}`.toLowerCase();
      const words = text.split(/\s+/);
      let postPos = 0;
      let postNeg = 0;
      for (const word of words) {
        if (positive.has(word)) postPos++;
        if (negative.has(word)) postNeg++;
      }
      posCount += postPos;
      negCount += postNeg;
      const sentiment = postPos > postNeg ? 'positive' : postNeg > postPos ? 'negative' : 'neutral';
      posts.push({
        title: child.data.title.slice(0, 120),
        score: child.data.score ?? 0,
        sentiment,
      });
    }

    const total = posCount + negCount || 1;
    const result = {
      score: Math.round((posCount / total) * 100),
      positive: posCount,
      negative: negCount,
      totalPosts: children.length,
      posts: posts.slice(0, 10),
    };

    setCache('social-sentiment', result, 15 * 60 * 1000);
    return json(result);
  } catch (e) {
    log('error', 'social sentiment fetch failed', { error: String(e) });
    return error('Upstream Reddit API unavailable', 502);
  }
}
