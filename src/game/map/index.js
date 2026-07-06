const { ITEM_CONFIG } = require('../config')
const { getPokemonRarity } = require('../utils')
const { loadRarityProbability, loadCollectionNames, loadRarityConfig } = require('../configCache')

let RARITY_PROBABILITY = {}
let COLLECTION_NAMES = {}
let RARITY_BASE_PRICE = {}

async function initMapConfig() {
  RARITY_PROBABILITY = await loadRarityProbability()
  COLLECTION_NAMES = await loadCollectionNames()
  
  const rarityConfig = await loadRarityConfig()
  RARITY_BASE_PRICE = {}
  for (const [key, config] of Object.entries(rarityConfig)) {
    RARITY_BASE_PRICE[key] = config.basePrice || 50
  }
  
  console.log('[Map] 地图配置已从数据库加载')
}

// 格数额外价格倍率
const SLOT_PRICE_MULTIPLIER = {
  1: 1.0,
  2: 1.5,
  3: 2.0,
  4: 3.0
}

const MAP_LOCATIONS = {
  '常磐近郊': { name: '常磐近郊', description: '常磐市附近的荒野地带，杂草丛生', type: 'wild', difficulty: 1, levelRange: { min: 3, max: 8 }, pokemonTypes: ['一般', '飞行'], features: ['高草丛', '废弃箱子'] },
  '1号道路': { name: '1号道路', description: '连接真新镇与常青市的道路，人流量较大', type: 'road', difficulty: 1, levelRange: { min: 3, max: 6 }, pokemonTypes: ['一般', '飞行'], features: ['路边草丛', '长椅'] },
  '常磐森林': { name: '常磐森林', description: '茂密的森林，虫系宝可梦栖息地', type: 'forest', difficulty: 1, levelRange: { min: 5, max: 12 }, pokemonTypes: ['虫', '草', '毒'], features: ['大树洞', '茂密草丛', '森林深处', '废弃小屋'] },
  '2号道路': { name: '2号道路', description: '通往月见山的道路，逐渐变得崎岖', type: 'road', difficulty: 1, levelRange: { min: 5, max: 10 }, pokemonTypes: ['一般', '岩石'], features: ['路边草丛', '岩石缝隙'] },
  '月见山外围': { name: '月见山外围', description: '月见山山脚区域，有许多岩石', type: 'mountain', difficulty: 1, levelRange: { min: 8, max: 15 }, pokemonTypes: ['岩石', '地面'], features: ['山洞入口', '岩石堆', '矿物采集点'] },
  '3号道路': { name: '3号道路', description: '通往深灰市的山路', type: 'road', difficulty: 2, levelRange: { min: 8, max: 15 }, pokemonTypes: ['一般', '岩石'], features: ['路边草丛', '山坡小径'] },
  '深灰市': { name: '深灰市', description: '岩石道馆所在城市，石质建筑风格', type: 'city', difficulty: 2, levelRange: { min: 10, max: 18 }, pokemonTypes: ['岩石', '地面'], features: ['道馆', 'NPC住宅1', 'NPC住宅2', '废弃商店', '废弃医院', '后山小径'] },
  '4号道路': { name: '4号道路', description: '连接深灰市与华蓝市，沿途有水域', type: 'road', difficulty: 2, levelRange: { min: 10, max: 16 }, pokemonTypes: ['水', '一般'], features: ['河边草丛', '钓鱼点'] },
  '华蓝市': { name: '华蓝市', description: '水系道馆所在城市，美丽的水上城市', type: 'city', difficulty: 2, levelRange: { min: 12, max: 20 }, pokemonTypes: ['水', '一般'], features: ['道馆', 'NPC住宅1', 'NPC住宅2', '水流公园', '废弃商店', '废弃医院'] },
  '地下通道': { name: '地下通道', description: '连接华蓝市与金黄市的地下道', type: 'underground', difficulty: 2, levelRange: { min: 10, max: 18 }, pokemonTypes: ['毒', '一般'], features: ['阴暗角落', '地下黑市', '隐藏通道'] },
  '5号道路': { name: '5号道路', description: '通往金黄市的道路', type: 'road', difficulty: 2, levelRange: { min: 12, max: 20 }, pokemonTypes: ['一般', '飞行'], features: ['路边草丛', '休息区'] },
  '6号道路': { name: '6号道路', description: '连接金黄市与枯叶市', type: 'road', difficulty: 2, levelRange: { min: 12, max: 20 }, pokemonTypes: ['一般', '飞行'], features: ['路边草丛', '自行车道'] },
  '7号道路': { name: '7号道路', description: '通往玉虹市的道路', type: 'road', difficulty: 2, levelRange: { min: 12, max: 20 }, pokemonTypes: ['一般', '草'], features: ['路边草丛', '废弃花店'] },
  '8号道路': { name: '8号道路', description: '连接紫苑镇与金黄市', type: 'road', difficulty: 2, levelRange: { min: 12, max: 20 }, pokemonTypes: ['一般', '幽灵'], features: ['路边草丛', '墓地入口'] },
  '9号道路': { name: '9号道路', description: '通往浅红市的道路', type: 'road', difficulty: 2, levelRange: { min: 14, max: 22 }, pokemonTypes: ['一般', '毒'], features: ['路边草丛', '沼泽地带'] },
  '10号道路': { name: '10号道路', description: '通往无人发电厂', type: 'road', difficulty: 2, levelRange: { min: 14, max: 22 }, pokemonTypes: ['电', '一般'], features: ['路边草丛', '发电站外围'] },
  '紫苑镇': { name: '紫苑镇', description: '宝可梦塔所在城镇，气氛神秘', type: 'city', difficulty: 2, levelRange: { min: 14, max: 22 }, pokemonTypes: ['幽灵', '一般'], features: ['宝可梦塔', 'NPC住宅1', '墓地', '灵屋'] },
  '枯叶市': { name: '枯叶市', description: '电系道馆所在城市，港口城市', type: 'city', difficulty: 3, levelRange: { min: 18, max: 28 }, pokemonTypes: ['电', '水'], features: ['道馆', 'NPC住宅1', 'NPC住宅2', '港口', '废弃商店', '废弃医院', '船长室'] },
  '金黄市': { name: '金黄市', description: '西尔佛公司所在地，超能道馆，大城市', type: 'city', difficulty: 3, levelRange: { min: 20, max: 30 }, pokemonTypes: ['超能', '一般'], features: ['道馆', '西尔佛公司', 'NPC住宅1', 'NPC住宅2', '废弃百货', '废弃游戏厅', '废弃医院'] },
  '玉虹市': { name: '玉虹市', description: '废弃百货与游戏厅，草系道馆', type: 'city', difficulty: 3, levelRange: { min: 20, max: 30 }, pokemonTypes: ['草', '一般'], features: ['道馆', 'NPC住宅1', 'NPC住宅2', '废弃百货', '废弃游戏厅', '废弃花店', '废弃医院'] },
  '浅红市': { name: '浅红市', description: '毒系道馆与狩猎地带', type: 'city', difficulty: 3, levelRange: { min: 20, max: 30 }, pokemonTypes: ['毒', '一般'], features: ['道馆', 'NPC住宅1', '狩猎地带入口', '废弃商店', '废弃医院', '秘密基地'] },
  '11号道路': { name: '11号道路', description: '连接枯叶市与金黄市', type: 'road', difficulty: 3, levelRange: { min: 18, max: 28 }, pokemonTypes: ['一般', '飞行'], features: ['路边草丛', '告示牌'] },
  '12号道路': { name: '12号道路', description: '通往狩猎地带', type: 'road', difficulty: 3, levelRange: { min: 18, max: 28 }, pokemonTypes: ['一般', '草'], features: ['路边草丛', '狩猎地带外围'] },
  '13号道路': { name: '13号道路', description: '沿海道路', type: 'road', difficulty: 3, levelRange: { min: 20, max: 30 }, pokemonTypes: ['水', '飞行'], features: ['海边草丛', '钓鱼点', '沙滩'] },
  '14号道路': { name: '14号道路', description: '崎岖山路', type: 'road', difficulty: 3, levelRange: { min: 22, max: 32 }, pokemonTypes: ['岩石', '地面'], features: ['山路草丛', '悬崖边'] },
  '15号道路': { name: '15号道路', description: '通往金黄市', type: 'road', difficulty: 3, levelRange: { min: 22, max: 32 }, pokemonTypes: ['一般', '飞行'], features: ['路边草丛', '豪宅外围'] },
  '16号道路': { name: '16号道路', description: '自行车专用道路', type: 'road', difficulty: 3, levelRange: { min: 20, max: 30 }, pokemonTypes: ['一般', '飞行'], features: ['路边草丛', '观景台'] },
  '17号道路': { name: '17号道路', description: '连接玉虹市与浅红市', type: 'road', difficulty: 3, levelRange: { min: 20, max: 30 }, pokemonTypes: ['草', '毒'], features: ['草丛', '沼泽'] },
  '18号道路': { name: '18号道路', description: '通往红莲镇', type: 'road', difficulty: 3, levelRange: { min: 24, max: 34 }, pokemonTypes: ['火', '一般'], features: ['火山灰', '热泉'] },
  '无人发电厂': { name: '无人发电厂', description: '闪电鸟栖息地，充满电力', type: 'dungeon', difficulty: 3, levelRange: { min: 25, max: 35 }, pokemonTypes: ['电'], features: ['发电室', '高压电塔', '废弃控制室'] },
  '狩猎地带': { name: '狩猎地带', description: '稀有宝可梦保护区', type: 'special', difficulty: 3, levelRange: { min: 25, max: 38 }, pokemonTypes: ['各种稀有'], features: ['狩猎场1', '狩猎场2', '稀有区域', '管理员小屋'] },
  '岩山隧道': { name: '岩山隧道', description: '黑暗的岩石隧道', type: 'dungeon', difficulty: 3, levelRange: { min: 22, max: 32 }, pokemonTypes: ['岩石', '地面'], features: ['隧道深处', '矿洞分支', '地下湖泊'] },
  '西尔佛公司': { name: '西尔佛公司', description: '火箭队秘密基地入口', type: 'dungeon', difficulty: 4, levelRange: { min: 30, max: 45 }, pokemonTypes: ['超能', '恶'], features: ['1楼大厅', '2楼办公室', '3楼实验室', '地下仓库', 'BOSS房间'] },
  '火箭队基地': { name: '火箭队基地', description: '火箭队总部核心区域', type: 'dungeon', difficulty: 4, levelRange: { min: 35, max: 50 }, pokemonTypes: ['恶', '毒'], features: ['入口大厅', '训练室', '武器库', '干部办公室', 'BOSS王座'] },
  '红莲镇': { name: '红莲镇', description: '火系道馆所在岛屿', type: 'city', difficulty: 4, levelRange: { min: 32, max: 45 }, pokemonTypes: ['火', '水'], features: ['道馆', 'NPC住宅1', 'NPC住宅2', '研究室', '温泉', '火山口'] },
  '双子岛': { name: '双子岛', description: '急冻鸟栖息地，冰天雪地', type: 'dungeon', difficulty: 4, levelRange: { min: 35, max: 50 }, pokemonTypes: ['冰', '水'], features: ['冰洞1', '冰洞2', '冰之神殿', '急冻鸟巢穴'] },
  '冠军之路': { name: '冠军之路', description: '通往石英联盟的道路，强者之路', type: 'dungeon', difficulty: 4, levelRange: { min: 40, max: 55 }, pokemonTypes: ['各种强力'], features: ['试炼之门', '精英训练家区域', '神秘洞窟', '联盟入口'] },
  '石英联盟': { name: '石英联盟', description: '宝可梦联盟所在地，终极挑战', type: 'special', difficulty: 4, levelRange: { min: 45, max: 60 }, pokemonTypes: ['传说'], features: ['冠军殿堂', '四天王房间', '冠军房间', '联盟宝库'] },
  '常青市': { name: '常青市', description: '真新镇附近的城市，新手训练家的起点', type: 'city', difficulty: 1, levelRange: { min: 3, max: 8 }, pokemonTypes: ['一般'], features: ['道馆', 'NPC住宅1', 'NPC住宅2', '废弃商店', '废弃医院'] }
}

