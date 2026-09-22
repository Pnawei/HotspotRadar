// 红迪（Reddit）热帖爬虫：r/popular 的 Atom 订阅（Reddit 官方 JSON 接口已封访客访问，RSS 仍开放），
// 经代理访问

import { cleanText, classifyCategory, generateId, withRetry } from './utils.js';
import { proxyFetch } from '../utils/proxy.js';

export interface RedditHotItem {
  id: string;
  title: string;
  url: string;
  hotValue: number;
  category: string;
  platform: string;
  rank: number;
  excerpt?: string;
}

const RSS_URL = 'https://www.reddit.com/r/popular/hot/.rss?limit=25';

const UA_BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export async function fetchRedditHot(): Promise<RedditHotItem[]> {
  const result = await withRetry(async () => {
    const response = await proxyFetch(RSS_URL, {
      headers: {
        'User-Agent': UA_BROWSER,
        Accept: 'application/rss+xml,application/atom+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      bodyTimeout: 12000,
      headersTimeout: 12000,
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const entries = xml.split('<entry>').slice(1);
    const items: RedditHotItem[] = [];

    for (let i = 0; i < entries.length; i++) {
      const block = entries[i].split('</entry>')[0];

      const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = block.match(/<link[^>]*href="([^"]+)"/);
      const idMatch = block.match(/<id>([\s\S]*?)<\/id>/);
      const contentMatch = block.match(/<content[^>]*>([\s\S]*?)<\/content>/);

      const title = titleMatch ? cleanText(decodeXml(stripCData(titleMatch[1]))) : '';
      if (!title) continue;

      const idKey = idMatch ? idMatch[1].trim() : title;
      const excerpt = contentMatch
        ? cleanText(stripTags(decodeXml(stripCData(contentMatch[1])))).slice(0, 100)
        : undefined;

      items.push({
        id: generateId('reddit', idKey),
        title,
        url: linkMatch ? linkMatch[1] : 'https://www.reddit.com/r/popular/',
        // RSS 不提供热度分，按榜单顺序给出递减的相对热度
        hotValue: Math.max(100, (entries.length - i) * 1000),
        category: classifyCategory(title),
        platform: 'reddit',
        rank: i + 1,
        excerpt: excerpt || undefined,
      });
    }

    return items;
  });

  return result || [];
}

function stripCData(text: string): string {
  return text.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}
