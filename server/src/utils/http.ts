// 统一响应封装

import type { Response } from 'express';

export function sendOk(res: Response, data: unknown): Response {
  return res.json({ code: 0, message: '成功', data });
}

export function sendError(res: Response, status: number, message: string): Response {
  return res.status(status).json({ code: status, message, data: null });
}