const MAP_CONNECTIONS = {
  '常磐近郊': { north: '1号道路', east: null, south: null, west: null },
  '1号道路': { north: '常青市', east: '常磐森林', south: '常磐近郊', west: null },
  '常磐森林': { north: '2号道路', east: null, south: null, west: '1号道路' },
  '2号道路': { north: '月见山外围', east: null, south: '常磐森林', west: null },
  '月见山外围': { north: '3号道路', east: null, south: '2号道路', west: null },
  '3号道路': { north: '深灰市', east: null, south: '月见山外围', west: null },
  '深灰市': { north: null, east: '4号道路', south: '3号道路', west: '岩山隧道' },
  '4号道路': { north: null, east: '华蓝市', south: null, west: '深灰市' },
  '华蓝市': { north: '10号道路', east: null, south: '地下通道', west: '4号道路' },
  '地下通道': { north: '金黄市', east: null, south: '华蓝市', west: null },
  '10号道路': { north: '无人发电厂', east: null, south: '华蓝市', west: null },
  '无人发电厂': { north: null, east: null, south: '10号道路', west: null },
  '金黄市': { north: '6号道路', east: '5号道路', south: '地下通道', west: '7号道路' },
  '5号道路': { north: '紫苑镇', east: null, south: null, west: '金黄市' },
  '6号道路': { north: '枯叶市', east: null, south: '金黄市', west: null },
  '7号道路': { north: null, east: '金黄市', south: '16号道路', west: null },
  '紫苑镇': { north: '8号道路', east: '9号道路', south: '5号道路', west: null },
  '8号道路': { north: null, east: null, south: null, west: '金黄市' },
  '9号道路': { north: null, east: '浅红市', south: null, west: '紫苑镇' },
  '枯叶市': { north: '11号道路', east: null, south: '6号道路', west: null },
  '11号道路': { north: null, east: null, south: null, west: '金黄市' },
  '16号道路': { north: '7号道路', east: null, south: '玉虹市', west: null },
  '玉虹市': { north: '16号道路', east: '17号道路', south: null, west: null },
  '17号道路': { north: null, east: '浅红市', south: null, west: '玉虹市' },
  '浅红市': { north: '12号道路', east: null, south: '9号道路', west: '17号道路' },
  '12号道路': { north: '狩猎地带', east: null, south: '浅红市', west: null },
  '狩猎地带': { north: null, east: null, south: '12号道路', west: null },
  '岩山隧道': { north: null, east: '深灰市', south: null, west: null },
  '西尔佛公司': { north: null, east: null, south: '金黄市', west: null },
  '火箭队基地': { north: null, east: null, south: '西尔佛公司', west: null },
  '13号道路': { north: '浅红市', east: '14号道路', south: null, west: null },
  '14号道路': { north: null, east: '15号道路', south: null, west: '13号道路' },
  '15号道路': { north: '金黄市', east: null, south: null, west: '14号道路' },
  '18号道路': { north: '玉虹市', east: null, south: '红莲镇', west: null },
  '红莲镇': { north: '18号道路', east: '双子岛', south: null, west: null },
  '双子岛': { north: null, east: null, south: null, west: '红莲镇' },
  '冠军之路': { north: '石英联盟', east: null, south: '浅红市', west: null },
  '石英联盟': { north: null, east: null, south: '冠军之路', west: null },
  '常青市': { north: null, east: null, south: '1号道路', west: null }
}

