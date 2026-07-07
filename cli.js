const readline = require('readline')
const { GameManager } = require('./src/game/GameManager')
const { handleBaseCommands } = require('./src/index/commands/baseCommands')
const { handleMissionCommands } = require('./src/index/commands/missionCommands')
const { bootstrap } = require('./src/game/bootstrap')

const TEST_USER_ID = 'cli_test_user'
const TEST_USER_NAME = 'CLI测试玩家'

let rl = null
let gameManager = null
let player = null

function isAtBase(p) {
  return p.isAtBase() && !p.currentGame
}

function isOnMission(p) {
  return p.currentGame && p.currentGame.status === 'playing'
}

function getSmartHelp(p) {
  if (!p.registered) {
    return `【欢迎来到火箭队 🚀】

你还未加入火箭队，请先登记！

📝 当前可执行：
  登记 [昵称]    - 加入火箭队，开启搜打撤之旅
  
💡 示例：登记 小明

加入后你将获得初始精灵和基础补给！`
  }
  
  if (isOnMission(p)) {
    const game = p.currentGame
    const encounter = game.currentEncounter
    
    let helpMsg = `【外勤中 🎮】\n\n`
    helpMsg += `📍 当前位置：${game.map.currentLocation}\n`
    helpMsg += `👣 已走步数：${game.stepsTaken}/${game.maxSteps}\n`
    
    if (encounter) {
      if (encounter.type === 'wild') {
        helpMsg += `\n⚠️ 遭遇野生 ${encounter.pokemon.name} Lv.${encounter.pokemon.level}！\n\n`
        helpMsg += `⚔️ 当前可执行：\n`
        helpMsg += `  战斗       - 与野生宝可梦对战\n`
        helpMsg += `  精灵球     - 使用精灵球捕捉（也可用 超级球/高级球/大师球）\n`
        helpMsg += `  逃跑       - 放弃捕捉让它逃走\n`
      } else {
        helpMsg += `\n⚠️ 遭遇训练家 ${encounter.trainer.name}！\n\n`
        helpMsg += `⚔️ 当前可执行：\n`
        helpMsg += `  战斗       - 与训练家对战\n`
        helpMsg += `  逃跑       - 逃离战斗\n`
        helpMsg += `  抢夺       - 抢夺训练家背包（需先击败）\n`
      }
    } else {
      helpMsg += `\n🔍 当前可执行：\n`
      helpMsg += `  查看周围    - 查看当前位置和可探索地点\n`
      helpMsg += `  搜索 [地点] - 搜索地点搜刮物资（如：搜索 高草丛）\n`
      helpMsg += `  进入 [地点] - 进入建筑（如：进入 道馆）\n`
      helpMsg += `  移动 [方向] - 前往其他地点（如：移动 北）\n`
      helpMsg += `  离开        - 离开当前建筑\n`
      helpMsg += `  上楼/下楼   - 切换楼层\n`
    }
    
    helpMsg += `\n🎒 背包相关：\n`
    helpMsg += `  背包        - 查看外勤背包\n`
    helpMsg += `  腰带        - 查看精灵腰带\n`
    helpMsg += `  待拾取      - 查看地上未拾取的道具\n`
    helpMsg += `  拾取 [物品] - 拾取地上的道具\n`
    helpMsg += `  丢弃 [物品] [数量] - 丢弃物品腾出空间\n`
    
    helpMsg += `\n🏠 返回：\n`
    helpMsg += `  撤离        - 结束外勤返回基地\n`
    
    helpMsg += `\n💡 提示：发送"帮助 1"查看完整指令列表`
    
    return helpMsg
  }
  
  if (isAtBase(p)) {
    const hasPokemon = p.warehouse.pokemon && p.warehouse.pokemon.length > 0
    
    let helpMsg = `【火箭队基地 🏠】\n\n`
    helpMsg += `📊 当前状态：\n`
    helpMsg += `  金币：${p.money}\n`
    helpMsg += `  军衔：${p.rank || '新兵'}\n`
    helpMsg += `  仓库精灵：${p.warehouse.pokemon?.length || 0}/6\n`
    
    helpMsg += `\n📝 日常操作：\n`
    helpMsg += `  签到        - 领取每日军饷和补给\n`
    helpMsg += `  军衔        - 查看军衔和Buff加成\n`
    helpMsg += `  藏品        - 查看个人藏品图鉴\n`
    
    helpMsg += `\n🏪 查看/交易：\n`
    helpMsg += `  仓库        - 查看个人永久仓库\n`
    helpMsg += `  腰带        - 查看精灵腰带\n`
    helpMsg += `  出售 [物品] [数量] - 出售物资\n`
    helpMsg += `  商店        - 查看玩家交易市场\n`
    
    if (hasPokemon) {
      helpMsg += `\n🚀 外勤准备：\n`
      helpMsg += `  地图        - 查看可用地图\n`
      helpMsg += `  外勤 [地图] - 出发执行外勤（如：外勤 低级地图）\n`
    } else {
      helpMsg += `\n🎁 获取精灵：\n`
      helpMsg += `  租借 [精灵] - 租借制式宝可梦（阿柏蛇/瓦斯弹/超音蝠）\n`
      helpMsg += `  仓库        - 查看是否有精灵\n`
    }
    
    helpMsg += `\n💡 提示：发送"帮助 1"查看完整指令列表`
    
    return helpMsg
  }
  
  return `【宝可梦火箭队 🚀】\n\n` +
    `📖 基础指令：\n` +
    `  帮助 [页码] - 分页查看所有指令\n` +
    `  状态        - 查看当前状态\n` +
    `  登记 [昵称] - 加入火箭队\n`
}

