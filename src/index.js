process.on('uncaughtException', (err) => {
  console.error(`\x1b[31m[FATAL]\x1b[0m 未捕获异常:`, err)
})
process.on('unhandledRejection', (reason) => {
  console.error(`\x1b[31m[FATAL]\x1b[0m 未处理的 Promise 拒绝:`, reason)
})

const WebSocket = require('ws')
const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')
const config = require('../config.json')
const pokemon = require('./pokemon')
const { GameManager } = require('./game/GameManager')
const { handleBaseCommands } = require('./index/commands/baseCommands')
const { handleMissionCommands } = require('./index/commands/missionCommands')

const API_BASE = 'https://api.sgroup.qq.com'
const TOKEN_URL = 'https://bots.qq.com/app/getAppAccessToken'

let ws = null
let heartbeatInterval = null
let lastSeq = 0
let accessToken = ''
let tokenExpireTime = 0
let dbReady = false  // 数据库初始化标志

// axios 拦截器：自动刷新过期 token
let isRefreshing = false
let refreshQueue = []

axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    // token 过期（11244）且未重试过
    if (error.response && error.response.data && error.response.data.code === 11244 && !originalRequest._retry) {
      if (isRefreshing) {
        // 等待刷新完成
        return new Promise(resolve => {
          refreshQueue.push(() => resolve(axios(originalRequest)))
        })
      }
      originalRequest._retry = true
      isRefreshing = true
      const success = await getAccessToken()
      isRefreshing = false
      if (success) {
        originalRequest.headers['Authorization'] = `QQBot ${accessToken}`
        refreshQueue.forEach(cb => cb())
        refreshQueue = []
        return axios(originalRequest)
      }
    }
    return Promise.reject(error)
  }
)

// 定时刷新 token（在过期前5分钟主动刷新）
function scheduleTokenRefresh() {
  const expiresIn = tokenExpireTime - Date.now()
  const refreshIn = Math.max(expiresIn - 300000, 60000) // 过期前5分钟刷新，至少1分钟
  console.log(`\x1b[34m[INFO]\x1b[0m Token 将在 ${Math.round(expiresIn/60000)} 分钟后过期，${Math.round(refreshIn/60000)} 分钟后自动刷新`)
  setTimeout(async () => {
    console.log(`\x1b[34m[INFO]\x1b[0m 正在主动刷新 AccessToken...`)
    await getAccessToken()
    scheduleTokenRefresh()
  }, refreshIn)
}

const gameManager = new GameManager()

// 群成员昵称缓存（避免频繁 API 调用）
const memberNameCache = new Map() // key: groupOpenId_memberOpenId, value: { name, time }

// 辅助函数：检查玩家是否在基地
function isAtBase(player) {
  return player.isAtBase() && !player.currentGame
}

// 辅助函数：检查玩家是否在外勤中
function isOnMission(player) {
  return player.currentGame && player.currentGame.status === 'playing'
}