const MAP_CONFIG = {
  '低级地图': {
    name: '低级地图',
    difficulty: '简单',
    steps: { min: 30, max: 45 },
    encounterRate: 0.3,
    trainerRate: 0.1,
    locations: ['常磐近郊', '1号道路', '常青市', '常磐森林', '2号道路', '月见山外围'],
    pokemonPool: ['波波', '小拉达', '绿毛虫', '独角虫', '鲤鱼王', '烈雀', '比比鸟', '派拉斯', '派拉斯特', '毛球', '末入蛾'],
    itemPool: ['普通精灵球', '伤药'],
    silverPoints: [],
    goldPoints: [],
    unlockCondition: '开局默认',
    levelRange: { min: 3, max: 10 },
    startLocation: '常磐近郊'
  },
  '中级地图': {
    name: '中级地图',
    difficulty: '中等',
    steps: { min: 50, max: 70 },
    encounterRate: 0.4,
    trainerRate: 0.2,
    locations: ['3号道路', '深灰市', '4号道路', '华蓝市', '地下通道', '5号道路', '6号道路', '7号道路', '8号道路', '9号道路', '10号道路', '紫苑镇', '岩山隧道'],
    pokemonPool: ['波波', '比比鸟', '烈雀', '大嘴雀', '小拉达', '拉达', '穿山鼠', '穿山王', '尼多兰', '尼多朗', '尼多力诺', '尼多后', '尼多王', '皮皮', '皮可西', '六尾', '九尾', '胖丁', '胖可丁'],
    itemPool: ['普通精灵球', '超级球', '伤药', '好伤药', '技能机'],
    silverPoints: ['隐藏洞穴', '废弃小屋', '神秘花园', '古老遗迹'],
    goldPoints: [],
    unlockCondition: '低级地图成功撤离≥3次',
    levelRange: { min: 8, max: 20 },
    startLocation: '月见山外围'
  },
  '高级地图': {
    name: '高级地图',
    difficulty: '困难',
    steps: { min: 70, max: 90 },
    encounterRate: 0.5,
    trainerRate: 0.3,
    locations: ['枯叶市', '金黄市', '玉虹市', '浅红市', '11号道路', '12号道路', '13号道路', '14号道路', '15号道路', '16号道路', '17号道路', '18号道路', '无人发电厂', '狩猎地带', '西尔佛公司'],
    pokemonPool: ['雷电球', '顽皮雷弹', '椰蛋树', '肯泰罗', '风速狗', '蚊香泳士', '快泳蛙', '毒刺水母', '宝石海星', '角金鱼', '金鱼王', '海刺龙', '墨海马', '飞天螳螂', '迷唇姐', '电击兽', '鸭嘴火兽'],
    itemPool: ['超级球', '高级球', '好伤药', '高级伤药', '进化石', '技能机'],
    silverPoints: ['发电厂', '废弃医院', '废弃百货'],
    goldPoints: ['火箭队秘密仓库', '道馆宝库', '海底遗迹', '火山口'],
    unlockCondition: '持有≥2枚道馆勋章 + 中级地图成功撤离≥5次',
    levelRange: { min: 18, max: 35 },
    startLocation: '深灰市'
  },
  '终极高危地图': {
    name: '终极高危地图',
    difficulty: '地狱',
    steps: { min: 90, max: 120 },
    encounterRate: 0.6,
    trainerRate: 0.4,
    locations: ['火箭队基地', '红莲镇', '双子岛', '冠军之路', '石英联盟'],
    pokemonPool: ['卡比兽', '急冻鸟', '闪电鸟', '火焰鸟', '超梦', '梦幻', '化石翼龙', '袋兽', '三地鼠', '吉利蛋', '乘龙', '百变怪', '喷火龙', '水箭龟', '妙蛙花'],
    itemPool: ['高级球', '大师球', '高级伤药', '全满药', '进化石', '技能机', '勋章碎片'],
    silverPoints: ['精英训练家营地', '联盟入口'],
    goldPoints: ['冠军殿堂', '石英联盟宝库', '西尔佛公司顶层', '火箭队BOSS房间', '传说祭坛'],
    unlockCondition: '集齐8枚关都道馆勋章',
    levelRange: { min: 35, max: 60 },
    startLocation: '西尔佛公司'
  }
}

const MEDALS = [
  '常磐道馆勋章',
  '尼比道馆勋章',
  '华蓝道馆勋章',
  '枯叶道馆勋章',
  '彩虹道馆勋章',
  '浅红道馆勋章',
  '金黄道馆勋章',
  '红莲道馆勋章'
]

