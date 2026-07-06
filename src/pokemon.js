const axios = require('axios')
const fs = require('fs')
const path = require('path')

const WIKI_BASE = 'https://wiki.52poke.com/zh-hans/'
const DATA_DIR = path.join(__dirname, '..', 'data', 'pokemon')
const IMG_DIR = path.join(__dirname, '..', 'data', 'images')
const POKEDEX_PATH = path.join(__dirname, '..', 'data', 'pokedex_all.json')

// 繁简属性名转换（CSS class名是固定模板，简体站仍用繁体）
const TYPE_T2S = {
  '飛行': '飞行', '幽靈': '幽灵', '龍': '龙', '太陽': '太阳',
  '紅': '红', '藍之圓盤': '蓝之圆盘', '劍': '剑', '惡': '恶',
  '鋼': '钢', '格鬥': '格斗', '蟲': '虫', '超能力': '超能力',
  '一般': '一般', '火': '火', '水': '水', '草': '草', '电': '电',
  '冰': '冰', '毒': '毒', '地面': '地面', '岩石': '岩石', '妖精': '妖精'
}
function normalizeType(t) {
  return TYPE_T2S[t] || t
}

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}
if (!fs.existsSync(IMG_DIR)) {
  fs.mkdirSync(IMG_DIR, { recursive: true })
}

// 加载全国图鉴列表
let POKEDEX = []
try {
  if (fs.existsSync(POKEDEX_PATH)) {
    POKEDEX = JSON.parse(fs.readFileSync(POKEDEX_PATH, 'utf-8'))
  }
} catch (e) {
  console.error('[POKEDEX] 加载列表失败:', e.message)
}

/**
 * 根据编号获取宝可梦名称
 */
function getNameById(id) {
  const entry = POKEDEX.find(p => p.id === parseInt(id))
  return entry ? entry.name : null
}

/**
 * 根据名称获取编号
 */
function getIdByName(name) {
  const entry = POKEDEX.find(p => p.name === name)
  return entry ? entry.id : null
}

/**
 * 在所有缓存的宝可梦数据中搜索形态名
 * @param {string} formName 形态名（如"超级喷火龙Ｘ"、"超级妙蛙花"）
 * @returns {object|null} { pokemonName, form } 或 null
 */
function findPokemonByFormName(formName) {
  if (!fs.existsSync(DATA_DIR)) return null

  // 策略1: 直接匹配形态名
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'))
      if (data.forms && data.forms.length > 0) {
        for (const form of data.forms) {
          // 精确匹配形态名
          if (form.name === formName) {
            return { pokemonName: data.name, form }
          }
        }
      }
    } catch (e) {
      // 跳过损坏文件
    }
  }

  // 策略2: 模糊匹配 - 用户输入包含宝可梦名+形态关键词
  // 如"超级妙蛙花" -> 妙蛙花 + "超级" -> 匹配"超级进化"形态
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'))
      if (!data.forms || data.forms.length === 0) continue

      // 检查用户输入是否包含该宝可梦名
      if (formName.includes(data.name)) {
        // 提取形态关键词（去掉宝可梦名后的部分）
        const formKeyword = formName.replace(data.name, '').trim()

        // 如果只有一个形态，直接返回
        if (data.forms.length === 1) {
          return { pokemonName: data.name, form: data.forms[0] }
        }

        // 多形态时，用关键词匹配
        for (const form of data.forms) {
          // 形态名包含关键词，或关键词包含形态名
          if (form.name.includes(formKeyword) || formKeyword.includes(form.name)) {
            return { pokemonName: data.name, form }
          }
        }

        // 如果关键词是"超级"，匹配"超级进化"形态
        if (formKeyword === '超级' || formKeyword === 'Mega') {
          const megaForm = data.forms.find(f => f.name.includes('超级') || f.name.includes('Mega'))
          if (megaForm) {
            return { pokemonName: data.name, form: megaForm }
          }
        }
      }
    } catch (e) {
      // 跳过损坏文件
    }
  }

  // 策略3: 模糊匹配 - 形态名包含用户输入，或用户输入包含形态名
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'))
      if (data.forms && data.forms.length > 0) {
        for (const form of data.forms) {
          if (form.name.includes(formName) || formName.includes(form.name)) {
            return { pokemonName: data.name, form }
          }
        }
      }
    } catch (e) {
      // 跳过损坏文件
    }
  }

  return null
}