function getSmartHelp(player) {
  if (!player.registered) {
    return `【欢迎来到火箭队 🚀】

你还未加入火箭队，请先登记！

📝 当前可执行：
  登记 [昵称]    - 加入火箭队，开启搜打撤之旅
  
💡 示例：登记 小明

加入后你将获得初始精灵和基础补给！`
  }
  
  if (isOnMission(player)) {
    const game = player.currentGame
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
  
  if (isAtBase(player)) {
    const hasPokemon = player.warehouse.pokemon && player.warehouse.pokemon.length > 0
    
    let helpMsg = `【火箭队基地 🏠】\n\n`
    helpMsg += `📊 当前状态：\n`
    helpMsg += `  金币：${player.money}\n`
    helpMsg += `  军衔：${player.rank || '新兵'}\n`
    helpMsg += `  仓库精灵：${player.warehouse.pokemon?.length || 0}/6\n`
    
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

async function getGroupMemberName(groupOpenId, memberOpenId) {
  const cacheKey = `${groupOpenId}_${memberOpenId}`
  const cached = memberNameCache.get(cacheKey)
  // 缓存10分钟
  if (cached && Date.now() - cached.time < 600000) {
    return cached.name
  }
  try {
    const res = await axios.get(`${API_BASE}/v2/groups/${groupOpenId}/members/${memberOpenId}`, { headers: getHeaders() })
    const name = res.data.nick || res.data.name || memberOpenId
    memberNameCache.set(cacheKey, { name, time: Date.now() })
    return name
  } catch {
    return memberOpenId
  }
}

// 长消息截断：保留开头和结尾，中间用省略信息替代
const MAX_MSG_LENGTH = 1500
function truncateMessage(text) {
  if (!text || text.length <= MAX_MSG_LENGTH) return text
  const headLen = 600
  const tailLen = 400
  const head = text.slice(0, headLen)
  const tail = text.slice(-tailLen)
  const omittedLines = text.slice(headLen, -tailLen).split('\n').filter(l => l.trim()).length
  return `${head}\n\n... (省略 ${omittedLines} 行中间内容) ...\n\n${tail}`
}

async function getAccessToken() {
  try {
    const response = await axios.post(TOKEN_URL, {
      appId: config.appId,
      clientSecret: config.token
    })
    if (response.data.access_token) {
      accessToken = response.data.access_token
      tokenExpireTime = Date.now() + parseInt(response.data.expires_in) * 1000
      console.log(`\x1b[32m[SUCCESS]\x1b[0m 获取 AccessToken 成功`)
      console.log(`\x1b[34m[INFO]\x1b[0m AccessToken 有效期至: ${new Date(tokenExpireTime).toLocaleString('zh-CN')}`)
      return true
    } else {
      console.error(`\x1b[31m[ERROR]\x1b[0m 获取 AccessToken 失败: ${response.data.message || '未知错误'}`)
      return false
    }
  } catch (error) {
    console.error(`\x1b[31m[ERROR]\x1b[0m 获取 AccessToken 失败: ${error.message}`)
    if (error.response) {
      console.error(`\x1b[31m[ERROR]\x1b[0m 状态码: ${error.response.status}`)
      console.error(`\x1b[31m[ERROR]\x1b[0m 响应: ${JSON.stringify(error.response.data)}`)
    }
    return false
  }
}

function getHeaders() {
  return {
    'Authorization': `QQBot ${accessToken}`,
    'Content-Type': 'application/json'
  }
}

async function getGateway() {
  try {
    const response = await axios.get(`${API_BASE}/gateway/bot`, { headers: getHeaders() })
    return response.data.url
  } catch (error) {
    console.error(`\x1b[31m[ERROR]\x1b[0m 获取 gateway 失败: ${error.message}`)
    if (error.response) {
      console.error(`\x1b[31m[ERROR]\x1b[0m 状态码: ${error.response.status}`)
      console.error(`\x1b[31m[ERROR]\x1b[0m 响应: ${JSON.stringify(error.response.data)}`)
    }
    return null
  }
}

async function downloadImage(url, filepath) {
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 })
  fs.writeFileSync(filepath, response.data)
  return filepath
}

async function sendMessage(channelId, content) {
  try {
    await axios.post(`${API_BASE}/channels/${channelId}/messages`, {
      content: truncateMessage(content)
    }, { headers: getHeaders() })
    return true
  } catch (error) {
    console.error(`\x1b[31m[ERROR]\x1b[0m 发送频道消息失败: ${error.message}`)
    if (error.response) {
      console.error(`\x1b[31m[ERROR]\x1b[0m 状态码: ${error.response.status}`)
      console.error(`\x1b[31m[ERROR]\x1b[0m 响应: ${JSON.stringify(error.response.data)}`)
    }
    return false
  }
}

async function sendGroupMessage(groupOpenId, content, msgId) {
  try {
    const body = {
      content: truncateMessage(content),
      msg_type: 0
    }
    // 带 msg_id 表示被动回复（不需要主动消息权限）
    if (msgId) {
      body.msg_id = msgId
    }
    await axios.post(`${API_BASE}/v2/groups/${groupOpenId}/messages`, body, { headers: getHeaders() })
    return true
  } catch (error) {
    console.error(`\x1b[31m[ERROR]\x1b[0m 发送群消息失败: ${error.message}`)
    if (error.response) {
      console.error(`\x1b[31m[ERROR]\x1b[0m 状态码: ${error.response.status}`)
      console.error(`\x1b[31m[ERROR]\x1b[0m 响应: ${JSON.stringify(error.response.data)}`)
    }
    return false
  }
}

async function sendC2CMessage(userOpenId, content) {
  try {
    await axios.post(`${API_BASE}/v2/users/${userOpenId}/messages`, {
      content: truncateMessage(content),
      msg_type: 0
    }, { headers: getHeaders() })
    return true
  } catch (error) {
    console.error(`\x1b[31m[ERROR]\x1b[0m 发送私聊消息失败: ${error.message}`)
    if (error.response) {
      console.error(`\x1b[31m[ERROR]\x1b[0m 状态码: ${error.response.status}`)
      console.error(`\x1b[31m[ERROR]\x1b[0m 响应: ${JSON.stringify(error.response.data)}`)
    }
    return false
  }
}

async function sendPokemonMessage(channelId, content, info) {
  try {
    await axios.post(`${API_BASE}/channels/${channelId}/messages`, {
      content: truncateMessage(content)
    }, { headers: getHeaders() })

    if (info.imageUrl) {
      try {
        const imgPath = await pokemon.downloadPokemonImage(info)
        if (imgPath && fs.existsSync(imgPath)) {
          const ext = imgPath.split('.').pop().toLowerCase()
          const form = new FormData()
          form.append('file_image', fs.createReadStream(imgPath), { filename: `pokemon.${ext}` })
          await axios.post(`${API_BASE}/channels/${channelId}/messages`, form, {
            headers: {
              ...getHeaders(),
              ...form.getHeaders()
            }
          })
        }
      } catch (imgError) {
        console.error(`\x1b[31m[ERROR]\x1b[0m 图片发送失败: ${imgError.message}`)
      }
    }
    return true
  } catch (error) {
    console.error(`\x1b[31m[ERROR]\x1b[0m 发送消息失败: ${error.message}`)
    if (error.response) {
      console.error(`\x1b[31m[ERROR]\x1b[0m 状态码: ${error.response.status}`)
      console.error(`\x1b[31m[ERROR]\x1b[0m 响应: ${JSON.stringify(error.response.data)}`)
    }
    return false
  }
}

async function handleMessageContent(targetId, content, userId, username, sendFn, sendPokemonFn, logLabel) {
  console.log(`\x1b[36m[MSG]\x1b[0m [${logLabel}] ${username}: ${content}`)

  // 未登记拦截（仅允许登记和ping等基础指令）
  const player = gameManager.getOrCreatePlayer(userId, username)
  if (!player.registered && 
      content !== 'ping' && content !== 'hello' &&
      !content.startsWith('登记') &&
      content !== '帮助' && !content.startsWith('帮助') && content !== '游戏帮助' &&
      content !== 'info' && content !== 'time' &&
      !content.startsWith('查看') && content !== '查看周围' && content !== '环顾') {
    await sendFn('输入"登记 [昵称]"即可加入火箭队，开始搜打撤之旅')
    return
  }

  if (content === 'ping') {
    await sendFn('pong')
    console.log(`\x1b[36m[REPLY]\x1b[0m [${logLabel}] ping -> pong`)
  } else if (content === 'hello') {
    await sendFn('你好！我是宝可梦火箭队QQ机器人~')
    console.log(`\x1b[36m[REPLY]\x1b[0m [${logLabel}] hello`)
  } else if (content === '查看周围' || content === '环顾') {
    // 查看周围要路由到游戏指令，不走宝可梦查询
    await handleGameCommandForPlayer(player, targetId, content, sendFn)
  } else if (content.startsWith('查看')) {
    const pokemonName = content.slice(2).trim()
    if (!pokemonName) {
      await sendFn('请输入宝可梦名称或编号，例如：\n- 查看皮卡丘\n- 查看25')
      return
    }
    console.log(`\x1b[36m[POKEMON]\x1b[0m 查询宝可梦: ${pokemonName}`)
    await sendFn(`正在查询「${pokemonName}」...`)
    try {
      const info = await pokemon.getPokemonInfo(pokemonName)
      if (info) {
        const text = pokemon.formatPokemonInfo(info)
        await sendPokemonFn(text, info)
        console.log(`\x1b[36m[REPLY]\x1b[0m [${logLabel}] 宝可梦查询: ${info.name}`)
      } else {
        await sendFn(`未找到宝可梦「${pokemonName}」，请检查名称或编号是否正确。`)
        console.log(`\x1b[36m[REPLY]\x1b[0m [${logLabel}] 未找到: ${pokemonName}`)
      }
    } catch (error) {
      console.error(`\x1b[31m[ERROR]\x1b[0m 宝可梦查询失败: ${error.message}`)
      await sendFn(`查询「${pokemonName}」时出错，请稍后重试`)
    }
  } else if (content === '帮助' || content.startsWith('帮助 ')) {
    const parts = content.split(' ')
    const pageNum = parseInt(parts[1])
    
    if (!pageNum) {
      await sendFn(getSmartHelp(player))
      console.log(`\x1b[36m[REPLY]\x1b[0m [${logLabel}] 智能帮助`)
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
        await sendFn(`页码不存在，请输入 帮助 1~${pages.length}`)
      } else {
        await sendFn(pages[pageNum - 1])
        if (pageNum < pages.length) {
          await sendFn(`💡 发送"帮助 ${pageNum + 1}"查看下一页`)
        }
      }
      console.log(`\x1b[36m[REPLY]\x1b[0m [${logLabel}] 指令帮助 第${pageNum}页`)
    }
  } else if (content === '时间') {
    const now = new Date()
    const timeStr = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    await sendFn(`当前时间：${timeStr}`)
    console.log(`\x1b[36m[REPLY]\x1b[0m [${logLabel}] 时间 -> ${timeStr}`)
  } else if (content === '信息') {
    const infoMsg = `
机器人信息：
- QQ: ${config.qq}
- AppID: ${config.appId}
- 版本: 1.0.0
- 状态: 在线
    `.trim()
    await sendFn(infoMsg)
    console.log(`\x1b[36m[REPLY]\x1b[0m [${logLabel}] 请求信息`)
  } else {
    await handleGameCommandForPlayer(player, targetId, content, sendFn)
  }
}

