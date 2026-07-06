/**
 * 从52poke全国图鉴列表页面提取所有宝可梦的编号和中文名
 * 输出: data/pokedex_all.json  [{id: 1, name: '妙蛙种子'}, ...]
 */
const axios = require('axios')
const fs = require('fs')
const path = require('path')

async function buildPokedex() {
  const url = 'https://wiki.52poke.com/zh-hans/' + encodeURIComponent('宝可梦列表（按全国图鉴编号）')
  console.log('正在获取列表页面...')
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 30000,
    responseType: 'arraybuffer'
  })
  const html = Buffer.from(res.data).toString('utf8')

  // 提取所有 <tr data-type="..."> 行
  const rowMatches = [...html.matchAll(/<tr data-type="[^"]*"[^>]*>([\s\S]*?)<\/tr>/g)]
  console.log('找到行数:', rowMatches.length)

  const pokedex = []
  for (const row of rowMatches) {
    const rowHtml = row[1]
    // 提取编号 #0001
    const idMatch = rowHtml.match(/rdexn-id">#(\d+)/)
    if (!idMatch) continue
    const id = parseInt(idMatch[1])

    // 提取中文名 - rdexn-name"><a ...>妙蛙种子</a>
    const nameMatch = rowHtml.match(/rdexn-name"><a[^>]*>([^<]+)<\/a>/)
    if (!nameMatch) continue
    const name = nameMatch[1].trim()

    // 跳过地区形态（编号相同但名字带后缀的，比如阿罗拉形态）
    // 只保留每个编号的第一只
    if (pokedex.find(p => p.id === id)) continue

    pokedex.push({ id, name })
  }

  // 按编号排序
  pokedex.sort((a, b) => a.id - b.id)

  console.log('提取到宝可梦数量:', pokedex.length)
  console.log('第一只:', pokedex[0])
  console.log('最后一只:', pokedex[pokedex.length - 1])

  // 保存
  const outPath = path.join(__dirname, '..', 'data', 'pokedex_all.json')
  fs.writeFileSync(outPath, JSON.stringify(pokedex, null, 2), 'utf-8')
  console.log('已保存到:', outPath)
}

buildPokedex().catch(e => console.error('失败:', e.message))
