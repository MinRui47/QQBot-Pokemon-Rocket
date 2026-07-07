const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data')
const POKEMON_DIR = path.join(DATA_DIR, 'pokemon')
const MOVES_FILE = path.join(DATA_DIR, 'moves.json')

async function importPokemonData() {
  console.log('[导入] 开始导入宝可梦数据...')
  
  const { database } = require('./dal')
  await database.init()
  
  let pokemonCount = 0
  let moveCount = 0
  let levelMoveCount = 0
  let tmMoveCount = 0
  
  console.log('[导入] 第一步：导入技能数据...')
  
  if (fs.existsSync(MOVES_FILE)) {
    try {
      const movesData = JSON.parse(fs.readFileSync(MOVES_FILE, 'utf-8'))
      console.log(`[导入] 发现 ${movesData.length} 个技能`)
      
      for (const move of movesData) {
        try {
          const existing = database.get('SELECT id FROM moves WHERE name = ?', [move.name])
          if (existing) {
            continue
          }
          
          database.db.run(`
            INSERT INTO moves (name, type, category, power, accuracy, pp, effect, effect_chance, damage_class)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            move.name,
            move.type || '',
            move.category || '',
            move.power || null,
            move.accuracy || null,
            move.pp || 0,
            move.description || '',
            move.effect_chance || null,
            move.damage_class || move.category || ''
          ])
          
          moveCount++
        } catch (e) {
          console.error(`[导入] 导入技能 "${move.name}" 失败:`, e.message)
        }
      }
      
      database.save()
      console.log(`[导入] 技能导入完成：成功 ${moveCount}`)
    } catch (e) {
      console.error('[导入] 读取技能数据失败:', e.message)
    }
  } else {
    console.log('[导入] 未找到moves.json，跳过技能导入')
  }
  
  console.log('[导入] 第二步：导入宝可梦基础数据...')
  
  const pokemonFiles = fs.readdirSync(POKEMON_DIR).filter(f => f.endsWith('.json'))
  console.log(`[导入] 发现 ${pokemonFiles.length} 个宝可梦文件`)
  
  for (const file of pokemonFiles) {
    try {
      const filePath = path.join(POKEMON_DIR, file)
      const pokemonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      
      const existing = database.get('SELECT id FROM pokemons WHERE name = ?', [pokemonData.name])
      if (existing) {
        continue
      }
      
      const stats = pokemonData.stats || {}
      const types = pokemonData.types || []
      const abilities = pokemonData.abilities || []
      const evolutionChain = pokemonData.evolutionChain || []
      
      database.db.run(`
        INSERT INTO pokemons (
          name, english_name, pokedex_id, type1, type2, category, 
          capture_rate, gender_ratio, egg_groups, height, weight,
          hp_base, attack_base, defense_base, sp_attack_base, sp_defense_base, speed_base,
          stat_total, abilities, hidden_ability, evolution_chain, flavor_text, legendary_category
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        pokemonData.name,
        pokemonData.englishName || '',
        pokemonData.id || '',
        types[0] || '',
        types[1] || '',
        pokemonData.category || '',
        parseInt(pokemonData.captureRate) || 45,
        pokemonData.genderRatio || '',
        pokemonData.eggGroups || '',
        pokemonData.height || '',
        pokemonData.weight || '',
        stats.HP || 40,
        stats.攻击 || 40,
        stats.防御 || 40,
        stats.特攻 || 40,
        stats.特防 || 40,
        stats.速度 || 40,
        pokemonData.statTotal || 240,
        JSON.stringify(abilities),
        pokemonData.hiddenAbility || '',
        JSON.stringify(evolutionChain),
        pokemonData.flavorText || '',
        pokemonData.legendaryCategory || 'normal'
      ])
      
      pokemonCount++
    } catch (e) {
      console.error(`[导入] 导入宝可梦 "${file}" 失败:`, e.message)
    }
  }
  
  database.save()
  console.log(`[导入] 宝可梦基础数据导入完成：成功 ${pokemonCount}`)
  
  console.log('[导入] 第三步：导入等级学习技能...')
  
  for (const file of pokemonFiles) {
    try {
      const filePath = path.join(POKEMON_DIR, file)
      const pokemonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      
      const pokemon = database.get('SELECT id FROM pokemons WHERE name = ?', [pokemonData.name])
      if (!pokemon) continue
      
      const learnableMoves = pokemonData.learnableMoves || []
      
      for (const moveData of learnableMoves) {
        if (!moveData.name) continue
        
        const move = database.get('SELECT id FROM moves WHERE name = ?', [moveData.name])
        if (!move) continue
        
        const level = moveData.level === '—' ? 1 : parseInt(moveData.level) || 1
        
        const existing = database.get(`
          SELECT id FROM pokemon_level_moves WHERE pokemon_id = ? AND move_id = ? AND level = ?
        `, [pokemon.id, move.id, level])
        
        if (existing) continue
        
        database.db.run(`
          INSERT INTO pokemon_level_moves (pokemon_id, move_id, level)
          VALUES (?, ?, ?)
        `, [pokemon.id, move.id, level])
        
        levelMoveCount++
      }
    } catch (e) {
      console.error(`[导入] 导入宝可梦 "${file}" 等级技能失败:`, e.message)
    }
  }
  
  database.save()
  console.log(`[导入] 等级学习技能导入完成：成功 ${levelMoveCount}`)
  
  console.log('[导入] 第四步：导入学习机技能...')
  
  for (const file of pokemonFiles) {
    try {
      const filePath = path.join(POKEMON_DIR, file)
      const pokemonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      
      const pokemon = database.get('SELECT id FROM pokemons WHERE name = ?', [pokemonData.name])
      if (!pokemon) continue
      
      const tmMoves = pokemonData.tmMoves || []
      
      for (const moveData of tmMoves) {
        if (!moveData.name) continue
        
        const move = database.get('SELECT id FROM moves WHERE name = ?', [moveData.name])
        if (!move) continue
        
        const tmNumber = moveData.tm || ''
        
        const existing = database.get(`
          SELECT id FROM pokemon_tm_moves WHERE pokemon_id = ? AND move_id = ? AND tm_number = ?
        `, [pokemon.id, move.id, tmNumber])
        
        if (existing) continue
        
        database.db.run(`
          INSERT INTO pokemon_tm_moves (pokemon_id, move_id, tm_number)
          VALUES (?, ?, ?)
        `, [pokemon.id, move.id, tmNumber])
        
        tmMoveCount++
      }
    } catch (e) {
      console.error(`[导入] 导入宝可梦 "${file}" 学习机技能失败:`, e.message)
    }
  }
  
  database.save()
  console.log(`[导入] 学习机技能导入完成：成功 ${tmMoveCount}`)
  
  console.log('\n[导入] === 导入统计 ===')
  console.log(`[导入] 技能总数: ${moveCount}`)
  console.log(`[导入] 宝可梦总数: ${pokemonCount}`)
  console.log(`[导入] 等级学习技能总数: ${levelMoveCount}`)
  console.log(`[导入] 学习机技能总数: ${tmMoveCount}`)
  console.log('[导入] === 导入完成 ===')
  
  database.close()
  console.log('\n数据库已关闭')
}

importPokemonData().catch(console.error)