/**
 * 从52poke维基爬取宝可梦信息
 * @param {string|number} nameOrId 宝可梦中文名、编号或形态名
 * @returns {object} 宝可梦信息
 */
async function getPokemonInfo(nameOrId) {
  // 0. 如果是编号，转换为名称
  let name = nameOrId
  if (typeof nameOrId === 'number' || /^\d+$/.test(String(nameOrId))) {
    const resolved = getNameById(parseInt(nameOrId))
    if (!resolved) {
      throw new Error(`未找到编号 ${nameOrId} 对应的宝可梦`)
    }
    name = resolved
  }

  // 1. 先查本地缓存（直接匹配宝可梦名）
  const safeName = name.replace(/[\\/:*?"<>|]/g, '_')
  const localPath = path.join(DATA_DIR, `${safeName}.json`)
  if (fs.existsSync(localPath)) {
    try {
      const localData = JSON.parse(fs.readFileSync(localPath, 'utf-8'))
      console.log(`[CACHE] 命中本地缓存: ${name}`)
      return localData
    } catch (e) {
      // 缓存损坏，继续请求
    }
  }

  // 1.5. 如果直接匹配失败，尝试按形态名搜索（如"超级喷火龙Ｘ"）
  const formResult = findPokemonByFormName(name)
  if (formResult) {
    console.log(`[FORM] 匹配到形态: ${name} -> ${formResult.pokemonName} 的 ${formResult.form.name}`)
    // 获取该宝可梦的完整数据
    const formData = await getPokemonInfo(formResult.pokemonName)
    // 标记要显示的形态
    formData._focusForm = formResult.form.name
    return formData
  }

  // 2. 请求52poke维基页面
  console.log(`[WIKI] 正在从52poke获取: ${name}`)
  const url = WIKI_BASE + encodeURIComponent(name)
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 15000,
    responseType: 'arraybuffer'
  })
  const html = Buffer.from(res.data).toString('utf8')

  // 3. 解析HTML
  const info = parseWikiHtml(html, name)

  // 4. 保存到本地缓存
  try {
    fs.writeFileSync(localPath, JSON.stringify(info, null, 2), 'utf-8')
    console.log(`[CACHE] 已保存到本地: ${name}`)
  } catch (e) {
    console.error(`[CACHE] 保存失败: ${e.message}`)
  }

  return info
}

/**
 * 下载并缓存宝可梦图片到本地
 * @param {object} info 宝可梦信息
 * @returns {string|null} 本地图片路径，失败返回null
 */