async function handleGameCommandForPlayer(player, targetId, content, sendFn) {
  // 等待数据库初始化完成
  if (!global.dbReady) {
    await sendFn('系统正在初始化，请稍后再试...')
    return
  }
  
  // 检查玩家是否在游戏中但没有精灵
  if (player.currentGame && player.currentGame.status === 'playing') {
    const game = player.currentGame
    const warehouseCount = player.warehouse.pokemon.length || 0
    const beltCount = game.belt.pokemon.length || 0
    
    if (warehouseCount === 0 && beltCount === 0) {
      const result = gameManager.forceEvacuate(player)
      await sendFn(result.message)
      return
    }
  }
  
  // 为消息添加玩家昵称前缀的包装
  const namedSend = (msg) => {
    // 使用玩家设置的昵称，而非API可能返回的ID
    const name = player.nickname || '火箭队探员'
    // 只在非帮助、非状态等长消息上添加前缀
    if (msg && (msg.includes('找到了') || msg.includes('搜刮') || msg.includes('撤离') || 
        msg.includes('遭遇') || msg.includes('搜索时'))) {
      sendFn(`${name} ${msg}`)
    } else {
      sendFn(msg)
    }
  }

  // 根据玩家当前游戏状态添加提示
  function addHint(msg) {
    const game = player.currentGame
    if (!game || game.status !== 'playing') return msg
    // 消息中已有相关指令提示，不再重复
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

  // 根据结果添加指令提示
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

  // ===== 新系统指令 =====

  if (content.startsWith('登记')) {
    const nickname = content.slice(2).trim()
    const result = gameManager.registerPlayer(player, nickname)
    await sendFn(result.message)
    return
  }

  // ===== 基地指令 =====
  // 调用基地指令处理模块
  if (handleBaseCommands(content, player, gameManager, sendFn, namedSend, isAtBase)) {
    return
  }

  // ===== 外勤指令 =====
  // 调用外勤指令处理模块
  if (await handleMissionCommands(content, player, gameManager, sendFn, namedSend, isOnMission, withHints, addHint)) {
    return
  }

  // ===== 通用指令 =====

  // 背包（通用）
  if (content === '背包') {
    const backpack = gameManager.getPlayerBackpack(player)
    if (!backpack.success) {
      await namedSend(backpack.message)
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
    
    await namedSend(msg)
    return
  }

  // 腰带（通用）
  if (content === '腰带') {
    const belt = gameManager.getPlayerBelt(player)
    if (!belt.success) {
      await namedSend(belt.message)
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
    await namedSend(msg)
    return
  }

  // 游戏帮助（通用）
  if (content === '游戏帮助') {
    const helpMsg = `
【宝可梦火箭队·搜打撤游戏】

--- 新兵登记 ---
- 登记 [昵称]: 加入火箭队，开启搜打撤之旅
- 签到: 每日签到领取军饷和补给
- 军衔/我的称号: 查看当前军衔和Buff加成
- 藏品: 查看个人藏品图鉴

--- 外勤出击 ---
- 地图: 查看可用地图（需在火箭队基地）
- 租借 [精灵名]: 在基地租借制式宝可梦（阿柏蛇/瓦斯弹/超音蝠）
- 外勤 [地图名]: 从火箭队基地出发执行外勤（需有精灵）
- 查看周围/环顾: 查看当前地点信息和可探索位置
- 搜索 [地点名]: 搜索指定地点搜刮物资
- 进入 [地点名]: 进入建筑/地点
- 离开: 离开当前建筑
- 战斗: 与遭遇的敌人战斗
- 撤离: 结束外勤撤离返回基地
- 待拾取/地上物品: 查看地上未拾取的道具
- 拾取 [物品名]: 拾取地上的道具
- 丢弃 [物品名] [数量]: 丢弃物品腾出背包空间
- 丢弃藏品 [藏品名]: 丢弃藏品腾出背包空间

--- 状态查看 ---
- 状态: 查看当前状态和任务
- 仓库: 查看个人永久仓库
- 背包: 查看外勤背包
- 腰带: 查看精灵腰带

--- 交易系统 ---
- 出售 [物品名] [数量]: 直售回收给火箭队
- 上架 [类型] [物品名] [数量] [价格]: 玩家挂牌交易
- 购买 [商品ID]: 购买玩家商品
- 取消上架 [商品ID]: 取消上架
- 商店: 查看玩家商店

--- 其他 ---
- 公金: 查看火箭队公共资金
- help: 查看机器人帮助
    `.trim()
    await namedSend(helpMsg)
    return
  }
}

async function handleMessage(message) {
  const data = JSON.parse(message)

  if (data.op === 10) {
    startHeartbeat(data.d.heartbeat_interval)
    identify()
    return
  }

  if (data.op === 11) {
    return
  }

  if (data.op === 0 && data.t === 'READY') {
    console.log(`\x1b[32m[SUCCESS]\x1b[0m 机器人已就绪! 用户: ${data.d.user.username}`)
    return
  }

  // ===== 频道消息（MESSAGE_CREATE）=====
  if (data.op === 0 && data.t === 'MESSAGE_CREATE') {
    const msg = data.d
    if (msg.author && msg.author.bot) return

    const rawContent = msg.content.trim()
    const content = rawContent.replace(/<@!\d+>\s*/g, '').trim()
    const targetId = msg.channel_id
    const userId = msg.author.id
    const username = msg.author.username

    await handleMessageContent(targetId, content, userId, username,
      (text) => sendMessage(targetId, text),
      (text, info) => sendPokemonMessage(targetId, text, info),
      targetId
    )

    lastSeq = data.s
    return
  }

  // ===== 群聊@消息（GROUP_AT_MESSAGE_CREATE）=====
  if (data.op === 0 && data.t === 'GROUP_AT_MESSAGE_CREATE') {
    const msg = data.d
    if (msg.author && msg.author.bot) return

    // 去除 @机器人 前缀
    const rawContent = msg.content.trim()
    const content = rawContent.replace(/<@!\d+>\s*/g, '').replace(/@机器人/g, '').trim()
    if (!content) return

    const targetId = msg.group_openid
    // 统一使用 user_openid 作为玩家ID，实现跨群数据互通
    const userId = msg.author.user_openid || msg.author.member_openid
    console.log(`[DEBUG] GROUP_AT_MSG: userId=${userId}, user_openid=${msg.author.user_openid}, member_openid=${msg.author.member_openid}`)
    const msgId = msg.id
    const memberOpenId = msg.author.member_openid || ''

    // 异步获取群成员昵称
    const username = await getGroupMemberName(targetId, memberOpenId)

    console.log(`\x1b[36m[GROUP_MSG]\x1b[0m [群${targetId}] ${username}: ${content}`)

    await handleMessageContent(targetId, content, userId, username,
      (text) => sendGroupMessage(targetId, text, msgId),
      (text) => sendGroupMessage(targetId, text, msgId),
      `群${targetId}`
    )

    lastSeq = data.s
    return
  }

  // ===== 私聊消息（C2C_MESSAGE_CREATE）=====
  if (data.op === 0 && data.t === 'C2C_MESSAGE_CREATE') {
    const msg = data.d
    if (msg.author && msg.author.bot) return

    const content = msg.content.trim()
    if (!content) return

    const targetId = msg.user_openid || msg.author.user_openid
    const userId = msg.author.user_openid
    const username = msg.author.user_openid || '私聊用户'

    console.log(`\x1b[36m[C2C_MSG]\x1b[0m [私聊${targetId}]: ${content}`)

    await handleMessageContent(targetId, content, userId, username,
      (text) => sendC2CMessage(targetId, text),
      (text) => sendC2CMessage(targetId, text),
      `私聊${targetId}`
    )

    lastSeq = data.s
    return
  }

  if (data.op === 0 && data.s) {
    lastSeq = data.s
  }
}

function startHeartbeat(interval) {
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        op: 1,
        d: lastSeq
      }))
    }
  }, interval)
}

