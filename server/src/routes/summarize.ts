// AI 摘要路由：POST /api/ai/summarize
// body: { title, content?, type?: 'summary' | 'analysis' }

import { Router } from 'express';
import { callDeepSeek } from '../ai/deepseek.js';
import { fallbackSummary, fallbackAnalysis } from '../ai/fallback.js';
import { sendOk, sendError } from '../utils/http.js';

export const summarizeRouter = Router();

summarizeRouter.post('/', async (req, res) => {
  try {
    const { title, content, type = 'summary' } = (req.body || {}) as {
      title?: string;
      content?: string;
      type?: 'summary' | 'analysis';
    };

    if (!title) {
      return sendError(res, 400, '缺少标题参数');
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (type === 'analysis') {
      systemPrompt = `你是一位专业的热点事件分析师。请根据提供的热点标题和内容，生成一份结构化的深度分析报告。
要求：
1. 使用中文回复
2. 分析要客观、专业、有深度
3. 输出格式使用Markdown
4. 包含：事件概述、核心要点(3-5条)、舆情分析、发展预测`;

      userPrompt = `请分析以下热点事件：

标题：${title}
${content ? `相关内容：${content}` : ''}

请生成深度分析报告。`;
    } else {
      systemPrompt = `你是一位简洁高效的新闻编辑。请根据热点标题生成一句话摘要。
要求：
1. 使用中文
2. 控制在50-80字
3. 突出核心信息和关键数据
4. 语言简洁、客观、有信息量`;

      userPrompt = `请为以下热点生成一句话摘要：

标题：${title}
${content ? `补充信息：${content}` : ''}`;
    }

    try {
      const summary = await callDeepSeek({
        system: systemPrompt,
        user: userPrompt,
        maxTokens: type === 'analysis' ? 1000 : 200,
        temperature: 0.7,
      });

      return sendOk(res, { summary, type, model: 'deepseek-chat' });
    } catch {
      // AI 不可用，规则降级
      const summary = type === 'analysis' ? fallbackAnalysis(title) : fallbackSummary(title);
      return sendOk(res, { summary, type, model: 'fallback' });
    }
  } catch (error) {
    console.error('[routes] AI 摘要失败:', error);
    return sendError(res, 500, '服务器内部错误');
  }
});
