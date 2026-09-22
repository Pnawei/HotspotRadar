// 谷歌趋势（Google Trends）爬虫：每日热搜 RSS（geo=CN 已不支持该订阅，使用 geo=US），经代理访问

import { cleanText, classifyCategory, generateId, withRetry } from './utils.js';
import { proxyFetch } from '../utils/proxy.js';

export interface GoogleTrendsHotItem {
  id: string;
  title: string;
  url: string;
  hotValue: number;
  category: string;
  platform: string;
  rank: number;
  excerpt?: string;
}

const RSS_URL = 'https://trends.google.com/trending/rss?geo=US';

export async function fetchGoogleTrendsHot(): Promise<GoogleTrendsHotItem[]> {
  const result = await withRetry(async () => {
    const response = await proxyFetch(RSS_URL, {
      headers: {
        Accept: 'application/rss+xml,application/xml',
        'User-Agent': 'HotRadar/1.0',
      },
      bodyTimeout: 12000,
      headersTimeout: 12000,
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const segments = xml.split('<item>').slice(1);
    const items: GoogleTrendsHotItem[] = [];

    for (let i = 0; i < segments.length; i++) {
      const block = segments[i].split('</item>')[0];

      const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
      const trafficMatch = block.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/);
      const newsTitleMatch = block.match(/<ht:news_item_title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ht:news_item_title>/);
      const newsUrlMatch = block.match(/<ht:news_item_url>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ht:news_item_url>/);

      const title = titleMatch ? cleanText(titleMatch[1]) : '';
      if (!title) continue;

      items.push({
        id: generateId('google', title),
        title,
        // 外链优先使用第一条新闻报道的地址，没有则跳趋势搜索页
        url: newsUrlMatch ? newsUrlMatch[1].trim() : `https://www.google.com/search?q=${encodeURIComponent(title)}`,
        hotValue: parseTraffic(trafficMatch ? trafficMatch[1] : ''),
        category: classifyCategory(title),
        platform: 'google',
        rank: i + 1,
        excerpt: newsTitleMatch ? cleanText(newsTitleMatch[1]).slice(0, 100) : undefined,
      });
    }

    return items;
  });

  return result || [];
}

// 解析 "100+"、"1,000+"、"20,000+" 等形式
function parseTraffic(text: string): number {
  const digits = text.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}
