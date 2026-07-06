const axios = require('axios')
const { parseFormsAndStats } = require('./pokemon')

async function test() {
  const url = 'https://wiki.52poke.com/zh-hans/' + encodeURIComponent('喷火龙')
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 15000,
    responseType: 'arraybuffer'
  })
  const html = Buffer.from(res.data).toString('utf8')

  const forms = parseFormsAndStats(html)
  console.log('喷火龙形态数据:')
  if (forms) {
    for (const form of forms) {
      console.log(`  ${form.name}:`)
      console.log(`    图片: ${form.imageUrl || '[无]'}`)
      console.log(`    属性: ${form.types.join('、')}`)
    }
  } else {
    console.log('  无形态数据')
  }
}

test().catch(e => console.error(e.message))