const FEATURE_CONFIG = {
  '大树洞': { type: 'searchable', description: '一个巨大的树洞，看起来可以搜索', searchChance: 0.7, rewards: ['普通精灵球', '伤药', '好伤药'], encounterChance: 0.3, encounterType: 'wild' },
  '茂密草丛': { type: 'searchable', description: '茂密的草丛，可能藏着宝可梦或道具', searchChance: 0.8, rewards: ['普通精灵球', '伤药'], encounterChance: 0.5, encounterType: 'wild' },
  '森林深处': { type: 'enterable', description: '森林深处，可能有野生宝可梦出没', floor: 1, trainerChance: 0.4 },
  '废弃小屋': { type: 'enterable', description: '一间废弃的小屋，里面可能有遗留的道具', floor: 1, trainerChance: 0.6, hasSecondFloor: true },
  '高草丛': { type: 'searchable', description: '高高的草丛，适合隐藏', searchChance: 0.7, rewards: ['普通精灵球'], encounterChance: 0.4, encounterType: 'wild' },
  '废弃箱子': { type: 'searchable', description: '路边的废弃木箱', searchChance: 0.6, rewards: ['普通精灵球', '伤药'], encounterChance: 0.2, encounterType: 'wild' },
  '路边草丛': { type: 'searchable', description: '路边的草丛', searchChance: 0.6, rewards: ['普通精灵球'], encounterChance: 0.3, encounterType: 'wild' },
  '岩石缝隙': { type: 'searchable', description: '岩石间的缝隙', searchChance: 0.5, rewards: ['伤药'], encounterChance: 0.4, encounterType: 'wild' },
  '山洞入口': { type: 'enterable', description: '山洞的入口', floor: 1, trainerChance: 0.3 },
  '岩石堆': { type: 'searchable', description: '一堆岩石', searchChance: 0.5, rewards: ['好伤药'], encounterChance: 0.3, encounterType: 'wild' },
  '矿物采集点': { type: 'searchable', description: '可以采集矿物的地方', searchChance: 0.4, rewards: ['进化石'], encounterChance: 0.5, encounterType: 'wild' },
  'NPC住宅1': { type: 'enterable', description: '一间普通的住宅', floor: 1, trainerChance: 0.5, hasSecondFloor: true },
  'NPC住宅2': { type: 'enterable', description: '另一间住宅', floor: 1, trainerChance: 0.4, hasSecondFloor: true },
  '道馆': { type: 'enterable', description: '道馆入口', floor: 1, trainerChance: 0.8, isGym: true },
  '废弃商店': { type: 'searchable', description: '一间废弃的商店，货架上可能有残留的物资', searchChance: 0.7, rewards: ['普通精灵球', '超级球', '伤药', '好伤药'], encounterChance: 0.3, encounterType: 'wild' },
  '废弃医院': { type: 'enterable', description: '废弃的医院，可能有医疗物资遗留', floor: 1, trainerChance: 0.5, hasSecondFloor: true },
  '河边草丛': { type: 'searchable', description: '河边的草丛', searchChance: 0.6, rewards: ['普通精灵球'], encounterChance: 0.4, encounterType: 'wild' },
  '钓鱼点': { type: 'searchable', description: '可以钓鱼的地方', searchChance: 0.7, rewards: ['超级球'], encounterChance: 0.5, encounterType: 'wild' },
  '阴暗角落': { type: 'searchable', description: '阴暗的角落', searchChance: 0.6, rewards: ['好伤药', '技能机'], encounterChance: 0.5, encounterType: 'wild' },
  '地下黑市': { type: 'enterable', description: '地下黑市，可能有黑市商人或遗留物资', floor: 1, trainerChance: 0.7 },
  '隐藏通道': { type: 'enterable', description: '隐藏的通道', floor: 1, trainerChance: 0.7 },
  '长椅': { type: 'searchable', description: '一张破旧的长椅，下面可能有东西', searchChance: 0.4, rewards: ['伤药'], encounterChance: 0.2, encounterType: 'wild' },
  '自行车道': { type: 'searchable', description: '自行车专用道，路边可能有掉落的物品', searchChance: 0.5, rewards: ['普通精灵球'], encounterChance: 0.3, encounterType: 'wild' },
  '废弃花店': { type: 'searchable', description: '废弃的花店，可能有植物系道具', searchChance: 0.6, rewards: ['好伤药', '进化石'], encounterChance: 0.3, encounterType: 'wild' },
  '墓地入口': { type: 'enterable', description: '墓地入口', floor: 1, trainerChance: 0.6 },
  '沼泽地带': { type: 'searchable', description: '沼泽地带', searchChance: 0.5, rewards: ['好伤药'], encounterChance: 0.6, encounterType: 'wild' },
  '发电站外围': { type: 'searchable', description: '发电站外围区域', searchChance: 0.5, rewards: ['技能机'], encounterChance: 0.6, encounterType: 'wild' },
  '宝可梦塔': { type: 'enterable', description: '宝可梦塔', floor: 1, trainerChance: 0.5, hasMultipleFloors: true, maxFloors: 5 },
  '灵屋': { type: 'enterable', description: '灵屋', floor: 1, trainerChance: 0.7 },
  '港口': { type: 'enterable', description: '港口', floor: 1, trainerChance: 0.3 },
  '船长室': { type: 'enterable', description: '船长室', floor: 1, trainerChance: 0.8 },
  '西尔佛公司': { type: 'enterable', description: '西尔佛公司大楼', floor: 1, trainerChance: 0.7, hasMultipleFloors: true, maxFloors: 11 },
  '废弃百货': { type: 'enterable', description: '废弃的百货公司，货架上可能有大量物资', floor: 1, trainerChance: 0.6, hasMultipleFloors: true, maxFloors: 3 },
  '废弃游戏厅': { type: 'enterable', description: '废弃的游戏厅，角落里可能有遗留的物品', floor: 1, trainerChance: 0.5 },
  '狩猎地带入口': { type: 'enterable', description: '狩猎地带入口', floor: 1, trainerChance: 0.2 },
  '秘密基地': { type: 'enterable', description: '秘密基地', floor: 1, trainerChance: 0.9 },
  '海边草丛': { type: 'searchable', description: '海边的草丛', searchChance: 0.6, rewards: ['超级球'], encounterChance: 0.4, encounterType: 'wild' },
  '沙滩': { type: 'searchable', description: '沙滩', searchChance: 0.7, rewards: ['高级球'], encounterChance: 0.3, encounterType: 'wild' },
  '山路草丛': { type: 'searchable', description: '山路上的草丛', searchChance: 0.5, rewards: ['好伤药'], encounterChance: 0.5, encounterType: 'wild' },
  '悬崖边': { type: 'searchable', description: '悬崖边', searchChance: 0.4, rewards: ['进化石'], encounterChance: 0.6, encounterType: 'wild' },
  '豪宅外围': { type: 'searchable', description: '豪宅外围', searchChance: 0.5, rewards: ['高级球'], encounterChance: 0.4, encounterType: 'wild' },
  '观景台': { type: 'searchable', description: '观景台，栏杆旁可能有东西', searchChance: 0.4, rewards: ['好伤药'], encounterChance: 0.3, encounterType: 'wild' },
  '草丛': { type: 'searchable', description: '普通草丛', searchChance: 0.6, rewards: ['普通精灵球'], encounterChance: 0.4, encounterType: 'wild' },
  '沼泽': { type: 'searchable', description: '沼泽', searchChance: 0.5, rewards: ['好伤药'], encounterChance: 0.5, encounterType: 'wild' },
  '火山灰': { type: 'searchable', description: '火山灰覆盖的区域', searchChance: 0.4, rewards: ['进化石'], encounterChance: 0.5, encounterType: 'wild' },
  '热泉': { type: 'searchable', description: '热泉区域，岩石旁可能有矿物', searchChance: 0.5, rewards: ['进化石', '好伤药'], encounterChance: 0.4, encounterType: 'wild' },
  '发电室': { type: 'enterable', description: '发电室', floor: 1, trainerChance: 0.8 },
  '高压电塔': { type: 'searchable', description: '高压电塔', searchChance: 0.3, rewards: ['技能机'], encounterChance: 0.7, encounterType: 'wild' },
  '废弃控制室': { type: 'enterable', description: '废弃的控制室', floor: 1, trainerChance: 0.9 },
  '狩猎场1': { type: 'enterable', description: '狩猎场区域1', floor: 1, trainerChance: 0.2 },
  '狩猎场2': { type: 'enterable', description: '狩猎场区域2', floor: 1, trainerChance: 0.3 },
  '稀有区域': { type: 'enterable', description: '稀有宝可梦区域', floor: 1, trainerChance: 0.5 },
  '管理员小屋': { type: 'enterable', description: '管理员小屋', floor: 1, trainerChance: 0.4 },
  '隧道深处': { type: 'enterable', description: '隧道深处', floor: 1, trainerChance: 0.6 },
  '矿洞分支': { type: 'enterable', description: '矿洞分支', floor: 1, trainerChance: 0.5 },
  '地下湖泊': { type: 'searchable', description: '地下湖泊', searchChance: 0.5, rewards: ['高级球'], encounterChance: 0.4, encounterType: 'wild' },
  '1楼大厅': { type: 'enterable', description: '1楼大厅', floor: 1, trainerChance: 0.3 },
  '2楼办公室': { type: 'enterable', description: '2楼办公室', floor: 2, trainerChance: 0.7 },
  '3楼实验室': { type: 'enterable', description: '3楼实验室', floor: 3, trainerChance: 0.8 },
  '地下仓库': { type: 'enterable', description: '地下仓库', floor: -1, trainerChance: 0.9 },
  'BOSS房间': { type: 'enterable', description: 'BOSS房间', floor: 5, trainerChance: 1.0, isBoss: true },
  '入口大厅': { type: 'enterable', description: '入口大厅', floor: 1, trainerChance: 0.4 },
  '训练室': { type: 'enterable', description: '训练室', floor: 1, trainerChance: 0.6 },
  '武器库': { type: 'enterable', description: '武器库', floor: 1, trainerChance: 0.7 },
  '干部办公室': { type: 'enterable', description: '干部办公室', floor: 2, trainerChance: 0.9 },
  'BOSS王座': { type: 'enterable', description: 'BOSS王座', floor: 3, trainerChance: 1.0, isBoss: true },
  '研究室': { type: 'enterable', description: '研究室', floor: 1, trainerChance: 0.6 },
  '温泉': { type: 'searchable', description: '温泉区域，周围可能有珍贵物品', searchChance: 0.5, rewards: ['高级伤药', '全满药', '进化石'], encounterChance: 0.4, encounterType: 'wild' },
  '火山口': { type: 'enterable', description: '火山口', floor: 1, trainerChance: 0.8 },
  '冰洞1': { type: 'enterable', description: '冰洞1', floor: 1, trainerChance: 0.5 },
  '冰洞2': { type: 'enterable', description: '冰洞2', floor: 1, trainerChance: 0.6 },
  '冰之神殿': { type: 'enterable', description: '冰之神殿', floor: 1, trainerChance: 0.8 },
  '急冻鸟巢穴': { type: 'enterable', description: '急冻鸟巢穴', floor: 2, trainerChance: 1.0, isBoss: true },
  '试炼之门': { type: 'enterable', description: '试炼之门', floor: 1, trainerChance: 0.6 },
  '精英训练家区域': { type: 'enterable', description: '精英训练家区域', floor: 1, trainerChance: 0.8 },
  '神秘洞窟': { type: 'enterable', description: '神秘洞窟', floor: 1, trainerChance: 0.7 },
  '联盟入口': { type: 'enterable', description: '联盟入口', floor: 1, trainerChance: 0.9 },
  '冠军殿堂': { type: 'enterable', description: '冠军殿堂', floor: 1, trainerChance: 1.0, isBoss: true },
  '四天王房间': { type: 'enterable', description: '四天王房间', floor: 2, trainerChance: 1.0, isBoss: true },
  '冠军房间': { type: 'enterable', description: '冠军房间', floor: 3, trainerChance: 1.0, isBoss: true },
  '联盟宝库': { type: 'enterable', description: '联盟宝库', floor: -1, trainerChance: 0.9 },
  '后山小径': { type: 'searchable', description: '后山小径', searchChance: 0.6, rewards: ['好伤药'], encounterChance: 0.4, encounterType: 'wild' },
  '水流公园': { type: 'searchable', description: '水流公园', searchChance: 0.7, rewards: ['超级球'], encounterChance: 0.3, encounterType: 'wild' },
  '告示牌': { type: 'searchable', description: '一张破旧的告示牌，背面可能有东西', searchChance: 0.3, rewards: ['伤药'], encounterChance: 0.1, encounterType: 'wild' },
  '狩猎地带外围': { type: 'searchable', description: '狩猎地带外围', searchChance: 0.5, rewards: ['超级球'], encounterChance: 0.4, encounterType: 'wild' },
  '休息区': { type: 'searchable', description: '废弃的休息区，长椅下可能有物资', searchChance: 0.5, rewards: ['好伤药'], encounterChance: 0.3, encounterType: 'wild' }
}

