// 备用数据 - 当爬虫失败时使用（模拟热点数据）

import { generateId, formatHotValue } from './utils.js';
import type { HotItem } from './index.js';

// 带随机波动的热度值
const generateHotValue = (base: number): number => {
  const variance = base * 0.2;
  return Math.floor(base + (Math.random() - 0.5) * variance);
};

// 模拟热点数据（覆盖各类别）
const fallbackTopics = [
  // 娱乐类
  { title: '春节档电影票房突破80亿', category: 'entertainment', base: 9800000,
    excerpt: '2026年春节档电影市场火爆，《封神第三部》《唐探4》等影片表现亮眼，总票房突破80亿大关，刷新历史纪录。影院上座率高达85%，三四线城市成为票房增长主力。' },
  { title: '顶流明星官宣新恋情', category: 'entertainment', base: 7900000,
    excerpt: '知名艺人今日通过微博官宣恋情，晒出二人合照并配文"确认过眼神"。双方粉丝反应不一，相关话题阅读量已破10亿。据悉两人因合作新戏相识相恋。' },
  { title: '热门综艺节目官宣阵容', category: 'entertainment', base: 5200000,
    excerpt: '《奔跑吧》第十季正式官宣全新阵容，老成员回归加盟新血液。节目组透露将增加海外录制环节，嘉宾包括多位顶流艺人。首期将于下周五播出。' },
  { title: '奥运冠军宣布退役', category: 'entertainment', base: 6500000,
    excerpt: '三届奥运金牌得主今日宣布正式退役，结束长达18年的职业生涯。发布会上数度哽咽，感谢教练和家人支持。退役后将担任国家队教练组顾问。' },
  { title: '知名导演新片定档', category: 'entertainment', base: 4100000,
    excerpt: '张艺谋新作《长城之战》定档暑期档，影片集结章子怡、易烊千玺等实力派演员。首支预告片播放量破亿，展现了恢弘的战争场面和精良的视效制作。' },
  { title: '热播剧大结局引争议', category: 'entertainment', base: 3100000,
    excerpt: '都市剧《北京爱情故事2》大结局播出后引发争议，男女主角分手结局让观众直呼"意难平"。编剧回应称结局符合角色性格，已有续集计划。' },
  { title: '歌手巡回演唱会开票秒光', category: 'entertainment', base: 4800000,
    excerpt: '周杰伦2026世界巡回演唱会北京站开票后秒光，10万张门票在1分钟内售罄。主办方宣布将加开场次，黄牛票价已炒至万元以上。' },
  { title: '选秀节目冠军出道', category: 'entertainment', base: 3600000,
    excerpt: '《超新星2026》总决赛昨晚落幕，00后选手李明阳以2.3亿票数夺冠。颁奖礼现场，评委和粉丝激动落泪，见证新星诞生的感人时刻。' },
  { title: '知名演员被曝学历造假', category: 'entertainment', base: 5800000,
    excerpt: '某知名演员被网友扒出学历存疑，其自称毕业于北京电影学院，但校方回应无此人入学记录。当事人工作室尚未回应，事件持续发酵中。' },
  { title: '国产动漫电影破10亿', category: 'entertainment', base: 4200000,
    excerpt: '《西游记之大圣归来2》上映15天票房突破10亿，成为国产动漫电影票房新纪录。影片特效获国际认可，已确认将推出英文配音版登陆北美市场。' },

  // 科技类
  { title: '人工智能大模型重大突破', category: 'technology', base: 8200000,
    excerpt: '百度发布新一代文心大模型5.0，在多项测试中超越GPT-5表现。模型支持100种语言，推理速度提升300%，已向开发者开放API接口。' },
  { title: '新能源汽车销量创新高', category: 'technology', base: 8900000,
    excerpt: '2月新能源汽车销量达120万辆，同比增长65%，渗透率首次突破50%。比亚迪、特斯拉、蔚来位列前三，磷酸铁锂电池成主流选择。' },
  { title: '新款iPhone正式发布', category: 'technology', base: 6800000,
    excerpt: 'Apple发布iPhone 17系列，首次搭载自研5G基带芯片，电池续航提升40%。Pro版本新增卫星直连通话功能，国行版售价7999元起。' },
  { title: '华为发布全新操作系统', category: 'technology', base: 5500000,
    excerpt: '鸿蒙OS 5.0正式发布，实现了与iOS和Android应用的完全兼容。新增原子化服务、分布式任务等特性，已有超过200万款应用完成适配。' },
  { title: '5G网络覆盖率超90%', category: 'technology', base: 3300000,
    excerpt: '工信部数据显示全国5G基站总数突破500万个，5G用户达8亿，覆盖全国所有地级市和90%以上县城。下一步将推进5G-A和6G研发。' },
  { title: '国产大飞机商业首航', category: 'technology', base: 4300000,
    excerpt: 'C919大型客机完成首次商业航班，从上海虹桥飞往北京大兴。首航乘客表示飞行平稳舒适，机舱噪音控制优秀。未来三年计划交付300架。' },
  { title: '量子计算机实现新突破', category: 'technology', base: 4600000,
    excerpt: '中科院团队成功研制出超1000量子比特的量子计算机"九章三号"，在特定任务上比经典超级计算机快亿亿倍，标志着中国量子计算进入新阶段。' },
  { title: '可控核聚变实验取得进展', category: 'technology', base: 5100000,
    excerpt: '中国环流三号托卡马克装置实现等离子体运行1000秒，创造新世界纪录。这一突破使可控核聚变商业化发电的前景更加明朗。' },
  { title: '自动驾驶获准全面上路', category: 'technology', base: 4000000,
    excerpt: '北京正式发放L4级自动驾驶全域通行许可，百度、小马智行等企业获准在全市道路运营无人出租车。此举标志着自动驾驶进入商业化新阶段。' },
  { title: '折叠屏手机销量暴涨', category: 'technology', base: 3200000,
    excerpt: '2026年Q1折叠屏手机出货量达1500万部，同比增长200%。华为、三星、小米占据前三，竖折机型成为市场新宠，价格下探至5000元区间。' },

  // 财经类
  { title: '央行宣布降准降息', category: 'finance', base: 8700000,
    excerpt: '中国人民银行宣布下调存款准备金率0.5个百分点，下调LPR利率0.25个百分点。预计释放流动性约1万亿元，降低实体经济融资成本。' },
  { title: '房地产市场新政出台', category: 'finance', base: 7600000,
    excerpt: '住建部等三部门联合发布房地产新政，取消限购城市增至50个，首套房首付比例降至15%，公积金贷款额度上调50%。市场反应积极。' },
  { title: '股市大盘强势反弹', category: 'finance', base: 5900000,
    excerpt: '上证指数大涨3.5%站上3500点，创业板指涨超5%，两市成交额突破2万亿。北向资金净流入超500亿，券商、半导体板块领涨。' },
  { title: '比特币价格剧烈波动', category: 'finance', base: 4700000,
    excerpt: '比特币价格24小时内暴涨15%突破15万美元后急跌10%，市场剧烈震荡。分析指出美联储政策预期和机构资金流动是主要原因。' },
  { title: '多家银行调整存款利率', category: 'finance', base: 3700000,
    excerpt: '工农中建四大行同步下调存款利率，一年期定存降至1.5%，三年期降至2.0%。专家建议储户关注国债、货币基金等替代投资品种。' },
  { title: '新三板改革政策落地', category: 'finance', base: 2700000,
    excerpt: '新三板深化改革方案正式实施，简化转板上市流程，降低投资者门槛至50万元。首批10家企业获准转板至科创板或创业板。' },
  { title: '数字人民币试点扩大', category: 'finance', base: 3800000,
    excerpt: '数字人民币试点城市增至50个，累计交易额突破5万亿元。新增支持境外银行卡绑定功能，外国游客可直接使用数字人民币消费。' },
  { title: '独角兽企业IPO潮来袭', category: 'finance', base: 3400000,
    excerpt: '2026年首季度，20家独角兽企业完成IPO，融资总额超过500亿美元。AI、新能源、生物医药领域成为上市热门赛道。' },
  { title: '黄金价格创历史新高', category: 'finance', base: 4100000,
    excerpt: '国际金价突破3000美元/盎司，国内金价达到720元/克历史新高。地缘政治风险和美元走弱是主要推动因素，投资机构看好后市。' },
  { title: '人民币汇率企稳回升', category: 'finance', base: 3000000,
    excerpt: '人民币兑美元汇率回升至6.8关口，创半年新高。外汇储备稳定在3.2万亿美元，外资持续流入中国债券和股票市场。' },

  // 社会民生类
  { title: '国务院发布重要经济政策', category: 'social', base: 9500000,
    excerpt: '国务院常务会议审议通过促进消费、稳定就业一揽子政策，包括发放2000亿消费券、创造500万新就业岗位、提高低保标准等措施。' },
  { title: '教育部发布高考新规', category: 'social', base: 7400000,
    excerpt: '2026年高考改革方案公布：新增人工智能科目，英语考试改为一年两考，综合素质评价纳入录取参考。新政将于2027届考生开始实施。' },
  { title: '医保政策重大调整', category: 'social', base: 6200000,
    excerpt: '国家医保局发布新版医保目录，新增182种药品，价格平均降幅60%。癌症靶向药、罕见病用药覆盖范围大幅扩展，惠及千万患者。' },
  { title: '全国多地迎来降温', category: 'social', base: 4900000,
    excerpt: '受强冷空气影响，全国将迎来大范围降温降雪天气。北方地区降温幅度达15度，南方部分地区出现冻雨。各地启动应急预案保障出行。' },
  { title: '地铁新线路开通试运营', category: 'social', base: 3900000,
    excerpt: '北京地铁28号线正式开通试运营，全长31公里设20站，连接CBD与通州副中心。首班车时间提前至5:30，票价采用里程计价。' },
  { title: '油价调整窗口即将开启', category: 'social', base: 2900000,
    excerpt: '新一轮成品油调价窗口将于明日开启，预计92号汽油上调0.15元/升，95号汽油上调0.16元/升。建议有需要的车主提前加油。' },
  { title: '全国人口普查结果公布', category: 'social', base: 5600000,
    excerpt: '第八次全国人口普查结果出炉：总人口14.1亿，城镇化率达70%，60岁以上人口占比22%。东北人口负增长趋势加剧，引发关注。' },
  { title: '延迟退休政策正式实施', category: 'social', base: 6800000,
    excerpt: '延迟退休改革方案今日起实施，将在15年内逐步将退休年龄提高至男65岁、女60岁。配套措施包括灵活就业支持和养老金调整。' },
  { title: '春运客流量创新高', category: 'social', base: 5300000,
    excerpt: '2026年春运40天累计发送旅客超90亿人次，刷新历史纪录。高铁成为出行首选，自驾返乡比例上升至35%，顺风车订单量翻倍。' },
  { title: '生育政策再放宽', category: 'social', base: 4800000,
    excerpt: '多地出台鼓励生育新政：三孩家庭购房补贴20万、产假延长至180天、托育服务免费等。专家呼吁加大配套设施建设。' },

  // 国际类
  { title: '中美关系最新进展', category: 'international', base: 8500000,
    excerpt: '中美元首在旧金山举行会晤，就台湾问题、经贸关系、气候变化等议题深入交流。双方同意恢复军事对话机制，释放积极信号。' },
  { title: '全球气候峰会召开', category: 'international', base: 7100000,
    excerpt: 'COP31气候大会在迪拜召开，190多国领导人出席。中国宣布2035年碳排放较峰值下降50%目标，获国际社会高度评价。' },
  { title: '俄乌局势最新动态', category: 'international', base: 5700000,
    excerpt: '俄乌冲突进入第四年，和平谈判取得突破性进展。在中国斡旋下，双方同意在乌东地区实现停火，联合国将派遣维和部队。' },
  { title: '欧洲多国领导人访华', category: 'international', base: 4500000,
    excerpt: '法德两国领导人联袂访华，签署200亿美元经贸合作协议。双方表示将深化在新能源、航空等领域合作，共同维护多边贸易体系。' },
  { title: '国际油价持续走高', category: 'international', base: 2500000,
    excerpt: '受OPEC+减产和中东局势影响，国际油价升至每桶95美元。分析师预计短期内油价仍将维持高位，建议关注新能源替代方案。' },
  { title: '联合国召开紧急会议', category: 'international', base: 3500000,
    excerpt: '联合国安理会就巴以冲突召开紧急会议，中国提出四点和平方案获广泛支持。各方呼吁保护平民，尽快恢复人道主义援助通道。' },
  { title: '朝韩关系出现缓和', category: 'international', base: 4200000,
    excerpt: '朝韩双方在板门店举行高级别会谈，同意恢复离散家属团聚活动，重启开城工业园区。国际社会对半岛和平进程表示谨慎乐观。' },
  { title: '印度经济增速超越中国', category: 'international', base: 3800000,
    excerpt: 'IMF预测2026年印度GDP增速将达7.2%，超过中国的4.8%。分析指出人口红利和制造业转移是主要驱动力，但基础设施仍是短板。' },
  { title: '日本央行结束负利率', category: 'international', base: 3300000,
    excerpt: '日本央行宣布将基准利率上调至0.25%，正式结束长达8年的负利率政策。日元汇率应声上涨，全球金融市场波动加剧。' },
  { title: '特朗普宣布参选2028', category: 'international', base: 5000000,
    excerpt: '美国前总统特朗普宣布将参加2028年总统大选，这将是他第四次竞选。民调显示其在共和党内支持率领先，民主党紧急应对。' },

  // 体育类
  { title: '中国男足世预赛出线', category: 'sports', base: 7500000,
    excerpt: '中国男足2:0战胜日本，提前两轮锁定2026世界杯入场券！这是国足时隔24年再次打进世界杯。赛后球员激动落泪，举国欢庆。' },
  { title: 'NBA全明星赛落幕', category: 'sports', base: 4000000,
    excerpt: '2026NBA全明星赛在旧金山举行，东部队185:180险胜西部队。詹姆斯砍下35分获得MVP，成为历史上最年长的全明星MVP。' },
  { title: '中国网球选手创历史', category: 'sports', base: 3600000,
    excerpt: '中国选手郑钦文在澳网决赛中击败斯瓦泰克，成为首位获得大满贯单打冠军的中国球员。颁奖礼上激动落泪，创造历史时刻。' },
  { title: '欧冠决赛爆冷门', category: 'sports', base: 3200000,
    excerpt: '巴黎圣日耳曼在欧冠决赛中3:1击败皇家马德里，队史首次捧起大耳朵杯。姆巴佩梅开二度，赛后宣布下赛季转会皇马。' },
  { title: 'F1中国大奖赛回归', category: 'sports', base: 2800000,
    excerpt: 'F1上海站时隔五年回归，周冠宇成为首位出战主场的中国车手。现场观众超过15万人，创下F1单站观众人数新纪录。' },
];