function withHints(msg, result, hints) {
  let m = msg
  if (result && result.encounter && !m.includes('输入"')) {
    if (result.encounter.type === 'wild') {
      m += '\n输入"战斗"可以进入对战'
    } else {
      m += '\n输入"战斗"开始对战'
    }
  }
  if (hints) m += hints
  return m
}

function addHint(msg) {
  const game = player.currentGame
  if (!game || game.status !== 'playing') return msg
  if (msg.includes('输入"')) return msg
  const encounters = game.currentEncounter
  if (encounters) {
    if (encounters.type === 'wild') {
      return msg + '\n输入"战斗"开始对战，或"精灵球"尝试捕捉'
    }
    return msg + '\n输入"战斗"开始对战'
  }
  return msg
}

async function processCommand(content) {
  if (!player) {
    player = gameManager.getOrCreatePlayer(TEST_USER_ID, TEST_USER_NAME)
  }

  if (!player.registered && 
      content !== 'ping' && content !== 'hello' &&
      !content.startsWith('登记') &&
      content !== '帮助' && !content.startsWith('帮助') && content !== '游戏帮助' &&
      content !== 'info' && content !== 'time' &&
      !content.startsWith('查看') && content !== '查看周围' && content !== '环顾') {
    console.log('输入"登记 [昵称]"即可加入火箭队，开始搜打撤之旅')
    return
  }

  if (content === 'ping') {
    console.log('pong')
    return
  }

  if (content === 'hello') {
    console.log('你好！我是宝可梦火箭队QQ机器人~')
    return
  }

  if (content === '查看周围' || content === '环顾') {
    await handleGameCommand(content)
    return
  }

  if (content.startsWith('查看')) {
    const pokemonName = content.slice(2).trim()
    if (!pokemonName) {
      console.log('请输入宝可梦名称或编号，例如：\n- 查看皮卡丘\n- 查看25')
      return
    }
    console.log(`正在查询「${pokemonName}」...`)
    try {
      const pokemon = require('./src/pokemon')
      const info = await pokemon.getPokemonInfo(pokemonName)
      if (info) {
        const text = pokemon.formatPokemonInfo(info)
        console.log(text)
      } else {
        console.log(`未找到宝可梦「${pokemonName}」，请检查名称或编号是否正确。`)
      }
    } catch (error) {
      console.error(`查询「${pokemonName}」时出错:`, error.message)
    }
    return
  }

  if (content === '帮助' || content.startsWith('帮助 ')) {
    const parts = content.split(' ')
    const pageNum = parseInt(parts[1])
    
    if (!pageNum) {
      console.log(getSmartHelp(player))
    } else {
      const pages = [
        `【宝可梦火箭队QQ机器人 - 指令帮助 📖 1/3】

📖 基础指令：
  ping            - 测试连接
  hello           - 打招呼
  时间            - 查看当前时间
  信息            - 查看机器人信息
  帮助 [页码]      - 分页帮助

🔍 宝可梦查询：
  查看 [名称/编号]  - 查询宝可梦信息

💡 发送"帮助 2"查看下一页`,
        `【宝可梦火箭队QQ机器人 - 搜打撤 🎮 2/3】

登记/签到：
  登记 [昵称]              - 加入火箭队
  签到                     - 每日签到领补给
  军衔 / 我的称号           - 查看军衔和Buff
  藏品                     - 查看藏品图鉴

出击/探索：
  地图                     - 查看可用地图
  外勤 [地图]              - 从基地外勤搜刮（如：外勤 低级地图）
  租借 [精灵名]            - 租借制式宝可梦（阿柏蛇/瓦斯弹/超音蝠）
  查看周围 / 环顾          - 查看当前位置和可探索地点
  搜索 [地点] / 搜寻       - 搜索特定地点搜刮物资（如：搜索 高草丛）
  进入 [名称]              - 进入建筑/地点（如：进入 道馆）
  离开                     - 离开建筑
  上楼 / 下楼              - 切换楼层
  撤离                     - 撤离返回基地
  待拾取 / 地上物品        - 查看地上未拾取的道具
  拾取 [物品名]            - 拾取地上的道具
  丢弃 [物品名] [数量]     - 丢弃物品腾出背包空间

💡 发送"帮助 3"查看下一页`,
        `【宝可梦火箭队QQ机器人 - 战斗/查看/交易 ⚔️ 3/3】

战斗：
  战斗                     - 开始对战
  精灵球/超级球/高级球/大师球 - 使用对应球捕捉野生宝可梦
  逃跑                     - 逃离战斗
  抢夺                     - 抢夺被击败训练家的物资
  使用 [物品] [序号]       - 使用道具
  丢弃 [物品] [数量]       - 丢弃道具

查看：
  状态                     - 当前状态
  仓库                     - 个人仓库
  背包                     - 外勤背包
  腰带                     - 精灵腰带
  勋章                     - 勋章/听话等级
  地图                     - 可用地图

交易：
  出售 [物品] [数量]       - 直售回收
  上架 [...]               - 玩家挂牌交易
  购买 [商品ID]            - 购买玩家商品
  取消上架 [商品ID]        - 取消上架
  商店 / 拍卖行            - 查看玩家交易市场
  公金                     - 查看火箭队公共资金`
      ]

      if (pageNum < 1 || pageNum > pages.length) {
        console.log(`页码不存在，请输入 帮助 1~${pages.length}`)
      } else {
        console.log(pages[pageNum - 1])
        if (pageNum < pages.length) {
          console.log(`💡 发送"帮助 ${pageNum + 1}"查看下一页`)
        }
      }
    }
    return
  }

  if (content === '时间') {
    const now = new Date()
    const timeStr = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    console.log(`当前时间：${timeStr}`)
    return
  }

  if (content === '信息') {
    const config = require('./config.json')
    const infoMsg = `
机器人信息：
- QQ: ${config.qq}
- AppID: ${config.appId}
- 版本: 1.0.0
- 状态: 在线（CLI模式）
    `.trim()
    console.log(infoMsg)
    return
  }

  await handleGameCommand(content)
}

