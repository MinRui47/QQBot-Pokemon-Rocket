// 藏品系统
// 稀有度：白色普通→绿色优秀→蓝色稀有→紫色史诗→金色传说→红色神话
// 格子占用：1格小件 / 2格中型 / 4格大型 / 6格巨型

const RARITY_ORDER = ['白色普通', '绿色优秀', '蓝色稀有', '紫色史诗', '金色传说', '红色神话']

const COLLECTIONS = [
  // === 进化道具/石头 ===
  { name: '火之石', rarity: '蓝色稀有', grid: 1, source: '矿物采集点、火山口', type: 'evolution' },
  { name: '水之石', rarity: '蓝色稀有', grid: 1, source: '钓鱼点、双子岛', type: 'evolution' },
  { name: '雷之石', rarity: '蓝色稀有', grid: 1, source: '无人发电厂', type: 'evolution' },
  { name: '叶之石', rarity: '蓝色稀有', grid: 1, source: '茂密草丛、森林深处', type: 'evolution' },
  { name: '冰之石', rarity: '蓝色稀有', grid: 1, source: '双子岛冰洞', type: 'evolution' },
  { name: '月之石', rarity: '紫色史诗', grid: 1, source: '月见山、宝可梦塔', type: 'evolution' },
  { name: '日之石', rarity: '紫色史诗', grid: 1, source: '稀有区域、金黄市', type: 'evolution' },
  { name: '暗之石', rarity: '紫色史诗', grid: 1, source: '火箭队基地、西尔佛公司', type: 'evolution' },
  { name: '光之石', rarity: '紫色史诗', grid: 1, source: '西尔佛公司顶层、冠军之路', type: 'evolution' },
  { name: '觉醒之石', rarity: '紫色史诗', grid: 1, source: '冠军之路、石英联盟', type: 'evolution' },
  { name: '王者之证', rarity: '紫色史诗', grid: 1, source: '道馆馆主掉落', type: 'evolution' },
  { name: '金属膜', rarity: '紫色史诗', grid: 1, source: '无人发电厂、西尔佛公司', type: 'evolution' },
  { name: '龙之鳞片', rarity: '金色传说', grid: 1, source: '狩猎地带稀有区域', type: 'evolution' },
  { name: '电力增幅器', rarity: '紫色史诗', grid: 1, source: '无人发电厂', type: 'evolution' },
  { name: '熔岩增幅器', rarity: '紫色史诗', grid: 1, source: '红莲镇火山口', type: 'evolution' },
  { name: '升级数据', rarity: '蓝色稀有', grid: 1, source: '西尔佛公司、金黄市', type: 'evolution' },
  { name: ' dubious disc', rarity: '金色传说', grid: 1, source: '西尔佛公司实验室', type: 'evolution' },
  { name: '锐利牙', rarity: '蓝色稀有', grid: 1, source: '狩猎地带', type: 'evolution' },
  { name: '锐利爪', rarity: '蓝色稀有', grid: 1, source: '岩山隧道', type: 'evolution' },
  { name: '灵界之布', rarity: '紫色史诗', grid: 1, source: '宝可梦塔', type: 'evolution' },
  { name: '甜甜蜜', rarity: '绿色优秀', grid: 1, source: '玉虹市废弃花店', type: 'evolution' },
  { name: '护具', rarity: '蓝色稀有', grid: 1, source: '枯叶市港口', type: 'evolution' },
  { name: '鞭子', rarity: '蓝色稀有', grid: 1, source: '浅红市狩猎地带', type: 'evolution' },
  { name: '美丽鳞片', rarity: '紫色史诗', grid: 1, source: '华蓝市水流公园', type: 'evolution' },
  { name: '破裂茶壶', rarity: '蓝色稀有', grid: 1, source: '玉虹市废弃百货', type: 'evolution' },
  { name: '大师球碎片（1/4）', rarity: '金色传说', grid: 1, source: '高级干部签到、BOSS房间', type: 'collectible' },
  { name: '大师球碎片（2/4）', rarity: '金色传说', grid: 1, source: '高级干部签到、BOSS房间', type: 'collectible' },
  { name: '大师球碎片（3/4）', rarity: '金色传说', grid: 1, source: '高级干部签到、BOSS房间', type: 'collectible' },
  { name: '大师球碎片（4/4）', rarity: '金色传说', grid: 1, source: '高级干部签到、BOSS房间', type: 'collectible' },

  // === 收藏品 ===
  { name: '皮卡丘玩偶', rarity: '白色普通', grid: 1, source: '玉虹市废弃游戏厅', type: 'collectible' },
  { name: '呆呆兽尾巴', rarity: '白色普通', grid: 1, source: '河边草丛', type: 'collectible' },
  { name: '鲤鱼王鳞片', rarity: '白色普通', grid: 1, source: '钓鱼点', type: 'collectible' },
  { name: '大木博士的信', rarity: '绿色优秀', grid: 1, source: '真新镇附近', type: 'collectible' },
  { name: '自行车零件', rarity: '绿色优秀', grid: 2, source: '自行车道、枯叶市', type: 'collectible' },
  { name: '西尔佛公司胸牌', rarity: '绿色优秀', grid: 1, source: '西尔佛公司', type: 'collectible' },
  { name: '火箭队制服', rarity: '蓝色稀有', grid: 2, source: '火箭队基地', type: 'collectible' },
  { name: '坂木的签名照', rarity: '蓝色稀有', grid: 1, source: '火箭队基地BOSS房间', type: 'collectible' },
  { name: '化石盔化石', rarity: '蓝色稀有', grid: 2, source: '月见山、岩山隧道', type: 'collectible' },
  { name: '化石翼龙化石', rarity: '紫色史诗', grid: 4, source: '月见山深层、冠军之路', type: 'collectible' },
  { name: '神秘琥珀', rarity: '紫色史诗', grid: 2, source: '红莲镇研究室', type: 'collectible' },
  { name: '古代海百合化石', rarity: '紫色史诗', grid: 2, source: '月见山深层', type: 'collectible' },
  { name: '银色王冠', rarity: '紫色史诗', grid: 1, source: '对战塔、精英训练家', type: 'collectible' },
  { name: '金色王冠', rarity: '金色传说', grid: 1, source: '石英联盟冠军房间', type: 'collectible' },
  { name: '宝可梦联盟奖杯', rarity: '金色传说', grid: 4, source: '石英联盟冠军殿堂', type: 'collectible' },
  { name: '超梦的基因样本', rarity: '金色传说', grid: 2, source: '西尔佛公司顶层实验室', type: 'collectible' },
  { name: '传说鸟类的羽毛', rarity: '金色传说', grid: 1, source: '传说宝可梦栖息地', type: 'collectible' },
  { name: '凤王之羽', rarity: '红色神话', grid: 2, source: '传说事件限定', type: 'collectible' },
  { name: '洛奇亚的泪滴', rarity: '红色神话', grid: 2, source: '传说事件限定', type: 'collectible' },
  { name: '代欧奇希斯的DNA', rarity: '红色神话', grid: 2, source: '传说事件限定', type: 'collectible' },
  { name: '梦幻的睫毛', rarity: '红色神话', grid: 1, source: '传说事件限定', type: 'collectible' },
  { name: '时拉比的祝福', rarity: '红色神话', grid: 2, source: '传说事件限定', type: 'collectible' },

  // === 道具/杂物 ===
  { name: '技能机（随机）', rarity: '蓝色稀有', grid: 1, source: '废弃商店、西尔佛公司', type: 'tm' },
  { name: 'PP提升剂', rarity: '紫色史诗', grid: 1, source: '道馆、石英联盟', type: 'medicine' },
  { name: 'PP极限提升剂', rarity: '金色传说', grid: 1, source: '冠军之路、石英联盟', type: 'medicine' },
  { name: '能力值提升剂', rarity: '紫色史诗', grid: 1, source: '西尔佛公司', type: 'medicine' },
  { name: '神奇糖果', rarity: '紫色史诗', grid: 1, source: '稀有区域、道馆馆主', type: 'candy' },
  { name: '金色树果', rarity: '金色传说', grid: 1, source: '稀有区域、冠军之路', type: 'berry' },
  { name: '银色喷雾', rarity: '绿色优秀', grid: 1, source: '废弃商店', type: 'usable' },
  { name: '黄金喷雾', rarity: '蓝色稀有', grid: 1, source: '火箭队基地', type: 'usable' },
  { name: '黑市入场券', rarity: '金色传说', grid: 1, source: '火箭队高级干部签到', type: 'special' },
  { name: '火箭队机密文件', rarity: '紫色史诗', grid: 2, source: '西尔佛公司地下仓库', type: 'quest' },
  { name: '道馆挑战徽章（复刻）', rarity: '蓝色稀有', grid: 1, source: '各道馆', type: 'collectible' }
]

function getCollectionInfo(name) {
  return COLLECTIONS.find(c => c.name === name) || null
}

function getCollectionByRarity(rarity) {
  return COLLECTIONS.filter(c => c.rarity === rarity)
}

function getRandomCollection(maxRarity = '红色神话') {
  const maxIdx = RARITY_ORDER.indexOf(maxRarity)
  const filtered = COLLECTIONS.filter(c => RARITY_ORDER.indexOf(c.rarity) <= maxIdx)
  return filtered[Math.floor(Math.random() * filtered.length)] || null
}

function getRarityValue(name) {
  const info = getCollectionInfo(name)
  if (!info) return 10
  const rarityPrices = { '白色普通': 50, '绿色优秀': 200, '蓝色稀有': 800, '紫色史诗': 3000, '金色传说': 12000, '红色神话': 50000 }
  return rarityPrices[info.rarity] || 10
}

module.exports = { COLLECTIONS, getCollectionInfo, getCollectionByRarity, getRandomCollection, getRarityValue, RARITY_ORDER }