async function downloadPokemonImage(info) {
  if (!info.imageUrl) return null

  const safeName = (info.name || 'unknown').replace(/[\\/:*?"<>|]/g, '_')
  const ext = info.imageUrl.split('.').pop().split('?')[0] || 'png'
  const localPath = path.join(IMG_DIR, `${safeName}.${ext}`)

  // 已缓存直接返回
  if (fs.existsSync(localPath)) {
    console.log(`[IMG] 命中本地图片: ${info.name}`)
    return localPath
  }

  try {
    console.log(`[IMG] 下载图片: ${info.name}`)
    const res = await axios.get(info.imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000,
      responseType: 'arraybuffer'
    })
    fs.writeFileSync(localPath, res.data)
    console.log(`[IMG] 已保存: ${localPath}`)
    return localPath
  } catch (e) {
    console.error(`[IMG] 下载失败: ${info.name} - ${e.message}`)
    return null
  }
}

/**
 * 解析52poke维基HTML，提取宝可梦信息
 */
function parseWikiHtml(html, queryName) {
  const result = {
    name: queryName,
    englishName: '',
    id: '',
    types: [],
    category: '',
    abilities: [],
    hiddenAbility: '',
    height: '',
    weight: '',
    captureRate: '',
    genderRatio: '',
    eggGroups: '',
    stats: {},
    statTotal: 0,
    forms: [], // 多形态数据（种族值、属性不同的形态）
    imageUrl: '',
    evolutionChain: [],
    flavorText: '',
    learnableMoves: [],
    tmMoves: [],
    eggMoves: []
  }

  // 提取英文名 - 从信息框 <b>Bulbasaur</b>
  const enMatch = html.match(/<b><span lang="ja">[^<]+<\/span><\/b>\s*<b>([A-Za-z]+)<\/b>/)
  if (enMatch) {
    result.englishName = enMatch[1]
  } else {
    // 备用：从概述段落提取
    const enMatch2 = html.match(/英文︰<\/b>([A-Za-z]+)/)
    if (enMatch2) {
      result.englishName = enMatch2[1]
    }
  }

  // 提取图鉴编号 - #0001
  const idMatch = html.match(/<a[^>]*title="[^"]*全国图鉴编号[^"]*"[^>]*>(#\d+)<\/a>/)
  if (idMatch) {
    result.id = idMatch[1]
  }

  // 提取图片URL - 官方绘图
  const imgMatch = html.match(/src="(\/\/s1\.52poke\.com\/wiki\/[^"]+)"[\s\S]{0,500}?官方绘图/)
  if (imgMatch) {
    result.imageUrl = 'https:' + imgMatch[1]
  }

  // 提取属性
  const typesSection = html.match(/title="属性"[\s\S]*?<\/td><\/tr><\/tbody><\/table>/)
  if (typesSection) {
    const typeMatches = typesSection[0].matchAll(/type-box-9-text">(.*?)<\/span>/g)
    for (const m of typeMatches) {
      if (m[1] && !result.types.includes(m[1])) {
        result.types.push(normalizeType(m[1]))
      }
    }
  }

  // 提取分类
  const catMatch = html.match(/title="分类"[\s\S]*?>([^<]+宝可梦)</)
  if (catMatch) {
    result.category = catMatch[1]
  }

  // 提取特性
  const abilitySection = html.match(/title="特性"[\s\S]*?<\/td><\/tr><\/tbody><\/table>\s*<\/td><\/tr>/)
  if (abilitySection) {
    const abilityMatches = abilitySection[0].matchAll(/<a[^>]*>([^<]+)<\/a>(?:<br\s*\/><small>([^<]*)<\/small>)?/g)
    for (const m of abilityMatches) {
      if (m[1] && m[1] !== '特性') {
        if (m[2] && m[2].includes('隐藏') || m[2] && m[2].includes('隱藏')) {
          result.hiddenAbility = m[1]
        } else {
          result.abilities.push(m[1])
        }
      }
    }
  }

  // 提取身高
  const heightMatch = html.match(/身高<\/a><\/b>[\s\S]*?<td[^>]*>([\d.]+m)/)
  if (heightMatch) {
    result.height = heightMatch[1]
  }

  // 提取体重
  const weightMatch = html.match(/体重<\/a><\/b>[\s\S]*?<td[^>]*>([\d.]+kg)/)
  if (weightMatch) {
    result.weight = weightMatch[1]
  }

  // 提取捕获率
  const captureMatch = html.match(/捕获率<\/a><\/b>[\s\S]*?<td[^>]*>(\d+)/)
  if (captureMatch) {
    result.captureRate = captureMatch[1]
  }

  // 提取性别比例
  const genderSection = html.match(/性别比例<\/a><\/b>[\s\S]*?<\/td><\/tr><\/tbody><\/table>\s*<\/td><\/tr><\/tbody><\/table>/)
  if (genderSection) {
    const maleMatch = genderSection[0].match(/雄性\s+([\d.]+%)/)
    const femaleMatch = genderSection[0].match(/雌性\s+([\d.]+%)/)
    if (maleMatch && femaleMatch) {
      result.genderRatio = `雄性 ${maleMatch[1]} / 雌性 ${femaleMatch[1]}`
    } else {
      if (genderSection[0].includes('无性别') && !genderSection[0].includes('雄性')) {
        result.genderRatio = '无性别'
      }
    }
  }

  // 提取蛋组
  const eggSection = html.match(/title="宝可梦培育"[\s\S]*?<\/td><\/tr><\/tbody><\/table>/)
  if (eggSection) {
    const eggMatches = eggSection[0].matchAll(/<a[^>]*title="([^"]+)（蛋群）"/g)
    const groups = []
    for (const m of eggMatches) {
      groups.push(m[1])
    }
    if (groups.length > 0) {
      result.eggGroups = groups.join('、')
    } else {
      const eggText = eggSection[0].match(/<a[^>]*>([^<]+)<\/a>\s*(?:与\s*<a[^>]*>([^<]+)<\/a>)?/)
      if (eggText) {
        result.eggGroups = eggText[2] ? `${eggText[1]}、${eggText[2]}` : eggText[1]
      }
    }
  }

  // 提取种族值（含多形态）
  const formData = parseFormsAndStats(html)
  if (formData) {
    // 多形态：第一个形态作为主数据，其余存入 forms
    if (formData.length > 0) {
      const primary = formData[0]
      result.stats = primary.stats
      result.statTotal = primary.statTotal
      // 如果主形态属性为空，用形态的属性
      if (result.types.length === 0 && primary.types.length > 0) {
        result.types = primary.types
      }
      // 其余形态存入 forms（包含图片地址）
      if (formData.length > 1) {
        result.forms = formData.slice(1).map(f => ({
          name: f.name,
          types: f.types,
          stats: f.stats,
          statTotal: f.statTotal,
          imageUrl: f.imageUrl
        }))
      }
    }
  } else {
    // 单形态：用原逻辑
    const statNames = ['HP', '攻击', '防御', '特攻', '特防', '速度']
    for (const statName of statNames) {
      const statRegex = new RegExp(`class="bgl-${statName}"[\\s\\S]*?float:right">(\\d+)`)
      const statMatch = html.match(statRegex)
      if (statMatch) {
        result.stats[statName] = parseInt(statMatch[1])
      }
    }
    const totalMatch = html.match(/总和[：:]?<\/span><span style="float:right">(\d+)/)
    if (totalMatch) {
      result.statTotal = parseInt(totalMatch[1])
    }
  }

  // 提取进化链
  result.evolutionChain = parseEvolutionChain(html)

  // 提取图鉴简介
  result.flavorText = parseFlavorText(html)

  // 提取招式表（只取最新世代 - 第九世代《朱／紫》）
  result.learnableMoves = parseMoveTable(html, '可学会的招式')
  result.tmMoves = parseMoveTable(html, '能使用的招式学习器')
  result.eggMoves = parseMoveTable(html, '蛋招式')

  return result
}

/**
 * 解析招式表（只取第一张表，即最新世代）
 * @param {string} html 完整HTML
 * @param {string} sectionId 段落ID（如"可学会的招式"）
 * @returns {Array} 招式列表
 */
function parseMoveTable(html, sectionId) {
  const moves = []

  // 找到段落标题位置（排除 _2 后缀的版本）
  const idPattern = `id="${sectionId}"`
  const idIdx = html.indexOf(idPattern)
  if (idIdx === -1) return moves

  // 找到下一个 <h5> 或 <h4> 或 <h3> 标题作为边界
  const headerPattern = /<h[345][^>]*>/
  const afterId = html.substring(idIdx + 20)
  const nextHeaderMatch = afterId.match(headerPattern)
  let sectionEnd = nextHeaderMatch ? idIdx + 20 + nextHeaderMatch.index : idIdx + 20000

  const sectionHtml = html.substring(idIdx, sectionEnd)

  // 提取所有数据行 <tr class="...bgwhite...">
  const rowMatches = [...sectionHtml.matchAll(/<tr[^>]*class="[^"]*bgwhite[^"]*"[^>]*>([\s\S]*?)<\/tr>/g)]

  for (const row of rowMatches) {
    const rowHtml = row[1]
    const move = parseMoveRow(rowHtml, sectionId)
    if (move && move.name) {
      moves.push(move)
    }
  }

  return moves
}

/**
 * 解析单行招式数据
 */
function parseMoveRow(rowHtml, sectionId) {
  const move = {
    level: '',
    tm: '',
    name: '',
    type: '',
    category: '',
    power: '',
    accuracy: '',
    pp: ''
  }

  // 提取招式名 - title="...（招式）"
  const nameMatch = rowHtml.match(/<a[^>]*title="([^"]+)（招式）"[^>]*>([^<]+)<\/a>/)
  if (!nameMatch) return null
  move.name = nameMatch[2].trim()

  // 提取属性 - title="...（属性）"
  const typeMatch = rowHtml.match(/<a[^>]*title="([^"]+)（属性）"[^>]*>([^<]+)<\/a>/)
  if (typeMatch) {
    move.type = typeMatch[2].trim()
  }

  // 提取分类 - 通过 class 属性识别（bg-物理/bg-特殊/bg-变化）
  const catClassMatch = rowHtml.match(/class="bg-(物理|特殊|变化)\s/)
  if (catClassMatch) {
    move.category = catClassMatch[1]
  } else {
    // 备用：通过 title 属性
    const catMatch = rowHtml.match(/<a[^>]*title="(物理|特殊|变化)招式"[^>]*>([^<]+)<\/a>/)
    if (catMatch) {
      move.category = catMatch[2].trim()
    }
  }

  // 提取所有 <td> 内容
  const tdMatches = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
  const tdTexts = tdMatches.map(m => m[1].replace(/<[^>]+>/g, '').trim())

  if (sectionId === '可学会的招式') {
    // 可学会招式：第一列是等级
    if (tdTexts.length > 0) {
      move.level = tdTexts[0] || '—'
    }
    // 威力、命中、PP 在最后几列
    const nums = tdTexts.filter(t => /^[\d—]+$/.test(t))
    if (nums.length >= 3) {
      move.power = nums[nums.length - 3] || '—'
      move.accuracy = nums[nums.length - 2] || '—'
      move.pp = nums[nums.length - 1] || '—'
    }
  } else if (sectionId === '能使用的招式学习器') {
    // TM：第二列是招式学习器编号
    const tmMatch = rowHtml.match(/<a[^>]*title="(招式学习器[^"]*)"[^>]*>([^<]+)<\/a>/)
    if (tmMatch) {
      move.tm = tmMatch[2].trim()
    }
    const nums = tdTexts.filter(t => /^[\d—]+$/.test(t))
    if (nums.length >= 3) {
      move.power = nums[nums.length - 3] || '—'
      move.accuracy = nums[nums.length - 2] || '—'
      move.pp = nums[nums.length - 1] || '—'
    }
  } else if (sectionId === '蛋招式') {
    // 蛋招式：第一列是亲代（跳过）
    const nums = tdTexts.filter(t => /^[\d—]+$/.test(t))
    if (nums.length >= 3) {
      move.power = nums[nums.length - 3] || '—'
      move.accuracy = nums[nums.length - 2] || '—'
      move.pp = nums[nums.length - 1] || '—'
    }
  }

  return move
}

