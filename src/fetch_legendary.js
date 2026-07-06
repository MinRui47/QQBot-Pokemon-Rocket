/**
 * 从52poke维基的"传说宝可梦"页面爬取神兽列表
 */
const axios = require('axios')
const fs = require('fs')
const path = require('path')

async function fetchPage(pageName) {
  const url = `https://wiki.52poke.com/zh-hans/${encodeURIComponent(pageName)}`
  console.log(`请求: ${url}`)

  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 15000,
    responseType: 'arraybuffer'
  })
  return Buffer.from(res.data).toString('utf8')
}

function extractPokemonLinks(html) {
  // 提取页面中的宝可梦链接
  // 格式: <a href="/zh-hans/皮卡丘" title="皮卡丘">皮卡丘</a>
  const matches = [...html.matchAll(/<a[^>]*href="\/zh-hans\/([^":]+)"[^>]*title="([^"]+)"[^>]*>[^<]*<\/a>/g)]

  const seen = new Set()
  const result = []
  for (const m of matches) {
    const title = m[2]
    // 排除分类、文件、模板等非宝可梦页面
    if (!title.startsWith('分类') && !title.startsWith('文件') &&
        !title.startsWith('模板') && !title.startsWith('帮助') &&
        !title.includes('（')) {  // 排除带括号的页面
      if (!seen.has(title)) {
        seen.add(title)
        result.push(title)
      }
    }
  }
  return result
}

async function main() {
  console.log('=== 爬取传说宝可梦列表 ===\n')

  // 爬取传说宝可梦页面
  console.log('--- 传说宝可梦 ---')
  const legendaryHtml = await fetchPage('传说宝可梦')
  const legendaries = extractPokemonLinks(legendaryHtml)
  console.log(`共 ${legendaries.length} 个\n`)

  // 爬取幻之宝可梦页面
  console.log('--- 幻之宝可梦 ---')
  const mythicalHtml = await fetchPage('幻之宝可梦')
  const mythicals = extractPokemonLinks(mythicalHtml)
  console.log(`共 ${mythicals.length} 个\n`)

  // 爬取准传说宝可梦页面
  console.log('--- 准传说宝可梦 ---')
  const pseudoHtml = await fetchPage('准传说宝可梦')
  const pseudoLegendaries = extractPokemonLinks(pseudoHtml)
  console.log(`共 ${pseudoLegendaries.length} 个\n`)

  // 保存结果
  const result = {
    pseudoLegendaries,
    legendaries,
    mythicals,
    fetchedAt: new Date().toISOString()
  }

  const outputPath = path.join(__dirname, '..', 'data', 'legendary_list.json')
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8')
  console.log(`\n结果已保存到: ${outputPath}`)

  // 输出列表
  console.log('\n=== 准神 ===')
  pseudoLegendaries.forEach(n => console.log(`  ${n}`))
  console.log('\n=== 传说宝可梦 ===')
  legendaries.forEach(n => console.log(`  ${n}`))
  console.log('\n=== 幻之宝可梦 ===')
  mythicals.forEach(n => console.log(`  ${n}`))
}

main().catch(e => console.error(e.message))
