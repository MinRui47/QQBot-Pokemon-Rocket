/**
 * 爬取52poke维基的招式列表数据
 * 数据来源：https://wiki.52poke.com/zh-hans/招式列表
 */
const axios = require('axios')
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')

// 繁简属性名转换
const TYPE_T2S = {
  '飛行': '飞行', '幽靈': '幽灵', '龍': '龙', '太陽': '太阳',
  '紅': '红', '藍之圓盤': '蓝之圆盘', '劍': '剑', '惡': '恶',
  '鋼': '钢', '格鬥': '格斗', '蟲': '虫'
}
function normalizeType(t) {
  return TYPE_T2S[t] || t
}

/**
 * 从HTML中解析招式列表
 */
function parseMovesList(html) {
  const moves = []

  // 招式行的格式：<tr data-type="属性" data-category="分类">...</tr>
  const rowMatches = [...html.matchAll(/<tr[^>]*data-type="([^"]*)"[^>]*data-category="([^"]*)"[^>]*>([\s\S]*?)<\/tr>/g)]

  console.log(`找到 ${rowMatches.length} 个招式行`)

  for (const row of rowMatches) {
    const dataType = normalizeType(row[1])
    const dataCategory = row[2]
    const rowContent = row[3]

    // 提取所有单元格
    const cellMatches = [...rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
    if (cellMatches.length < 8) continue

    // 清理HTML标签
    function cleanText(text) {
      return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    }

    // 提取招式名（带链接）
    const nameMatch = rowContent.match(/<a[^>]*title="([^"]+)"[^>]*>[^<]*<\/a>/)
    const name = nameMatch ? nameMatch[1].replace(/（招式）$/, '') : cleanText(cellMatches[1][1])

    // 提取各字段
    const id = cleanText(cellMatches[0][1])
    const japaneseName = cleanText(cellMatches[2][1])
    const englishName = cleanText(cellMatches[3][1])
    const type = dataType || cleanText(cellMatches[4][1])
    const category = dataCategory || cleanText(cellMatches[5][1])
    const power = cleanText(cellMatches[6][1])
    const accuracy = cleanText(cellMatches[7][1])
    const pp = cleanText(cellMatches[8] ? cellMatches[8][1] : '')
    const description = cleanText(cellMatches[9] ? cellMatches[9][1] : '')

    // 跳过无效行
    if (!id || !name) continue

    moves.push({
      id: parseInt(id) || id,
      name,
      japaneseName,
      englishName,
      type: normalizeType(type),
      category,
      power: power === '—' ? null : (parseInt(power) || power),
      accuracy: accuracy === '—' ? null : (parseInt(accuracy) || accuracy),
      pp: pp === '—' ? null : (parseInt(pp) || pp),
      description
    })
  }

  return moves
}

async function fetchMovesList() {
  console.log('=== 爬取招式列表 ===\n')

  const url = 'https://wiki.52poke.com/zh-hans/' + encodeURIComponent('招式列表')
  console.log(`请求: ${url}`)

  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 30000,
    responseType: 'arraybuffer'
  })
  const html = Buffer.from(res.data).toString('utf8')

  console.log(`页面长度: ${html.length}`)

  // 解析招式列表
  const moves = parseMovesList(html)
  console.log(`\n共解析 ${moves.length} 个招式`)

  // 去重（按招式名）
  const seen = new Set()
  const uniqueMoves = []
  for (const move of moves) {
    if (!seen.has(move.name)) {
      seen.add(move.name)
      uniqueMoves.push(move)
    }
  }
  console.log(`去重后: ${uniqueMoves.length} 个招式`)

  // 显示前10个招式
  console.log('\n前10个招式:')
  for (let i = 0; i < Math.min(10, uniqueMoves.length); i++) {
    const m = uniqueMoves[i]
    console.log(`  ${m.id} ${m.name} (${m.type}/${m.category}) 威力:${m.power} 命中:${m.accuracy} PP:${m.pp}`)
  }

  // 保存到文件
  const outputPath = path.join(DATA_DIR, 'moves.json')
  fs.writeFileSync(outputPath, JSON.stringify(uniqueMoves, null, 2), 'utf-8')
  console.log(`\n招式数据已保存到: ${outputPath}`)

  return uniqueMoves
}

fetchMovesList().catch(e => console.error(e.message))