const GYM_LEADERS = {
  '常青市': {
    name: '小丹',
    title: '常青市道馆馆主',
    pokemon: [
      { name: '妙蛙种子', level: 8 },
      { name: '小火马', level: 8 }
    ],
    items: ['好伤药', '普通精灵球'],
    rewardMultiplier: 1.5,
    medal: '常青道馆勋章'
  },
  '深灰市': {
    name: '小刚',
    title: '深灰市道馆馆主',
    pokemon: [
      { name: '小拳石', level: 12 },
      { name: '隆隆岩', level: 14 }
    ],
    items: ['好伤药', '超级球'],
    rewardMultiplier: 2.0,
    medal: '岩石道馆勋章'
  }
}

const NPC_TRAINERS = [
  { name: '路人训练家', pokemonCount: 1, difficulty: 1, rewardMultiplier: 1.0, items: ['普通精灵球', '伤药'] },
  { name: '精英训练家', pokemonCount: 2, difficulty: 2, rewardMultiplier: 1.5, items: ['超级球', '好伤药'] },
  { name: '道馆挑战者', pokemonCount: 3, difficulty: 3, rewardMultiplier: 2.0, items: ['高级球', '高级伤药'] },
  { name: '四天王候选人', pokemonCount: 4, difficulty: 4, rewardMultiplier: 3.0, items: ['高级球', '全满药', '进化石'] },
  { name: '火箭队干部', pokemonCount: 3, difficulty: 3, rewardMultiplier: 2.5, items: ['高级球', '技能机', '进化石'] },
  { name: '火箭队小兵', pokemonCount: 1, difficulty: 2, rewardMultiplier: 1.2, items: ['普通精灵球', '伤药'] },
  { name: '道馆馆主', pokemonCount: 3, difficulty: 4, rewardMultiplier: 3.5, items: ['大师球', '全满药', '进化石'], isGymLeader: true },
  { name: '野生训练家', pokemonCount: 1, difficulty: 1, rewardMultiplier: 1.0, items: ['普通精灵球'] }
]

class MapPoint {
  constructor(type, name, description) {
    this.type = type
    this.name = name
    this.description = description
    this.visited = false
  }
  
  getReward() {
    switch (this.type) {
      case 'gold':
        return this._generateGoldReward()
      case 'silver':
        return this._generateSilverReward()
      default:
        return this._generateNormalReward()
    }
  }
  
  _generateNormalReward() {
    const rewards = []
    const rand = Math.random()
    if (rand > 0.5) {
      const items = ['普通精灵球', '伤药']
      const item = items[Math.floor(Math.random() * items.length)]
      rewards.push({ type: 'item', name: item, quantity: 1 })
    }
    return rewards
  }
  
  _generateSilverReward() {
    const rewards = []
    const items = ['超级球', '好伤药', '技能机']
    const item = items[Math.floor(Math.random() * items.length)]
    rewards.push({ type: 'item', name: item, quantity: Math.floor(Math.random() * 3) + 1 })
    return rewards
  }
  
  _generateGoldReward() {
    const rewards = []
    const rand = Math.random()
    
    if (rand < 0.3) {
      rewards.push({ type: 'item', name: '大师球', quantity: 1 })
    } else if (rand < 0.5) {
      rewards.push({ type: 'item', name: '全满药', quantity: Math.floor(Math.random() * 2) + 1 })
    } else if (rand < 0.7) {
      rewards.push({ type: 'item', name: '进化石', quantity: Math.floor(Math.random() * 2) + 1 })
    } else {
      rewards.push({ type: 'item', name: '高级球', quantity: Math.floor(Math.random() * 3) + 2 })
    }
    
    if (Math.random() < 0.3) {
      rewards.push({ type: 'medal', name: MEDALS[Math.floor(Math.random() * MEDALS.length)] })
    }
    
    return rewards
  }
  
  toJSON() {
    return {
      type: this.type,
      name: this.name,
      description: this.description,
      visited: this.visited
    }
  }
  
  static fromJSON(data) {
    const point = new MapPoint(data.type, data.name, data.description)
    point.visited = data.visited
    return point
  }
}

class GameMap {
  constructor(mapTier) {
    this.tier = mapTier
    this.config = MAP_CONFIG[mapTier]
    this.currentLocation = this.config.startLocation || this.config.locations[0]
    this.points = this._generatePoints()
    this.exploredLocations = new Set([this.currentLocation])
    this.currentBuilding = null
    this.currentFloor = 0
    this.exploredFeatures = new Set()
  }
  
  _generatePoints() {
    const points = []
    
    for (const name of this.config.silverPoints) {
      points.push(new MapPoint('silver', name, '银色稀有点位，稳定产出中级物资'))
    }
    
    for (const name of this.config.goldPoints) {
      points.push(new MapPoint('gold', name, '金色高价值点位，必出高阶物资'))
    }
    
    return points
  }
  
  getCurrentLocationInfo() {
    return MAP_LOCATIONS[this.currentLocation] || {}
  }
  
  getAvailableFeatures() {
    const locationInfo = this.getCurrentLocationInfo()
    const features = []
    
    if (locationInfo.features) {
      for (const featureName of locationInfo.features) {
        const config = FEATURE_CONFIG[featureName]
        if (config) {
          features.push({
            name: featureName,
            type: config.type,
            description: config.description,
            canSearch: config.type === 'searchable',
            canEnter: config.type === 'enterable',
            canHeal: config.type === 'heal',
            canShop: config.type === 'shop',
            hasSecondFloor: config.hasSecondFloor,
            isExplored: this.exploredFeatures.has(featureName)
          })
        }
      }
    }
    
    return features
  }
  
  getAvailableDirections() {
    const connections = MAP_CONNECTIONS[this.currentLocation] || {}
    const directions = []
    
    if (connections.north) directions.push({ direction: '北', location: connections.north })
    if (connections.east) directions.push({ direction: '东', location: connections.east })
    if (connections.south) directions.push({ direction: '南', location: connections.south })
    if (connections.west) directions.push({ direction: '西', location: connections.west })
    
    return directions
  }
  
