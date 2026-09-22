// GitHub 热门爬虫：优先抓取官方 Trending 页面（经代理访问），
// 条数不足时用 GitHub 搜索 API（近期新建、按星标排序）补充

import { cleanText, generateId, withRetry } from './utils.js';
import { config } from '../config.js';
import { proxyFetch } from '../utils/proxy.js';

export interface GithubHotItem {
  id: string;
  title: string;
  url: string;
  hotValue: number;
  category: string;
  platform: string;
  rank: number;
  excerpt?: string;
  tag?: string;
}

const UA_PC =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

interface ParsedRepo {
  path: string;
  description?: string;
  language?: string;
  stars: number;
  starsToday?: number;
}

export async function fetchGithubHot(): Promise<GithubHotItem[]> {
  const result = await withRetry(async () => {
    const repos: ParsedRepo[] = [];
    const seen = new Set<string>();

    const pushRepo = (repo: ParsedRepo) => {
      const key = repo.path.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        repos.push(repo);
      }
    };

    // 1. 官方 Trending（走代理）
    try {
      const trending = await fetchTrending();
      trending.forEach(pushRepo);
    } catch {
      // 代理不可用时继续尝试搜索 API
    }

    // 2. 条数不足，搜索 API 补充
    if (repos.length < 12) {
      try {
        const extra = await fetchRecentRepos();
        extra.forEach(pushRepo);
      } catch {
        // 忽略
      }
    }

    return repos.slice(0, 25).map<GithubHotItem>((repo, index) => ({
      id: generateId('github', repo.path),
      title: repo.path,
      url: `https://github.com/${repo.path}`,
      // Trending 条目以"今日新增星标"作为当下热度；搜索补充条目无此值，用总星标
      hotValue: repo.starsToday || repo.stars,
      category: 'technology',
      platform: 'github',
      rank: index + 1,
      excerpt: repo.description,
      tag: repo.language,
    }));
  });

  return result || [];
}

async function fetchTrending(): Promise<ParsedRepo[]> {
  const response = await proxyFetch('https://github.com/trending?since=daily', {
    headers: {
      'User-Agent': UA_PC,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    bodyTimeout: 12000,
    headersTimeout: 12000,
  });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const articles = html.match(/<article[^>]*Box-row[\s\S]*?<\/article>/g) || [];
  const repos: ParsedRepo[] = [];

  for (const article of articles) {
    const hrefMatch = article.match(/<h2[\s\S]*?<a[\s\S]*?href="\/([^"]+)"/);
    if (!hrefMatch) continue;
    const path = hrefMatch[1].trim();

    const descMatch = article.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    const langMatch = article.match(/programLanguage"[^>]*>([\s\S]*?)<\/span>/);
    const starsMatch = article.match(/\/stargazers"[\s\S]*?<\/svg>\s*([\d,]+)/);
    const todayMatch = article.match(/([\d,]+)\s*stars today/);

    repos.push({
      path,
      description: descMatch ? cleanText(stripTags(descMatch[1])).slice(0, 100) : undefined,
      language: langMatch ? cleanText(stripTags(langMatch[1])) : undefined,
      stars: starsMatch ? parseCount(starsMatch[1]) : 0,
      starsToday: todayMatch ? parseCount(todayMatch[1]) : undefined,
    });
  }

  return repos;
}

interface GithubRepository {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
}

async function fetchRecentRepos(): Promise<ParsedRepo[]> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(`created:>${since}`)}&sort=stars&order=desc&per_page=20`;

  const response = await proxyFetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'HotRadar/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(config.githubToken ? { Authorization: `Bearer ${config.githubToken}` } : {}),
    },
    bodyTimeout: 12000,
    headersTimeout: 12000,
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { items: GithubRepository[] };
  return data.items.map((repo) => ({
    path: repo.full_name,
    description: repo.description ? cleanText(repo.description).slice(0, 100) : undefined,
    language: repo.language || undefined,
    stars: repo.stargazers_count || 0,
  }));
}

function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

function parseCount(text: string): number {
  return parseInt(text.replace(/,/g, ''), 10) || 0;
}