// 模拟平台分布
const platforms = ['weibo', 'zhihu', 'baidu', 'bilibili', 'douyin', 'toutiao'];
const platformNames: Record<string, string> = {
  weibo: '微博',
  zhihu: '知乎',
  baidu: '百度',
  bilibili: 'B站',
  douyin: '抖音',
  toutiao: '今日头条',
};

export function generateFallbackData(): HotItem[] {
  return fallbackTopics.map((topic, index) => {
    const hotValue = generateHotValue(topic.base);
    const mainPlatform = platforms[index % platforms.length];

    // 热度越高，来源越多
    const sourceCount = index < 10 ? 4 + Math.floor(Math.random() * 3)
      : index < 30 ? 2 + Math.floor(Math.random() * 3)
      : 1 + Math.floor(Math.random() * 2);
    const sourcePlatforms = platforms.slice(0, sourceCount);

    return {
      id: generateId(mainPlatform, topic.title),
      title: topic.title,
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(topic.title)}`,
      hotValue,
      hotValueFormatted: formatHotValue(hotValue),
      category: topic.category,
      platform: mainPlatform,
      platformName: platformNames[mainPlatform],
      rank: index + 1,
      excerpt: topic.excerpt,
      sources: sourcePlatforms.map((p) => ({
        platform: p,
        platformName: platformNames[p],
        url: `https://s.weibo.com/weibo?q=${encodeURIComponent(topic.title)}`,
        title: topic.title,
        hotValue: generateHotValue(topic.base * (0.5 + Math.random() * 0.5)),
      })),
    };
  });
}

// 数据不足时是否使用备用数据
export function shouldUseFallback(items: HotItem[]): boolean {
  return items.length < 10;
}
