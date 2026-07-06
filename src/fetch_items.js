/**
 * 爬取52poke维基的道具列表数据
 * 数据来源：https://wiki.52poke.com/zh-hans/道具列表
 */
const axios = require('axios')
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')

// 繁简转换
const T2S = {
  '郵件': '邮件', '戰鬥': '战斗', '學習': '学习', '回復': '回复',
  '製作': '制作', '攜帶': '携带', '貴重': '贵重', '訓練家': '训练家',
  '寶可夢': '宝可梦', '進化': '进化', '樹果': '树果'
}
function normalize(t) {
  return T2S[t] || t
}

// 表格class到分类名的映射
const CLASS_TO_CATEGORY = {
  'bgd-道具': '道具',
  'bgd-球果': '球果',
  'bgd-帕底亚': '帕底亚',
  'bgd-郵件': '邮件',
  'bgd-阿罗拉': '阿罗拉',
  'bgd-精灵球': '精灵球',
  'bgd-宝物': '宝物',
  'bgd-战斗道具': '战斗道具',
  'bgd-招式学习器': '招式学习器',
  'bgd-回复': '回复道具',
  'bgd-ZA': 'ZA',
  'bgd-Ｚ纯晶': 'Ｚ纯晶',
  'bgd-洗翠': '洗翠',
  'bgd-白2': '白2',
  'bgd-野餐': '野餐',
  'bgd-皮卡丘': '皮卡丘',
  'bgd-树果': '树果',
  'bgd-重要物品': '重要物品',
  'bg-红': '红'
}

function cleanText(text) {
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * 解析道具表格
 */
function parseItemsTable(html, tableMatch) {
  const tableContent = tableMatch[0]
  const tableClass = tableMatch[1]

  // 从class中提取分类
  let category = '其他'
  for (const [cls, cat] of Object.entries(CLASS_TO_CATEGORY)) {
    if (tableClass.includes(cls)) {
      category = cat
      break
    }
  }

  const items = []

  // 解析表格行
  const rowMatches = [...tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
  for (const row of rowMatches) {
    const rowContent = row[1]

    // 提取所有单元格
    const cellMatches = [...rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
    if (cellMatches.length < 3) continue

    // 跳过表头行
    if (rowContent.includes('<th')) continue

    // 提取道具名（带链接）
    const nameMatch = rowContent.match(/<a[^>]*title="([^"]+)"[^>]*>[^<]*<\/a>/)
    if (!nameMatch) continue

    const name = nameMatch[1].replace(/（道具）$/, '').replace(/（重要物品）$/, '').replace(/（招式学习器）$/, '')

    // 提取图片地址
    let imageUrl = ''
    const imgMatch = rowContent.match(/<img[^>]*src="(\/\/s1\.52poke\.com\/wiki\/[^"]+)"/)
    if (imgMatch) {
      imageUrl = 'https:' + imgMatch[1]
    }

    // 提取日文名和英文名
    // 第一个单元格是图片，第二个是中文名，第三个是日文名，第四个是英文名，第五个是说明
    const japaneseName = cellMatches[2] ? cleanText(cellMatches[2][1]) : ''
    const englishName = cellMatches[3] ? cleanText(cellMatches[3][1]) : ''
    const description = cellMatches[4] ? cleanText(cellMatches[4][1]) : ''

    if (!name) continue

    items.push({
      name,
      japaneseName: normalize(japaneseName),
      englishName,
      description,
      category,
      imageUrl
    })
  }

  return items
}

async function fetchItemsList() {
  console.log('=== 爬取道具列表 ===\n')

  const url = 'https://wiki.52poke.com/zh-hans/' + encodeURIComponent('道具列表')
  console.log(`请求: ${url}`)

  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 30000,
    responseType: 'arraybuffer'
  })
  const html = Buffer.from(res.data).toString('utf8')

  console.log(`页面长度: ${html.length}`)

  // 查找所有道具表格（class包含bgd-或bg-的表格）
  const tableMatches = [...html.matchAll(/<table[^>]*class="([^"]*(?:bgd-|bg-)[^"]*)"[^>]*>([\s\S]*?)<\/table>/g)]
  console.log(`找到 ${tableMatches.length} 个道具表格`)

  const allItems = []
  const categoryCount = {}

  for (const tableMatch of tableMatches) {
    const fullTable = tableMatch[0]
    const tableClass = tableMatch[1]

    // 从class中提取分类
    let category = '其他'
    for (const [cls, cat] of Object.entries(CLASS_TO_CATEGORY)) {
      if (tableClass.includes(cls)) {
        category = cat
        break
      }
    }

    const items = parseItemsTable(fullTable, [fullTable, tableClass])
    console.log(`  ${category}: ${items.length} 个道具`)

    categoryCount[category] = (categoryCount[category] || 0) + items.length
    allItems.push(...items)
  }

  // 去重（按道具名）
  const seen = new Set()
  const uniqueItems = []
  for (const item of allItems) {
    if (!seen.has(item.name)) {
      seen.add(item.name)
      uniqueItems.push(item)
    }
  }

  console.log(`\n共解析 ${uniqueItems.length} 个道具（去重前 ${allItems.length}）`)

  // 显示分类统计
  console.log('\n分类统计:')
  for (const [cat, count] of Object.entries(categoryCount)) {
    console.log(`  ${cat}: ${count}`)
  }

  // 显示前10个道具
  console.log('\n前10个道具:')
  for (let i = 0; i < Math.min(10, uniqueItems.length); i++) {
    const item = uniqueItems[i]
    console.log(`  ${item.name} (${item.category}) - ${item.description.substring(0, 30)}...`)
  }

  // 保存到文件
  const outputPath = path.join(DATA_DIR, 'items.json')
  fs.writeFileSync(outputPath, JSON.stringify(uniqueItems, null, 2), 'utf-8')
  console.log(`\n道具数据已保存到: ${outputPath}`)

  return uniqueItems
}

fetchItemsList().catch(e => console.error(e.message))
