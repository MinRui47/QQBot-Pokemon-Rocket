/**
 * 爬取52poke维基的特性列表数据
 * 数据来源：https://wiki.52poke.com/zh-hans/特性列表
 */
const axios = require('axios')
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')

async function fetchAbilitiesList() {
  console.log('=== 爬取特性列表 ===\n')

  const url = 'https://wiki.52poke.com/zh-hans/' + encodeURIComponent('特性列表')
  console.log(`请求: ${url}`)

  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 30000,
    responseType: 'arraybuffer'
  })
  const html = Buffer.from(res.data).toString('utf8')

  console.log(`页面长度: ${html.length}`)

  // 查找特性表格行
  // 特性行格式：<tr> <td>编号</td> <td><a>特性名</a></td> <td>英文名</td> <td>描述</td> </tr>
  const abilities = []

  // 方法1: 查找带编号的特性行
  const rowMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
  console.log(`共 ${rowMatches.length} 个表格行`)

  for (const row of rowMatches) {
    const content = row[1]

    // 提取所有单元格
    const cellMatches = [...content.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
    if (cellMatches.length < 3) continue

    function cleanText(text) {
      return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    }

    // 第一个单元格应该是编号
    const idText = cleanText(cellMatches[0][1])
    const id = parseInt(idText)
    if (isNaN(id) || id < 1 || id > 300) continue

    // 第二个单元格是特性名（带链接）
    const nameMatch = cellMatches[1][1].match(/<a[^>]*title="([^"]+)"[^>]*>[^<]*<\/a>/)
    const name = nameMatch ? nameMatch[1].replace(/（特性）$/, '') : cleanText(cellMatches[1][1])

    if (!name) continue

    // 第三个单元格是日文名（lang="ja"）
    const japaneseName = cleanText(cellMatches[2][1])

    // 第四个单元格是英文名（lang="en"）
    const englishName = cleanText(cellMatches[3][1])

    // 第五个单元格是说明
    const description = cellMatches[4] ? cleanText(cellMatches[4][1]) : ''

    // 第六个单元格是常见特性数量
    const commonCount = cellMatches[5] ? parseInt(cleanText(cellMatches[5][1])) || 0 : 0

    // 第七个单元格是隐藏特性数量
    const hiddenCount = cellMatches[6] ? parseInt(cleanText(cellMatches[6][1])) || 0 : 0

    abilities.push({
      id,
      name,
      japaneseName,
      englishName,
      description,
      commonCount,
      hiddenCount
    })
  }

  // 去重
  const seen = new Set()
  const uniqueAbilities = []
  for (const ability of abilities) {
    if (!seen.has(ability.name)) {
      seen.add(ability.name)
      uniqueAbilities.push(ability)
    }
  }

  console.log(`\n共解析 ${uniqueAbilities.length} 个特性`)

  // 显示前10个特性
  console.log('\n前10个特性:')
  for (let i = 0; i < Math.min(10, uniqueAbilities.length); i++) {
    const a = uniqueAbilities[i]
    console.log(`  ${a.id} ${a.name} (${a.englishName}) - ${a.description.substring(0, 40)}...`)
  }

  // 保存到文件
  const outputPath = path.join(DATA_DIR, 'abilities.json')
  fs.writeFileSync(outputPath, JSON.stringify(uniqueAbilities, null, 2), 'utf-8')
  console.log(`\n特性数据已保存到: ${outputPath}`)

  return uniqueAbilities
}

fetchAbilitiesList().catch(e => console.error(e.message))
