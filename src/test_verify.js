const { getPokemonInfo, formatPokemonInfo } = require('./pokemon')

async function test() {
  console.log('=== 验证修复效果 ===\n')

  // 测试之前有问题的宝可梦
  const testCases = [
    '皮卡丘',      // 进化链曾缺少皮卡丘节点
    '呆火鳄',      // 繁体"進化"章节
    '妙蛙草',      // "基本介绍"章节
    '坚盾剑怪',    // 繁体属性"鋼"
    '布里卡隆',    // 繁体属性"格鬥"
    '长耳兔',      // 繁体属性
    '摔角鹰人'     // 繁体属性
  ]

  for (const name of testCases) {
    console.log(`--- ${name} ---`)
    const info = await getPokemonInfo(name)
    if (info) {
      const text = formatPokemonInfo(info)
      // 只显示关键部分
      const lines = text.split('\n')
      for (const line of lines) {
        if (line.includes('属性') || line.includes('进化链') || line.includes('->') ||
            line.includes('图鉴简介') || line.startsWith('---')) {
          console.log(line)
        }
      }
      // 显示图鉴简介前50字
      if (info.flavorText) {
        console.log(`简介: ${info.flavorText.substring(0, 50)}...`)
      } else {
        console.log('简介: [缺失]')
      }
    } else {
      console.log('未找到')
    }
    console.log()
  }
}

test().catch(e => console.error(e.message))
