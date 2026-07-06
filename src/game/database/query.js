/**
 * 数据库查询工具 - 用于查看数据库内容
 * 运行方式: node src/game/database/query.js
 */

const { database, pokemonDAL, playerDAL } = require('./dal')

async function queryDatabase() {
  await database.init()
  
  const args = process.argv.slice(2)
  const command = args[0] || 'help'
  
  switch (command) {
    case 'pokemons':
      // 查看所有宝可梦
      const pokemons = database.all('SELECT id, name, type1, type2, hp_base, attack_base, defense_base FROM pokemons LIMIT 20')
      console.log('\n=== 宝可梦列表 (前20条) ===')
      console.table(pokemons)
      break
      
    case 'pokemon':
      // 查看指定宝可梦详情
      const name = args[1]
      if (!name) {
        console.log('用法: node query.js pokemon <名称>')
        break
      }
      const p = pokemonDAL.getPokemonByName(name)
      if (p) {
        console.log(`\n=== ${p.name} 详情 ===`)
        console.log(`图鉴编号: ${p.pokedexId}`)
        console.log(`属性: ${p.types.join('/')}`)
        console.log(`种族值: HP=${p.baseStats.HP}, 攻击=${p.baseStats.攻击}, 防御=${p.baseStats.防御}, 特攻=${p.baseStats.特攻}, 特防=${p.baseStats.特防}, 速度=${p.baseStats.速度}`)
        console.log(`特性: ${p.abilities.join(', ')}`)
        console.log(`隐藏特性: ${p.hiddenAbility}`)
        
        const moves = pokemonDAL.getPokemonLevelMoves(p.id)
        console.log(`\n等级学习技能 (${moves.length}个):`)
        moves.slice(0, 10).forEach(m => console.log(`  Lv.${m.level}: ${m.name} (${m.type}/${m.category}) 威力:${m.power || '-'}`))
        
        const tms = pokemonDAL.getPokemonTMs(p.id)
        console.log(`\n学习机技能 (${tms.length}个):`)
        tms.slice(0, 10).forEach(m => console.log(`  ${m.tmNumber}: ${m.name} (${m.type}/${m.category}) 威力:${m.power || '-'}`))
      } else {
        console.log(`未找到宝可梦: ${name}`)
      }
      break
      
    case 'moves':
      // 查看所有技能
      const moves = database.all('SELECT id, name, type, category, power, accuracy, pp FROM moves LIMIT 20')
      console.log('\n=== 技能列表 (前20条) ===')
      console.table(moves)
      break
      
    case 'move':
      // 查看指定技能详情
      const moveName = args[1]
      if (!moveName) {
        console.log('用法: node query.js move <名称>')
        break
      }
      const m = database.get('SELECT * FROM moves WHERE name = ?', [moveName])
      if (m) {
        console.log(`\n=== ${m.name} 详情 ===`)
        console.log(`属性: ${m.type}`)
        console.log(`类别: ${m.category}`)
        console.log(`威力: ${m.power || '-'}`)
        console.log(`命中率: ${m.accuracy || '-'}`)
        console.log(`PP: ${m.pp}`)
        console.log(`描述: ${m.effect || '-'}`)
        
        // 显示结构化效果数据
        if (m.effect_type) {
          console.log(`\n=== 效果数据 ===`)
          console.log(`效果类型: ${m.effect_type}`)
          console.log(`效果目标: ${m.effect_target}`)
          console.log(`影响属性: ${m.effect_stat}`)
          console.log(`效果数值: ${m.effect_value}`)
          console.log(`触发概率: ${m.effect_chance}%`)
          if (m.effect_duration) console.log(`持续时间: ${m.effect_duration}`)
          if (m.priority) console.log(`优先度: ${m.priority}`)
        }
      } else {
        console.log(`未找到技能: ${moveName}`)
      }
      break
      
    case 'items':
      // 查看所有道具
      const items = database.all('SELECT id, name, category, slots, max_stack, price FROM items LIMIT 20')
      console.log('\n=== 道具列表 (前20条) ===')
      console.table(items)
      break
      
    case 'item':
      // 查看指定道具详情
      const itemName = args[1]
      if (!itemName) {
        console.log('用法: node query.js item <名称>')
        break
      }
      const item = database.get('SELECT * FROM items WHERE name = ?', [itemName])
      if (item) {
        console.log(`\n=== ${item.name} 详情 ===`)
        console.log(`分类: ${item.category}`)
        console.log(`描述: ${item.description || '-'}`)
        console.log(`占格: ${item.slots}`)
        console.log(`最大堆叠: ${item.max_stack}`)
        console.log(`价格: ${item.price}`)
        console.log(`出售价格: ${item.sell_price}`)
        console.log(`可使用: ${item.usable ? '是' : '否'}`)
        console.log(`战斗中使用: ${item.battle_usable ? '是' : '否'}`)
        console.log(`野外使用: ${item.field_usable ? '是' : '否'}`)
        if (item.effect_type) {
          console.log(`效果类型: ${item.effect_type}`)
          console.log(`效果值: ${item.effect_value}`)
        }
      } else {
        console.log(`未找到道具: ${itemName}`)
      }
      break
      
    case 'pokeballs':
      // 查看所有精灵球
      const pokeballs = database.all('SELECT id, name, catch_rate_multiplier, slots, max_stack, price, rarity FROM pokeballs')
      console.log('\n=== 精灵球列表 ===')
      console.table(pokeballs)
      break
      
    case 'pokeball':
      // 查看指定精灵球详情
      const pokeballName = args[1]
      if (!pokeballName) {
        console.log('用法: node query.js pokeball <名称>')
        break
      }
      const pokeball = database.get('SELECT * FROM pokeballs WHERE name = ?', [pokeballName])
      if (pokeball) {
        console.log(`\n=== ${pokeball.name} 详情 ===`)
        console.log(`描述: ${pokeball.description || '-'}`)
        console.log(`捕获倍率: ${pokeball.catch_rate_multiplier}`)
        console.log(`占格: ${pokeball.slots}`)
        console.log(`最大堆叠: ${pokeball.max_stack}`)
        console.log(`价格: ${pokeball.price}`)
        console.log(`稀有度: ${pokeball.rarity}`)
        if (pokeball.special_condition) {
          console.log(`特殊条件: ${pokeball.special_condition}`)
        }
      } else {
        console.log(`未找到精灵球: ${pokeballName}`)
      }
      break
      
    case 'collections':
      // 查看所有藏品
      const collections = database.all('SELECT id, name, rarity, slots, base_price FROM collections')
      console.log('\n=== 藏品列表 ===')
      console.table(collections)
      break
      
    case 'collection':
      // 查看指定藏品详情
      const collectionName = args[1]
      if (!collectionName) {
        console.log('用法: node query.js collection <名称>')
        break
      }
      const collection = database.get('SELECT * FROM collections WHERE name = ?', [collectionName])
      if (collection) {
        console.log(`\n=== ${collection.name} 详情 ===`)
        console.log(`稀有度: ${collection.rarity}`)
        console.log(`占格: ${collection.slots}`)
        console.log(`价值: ${collection.base_price}`)
        console.log(`描述: ${collection.description || '-'}`)
        console.log(`来源: ${collection.source || '-'}`)
      } else {
        console.log(`未找到藏品: ${collectionName}`)
      }
      break
      
    case 'players':
      // 查看所有玩家
      const players = database.all('SELECT user_id, username, nickname, location, coins, rank_level FROM players LIMIT 20')
      console.log('\n=== 玩家列表 (前20条) ===')
      console.table(players)
      break
      
    case 'player':
      // 查看指定玩家详情
      const userId = args[1]
      if (!userId) {
        console.log('用法: node query.js player <用户ID>')
        break
      }
      const player = playerDAL.getPlayer(userId)
      if (player) {
        console.log(`\n=== ${userId} 详情 ===`)
        console.log(`昵称: ${player.nickname}`)
        console.log(`位置: ${player.location}`)
        console.log(`金币: ${player.coins}`)
        console.log(`等级: ${player.rankLevel}`)
        console.log(`已注册: ${player.registered}`)
        
        const personalPokemons = pokemonDAL.getPersonalPokemonsByUserId(userId)
        console.log(`\n个人宝可梦 (${personalPokemons.length}只):`)
        personalPokemons.forEach(pp => {
          const basePokemon = pokemonDAL.getPokemonById(pp.pokemonId)
          console.log(`  ${pp.nickname || basePokemon?.name || '未知'} Lv.${pp.level} HP:${pp.hp}/${pp.maxHp}`)
        })
      } else {
        console.log(`未找到玩家: ${userId}`)
      }
      break
      
    case 'stats':
      // 数据库统计
      console.log('\n=== 数据库统计 ===')
      const stats = {
        宝可梦: database.all('SELECT COUNT(*) as cnt FROM pokemons')[0].cnt,
        技能: database.all('SELECT COUNT(*) as cnt FROM moves')[0].cnt,
        等级技能: database.all('SELECT COUNT(*) as cnt FROM pokemon_level_moves')[0].cnt,
        学习机技能: database.all('SELECT COUNT(*) as cnt FROM pokemon_tm_moves')[0].cnt,
        道具: database.all('SELECT COUNT(*) as cnt FROM items')[0].cnt,
        精灵球: database.all('SELECT COUNT(*) as cnt FROM pokeballs')[0].cnt,
        藏品: database.all('SELECT COUNT(*) as cnt FROM collections')[0].cnt,
        玩家: database.all('SELECT COUNT(*) as cnt FROM players')[0].cnt,
        个人宝可梦: database.all('SELECT COUNT(*) as cnt FROM personal_pokemon')[0].cnt
      }
      console.table(stats)
      break
      
    case 'sql':
      // 执行自定义SQL
      const sql = args[1]
      if (!sql) {
        console.log('用法: node query.js sql <SQL语句>')
        console.log('示例: node query.js sql "SELECT * FROM pokemons WHERE type1=\'草\' LIMIT 10"')
        break
      }
      try {
        const results = database.all(sql)
        console.log('\n=== 查询结果 ===')
        console.table(results)
      } catch (e) {
        console.log('查询失败:', e.message)
      }
      break
      
    case 'help':
    default:
      console.log('\n=== 数据库查询工具 ===')
      console.log('\n可用命令:')
      console.log('  pokemons        - 查看宝可梦列表')
      console.log('  pokemon <名称>  - 查看指定宝可梦详情')
      console.log('  moves           - 查看技能列表')
      console.log('  move <名称>     - 查看指定技能详情')
      console.log('  items           - 查看道具列表')
      console.log('  item <名称>     - 查看指定道具详情')
      console.log('  pokeballs       - 查看精灵球列表')
      console.log('  pokeball <名称> - 查看指定精灵球详情')
      console.log('  collections     - 查看藏品列表')
      console.log('  collection <名称> - 查看指定藏品详情')
      console.log('  players         - 查看玩家列表')
      console.log('  player <ID>     - 查看指定玩家详情')
      console.log('  stats           - 查看数据库统计')
      console.log('  sql <语句>      - 执行自定义SQL查询')
      console.log('  help            - 显示帮助信息')
      console.log('\n示例:')
      console.log('  node query.js pokemon 妙蛙种子')
      console.log('  node query.js move 藤鞭')
      console.log('  node query.js item 伤药')
      console.log('  node query.js pokeball 精灵球')
      console.log('  node query.js stats')
      break
  }
  
  database.close()
}

queryDatabase().catch(console.error)