/**
 * 爬取52poke维基的地点列表数据
 * 数据来源：https://wiki.52poke.com/zh-hans/地点列表
 */
const axios = require('axios')
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')

// 繁简转换
const T2S = {
  '關都': '关都', '城都': '城都', '豐緣': '丰缘', '神奧': '神奥',
  '合眾': '合众', '卡洛斯': '卡洛斯', '阿羅拉': '阿罗拉',
  '伽勒爾': '伽勒尔', '帕底亞': '帕底亚', '洗翠': '洗翠',
  '城鎮': '城镇', '道路': '道路', '水路': '水路',
  '傳說': '传说', '地點': '地点'
}
function normalize(t) {
  return T2S[t] || t
}

function cleanText(text) {
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * 从HTML中解析地点列表
 */
function parseLocationsList(html) {
  const locations = []

  // 按顺序解析HTML，跟踪当前的地区和子分类
  let currentRegion = ''
  let currentSubCategory = ''

  // 使用正则表达式按顺序匹配h2、h3和table
  const elementRegex = /(<h2[^>]*>[\s\S]*?<\/h2>)|(<h3[^>]*>[\s\S]*?<\/h3>)|(<table[^>]*class="[^"]*eplist[^"]*"[^>]*>[\s\S]*?<\/table>)/g
  const matches = [...html.matchAll(elementRegex)]

  console.log(`共找到 ${matches.length} 个元素（h2/h3/table）`)

  for (const match of matches) {
    if (match[1]) {
      // h2标题 - 地区
      const titleMatch = match[1].match(/<span class="mw-headline"[^>]*>(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/span>/)
      if (titleMatch) {
        currentRegion = normalize(titleMatch[1].trim())
      }
    } else if (match[2]) {
      // h3标题 - 子分类
      const titleMatch = match[2].match(/<span class="mw-headline"[^>]*>(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/span>/)
      if (titleMatch) {
        currentSubCategory = normalize(titleMatch[1].trim())
      }
    } else if (match[3]) {
      // 表格 - 地点列表
      const tableContent = match[3]

      // 解析表格行
      const rowMatches = [...tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
      for (const row of rowMatches) {
        const rowContent = row[1]

        // 跳过表头行
        if (rowContent.includes('<th')) continue

        // 提取所有单元格
        const cellMatches = [...rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
        if (cellMatches.length < 2) continue

        // 提取地点名（带链接）
        const nameMatch = rowContent.match(/<a[^>]*title="([^"]+)"[^>]*>[^<]*<\/a>/)
        const name = nameMatch ? nameMatch[1] : cleanText(cellMatches[0][1])

        if (!name) continue

        // 提取日文名和英文名
        const japaneseName = cellMatches[1] ? cleanText(cellMatches[1][1]) : ''
        const englishName = cellMatches[2] ? cleanText(cellMatches[2][1]) : ''

        locations.push({
          name,
          japaneseName,
          englishName,
          region: currentRegion,
          subCategory: currentSubCategory
        })
      }
    }
  }

  return locations
}

async function fetchLocationsList() {
  console.log('=== 爬取地点列表 ===\n')

  const url = 'https://wiki.52poke.com/zh-hans/' + encodeURIComponent('地点列表')
  console.log(`请求: ${url}`)

  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 30000,
    responseType: 'arraybuffer'
  })
  const html = Buffer.from(res.data).toString('utf8')

  console.log(`页面长度: ${html.length}`)

  // 解析地点列表
  const locations = parseLocationsList(html)
  console.log(`\n共解析 ${locations.length} 个地点`)

  // 去重（按地点名+地区）
  const seen = new Set()
  const uniqueLocations = []
  for (const loc of locations) {
    const key = `${loc.region}_${loc.name}`
    if (!seen.has(key)) {
      seen.add(key)
      uniqueLocations.push(loc)
    }
  }
  console.log(`去重后: ${uniqueLocations.length} 个地点`)

  // 按地区统计
  const regionCount = {}
  for (const loc of uniqueLocations) {
    const region = loc.region || '未知'
    regionCount[region] = (regionCount[region] || 0) + 1
  }

  console.log('\n地区统计:')
  for (const [region, count] of Object.entries(regionCount)) {
    console.log(`  ${region}: ${count}`)
  }

  // 显示前10个地点
  console.log('\n前10个地点:')
  for (let i = 0; i < Math.min(10, uniqueLocations.length); i++) {
    const loc = uniqueLocations[i]
    console.log(`  ${loc.region} > ${loc.subCategory} > ${loc.name} (${loc.englishName})`)
  }

  // 保存到文件
  const outputPath = path.join(DATA_DIR, 'locations.json')
  fs.writeFileSync(outputPath, JSON.stringify(uniqueLocations, null, 2), 'utf-8')
  console.log(`\n地点数据已保存到: ${outputPath}`)

  return uniqueLocations
}

fetchLocationsList().catch(e => console.error(e.message))