async function handleGameCommand(content) {
  if (player.currentGame && player.currentGame.status === 'playing') {
    const game = player.currentGame
    const warehouseCount = player.warehouse.pokemon.length || 0
    const beltCount = game.belt.pokemon.length || 0
    
    if (warehouseCount === 0 && beltCount === 0) {
      const result = gameManager.forceEvacuate(player)
      console.log(result.message)
      return
    }
  }

  const namedSend = (msg) => {
    const name = player.nickname || '火箭队探员'
    if (msg && (msg.includes('找到了') || msg.includes('搜刮') || msg.includes('撤离') || 
        msg.includes('遭遇') || msg.includes('搜索时'))) {
      console.log(`${name} ${msg}`)
    } else {
      console.log(msg)
    }
  }

  const sendFn = (msg) => {
    console.log(msg)
  }

  if (content.startsWith('登记')) {
    const nickname = content.slice(2).trim()
    const result = gameManager.registerPlayer(player, nickname)
    console.log(result.message)
    return
  }

  if (handleBaseCommands(content, player, gameManager, sendFn, namedSend, isAtBase)) {
    return
  }

  if (await handleMissionCommands(content, player, gameManager, sendFn, namedSend, isOnMission, withHints, addHint)) {
    return
  }

  if (content === '背包') {
    const backpack = gameManager.getPlayerBackpack(player)
    if (!backpack.success) {
      namedSend(backpack.message)
      return
    }
    let msg = `【外勤背包】\n`
    msg += `容量: ${backpack.usedSlots}/${backpack.maxSlots}\n`
    
    msg += `\n物品:\n`
    if (backpack.items.length === 0) {
      msg += `  无\n`
    } else {
      for (const item of backpack.items) {
        msg += `  ${item.name} x${item.quantity}\n`
      }
    }
    
    if (backpack.collections && backpack.collections.length > 0) {
      msg += `\n藏品:\n`
      for (const col of backpack.collections) {
        const rarityText = { common: '普通', uncommon: '优秀', rare: '罕见', epic: '史诗', legendary: '金色', mythic: '神话' }
        msg += `  【${col.name}】 ${rarityText[col.rarity] || '普通'} ${col.slots}格 ${col.price}金币\n`
      }
    }
    
    namedSend(msg)
    return
  }

  if (content === '腰带') {
    const belt = gameManager.getPlayerBelt(player)
    if (!belt.success) {
      namedSend(belt.message)
      return
    }
    let msg = `【精灵腰带】\n`
    msg += `容量: ${belt.usedSlots}/${belt.maxSlots}\n`
    msg += `\n精灵:\n`
    if (belt.pokemon.length === 0) {
      msg += `  无\n`
    } else {
      for (const p of belt.pokemon) {
        const hpPercent = Math.floor((p.hp / p.maxHp) * 100)
        const hpBar = '█'.repeat(Math.floor(hpPercent / 20)) + '░'.repeat(5 - Math.floor(hpPercent / 20))
        msg += `  ${p.index}. ${p.name} Lv.${p.level} [${hpBar}] ${p.hp}/${p.maxHp}${p.isInitial ? ' (初始)' : ''}\n`
      }
    }
    namedSend(msg)
    return
  }

  if (content === '状态') {
    const status = gameManager.getPlayerStatus(player)
    console.log('')
    console.log('=== 玩家状态 ===')
    console.log('昵称:', player.username)
    console.log('金币:', player.money)
    console.log('勋章:', player.medals.length)
    console.log('服从等级:', player.getObedienceLevel())
    console.log('军衔:', player.rank || '新兵')
    if (status.status === 'playing') {
      console.log('游戏状态:', status.status)
      console.log('当前位置:', status.currentLocation)
      console.log('已走步数:', status.stepsTaken + '/' + status.maxSteps)
      console.log('背包:', status.backpackSlots)
      console.log('精灵腰带:', status.beltSlots)
    }
    return
  }

  console.log('未知指令:', content)
  console.log('输入"帮助"查看可用指令')
}