  move(direction) {
    if (this.currentBuilding) {
      return { moved: false, message: '请先离开当前建筑！', location: this.currentLocation }
    }
    
    const validDirections = ['北', '南', '东', '西']
    if (!validDirections.includes(direction)) {
      return { moved: false, message: `无效方向！可用方向: ${this.getAvailableDirections().map(d => d.direction).join('、')}`, location: this.currentLocation }
    }
    
    const connections = MAP_CONNECTIONS[this.currentLocation] || {}
    const directionMap = { '北': 'north', '南': 'south', '东': 'east', '西': 'west' }
    const newLocation = connections[directionMap[direction]]
    
    if (!newLocation) {
      return { moved: false, message: `不能往${direction}走！前方没有道路。可用方向: ${this.getAvailableDirections().map(d => d.direction).join('、')}`, location: this.currentLocation }
    }
    
    if (!this.config.locations.includes(newLocation) && !MAP_LOCATIONS[newLocation]) {
      return { moved: false, message: `该区域不在当前地图范围内！`, location: this.currentLocation }
    }
    
    this.exploredLocations.add(newLocation)
    this.currentLocation = newLocation
    
    const nearbyPoints = this.points.filter(p => !p.visited)
    let pointMessage = ''
    
    if (nearbyPoints.length > 0 && Math.random() < 0.3) {
      const point = nearbyPoints[Math.floor(Math.random() * nearbyPoints.length)]
      point.visited = true
      pointMessage = `\n【发现】${point.description}「${point.name}」！`
    }
    
    const locationInfo = MAP_LOCATIONS[newLocation] || {}
    
    return {
      moved: true,
      message: `向${direction}移动到 ${newLocation}${locationInfo.description ? ` - ${locationInfo.description}` : ''}${pointMessage}`,
      location: newLocation,
      locationInfo: locationInfo,
      foundPoint: pointMessage ? nearbyPoints.find(p => p.name === pointMessage.match(/「([^」]+)」/)[1]) : null,
      features: this.getAvailableFeatures()
    }
  }
  
  enterFeature(featureName) {
    const locationInfo = this.getCurrentLocationInfo()
    
    if (!locationInfo.features || !locationInfo.features.includes(featureName)) {
      return { success: false, message: `该地点没有「${featureName}」！` }
    }
    
    const config = FEATURE_CONFIG[featureName]
    if (!config) {
      return { success: false, message: `未知地点「${featureName}」！` }
    }
    
    if (config.type !== 'enterable') {
      return { success: false, message: `「${featureName}」无法进入！` }
    }
    
    this.currentBuilding = featureName
    this.currentFloor = config.floor || 1
    this.exploredFeatures.add(featureName)
    
    const messages = [`进入了「${featureName}」`]
    
    if (config.hasSecondFloor) {
      messages.push('发现有楼梯可以通往2楼')
    }
    
    if (config.hasMultipleFloors) {
      messages.push(`这栋建筑有${config.maxFloors}层`)
    }
    
    // 显示当前楼层可搜索的物品
    const floorItems = this._getFloorItems(featureName, this.currentFloor)
    if (floorItems && floorItems.length > 0) {
      messages.push(`\n【可搜索物品】`)
      floorItems.forEach(item => {
        messages.push(`  - ${item.description}`)
      })
    }
    
    // 指令提示
    const commands = []
    if (config.hasSecondFloor || (config.hasMultipleFloors && this.currentFloor < config.maxFloors)) {
      commands.push('"上楼"前往2楼')
    }
    if (this.currentFloor > 1) {
      commands.push('"下楼"前往1楼')
    }
    commands.push('"搜刮"搜索当前楼层物品')
    commands.push('"离开"退出建筑')
    
    messages.push(`\n可用指令：${commands.join('、')}`)
    
    const encounter = this._checkBuildingEncounter(config)
    
    return {
      success: true,
      message: messages.join('\n'),
      feature: config,
      building: featureName,
      floor: this.currentFloor,
      encounter: encounter
    }
  }
  
  leaveBuilding() {
    if (!this.currentBuilding) {
      return { success: false, message: '你不在任何建筑内！' }
    }
    
    const building = this.currentBuilding
    this.currentBuilding = null
    this.currentFloor = 0
    
    return {
      success: true,
      message: `离开了「${building}」`,
      location: this.currentLocation,
      features: this.getAvailableFeatures()
    }
  }
  
  goToFloor(floor) {
    if (!this.currentBuilding) {
      return { success: false, message: '你不在任何建筑内！' }
    }
    
    const config = FEATURE_CONFIG[this.currentBuilding]
    if (!config) {
      return { success: false, message: '建筑配置错误！' }
    }
    
    const currentFloor = this.currentFloor || 1
    const targetFloor = currentFloor + floor
    
    if (targetFloor < 1) {
      return { success: false, message: '已经是最低层了！' }
    }
    
    if (targetFloor > 2 && !config.hasMultipleFloors) {
      return { success: false, message: '无法前往该楼层！' }
    }
    
    if (config.hasMultipleFloors && targetFloor > config.maxFloors) {
      return { success: false, message: '无法前往该楼层！' }
    }
    
    // 检查是否有2楼
    if (config.hasSecondFloor && targetFloor === 2) {
      this.currentFloor = 2
      
      const encounter = this._checkSecondFloorEncounter()
      
      return {
        success: true,
        message: '上到了2楼...',
        floor: 2,
        encounter: encounter
      }
    }
    
    // 多楼层建筑
    if (config.hasMultipleFloors && targetFloor >= 1 && targetFloor <= config.maxFloors) {
      this.currentFloor = targetFloor
      
      const encounter = this._checkBuildingEncounter(config)
      
      const direction = targetFloor > currentFloor ? '上' : '下'
      return {
        success: true,
        message: `${direction}到了${targetFloor}楼`,
        floor: targetFloor,
        encounter: encounter
      }
    }
    
    return { success: false, message: '无法前往该楼层！' }
  }
  
  getCurrentBuildingConfig() {
    if (!this.currentBuilding) {
      return null
    }
    return FEATURE_CONFIG[this.currentBuilding] || null
  }
  
  _checkBuildingEncounter(config) {
    if (Math.random() < config.trainerChance) {
      return { type: 'trainer', trainer: this._generateTrainer(config) }
    }
    return null
  }
  
  _getFloorItems(buildingName, floor) {
    const floorItems = {
      '废弃医院': {
        1: [
          { description: '破旧的药柜', item: '伤药', searchChance: 0.5 },
          { description: '散落的文件堆', item: null, searchChance: 0.3 }
        ],
        2: [
          { description: '手术室器械台', item: '好伤药', searchChance: 0.4 },
          { description: '病房床头柜', item: '普通精灵球', searchChance: 0.3 }
        ]
      },
      '废弃商店': {
        1: [
          { description: '货架残骸', item: '普通精灵球', searchChance: 0.6 },
          { description: '收银台抽屉', item: null, searchChance: 0.4 }
        ]
      },
      '废弃百货': {
        1: [
          { description: '一楼大厅展示柜', item: '超级球', searchChance: 0.3 },
          { description: '服务台', item: null, searchChance: 0.5 }
        ],
        2: [
          { description: '玩具区货架', item: '伤药', searchChance: 0.4 },
          { description: '电器区柜台', item: '技能机', searchChance: 0.2 }
        ],
        3: [
          { description: '天台储物间', item: '高级球', searchChance: 0.3 }
        ]
      },
      '废弃游戏厅': {
        1: [
          { description: '游戏机内部', item: null, searchChance: 0.4 },
          { description: '角落垃圾桶', item: '伤药', searchChance: 0.3 }
        ]
      },
      'NPC住宅1': {
        1: [
          { description: '客厅茶几', item: '伤药', searchChance: 0.4 },
          { description: '卧室床头柜', item: '普通精灵球', searchChance: 0.3 },
          { description: '厨房橱柜', item: null, searchChance: 0.5 }
        ],
        2: [
          { description: '二楼卧室床铺', item: '好伤药', searchChance: 0.4 },
          { description: '儿童书桌', item: '普通精灵球', searchChance: 0.3 },
          { description: '阳台植物盆', item: '高级球', searchChance: 0.2 }
        ]
      },
      'NPC住宅2': {
        1: [
          { description: '玄关鞋柜', item: '普通精灵球', searchChance: 0.4 },
          { description: '书房书架', item: '好伤药', searchChance: 0.3 },
          { description: '阳台花盆', item: null, searchChance: 0.4 }
        ],
        2: [
          { description: '主人房梳妆台', item: '超级球', searchChance: 0.3 },
          { description: '储藏室纸箱', item: '伤药', searchChance: 0.4 },
          { description: '阁楼旧物堆', item: '稀有化石', searchChance: 0.2 }
        ]
      },
      '废弃道馆': {
        1: [
          { description: '前台接待处', item: '好伤药', searchChance: 0.5 },
          { description: '训练室器材', item: '高级球', searchChance: 0.3 }
        ],
        2: [
          { description: '馆主房间', item: '超级球', searchChance: 0.4 },
          { description: '奖杯陈列柜', item: '稀有化石', searchChance: 0.2 }
        ]
      }
    }
    
    return floorItems[buildingName]?.[floor] || []
  }
  
