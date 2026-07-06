/**
 * 批量为有形态的宝可梦补充形态图片地址
 */
const axios = require('axios')
const fs = require('fs')
const path = require('path')

const WIKI_BASE = 'https://wiki.52poke.com/zh-hans/'
const DATA_DIR = path.join(__dirname, '..', 'data', 'pokemon')

async function fixFormImages() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  console.log(`共 ${files.length} 个文件需要检查\n`)

  let fixed = 0
  let skipped = 0
  let failed = 0
  const failedList = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const filePath = path.join(DATA_DIR, file)
    const progress = `[${i + 1}/${files.length}]`

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

      // 只处理有形态的宝可梦
      if (!data.forms || data.forms.length === 0) {
        skipped++
        continue
      }

      // 检查是否所有形态都已有图片地址
      const allHaveImages = data.forms.every(f => f.imageUrl)
      if (allHaveImages) {
        skipped++
        continue
      }

      // 重新请求页面并解析形态图片
      const name = data.name
      console.log(`${progress} 补充 ${name} 的形态图片`)

      const url = WIKI_BASE + encodeURIComponent(name)
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 15000,
        responseType: 'arraybuffer'
      })
      const html = Buffer.from(res.data).toString('utf8')

      // 使用pokemon.js中的parseFormsAndStats重新解析形态数据
      const { parseFormsAndStats } = require('./pokemon')
      const newForms = parseFormsAndStats(html)

      if (newForms) {
        // 只更新图片地址，保留原有数据
        for (const newForm of newForms) {
          const oldForm = data.forms.find(f => f.name === newForm.name)
          if (oldForm && newForm.imageUrl) {
            oldForm.imageUrl = newForm.imageUrl
          }
        }
      }

      // 保存
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      fixed++
    } catch (e) {
      console.error(`${progress} 失败: ${file} - ${e.message}`)
      failed++
      failedList.push({ file, error: e.message })
    }

    // 间隔200ms避免请求过快
    if (i < files.length - 1) {
      await new Promise(r => setTimeout(r, 200))
    }
  }

  console.log(`\n===== 修复完成 =====`)
  console.log(`修复: ${fixed}  跳过: ${skipped}  失败: ${failed}`)

  if (failedList.length > 0) {
    const failPath = path.join(__dirname, '..', 'data', 'fix_formimg_failed.json')
    fs.writeFileSync(failPath, JSON.stringify(failedList, null, 2), 'utf-8')
    console.log(`\n失败列表已保存到: ${failPath}`)
  }
}

fixFormImages().catch(e => console.error(e.message))
