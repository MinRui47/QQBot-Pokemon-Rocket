/**
 * 预热脚本：按编号顺序下载全部1025只宝可梦数据到本地
 * 数据文件保存到 data/pokemon/<名称>.json，只保存图片URL不下载图片
 *
 * 用法:
 *   node src/preload.js            # 下载全部
 *   node src/preload.js 1 100      # 下载编号1-100
 *   node src/preload.js 25         # 只下载编号25
 */
const { getPokemonInfo, POKEDEX } = require('./pokemon')
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data', 'pokemon')

async function preload(startId, endId) {
  const list = POKEDEX.filter(p => p.id >= startId && p.id <= endId)
  console.log(`开始下载编号 ${startId}-${endId}，共 ${list.length} 只宝可梦...\n`)

  let success = 0
  let fail = 0
  let skipped = 0
  const failed = []

  for (let i = 0; i < list.length; i++) {
    const { id, name } = list[i]
    const progress = `[${i + 1}/${list.length}] #${String(id).padStart(4, '0')}`

    // 已存在则跳过
    const safeName = name.replace(/[\\/:*?"<>|]/g, '_')
    const localPath = path.join(DATA_DIR, `${safeName}.json`)
    if (fs.existsSync(localPath)) {
      console.log(`${progress} ${name} - 已存在,跳过`)
      skipped++
      continue
    }

    try {
      console.log(`${progress} 正在下载: ${name}...`)
      await getPokemonInfo(name)
      success++
    } catch (e) {
      console.error(`${progress} 失败: ${name} - ${e.message}`)
      fail++
      failed.push({ id, name, error: e.message })
    }

    // 间隔300ms避免请求过快
    if (i < list.length - 1) {
      await new Promise(r => setTimeout(r, 300))
    }
  }

  console.log(`\n===== 下载完成 =====`)
  console.log(`成功: ${success}  失败: ${fail}  跳过: ${skipped}`)

  if (failed.length > 0) {
    console.log(`\n失败列表:`)
    for (const f of failed) {
      console.log(`  #${String(f.id).padStart(4, '0')} ${f.name} - ${f.error}`)
    }
    // 保存失败列表
    const failPath = path.join(__dirname, '..', 'data', 'preload_failed.json')
    fs.writeFileSync(failPath, JSON.stringify(failed, null, 2), 'utf-8')
    console.log(`\n失败列表已保存到: ${failPath}`)
  }
}

// 解析命令行参数
const args = process.argv.slice(2)
let startId = 1
let endId = 1025

if (args.length === 1) {
  startId = parseInt(args[0])
  endId = startId
} else if (args.length >= 2) {
  startId = parseInt(args[0])
  endId = parseInt(args[1])
}

if (isNaN(startId) || isNaN(endId) || startId < 1 || endId > 1025 || startId > endId) {
  console.error('参数无效。用法: node src/preload.js [起始编号] [结束编号]')
  console.error('示例:')
  console.error('  node src/preload.js            # 下载全部 1-1025')
  console.error('  node src/preload.js 1 100      # 下载编号 1-100')
  console.error('  node src/preload.js 25         # 只下载编号 25')
  process.exit(1)
}

preload(startId, endId).catch(e => {
  console.error('预热脚本异常:', e)
  process.exit(1)
})