  _searchBuildingItem(itemName) {
    const floorItems = this._getFloorItems(this.currentBuilding, this.currentFloor)
    const targetItem = floorItems.find(item => item.description === itemName)
    
    if (!targetItem) {
      return { success: false, message: `当前楼层没有「${itemName}」！` }
    }
    
    // 检查是否已搜索过
    const searchedKey = `${this.currentBuilding}_${this.currentFloor}_${itemName}`
    if (this.exploredFeatures.has(searchedKey)) {
      return { success: false, message: `「${itemName}」已经搜索过了！` }
    }
    
    this.exploredFeatures.add(searchedKey)
    
    const rewards = []
    const messages = []
    
    // 获取当前地图难度
    const difficulty = this._getCurrentDifficulty()
    
    // 搜索成功率（基础概率）
    const baseSearchChance = targetItem.searchChance || 0.5
    
    // 根据搜索成功率决定是否找到东西
    if (Math.random() < baseSearchChance) {
      // 决定获得什么类型的奖励
      const rewardTypeRoll = Math.random()
      
      // 10%概率获得藏品，90%概率获得普通物品
      if (rewardTypeRoll < 0.1 && targetItem.collection !== false) {
        // 获得藏品
        const collectionResult = this._generateCollection(difficulty, targetItem)
        if (collectionResult) {
          rewards.push(collectionResult)
          messages.push(`在${itemName}中发现了藏品【${collectionResult.name}】！`)
          messages.push(`品质：${this._getRarityText(collectionResult.rarity)} | 占用：${collectionResult.slots}格 | 价格：${collectionResult.price}金币`)
        }
      } else if (targetItem.item) {
        // 获得普通物品
        const quantity = Math.floor(Math.random() * 2) + 1
        rewards.push({ type: 'item', name: targetItem.item, quantity })
        messages.push(`在${itemName}中找到了 ${targetItem.item} x${quantity}`)
      } else {
        // 没有配置物品，尝试生成随机物品
        const randomItem = this._generateRandomItem(difficulty)
        if (randomItem) {
          rewards.push({ type: 'item', name: randomItem.name, quantity: randomItem.quantity })
          messages.push(`在${itemName}中找到了 ${randomItem.name} x${randomItem.quantity}`)
        } else {
          messages.push(`在${itemName}中找到了一些零散的物品，但没有什么价值`)
        }
      }
    } else {
      messages.push(`在${itemName}中什么也没找到`)
    }
    
    // 搜索建筑内物品也有几率遭遇野生宝可梦
    if (Math.random() < 0.2) {
      return {
        success: true,
        message: messages.join('\n'),
        rewards: rewards,
        encounter: { type: 'wild', pokemon: this._generateWildPokemon() }
      }
    }
    
    return {
      success: true,
      message: messages.join('\n'),
      rewards: rewards,
      encounter: null
    }
  }
  
  // 获取当前地图难度
  _getCurrentDifficulty() {
    const locationInfo = MAP_LOCATIONS[this.currentLocation]
    return locationInfo?.difficulty || 1
  }
  
  // 根据难度生成藏品
  _generateCollection(difficulty, targetItem) {
    const rarityProb = RARITY_PROBABILITY[difficulty] || RARITY_PROBABILITY[1]
    
    // 如果地点配置了固定品质，使用配置的品质
    if (targetItem.collection && targetItem.collectionName && targetItem.rarity) {
      // 检查该品质是否在当前难度允许范围内
      const rarityValue = this._getRarityValue(targetItem.rarity)
      const maxAllowedRarity = this._getMaxAllowedRarity(difficulty)
      
      if (rarityValue <= maxAllowedRarity) {
        // 随机生成格数（1-4格）
        const slots = Math.floor(Math.random() * 4) + 1
        const price = this._calculateCollectionPrice(targetItem.rarity, slots)
        
        return {
          type: 'collection',
          name: targetItem.collectionName,
          slots: slots,
          rarity: targetItem.rarity,
          price: price
        }
      }
      // 如果品质超出当前难度，降级处理
    }
    
    // 根据概率随机决定品质
    const roll = Math.random()
    let cumulative = 0
    let selectedRarity = 'common'
    
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
    for (const rarity of rarities) {
      cumulative += rarityProb[rarity] || 0
      if (roll < cumulative) {
        selectedRarity = rarity
        break
      }
    }
    
    // 随机生成格数（1-4格）
    const slots = Math.floor(Math.random() * 4) + 1
    
    // 从对应品质的藏品库中随机选择
    const collectionNames = COLLECTION_NAMES[selectedRarity]
    const name = collectionNames[Math.floor(Math.random() * collectionNames.length)]
    
    // 计算价格
    const price = this._calculateCollectionPrice(selectedRarity, slots)
    
    return {
      type: 'collection',
      name: name,
      slots: slots,
      rarity: selectedRarity,
      price: price
    }
  }
  
  // 计算藏品价格（品质基础价格 × 格数倍率）
  _calculateCollectionPrice(rarity, slots) {
    const basePrice = RARITY_BASE_PRICE[rarity] || 50
    const multiplier = SLOT_PRICE_MULTIPLIER[slots] || 1.0
    return Math.floor(basePrice * multiplier)
  }
  
