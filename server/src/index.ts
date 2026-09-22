// HotRadar 后端入口：Express 服务 + 首次爬取 + 定时调度

import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { hotRouter } from './routes/hot.js';
import { trendsRouter } from './routes/trends.js';
import { platformsRouter } from './routes/platforms.js';
import { summarizeRouter } from './routes/summarize.js';
import { crawlAndPersist } from './crawler/index.js';
import { startScheduler } from './scheduler.js';
import { createRateLimiter } from './utils/rate-limit.js';
import { startEnrichmentWorker } from './ai/enrichment.js';

const app = express();

// CORS：配置了白名单则严格校验，未配置时允许全部（本地开发）
app.use(
  cors(
    config.corsOrigin.length > 0
      ? { origin: config.corsOrigin }
      : undefined,
  ),
);

// 基础安全响应头（无需额外依赖）
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  next();
});

// 全局限流：每分钟 120 次/IP
app.use(createRateLimiter({ windowMs: 60_000, max: 120 }));

app.use(express.json({ limit: '2mb' }));

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hotradar-server', time: new Date().toISOString() });
});

// 业务路由
app.use('/api/hot', hotRouter);
app.use('/api/trends', trendsRouter);
app.use('/api/platforms', platformsRouter);
// AI 路由额外限流：每分钟 20 次/IP（该接口产生外部调用费用）
app.use(
  '/api/ai/summarize',
  createRateLimiter({ windowMs: 60_000, max: 20, message: 'AI 请求过于频繁，请稍后再试' }),
  summarizeRouter,
);

// 404 兜底
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在', data: null });
});

async function bootstrap(): Promise<void> {
  console.log('[server] 启动中，执行首次全站爬取...');

  try {
    const { items, platforms } = await crawlAndPersist();
    const onlineCount = platforms.filter((p) => p.status === 'online').length;
    console.log(`[server] 首次爬取完成：${items.length} 条热点，${onlineCount} 个平台在线`);
  } catch (error) {
    console.error('[server] 首次爬取失败，以空库启动:', error);
  }

  app.listen(config.port, () => {
    console.log(`[server] HotRadar 后端已启动: http://localhost:${config.port}`);
  });

  startScheduler();
  startEnrichmentWorker();
}

void bootstrap();