/**
 * 解析所有形态的种族值和属性
 * @param {string} html 完整HTML
 * @returns {Array|null} 形态数组，null表示单形态（无形态切换）
 */
function parseFormsAndStats(html) {
  const statIdx = html.indexOf('id="种族值"')
  if (statIdx === -1) return null

  // 查找形态切换按钮 - <span class="toggle-pbase toggle-p-Nbase" ...><b>形态名</b></span>
  const toggleSection = html.substring(statIdx, statIdx + 5000)
  const formNameMatches = [...toggleSection.matchAll(/toggle-p-(\d+)base"[^>]*><b>([^<]+)<\/b>/g)]

  if (formNameMatches.length === 0) {
    return null // 单形态
  }

  // 提取形态名称（去重）
  const seen = new Set()
  const formNames = []
  for (const m of formNameMatches) {
    if (!seen.has(m[1])) {
      seen.add(m[1])
      formNames.push({ num: m[1], name: m[2] })
    }
  }

  const forms = []
  for (const { num, name } of formNames) {
    const divPattern = `toggle-content toggle-cbase toggle-${num}base`
    const divIdx = html.indexOf(divPattern, statIdx)
    if (divIdx === -1) continue

    // 找到这个div的结束位置（下一个 toggle-content 或 5000字符后）
    const nextDivIdx = html.indexOf('toggle-content toggle-cbase', divIdx + 10)
    const divEnd = nextDivIdx !== -1 ? nextDivIdx : divIdx + 5000
    const divContent = html.substring(divIdx, divEnd)

    // 提取属性 - 从表格 class="bg-火 bd-飞行 roundy"
    let types = []
    const tableMatch = divContent.match(/<table class="([^"]+)"/)
    if (tableMatch) {
      const classStr = tableMatch[1]
      const bgMatches = [...classStr.matchAll(/bg-([^\s]+)/g)]
      const bdMatches = [...classStr.matchAll(/bd-([^\s]+)/g)]
      types = [...new Set([...bgMatches.map(m => m[1]), ...bdMatches.map(m => m[1])])]
      types = types.filter(t => !['roundy', 'roundytl', 'roundytr', 'roundybl', 'roundybr'].includes(t))
      // 繁简转换
      types = types.map(normalizeType)
    }

    // 提取种族值
    const stats = {}
    const statNames = ['HP', '攻击', '防御', '特攻', '特防', '速度']
    for (const statName of statNames) {
      const statRegex = new RegExp(`class="bgl-${statName}"[\\s\\S]*?float:right">(\\d+)`)
      const statMatch = divContent.match(statRegex)
      if (statMatch) {
        stats[statName] = parseInt(statMatch[1])
      }
    }

    // 提取种族值总和
    let statTotal = 0
    const totalMatch = divContent.match(/总和[：:]?<\/span><span style="float:right">(\d+)/)
    if (totalMatch) {
      statTotal = parseInt(totalMatch[1])
    }

    // 提取形态图片地址
    let imageUrl = ''
    // 方法1: 通过alt属性匹配形态名（最可靠）
    // 页面中图片的alt属性通常就是形态名，如 alt="超级喷火龙Ｘ"
    const altImgRegex = new RegExp(`<img[^>]*alt="${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*src="(\/\/s1\\.52poke\\.com\\/wiki\\/[^"]+)"`, 'i')
    const altImgMatch = html.match(altImgRegex)
    if (altImgMatch) {
      imageUrl = 'https:' + altImgMatch[1]
    }

    // 方法2: 通过URL模式匹配（如 Mega_X、Mega_Y、Gigantamax）
    if (!imageUrl) {
      // 根据形态名推断URL关键词
      let urlKeyword = ''
      if (name.includes('超级') && name.includes('Ｘ')) urlKeyword = 'Mega_X'
      else if (name.includes('超级') && name.includes('Ｙ')) urlKeyword = 'Mega_Y'
      else if (name.includes('超级')) urlKeyword = 'Mega'
      else if (name.includes('超极巨')) urlKeyword = 'Gigantamax'
      else if (name.includes('原始')) urlKeyword = 'Primal'
      else if (name.includes('究极')) urlKeyword = 'Ultra'

      if (urlKeyword) {
        const urlImgRegex = new RegExp(`src="(\/\/s1\\.52poke\\.com\\/wiki\\/[^"]*${urlKeyword}[^"]*)"`, 'i')
        const urlImgMatch = html.match(urlImgRegex)
        if (urlImgMatch) {
          // 排除小图标
          if (!urlImgMatch[1].includes('20px') && !urlImgMatch[1].includes('25px') &&
              !urlImgMatch[1].includes('icon') && !urlImgMatch[1].includes('Icon')) {
            imageUrl = 'https:' + urlImgMatch[1]
          }
        }
      }
    }

    forms.push({ name, types, stats, statTotal, imageUrl })
  }

  return forms.length > 0 ? forms : null
}

/**
 * 解析进化链
 */
function parseEvolutionChain(html) {
  const chain = []

  // 同时支持简体"进化"和繁体"進化"（52poke简体站部分页面未完全转换）
  let evoIdx = html.indexOf('id="进化"')
  if (evoIdx === -1) evoIdx = html.indexOf('id="進化"')
  if (evoIdx === -1) return chain

  const evoSection = html.substring(evoIdx, evoIdx + 10000)

  // 提取宝可梦名字：只有当 <a>名字</a><br /> 后面紧跟属性链接时，才是宝可梦
  // 道具（如雷之石）后面没有属性链接
  const nameMatches = [...evoSection.matchAll(/<a[^>]*>([^<]+)<\/a><br\s*\/>([\s\S]{0,300})/g)]

  const pokemonNames = []
  for (const m of nameMatches) {
    const name = m[1].trim()
    const afterText = m[2]
    // 宝可梦名字后面会有属性链接（type-box-9-text）
    // 道具后面没有属性链接
    if (afterText.includes('type-box-9-text')) {
      // 过滤掉非宝可梦节点（如"战斗切换"、"原始回归"等形态切换机制）
      // 通过验证名字是否在宝可梦列表中
      const isPokemon = POKEDEX.some(p => p.name === name) || chain.some(c => c.name === name)
      if (isPokemon || name.length <= 6) {
        // 进一步过滤已知的非进化节点
        const nonEvoKeywords = ['战斗切换', '原始回归', '形态切换', '属性切换', '究极爆发']
        if (!nonEvoKeywords.includes(name)) {
          pokemonNames.push({ name, index: m.index })
        }
      }
    }
  }

  // 提取进化条件
  // 1. 等级进化：<a...>等级</a>数字以上（不要求title属性，兼容简繁页面）
  const levelMatches = [...evoSection.matchAll(/<a[^>]*>等级<\/a>(\d+以上)/g)]

  // 2. 亲密度/友好度进化
  const friendshipMatches = [...evoSection.matchAll(/<a[^>]*>亲密度<\/a>/g)]

  // 3. 使用道具进化：<a title="XXX（道具）">XXX</a> 后面有 →
  const itemMatches = [...evoSection.matchAll(/<a[^>]*title="([^"]+)（道具）"[^>]*>[^<]*<\/a>[\s\S]{0,200}?→/g)]

  // 4. 通信交换
  const tradeMatches = [...evoSection.matchAll(/<a[^>]*>通信交换<\/a>/g)]

  // 5. 提升美丽度
  const beautyMatches = [...evoSection.matchAll(/<a[^>]*>美丽度<\/a>/g)]

  // 6. 亲密度且学会特定招式
  const moveFriendshipMatches = [...evoSection.matchAll(/<a[^>]*>亲密度<\/a>[\s\S]{0,300}?<a[^>]*>([^<]+)<\/a>/g)]

  // 构建进化链
  for (let i = 0; i < pokemonNames.length; i++) {
    const name = pokemonNames[i].name
    // 去重
    if (chain.find(c => c.name === name)) continue

    // 第一个宝可梦没有进化条件
    if (i === 0) {
      chain.push({ name, condition: '' })
    } else {
      // 根据位置和上下文判断条件
      const prevIndex = pokemonNames[i - 1].index
      const currIndex = pokemonNames[i].index
      const betweenText = evoSection.substring(prevIndex, currIndex)

      let cond = ''
      // 检查等级
      if (levelMatches.length > 0) {
        for (const lm of levelMatches) {
          if (lm.index > prevIndex && lm.index < currIndex) {
            cond = `等级${lm[1]}`
            break
          }
        }
      }
      // 检查亲密度
      if (!cond && friendshipMatches.length > 0) {
        for (const fm of friendshipMatches) {
          if (fm.index > prevIndex && fm.index < currIndex) {
            cond = '亲密度'
            break
          }
        }
      }
      // 检查道具
      if (!cond && itemMatches.length > 0) {
        for (const im of itemMatches) {
          if (im.index > prevIndex && im.index < currIndex) {
            cond = `使用${im[1]}`
            break
          }
        }
      }
      // 检查交换
      if (!cond && tradeMatches.length > 0) {
        for (const tm of tradeMatches) {
          if (tm.index > prevIndex && tm.index < currIndex) {
            cond = '通信交换'
            break
          }
        }
      }
      // 检查美丽度
      if (!cond && beautyMatches.length > 0) {
        for (const bm of beautyMatches) {
          if (bm.index > prevIndex && bm.index < currIndex) {
            cond = '美丽度足够'
            break
          }
        }
      }

      chain.push({ name, condition: cond || '进化' })
    }
  }

  return chain
}

/**
 * 解析图鉴简介
 */
function parseFlavorText(html) {
  // 支持多种章节名：概述、基本介绍
  let overviewIdx = html.indexOf('id="概述"')
  if (overviewIdx === -1) overviewIdx = html.indexOf('id="基本介绍"')
  if (overviewIdx === -1) return ''

  const overviewSection = html.substring(overviewIdx, overviewIdx + 5000)
  // 取该章节下第一个 <p> 标签内容（跳过空段落）
  const pMatches = [...overviewSection.matchAll(/<p>([\s\S]*?)<\/p>/g)]
  for (const pMatch of pMatches) {
    let text = pMatch[1].replace(/<[^>]+>/g, '').trim()
    // 跳过空段落或过短内容
    if (text.length > 20) {
      return text
    }
  }

  return ''
}

/**
 * 格式化宝可梦信息为消息文本
 * @param {object} info 宝可梦信息
 * @param {string} [focusForm] 指定显示的形态名（如"超级喷火龙Ｘ"），不传则显示全部
 */
function formatPokemonInfo(info, focusForm) {
  // 优先使用参数，其次从info._focusForm读取
  const targetForm = focusForm || info._focusForm

  // 如果指定了形态，只显示该形态的数据
  if (targetForm && info.forms && info.forms.length > 0) {
    const form = info.forms.find(f => f.name === targetForm)
    if (form) {
      let text = `===== ${info.name}（${form.name}）=====\n`
      if (info.id) {
        text += `图鉴编号: ${info.id}\n`
      }
      if (form.types.length > 0) {
        text += `属性: ${form.types.join('、')}\n`
      }
      // 特性沿用原宝可梦的（形态通常不改变特性，除非特殊说明）
      if (info.abilities.length > 0 || info.hiddenAbility) {
        const abilitiesStr = info.abilities.join('、')
        const hiddenStr = info.hiddenAbility ? `（隐藏特性: ${info.hiddenAbility}）` : ''
        text += `特性: ${abilitiesStr}${hiddenStr}\n`
      }

      // 该形态的种族值
      const fs = form.stats
      if (Object.keys(fs).length > 0) {
        text += `\n--- 种族值（${form.name}）---\n`
        text += `HP: ${fs.HP || '?'}  攻击: ${fs['攻击'] || '?'}  防御: ${fs['防御'] || '?'}\n`
        text += `特攻: ${fs['特攻'] || '?'}  特防: ${fs['特防'] || '?'}  速度: ${fs['速度'] || '?'}\n`
        if (form.statTotal) {
          text += `种族值总和: ${form.statTotal}\n`
        }
      }

      // 进化链
      if (info.evolutionChain && info.evolutionChain.length > 0) {
        text += `\n--- 进化链 ---\n`
        for (let i = 0; i < info.evolutionChain.length; i++) {
          const evo = info.evolutionChain[i]
          if (i === 0) {
            text += `${evo.name}`
          } else {
            text += `\n  -> ${evo.condition || '进化'} -> ${evo.name}`
          }
        }
        text += '\n'
      }

      // 图鉴简介
      if (info.flavorText) {
        text += `\n--- 图鉴简介 ---\n${info.flavorText}\n`
      }

      return text
    }
  }

  // 默认：显示全部信息（含所有形态）
  let text = `===== ${info.name} =====\n`

  if (info.id) {
    text += `图鉴编号: ${info.id}\n`
  }
  if (info.types.length > 0) {
    text += `属性: ${info.types.join('、')}\n`
  }
  if (info.abilities.length > 0 || info.hiddenAbility) {
    const abilitiesStr = info.abilities.join('、')
    const hiddenStr = info.hiddenAbility ? `（隐藏特性: ${info.hiddenAbility}）` : ''
    text += `特性: ${abilitiesStr}${hiddenStr}\n`
  }

  // 种族值
  const stats = info.stats
  if (Object.keys(stats).length > 0) {
    text += `\n--- 种族值 ---\n`
    text += `HP: ${stats.HP || '?'}  攻击: ${stats['攻击'] || '?'}  防御: ${stats['防御'] || '?'}\n`
    text += `特攻: ${stats['特攻'] || '?'}  特防: ${stats['特防'] || '?'}  速度: ${stats['速度'] || '?'}\n`
    if (info.statTotal) {
      text += `种族值总和: ${info.statTotal}\n`
    }
  }

  // 其他形态
  if (info.forms && info.forms.length > 0) {
    for (const form of info.forms) {
      text += `\n--- 形态: ${form.name} ---\n`
      if (form.types.length > 0) {
        text += `属性: ${form.types.join('、')}\n`
      }
      const fs = form.stats
      if (Object.keys(fs).length > 0) {
        text += `HP: ${fs.HP || '?'}  攻击: ${fs['攻击'] || '?'}  防御: ${fs['防御'] || '?'}\n`
        text += `特攻: ${fs['特攻'] || '?'}  特防: ${fs['特防'] || '?'}  速度: ${fs['速度'] || '?'}\n`
      }
      if (form.statTotal) {
        text += `种族值总和: ${form.statTotal}\n`
      }
    }
  }

  // 进化链
  if (info.evolutionChain && info.evolutionChain.length > 0) {
    text += `\n--- 进化链 ---\n`
    for (let i = 0; i < info.evolutionChain.length; i++) {
      const evo = info.evolutionChain[i]
      if (i === 0) {
        text += `${evo.name}`
      } else {
        text += `\n  -> ${evo.condition || '进化'} -> ${evo.name}`
      }
    }
    text += '\n'
  }

  // 图鉴简介
  if (info.flavorText) {
    text += `\n--- 图鉴简介 ---\n${info.flavorText}\n`
  }

  return text
}

module.exports = {
  getPokemonInfo,
  formatPokemonInfo,
  downloadPokemonImage,
  getNameById,
  getIdByName,
  parseEvolutionChain,
  parseFlavorText,
  parseFormsAndStats,
  POKEDEX
}
