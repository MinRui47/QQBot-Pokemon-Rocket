const fs = require('fs')
const path = require('path')
const database = require('./src/game/database/db')

const POKEMON_DIR = path.join(__dirname, 'data', 'pokemon')

async function importPokemonData() {
  await database.init()
  
  console.log('开始导入宝可梦数据...')
  
  const files = fs.readdirSync(POKEMON_DIR)
  let pokemonCount = 0
  let moveCount = 0
  let levelMoveCount = 0
  let tmMoveCount = 0
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    
    try {
      const filePath = path.join(POKEMON_DIR, file)
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      
      const name = data.name
      if (!name) continue
      
      // 检查是否已存在
      const existing = database.get('SELECT id FROM pokemons WHERE name = ?', [name])
      if (existing) {
        console.log(`跳过已存在: ${name}`)
        continue
      }
      
      // 解析属性
      const types = data.types || []
      const type1 = types[0] || '一般'
      const type2 = types[1] || null
      
      // 解析种族值
      const stats = data.stats || {}
      const hpBase = stats.HP || 40
      const attackBase = stats.攻击 || 40
      const defenseBase = stats.防御 || 40
      const spAttackBase = stats.特攻 || 40
      const spDefenseBase = stats.特防 || 40
      const speedBase = stats.速度 || 40
      const statTotal = hpBase + attackBase + defenseBase + spAttackBase + spDefenseBase + speedBase
      
      // 插入宝可梦数据
      database.run(`
        INSERT INTO pokemons (
          name, english_name, pokedex_id, type1, type2, category,
          capture_rate, gender_ratio, egg_groups, height, weight,
          hp_base, attack_base, defense_base, sp_attack_base, sp_defense_base, speed_base,
          stat_total, abilities, hidden_ability, evolution_chain, flavor_text, legendary_category
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name,
        data.englishName || '',
        data.id || '',
        type1,
        type2,
        data.category || '',
        parseInt(data.captureRate) || 45,
        data.genderRatio || '',
        data.eggGroups || '',
        data.height || '',
        data.weight || '',
        hpBase,
        attackBase,
        defenseBase,
        spAttackBase,
        spDefenseBase,
        speedBase,
        statTotal,
        JSON.stringify(data.abilities || []),
        data.hiddenAbility || '',
        JSON.stringify(data.evolutionChain || []),
        data.flavorText || '',
        data.legendaryCategory || 'normal'
      ])
      
      const pokemonId = database.get('SELECT id FROM pokemons WHERE name = ?', [name]).id
      pokemonCount++
      
      // 导入等级技能
      if (data.learnableMoves && Array.isArray(data.learnableMoves)) {
        for (const moveData of data.learnableMoves) {
          const moveName = moveData.name
          if (!moveName) continue
          
          // 获取或创建技能
          let moveId = database.get('SELECT id FROM moves WHERE name = ?', [moveName])
          if (!moveId) {
            database.run(`
              INSERT INTO moves (name, type, category, power, accuracy, pp, effect)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              moveName,
              moveData.type || '一般',
              moveData.category || '物理',
              parseInt(moveData.power) || 0,
              parseInt(moveData.accuracy) || 100,
              parseInt(moveData.pp) || 20,
              ''
            ])
            moveId = database.get('SELECT id FROM moves WHERE name = ?', [moveName])
            moveCount++
          }
          
          // 插入等级技能（只处理等级学习的技能）
          if (moveData.level && moveData.level !== '—' && moveData.level !== '') {
            database.run(`
              INSERT INTO pokemon_level_moves (pokemon_id, move_id, level)
              VALUES (?, ?, ?)
            `, [pokemonId, moveId.id, parseInt(moveData.level)])
            levelMoveCount++
          }
        }
      }
      
      // 导入学习机技能
      if (data.tmMoves && Array.isArray(data.tmMoves)) {
        for (const tmMove of data.tmMoves) {
          const moveName = tmMove.name
          if (!moveName) continue
          
          let moveId = database.get('SELECT id FROM moves WHERE name = ?', [moveName])
          if (!moveId) {
            database.run(`
              INSERT INTO moves (name, type, category, power, accuracy, pp, effect)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              moveName,
              tmMove.type || '一般',
              tmMove.category || '物理',
              parseInt(tmMove.power) || 0,
              parseInt(tmMove.accuracy) || 100,
              parseInt(tmMove.pp) || 20,
              ''
            ])
            moveId = database.get('SELECT id FROM moves WHERE name = ?', [moveName])
            moveCount++
          }
          
          database.run(`
            INSERT INTO pokemon_tm_moves (pokemon_id, move_id, tm_number)
            VALUES (?, ?, ?)
          `, [pokemonId, moveId.id, tmMove.tm || ''])
          tmMoveCount++
        }
      }
      
      if (pokemonCount % 50 === 0) {
        console.log(`已导入 ${pokemonCount} 只宝可梦`)
      }
      
    } catch (e) {
      console.error(`导入失败: ${file}`, e.message)
    }
  }
  
  console.log(`\n导入完成！`)
  console.log(`- 宝可梦: ${pokemonCount} 只`)
  console.log(`- 技能招式: ${moveCount} 个`)
  console.log(`- 等级技能关联: ${levelMoveCount} 条`)
  console.log(`- 学习机技能关联: ${tmMoveCount} 条`)
  
  database.close()
}

importPokemonData().catch(e => console.error('导入失败:', e.message))