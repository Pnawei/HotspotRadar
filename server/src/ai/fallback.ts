// 其他规则降级模板：一句话摘要、深度分析、详情页长摘要

// 一句话摘要（summarize 接口降级）
export function fallbackSummary(title: string): string {
  const cleanTitle = title.replace(/[#【】[\]《》「」『』""]/g, '');

  const keywords = {
    entertainment: ['明星', '演员', '歌手', '电影', '电视剧', '综艺', '官宣', '恋情'],
    technology: ['AI', '人工智能', '手机', '芯片', '5G', '新能源', '发布', '技术'],
    finance: ['股市', '股票', '基金', '房价', '利率', '央行', '银行'],
    social: ['教育', '医疗', '高考', '考研', '就业', '政策', '交通'],
    international: ['美国', '俄罗斯', '欧洲', '日本', '韩国', '外交'],
  };

  let category = 'general';
  for (const [cat, words] of Object.entries(keywords)) {
    if (words.some((word) => cleanTitle.includes(word))) {
      category = cat;
      break;
    }
  }

  const templates: Record<string, (t: string) => string> = {
    entertainment: (t) => `娱乐热点：${t}。相关话题在社交平台引发热议，多位业内人士发表看法。`,
    technology: (t) => `科技动态：${t}。业界专家分析认为这一发展趋势值得持续关注。`,
    finance: (t) => `财经要闻：${t}。市场分析人士指出投资者需关注政策面变化。`,
    social: (t) => `社会热点：${t}。多方声音汇聚，网友积极参与讨论。`,
    international: (t) => `国际聚焦：${t}。多国媒体报道关注，事态发展仍在持续。`,
    general: (t) => `热点聚焦：${t}。该话题在多个平台引发广泛讨论。`,
  };

  return templates[category](cleanTitle);
}

// 深度分析（summarize 接口 analysis 类型降级）
export function fallbackAnalysis(title: string): string {
  const cleanTitle = title.replace(/[#【】[\]《》「」『』""]/g, '');

  return `## 事件概述

"${cleanTitle}"近期成为网络热议话题，引发社会各界广泛关注。

## 核心要点

1. **话题热度高**：该事件在多个主流平台同步发酵，讨论热度持续攀升
2. **舆论多元化**：网友观点呈现多元化特点，支持与质疑声音并存
3. **持续关注中**：事件仍在发展中，后续进展值得持续关注

## 舆情分析

从目前的网络讨论来看，公众对该事件保持高度关注。大部分网友保持理性讨论态度，积极参与话题互动。建议持续关注官方信息和权威报道。

## 发展预测

预计该话题热度将在未来24-48小时内维持较高水平，随后逐步回落。如有重大进展，热度可能再次攀升。`;
}

// 详情页结构化长摘要（详情接口降级，保留原有分类模板）
export function detailedSummary(title: string): string {
  const cleanTitle = title.replace(/[#【】[\]《》「」『』""]/g, '');

  const isEntertainment = /明星|演员|歌手|电影|电视剧|综艺|官宣|恋情|票房|颁奖/.test(cleanTitle);
  const isTechnology = /AI|人工智能|手机|芯片|5G|新能源|电动车|发布|研发|技术|互联网/.test(cleanTitle);
  const isFinance = /股市|股票|基金|房价|利率|央行|银行|投资|上市|财报/.test(cleanTitle);
  const isSocial = /教育|医疗|高考|考研|就业|政策|交通|天气|安全|事故/.test(cleanTitle);
  const isInternational = /美国|俄罗斯|欧洲|日本|韩国|中东|外交|访问|峰会|贸易/.test(cleanTitle);

  if (isEntertainment) {
    return `【事件概述】"${cleanTitle}"引发娱乐圈关注，相关话题迅速登上各大平台热搜榜。

【核心要点】
1. 事件本身具有较高的话题性和关注度
2. 粉丝群体反应强烈，社交平台讨论活跃
3. 多家娱乐媒体跟进报道，舆论持续发酵

【舆论分析】网友评论呈现多元化特点，支持与质疑声音并存。大部分网友保持理性讨论态度，也有部分情绪化言论。预计该话题热度将在未来24-48小时内维持较高水平。`;
  }
  if (isTechnology) {
    return `【事件概述】"${cleanTitle}"成为科技圈焦点，引发行业内外广泛关注。

【核心要点】
1. 技术层面：涉及前沿技术领域的重要进展或产品发布
2. 市场影响：可能对相关产业链和消费市场产生影响
3. 行业反应：业内人士和分析师纷纷发表观点

【深度分析】从技术发展趋势来看，此事件反映了行业发展的重要方向。专家指出需关注技术落地应用和商业化前景，投资者和消费者均应保持理性关注。`;
  }
  if (isFinance) {
    return `【事件概述】"${cleanTitle}"引发金融市场关注，投资者密切关注后续影响。

【核心要点】
1. 政策层面：可能涉及宏观经济政策或监管措施调整
2. 市场反应：资本市场对此消息敏感度较高
3. 后续影响：需关注对实体经济和金融市场的传导效应

【投资建议】市场分析人士建议投资者理性看待市场波动，关注政策细则落地情况，做好风险管理，避免盲目跟风操作。`;
  }
  if (isSocial) {
    return `【事件概述】"${cleanTitle}"引发社会各界关注，民生话题热度攀升。

【核心要点】
1. 事件性质：涉及公众利益和社会民生领域
2. 各方反应：政府部门、媒体、公众等多方关注
3. 发展趋势：事件仍在持续发展中

【社会反响】网友讨论热烈，多数人关注事件进展和相关政策走向。专家建议公众通过官方渠道获取权威信息，理性参与讨论。`;
  }
  if (isInternational) {
    return `【事件概述】"${cleanTitle}"成为国际舆论焦点，多国媒体报道关注。

【核心要点】
1. 地缘影响：涉及国际关系和地区局势
2. 各方立场：相关国家和组织态度各异
3. 发展前景：局势走向仍存在不确定性

【国际观察】国际关系专家分析，此事件对地区和全球格局可能产生深远影响。各方博弈仍在继续，和平与稳定是国际社会的共同期待。`;
  }
  return `【事件概述】"${cleanTitle}"引发网络热议，成为近期热门话题。

【核心要点】
1. 话题热度高，多平台同步讨论
2. 网友观点多元，舆论场活跃
3. 事件仍在发展中，后续值得关注

【舆情分析】该话题在短时间内获得大量关注，反映了公众对相关领域的高度关注。建议持续关注官方信息和权威报道，理性看待各方观点。`;
}