function identify() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      op: 2,
      d: {
        token: `QQBot ${accessToken}`,
        // GUILD_MESSAGES(1<<9) | GUILD_MESSAGE_REACTIONS(1<<10) | GROUP_AT_MESSAGE(1<<25) | C2C_MESSAGE(1<<18)
        intents: 1 << 9 | 1 << 10 | 1 << 25 | 1 << 18,
        shard: [0, 1],
        properties: {
          $os: 'windows',
          $browser: 'qq-bot',
          $device: 'qq-bot'
        }
      }
    }))
  }
}

async function connect() {
  if (Date.now() >= tokenExpireTime || !accessToken) {
    const success = await getAccessToken()
    if (!success) {
      console.log(`\x1b[33m[WARN]\x1b[0m 5秒后重试...`)
      setTimeout(connect, 5000)
      return
    }
    scheduleTokenRefresh()
  }

  const gatewayUrl = await getGateway()
  if (!gatewayUrl) {
    console.log(`\x1b[33m[WARN]\x1b[0m 5秒后重试...`)
    setTimeout(connect, 5000)
    return
  }

  console.log(`\x1b[34m[INFO]\x1b[0m Gateway: ${gatewayUrl}`)
  console.log(`\x1b[34m[INFO]\x1b[0m 正在连接 WebSocket...`)

  // 关闭旧的 WebSocket 连接
  if (ws) {
    try {
      ws.removeAllListeners()
      ws.close()
    } catch (e) {}
    ws = null
  }

  let wsObj
  try {
    wsObj = new WebSocket(gatewayUrl, {
      handshakeTimeout: 15000
    })
  } catch (e) {
    console.error(`\x1b[31m[ERROR]\x1b[0m 创建 WebSocket 失败: ${e.message}`)
    setTimeout(connect, 5000)
    return
  }
  ws = wsObj

  // 连接超时定时器
  let connectionTimedOut = false
  const connectionTimer = setTimeout(() => {
    connectionTimedOut = true
    console.log(`\x1b[33m[WARN]\x1b[0m WebSocket 连接超时，正在重试...`)
    try {
      ws.removeAllListeners()
      ws.close()
    } catch (e) {}
    ws = null
    setTimeout(connect, 3000)
  }, 20000)

  ws.on('unexpected-response', (req, res) => {
    console.error(`\x1b[31m[ERROR]\x1b[0m WebSocket 连接被拒绝，状态码: ${res.statusCode}`)
    let body = ''
    res.on('data', (chunk) => { body += chunk })
    res.on('end', () => {
      console.error(`\x1b[31m[ERROR]\x1b[0m 响应: ${body}`)
    })
  })

  ws.on('open', () => {
    if (connectionTimedOut) return
    clearTimeout(connectionTimer)
    console.log(`\x1b[32m[SUCCESS]\x1b[0m WebSocket 连接已建立`)
  })

  ws.on('message', (message) => {
    handleMessage(message.toString())
  })

  ws.on('close', (code, reason) => {
    if (connectionTimedOut) return
    clearTimeout(connectionTimer)
    console.log(`\x1b[33m[WARN]\x1b[0m WebSocket 连接关闭: ${code}, ${reason}`)
    clearInterval(heartbeatInterval)
    setTimeout(connect, 5000)
  })

  ws.on('error', (error) => {
    if (connectionTimedOut) return
    clearTimeout(connectionTimer)
    console.error(`\x1b[31m[ERROR]\x1b[0m WebSocket 错误: ${error.message}`)
  })
}

console.log(`\x1b[34m[INFO]\x1b[0m 正在启动 QQ 频道机器人...`)
console.log(`\x1b[34m[INFO]\x1b[0m QQ: ${config.qq}`)
console.log(`\x1b[34m[INFO]\x1b[0m AppID: ${config.appId}`)

connect()

setInterval(() => {
  gameManager.saveData()
}, 30000)