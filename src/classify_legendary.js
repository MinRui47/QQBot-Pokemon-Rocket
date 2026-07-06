/**
 * 神兽分类工具 - 使用52poke维基的准确分类
 */
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data', 'pokemon')

// 准神（10只）：种族值600，可进化，可繁殖
const PSEUDO_LEGENDARIES = [
  '快龙', '班基拉斯', '暴飞龙', '巨金怪', '烈咬陆鲨',
  '三首恶龙', '黏美龙', '杖尾鳞甲龙', '多龙巴鲁托', '巨锻匠'
]

// 幻之宝可梦（20只）：通常只能通过活动获得
const MYTHICALS = [
  '梦幻', '时拉比', '基拉祈', '代欧奇希斯', '达克莱伊', '谢米', '阿尔宙斯',
  '比克提尼', '美洛耶塔', '盖诺赛克特', '蒂安希', '胡帕', '波尔凯尼恩',
  '玛机雅娜', '玛夏多', '捷拉奥拉', '美录坦', '美录梅塔', '萨戮德', '厄诡椪'
]

// 传说宝可梦（一级神 + 二级神）
const LEGENDARIES = [
  // 第一世代
  '急冻鸟', '闪电鸟', '火焰鸟', '超梦',
  // 第二世代
  '雷公', '炎帝', '水君', '洛奇亚', '凤王',
  // 第三世代
  '固拉多', '盖欧卡', '烈空坐',
  '雷吉洛克', '雷吉艾斯', '雷吉斯奇鲁',
  '拉帝亚斯', '拉帝欧斯',
  // 第四世代
  '帝牙卢卡', '帕路奇亚', '骑拉帝纳',
  '克雷色利亚', '席多蓝恩', '雷吉奇卡斯',
  '由克希', '艾姆利多', '亚克诺姆',
  '雷吉艾勒奇', '雷吉铎拉戈', // 这两个是第八世代的，放错位置了
  // 第五世代
  '勾帕路翁', '代拉基翁', '毕力吉翁', '凯路迪欧',
  '莱希拉姆', '捷克罗姆', '酋雷姆',
  '龙卷云', '雷电云', '土地云', '眷恋云',
  // 第六世代
  '哲尔尼亚斯', '伊裴尔塔尔', '基格尔德',
  // 第七世代
  '科斯莫古', '科斯莫姆', '索尔迦雷欧', '露奈雅拉', '奈克洛兹玛',
  '卡璞・鸣鸣', '卡璞・蝶蝶', '卡璞・哞哞', '卡璞・鳍鳍',
  // 第八世代
  '苍响', '藏玛然特', '无极汰那', '蕾冠王',
  '熊徒弟', '武道熊师',
  // 第九世代
  '故勒顿', '密勒顿',
  '古剑豹', '古简蜗', '古鼎鹿', '古玉鱼',
  // 悖谬宝可梦（被认为是传说宝可梦）
  '波荡水', '破空焰', '猛恶菇', '铁腕勾拳',
  '吼叫尾', '猛雷鼓', '爬地翅', '沙铁皮',
  '铁头壳', '铁斑叶', '铁武者', '铁磐岩',
  '铁毒蛾', '铁火辉夜', '铁脖颈', '铁荆棘', '铁辙迹',
  '雄伟牙', '雪暴马'
]

function classifyLegendary() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  console.log(`正在分析 ${files.length} 个宝可梦...\n`)

  const result = {
    pseudoLegendaries: [],  // 准神
    legendaries: [],        // 传说宝可梦
    mythicals: [],          // 幻之宝可梦
    normal: []              // 普通宝可梦
  }

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'))
      const name = data.name

      const info = {
        name,
        id: data.id,
        types: data.types,
        statTotal: data.statTotal,
        abilities: data.abilities
      }

      if (PSEUDO_LEGENDARIES.includes(name)) {
        result.pseudoLegendaries.push(info)
      } else if (MYTHICALS.includes(name)) {
        result.mythicals.push(info)
      } else if (LEGENDARIES.includes(name)) {
        result.legendaries.push(info)
      } else {
        result.normal.push(info)
      }
    } catch (e) {
      // 跳过损坏文件
    }
  }

  // 输出报告
  console.log('===== 神兽分类报告 =====\n')

  console.log(`准神 (${result.pseudoLegendaries.length}):`)
  result.pseudoLegendaries.forEach(p => console.log(`  ${p.id} ${p.name} (${p.types.join('、')}, 种族值:${p.statTotal})`))

  console.log(`\n传说宝可梦 (${result.legendaries.length}):`)
  result.legendaries.forEach(p => console.log(`  ${p.id} ${p.name} (${p.types.join('、')}, 种族值:${p.statTotal})`))

  console.log(`\n幻之宝可梦 (${result.mythicals.length}):`)
  result.mythicals.forEach(p => console.log(`  ${p.id} ${p.name} (${p.types.join('、')}, 种族值:${p.statTotal})`))

  console.log(`\n普通宝可梦: ${result.normal.length}`)

  // 保存结果
  const outputPath = path.join(__dirname, '..', 'data', 'legendary_classification.json')
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8')
  console.log(`\n分类结果已保存到: ${outputPath}`)

  // 同时为每个宝可梦缓存文件添加分类标记
  console.log('\n正在为缓存文件添加分类标记...')
  let updated = 0
  for (const file of files) {
    try {
      const filePath = path.join(DATA_DIR, file)
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      const name = data.name

      let category = 'normal'
      if (PSEUDO_LEGENDARIES.includes(name)) category = 'pseudoLegendary'
      else if (MYTHICALS.includes(name)) category = 'mythical'
      else if (LEGENDARIES.includes(name)) category = 'legendary'

      if (data.category !== category) {
        data.legendaryCategory = category
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
        updated++
      }
    } catch (e) {
      // 跳过
    }
  }
  console.log(`已更新 ${updated} 个文件的分类标记`)
}

classifyLegendary()
