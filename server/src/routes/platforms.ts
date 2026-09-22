// 平台状态路由：GET /api/platforms

import { Router } from 'express';
import { getPlatformStatuses, type PlatformStatus } from '../crawler/index.js';
import { sendOk, sendError } from '../utils/http.js';

export const platformsRouter = Router();

platformsRouter.get('/', (_req, res) => {
  try {
    const statuses = getPlatformStatuses();

    const format = (s: PlatformStatus) => ({
      id: s.platform,
      name: s.platformName,
      icon: s.icon,
      color: s.color,
      region: s.region,
      status: s.status,
      lastUpdate: s.lastUpdate,
      itemCount: s.itemCount,
      responseTime: s.responseTime,
      crawlInterval: s.defaultInterval,
      enabled: s.enabled,
    });

    const domesticPlatforms = statuses
      .filter((s) => s.region === 'domestic')
      .map(format);
    const internationalPlatforms = statuses
      .filter((s) => s.region === 'international')
      .map(format);

    return sendOk(res, {
      platforms: [...domesticPlatforms, ...internationalPlatforms],
      domesticPlatforms,
      internationalPlatforms,
      totalPlatforms: statuses.length,
      domesticCount: domesticPlatforms.length,
      internationalCount: internationalPlatforms.length,
      onlineCount: statuses.filter((p) => p.status === 'online').length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[routes] 获取平台状态失败:', error);
    return sendError(res, 500, '服务器内部错误');
  }
});
