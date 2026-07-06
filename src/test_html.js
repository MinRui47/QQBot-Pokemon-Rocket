const axios = require('axios')
const fs = require('fs')

async function test() {
  const url = 'https://wiki.52poke.com/zh-hans/' + encodeURIComponent('喷火龙')
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 15000,
    responseType: 'arraybuffer'
  })
  const html = Buffer.from(res.data).toString('utf8')

  // 查找所有52poke图片
  const imgMatches = [...html.matchAll(/<img[^>]*src="(\/\/s1\.52poke\.com\/wiki\/[^"]+)"[^>]*>/g)]
  console.log(`共找到 ${imgMatches.length} 张52poke图片\n`)

  // 显示前30张图片
  for (let i = 0; i < Math.min(30, imgMatches.length); i++) {
    const url = imgMatches[i][1]
    // 获取图片前后的上下文
    const start = Math.max(0, imgMatches[i].index - 100)
    const context = html.substring(start, imgMatches[i].index + url.length + 50)
    // 提取alt属性
    const altMatch = context.match(/alt="([^"]+)"/)
    const alt = altMatch ? altMatch[1] : ''
    console.log(`${i + 1}. ${url.substring(0, 80)}...`)
    if (alt) console.log(`   alt: ${alt}`)
  }

  // 查找超级喷火龙相关的图片
  console.log('\n--- 查找超级喷火龙相关图片 ---')
  const megaMatches = [...html.matchAll(/mega|超级|Ｘ|Ｙ/gi)]
  console.log(`找到 ${megaMatches.length} 个相关关键词`)

  // 查找包含"超级"的图片alt
  const megaImgMatches = [...html.matchAll(/<img[^>]*alt="([^"]*超级[^"]*)"[^>]*src="([^"]+)"/g)]
  for (const m of megaImgMatches) {
    console.log(`alt: ${m[1]}, src: ${m[2].substring(0, 80)}...`)
  }
}

test().catch(e => console.error(e.message))
