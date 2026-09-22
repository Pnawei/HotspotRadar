// 黑客新闻（Hacker News）爬虫：通过 Algolia 官方检索接口一次获取首页热门帖

import { cleanText, classifyCategory, withRetry } from './utils.js';

export interface HackerNewsHotItem {
  id: string;
  title: string;
  url: string;
  hotValue: number;
  category: string;
  platform: string;
  rank: number;
  excerpt?: string;
}

interface AlgoliaHit {
  objectID: string;
  title?: string;
  story_title?: string;
  url?: string;
  points?: number;
  num_comments?: number;
  author?: string;
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
}

const FRONT_PAGE_URL = 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30';

export async function fetchHackerNewsHot(): Promise<HackerNewsHotItem[]> {
  const result = await withRetry(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(FRONT_PAGE_URL, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'HotRadar/1.0',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as AlgoliaResponse;
      const items: HackerNewsHotItem[] = [];

      for (let i = 0; i < data.hits.length; i++) {
        const hit = data.hits[i];
        const title = cleanText(hit.title || hit.story_title || '');
        if (!title) continue;

        // 无外链的讨论帖（Ask HN 等）跳转 HN 站内讨论页
        const targetUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        const commentText = hit.num_comments ? `${hit.num_comments} 条讨论` : undefined;

        items.push({
          id: `hackernews-${hit.objectID}`,
          title,
          url: targetUrl,
          hotValue: hit.points || 0,
          category: classifyCategory(title),
          platform: 'hackernews',
          rank: i + 1,
          excerpt: commentText,
        });
      }

      return items;
    } finally {
      clearTimeout(timeout);
    }
  });

  return result || [];
}