function setupReadline() {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  })

  rl.on('line', async (input) => {
    const content = input.trim()
    if (!content) {
      rl.prompt()
      return
    }

    if (content === 'exit' || content === 'quit') {
      console.log('退出测试...')
      if (gameManager) {
        gameManager.saveData()
      }
      rl.close()
      return
    }

    try {
      await processCommand(content)
    } catch (error) {
      console.error('错误:', error.message)
      console.error('堆栈:', error.stack)
    }

    console.log('')
    rl.prompt()
  })

  rl.on('close', () => {
    if (gameManager) {
      gameManager.saveData()
    }
    process.exit(0)
  })
}

console.log('====================================')
console.log('     宝可梦火箭队 - CLI测试模式')
console.log('====================================')
console.log('')
console.log('说明：本工具使用与QQBot完全相同的命令处理逻辑')
console.log('所有指令与QQBot一致，可直接使用中文指令测试')
console.log('')
console.log('等待系统初始化...')

async function startCLI() {
  try {
    console.log('[CLI] 步骤1: 运行 Bootstrap...')
    await bootstrap()
    console.log('[CLI] Bootstrap 完成')
    global.dbReady = true
    
    console.log('[CLI] 步骤2: 创建 GameManager...')
    gameManager = new GameManager()
    
    console.log('[CLI] 步骤3: 等待 GameManager 初始化...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    console.log('[CLI] 步骤4: 创建玩家...')
    player = gameManager.getOrCreatePlayer(TEST_USER_ID, TEST_USER_NAME)
    
    console.log('[CLI] 步骤5: 初始化命令行界面...')
    setupReadline()
    
    console.log('')
    console.log('系统初始化完成！')
    console.log('')
    console.log(getSmartHelp(player))
    console.log('')
    rl.prompt()
  } catch (error) {
    console.error('初始化失败:', error.message)
    console.error('堆栈:', error.stack)
    process.exit(1)
  }
}

startCLI()