  // 获取品质数值（用于比较）
  _getRarityValue(rarity) {
    const values = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 }
    return values[rarity] || 1
  }
  
  // 获取当前难度允许的最高品质
  _getMaxAllowedRarity(difficulty) {
    const maxRarities = { 1: 3, 2: 4, 3: 5, 4: 6 } // 1=稀有, 2=史诗, 3=金色, 4=神话
    return maxRarities[difficulty] || 3
  }
  
  // 根据难度生成随机物品
  _generateRandomItem(difficulty) {
    const itemPools = {
      1: ['普通精灵球', '伤药'],
      2: ['普通精灵球', '超级球', '伤药', '好伤药'],
      3: ['超级球', '高级球', '好伤药', '解毒药', '技能机'],
      4: ['高级球', '大师球', '好伤药', '全复药', '技能机', '稀有化石']
    }
    
    const pool = itemPools[difficulty] || itemPools[1]
    const name = pool[Math.floor(Math.random() * pool.length)]
    const quantity = Math.floor(Math.random() * 2) + 1
    
    return { name, quantity }
  }
  
  _getRarityText(rarity) {
    const rarityMap = {
      'common': '普通',
      'uncommon': '稀有',
      'rare': '罕见',
      'epic': '史诗',
      'legendary': '传说'
    }
    return rarityMap[rarity] || '普通'
  }
  
  _checkSecondFloorEncounter() {
    if (Math.random() < 0.7) {
      return { type: 'trainer', trainer: this._generateTrainer({ trainerChance: 1.0 }) }
    }
    return null
  }
  
  searchFeature(featureName) {
    // 如果在建筑内，搜索建筑内的物品
    if (this.currentBuilding) {
      return this._searchBuildingItem(featureName)
    }
    
    const locationInfo = this.getCurrentLocationInfo()
    
    if (!locationInfo.features || !locationInfo.features.includes(featureName)) {
      return { success: false, message: `该地点没有「${featureName}」！` }
    }
    
    const config = FEATURE_CONFIG[featureName]
    if (!config) {
      return { success: false, message: `未知地点「${featureName}」！` }
    }
    
    if (config.type !== 'searchable') {
      return { success: false, message: `「${featureName}」无法搜索！` }
    }
    
    if (this.exploredFeatures.has(featureName)) {
      return { success: false, message: `「${featureName}」已经搜索过了！` }
    }
    
    this.exploredFeatures.add(featureName)
    
    const rewards = []
    const messages = []
    
    if (Math.random() < config.searchChance) {
      const item = config.rewards[Math.floor(Math.random() * config.rewards.length)]
      const quantity = Math.floor(Math.random() * 3) + 1
      rewards.push({ type: 'item', name: item, quantity })
      messages.push(`在${featureName}中找到了 ${item} x${quantity}`)
    } else {
      messages.push(`在${featureName}中什么也没找到`)
    }
    
    let encounter = null
    if (Math.random() < config.encounterChance) {
      encounter = { type: 'wild', pokemon: this._generateWildPokemon() }
      messages.push(`搜索时惊动了野生宝可梦！`)
    }
    
    return {
      success: true,
      message: messages.join('\n'),
      rewards: rewards,
      encounter: encounter,
      feature: config
    }
  }
  
  checkEncounter() {
    if (this.currentBuilding) {
      return null
    }
    
    if (Math.random() < this.config.encounterRate) {
      return { type: 'wild', pokemon: this._generateWildPokemon() }
    }
    
    if (Math.random() < this.config.trainerRate) {
      return { type: 'trainer', trainer: this._generateTrainer() }
    }
    
    return null
  }
  
  _generateWildPokemon() {
    const pool = this.config.pokemonPool
    const name = pool[Math.floor(Math.random() * pool.length)]
    const level = Math.floor(Math.random() * (this.config.levelRange.max - this.config.levelRange.min + 1)) + this.config.levelRange.min
    return { name, level, rarity: getPokemonRarity(name) }
  }
  
  _generateTrainer(configOverride = {}) {
    // 检查是否有城市专属道馆馆主
    const cityName = this.currentLocation || this.config.name
    if (configOverride.isGym && GYM_LEADERS[cityName]) {
      const gymLeader = GYM_LEADERS[cityName]
      const trainerItems = []
      if (gymLeader.items) {
        for (const itemName of gymLeader.items) {
          if (Math.random() < 0.5) {
            trainerItems.push({ name: itemName, quantity: Math.floor(Math.random() * 2) + 1 })
          }
        }
      }
      return {
        name: gymLeader.name,
        title: gymLeader.title,
        pokemon: gymLeader.pokemon.map(p => ({ ...p, rarity: getPokemonRarity(p.name) })),
        rewardMultiplier: gymLeader.rewardMultiplier,
        hasMedal: true,
        items: trainerItems,
        isGymLeader: true,
        isBoss: false,
        medal: gymLeader.medal
      }
    }
    
    const pool = NPC_TRAINERS.filter(t => t.difficulty <= this._getDifficulty())
    
    let template
    if (configOverride.isBoss) {
      template = pool.find(t => t.isBoss) || pool[pool.length - 1]
    } else if (configOverride.isGym) {
      template = pool.find(t => t.isGymLeader) || pool[pool.length - 1]
    } else {
      template = pool[Math.floor(Math.random() * pool.length)]
    }
    
    const pokemon = []
    for (let i = 0; i < template.pokemonCount; i++) {
      const name = this.config.pokemonPool[Math.floor(Math.random() * this.config.pokemonPool.length)]
      const level = Math.floor(Math.random() * (this.config.levelRange.max - this.config.levelRange.min + 1)) + this.config.levelRange.min
      pokemon.push({ name, level, rarity: getPokemonRarity(name) })
    }
    
    const trainerItems = []
    if (template.items) {
      for (const itemName of template.items) {
        if (Math.random() < 0.5) {
          trainerItems.push({ name: itemName, quantity: Math.floor(Math.random() * 2) + 1 })
        }
      }
    }
    
    return {
      name: template.name,
      pokemon: pokemon,
      rewardMultiplier: template.rewardMultiplier,
      hasMedal: Math.random() < 0.2,
      items: trainerItems,
      isGymLeader: template.isGymLeader || false,
      isBoss: template.isBoss || false
    }
  }
  
  lootTrainer(trainer) {
    const rewards = []
    
    if (trainer.items && trainer.items.length > 0) {
      for (const item of trainer.items) {
        rewards.push({ type: 'item', name: item.name, quantity: item.quantity })
      }
    }
    
    if (trainer.pokemon && trainer.pokemon.length > 0) {
      const lootablePokemon = trainer.pokemon.filter(() => Math.random() < 0.3)
      for (const p of lootablePokemon) {
        rewards.push({ type: 'pokemon', name: p.name, level: p.level, rarity: p.rarity })
      }
    }
    
    if (trainer.hasMedal) {
      rewards.push({ type: 'medal', name: MEDALS[Math.floor(Math.random() * MEDALS.length)] })
    }
    
    const moneyAmount = Math.floor(Math.random() * 100 * trainer.rewardMultiplier) + 50
    rewards.push({ type: 'money', amount: moneyAmount })
    
    return rewards
  }
  
  _getDifficulty() {
    const difficultyMap = { '简单': 1, '中等': 2, '困难': 3, '地狱': 4 }
    return difficultyMap[this.config.difficulty] || 1
  }
  
  search() {
    const rewards = []
    const rand = Math.random()
    
    if (rand < 0.6) {
      const item = this.config.itemPool[Math.floor(Math.random() * this.config.itemPool.length)]
      const quantity = Math.floor(Math.random() * 3) + 1
      rewards.push({ type: 'item', name: item, quantity })
    }
    
    if (rand < 0.3) {
      rewards.push({ type: 'money', amount: Math.floor(Math.random() * 50) + 20 })
    }
    
    return rewards
  }
  
  toJSON() {
    return {
      tier: this.tier,
      currentLocation: this.currentLocation,
      points: this.points.map(p => p.toJSON()),
      exploredLocations: [...this.exploredLocations],
      currentBuilding: this.currentBuilding,
      currentFloor: this.currentFloor,
      exploredFeatures: [...this.exploredFeatures]
    }
  }
  
  static fromJSON(data) {
    const map = new GameMap(data.tier)
    map.currentLocation = data.currentLocation
    map.points = data.points.map(p => MapPoint.fromJSON(p))
    map.exploredLocations = new Set(data.exploredLocations)
    map.currentBuilding = data.currentBuilding || null
    map.currentFloor = data.currentFloor || 0
    map.exploredFeatures = new Set(data.exploredFeatures || [])
    return map
  }
}

function getAvailableMaps(player) {
  const available = []
  
  available.push('低级地图')
  
  if (player.successfulMissions >= 3) {
    available.push('中级地图')
  }
  
  if (player.medals.length >= 2 && player.successfulMissions >= 8) {
    available.push('高级地图')
  }
  
  if (player.medals.length >= 8) {
    available.push('终极高危地图')
  }
  
  return available
}

function getMapInfo(mapTier) {
  return MAP_CONFIG[mapTier] || null
}

module.exports = {
  GameMap,
  MapPoint,
  MAP_CONFIG,
  MAP_LOCATIONS,
  FEATURE_CONFIG,
  MEDALS,
  NPC_TRAINERS,
  getAvailableMaps,
  getMapInfo,
  initMapConfig
}