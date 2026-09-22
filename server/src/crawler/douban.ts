// 豆瓣小组热议爬虫：解析小组精选频道页面（服务端渲染，无需登录）

import { cleanText, classifyCategory, generateId, withRetry } from './utils.js';

export interface DoubanHotItem {
  id: string;
  title: string;
  url: string;
  hotValue: number;
  category: string;
  platform: string;
  rank: number;
  tag?: string;
}

interface ParsedTopic {
  title: string;
  url: string;
  likes: number;
  group: string;
}

const CHANNEL_URL = 'https://www.douban.com/group/explore';

// 桌面端 UA：豆瓣对移动端 UA 返回的页面结构不同
const PC_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

export async function fetchDoubanHot(): Promise<DoubanHotItem[]> {
  const result = await withRetry(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(CHANNEL_URL, {
        headers: PC_HEADERS,
        signal: controller.signal,
      });

      if (!response.ok) {
        return [];
      }

      const html = await response.text();
      const topics = parseTopics(html);

      return topics.map((topic, index) => ({
        id: generateId('douban', topic.title),
        title: topic.title,
        url: topic.url,
        hotValue: topic.likes,
        category: classifyCategory(topic.title),
        platform: 'douban',
        rank: index + 1,
        tag: topic.group,
      }));
    } finally {
      clearTimeout(timeout);
    }
  });

  return result || [];
}

function parseTopics(html: string): ParsedTopic[] {
  const segments = html.split('class="channel-item"').slice(1);
  const topics: ParsedTopic[] = [];

  for (const seg of segments) {
    // 每个 channel-item 到下一个分页/侧栏标记为止，取前面足够的片段
    const block = seg.slice(0, 3000);

    const hrefMatch = block.match(/<h3>[\s\S]*?<a[^>]*href="([^"]+)"/);
    const titleMatch = block.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);
    const likesMatch = block.match(/class="likes">\s*(\d+)/);
    const groupMatch = block.match(/<span class="from">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);

    if (!hrefMatch || !titleMatch) continue;

    const title = cleanText(stripTags(titleMatch[1]));
    if (!title) continue;

    topics.push({
      title,
      url: cleanUrl(hrefMatch[1]),
      likes: likesMatch ? parseInt(likesMatch[1], 10) : 0,
      group: groupMatch ? cleanText(stripTags(groupMatch[1])) : '豆瓣小组',
    });
  }

  return topics.slice(0, 30);
}

function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

// 去掉跟踪参数
function cleanUrl(url: string): string {
  return url.split('?')[0];
}
