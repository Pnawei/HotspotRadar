// 服务配置 - 从环境变量读取，带合理默认值

import dotenv from 'dotenv';

dotenv.config();

function numberFromEnv(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  port: numberFromEnv(process.env.PORT, 3001),
  dbPath: process.env.DB_PATH || './data/hotradar.db',
  crawlIntervalMs: numberFromEnv(process.env.CRAWL_INTERVAL_MS, 5 * 60 * 1000),
  trendRetentionMs: numberFromEnv(process.env.TREND_RETENTION_MS, 48 * 60 * 60 * 1000),
  // CORS 白名单：多个来源用逗号分隔；留空则允许全部（仅限本地开发）
  corsOrigin: (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    timeoutMs: numberFromEnv(process.env.DEEPSEEK_TIMEOUT_MS, 30000),
  },
  // 每轮爬取后最多扩充多少个事件（控制 API 费用）
  enrichBatchSize: numberFromEnv(process.env.ENRICH_BATCH_SIZE, 5),
  // 扩充内容有效期（毫秒），过期后允许重新生成
  enrichTtlMs: numberFromEnv(process.env.ENRICH_TTL_MS, 24 * 60 * 60 * 1000),
  // 详情页相关报道/讨论的有效期（毫秒），默认 30 分钟
  relatedTtlMs: numberFromEnv(process.env.RELATED_TTL_MS, 30 * 60 * 1000),
  // 抓取相关内容的单次超时（毫秒），默认 8 秒
  relatedTimeoutMs: numberFromEnv(process.env.RELATED_TIMEOUT_MS, 8000),
  // 知乎热榜已要求登录态：在此填入浏览器中的 Cookie 即可恢复采集（可选，留空则该平台离线）
  zhihuCookie: (process.env.ZHIHU_COOKIE || '').trim(),
  // GitHub 个人访问令牌（可选）：填入可将搜索接口限额从 10 次/分钟提升到 30 次/分钟
  githubToken: (process.env.GITHUB_TOKEN || '').trim(),
  // 国际平台代理地址：默认尝试本机 Clash Verge 端口；设为 none 可关闭代理
  proxyUrl:
    process.env.PROXY_URL === undefined
      ? 'http://127.0.0.1:7897'
      : process.env.PROXY_URL === 'none'
        ? ''
        : process.env.PROXY_URL.trim(),
};
