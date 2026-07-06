const { database, pokemonDAL } = require('./dal')

async function testPokemonData() {
  console.log('=== 测试宝可梦数据库 ===\n')
  
  await database.init()
  console.log('[1] 数据库初始化完成\n')
  
  console.log('[2] 测试宝可梦数据...')
  const p = pokemonDAL.getPokemonByName('妙蛙种子')
  if (p) {
    console.log(`    名称: ${p.name}`)
    console.log(`    属性: ${p.types.join('/')}`)
    console.log(`    种族值: HP=${p.baseStats.HP}, 攻击=${p.baseStats.攻击}, 防御=${p.baseStats.防御}, 特攻=${p.baseStats.特攻}, 特防=${p.baseStats.特防}, 速度=${p.baseStats.速度}`)
    console.log(`    特性: ${p.abilities.join(', ')}`)
    console.log(`    隐藏特性: ${p.hiddenAbility}`)
    console.log(`    图鉴编号: ${p.pokedexId}`)
  } else {
    console.log('    未找到妙蛙种子')
  }
  console.log('')
  
  console.log('[3] 测试技能数据...')
  const m = pokemonDAL.getMoveByName('藤鞭')
  if (m) {
    console.log(`    名称: ${m.name}`)
    console.log(`    属性: ${m.type}`)
    console.log(`    类别: ${m.category}`)
    console.log(`    威力: ${m.power}`)
    console.log(`    命中率: ${m.accuracy}`)
    console.log(`    PP: ${m.pp}`)
  } else {
    console.log('    未找到藤鞭')
  }
  console.log('')
  
  console.log('[4] 测试等级学习技能...')
  if (p) {
    const moves = pokemonDAL.getPokemonLevelMoves(p.id)
    console.log(`    ${p.name} 可学习 ${moves.length} 个等级技能`)
    console.log(`    前5个技能: ${moves.slice(0, 5).map(x => `${x.name}(Lv.${x.level})`).join(', ')}`)
  }
  console.log('')
  
  console.log('[5] 测试学习机技能...')
  if (p) {
    const tms = pokemonDAL.getPokemonTMs(p.id)
    console.log(`    ${p.name} 可学习 ${tms.length} 个学习机技能`)
    console.log(`    前5个学习机: ${tms.slice(0, 5).map(x => `${x.tmNumber}: ${x.name}`).join(', ')}`)
  }
  console.log('')
  
  console.log('[6] 测试创建个人宝可梦...')
  if (p) {
    const result = pokemonDAL.createPersonalPokemon(p.id, 'TEST_USER_001', {
      level: 10,
      ivs: { HP: 31, 攻击: 31, 防御: 31, 特攻: 31, 特防: 31, 速度: 31 },
      nickname: '我的妙蛙种子'
    })
    console.log(`    创建成功: ${result.changes > 0}`)
    
    const pp = pokemonDAL.getPersonalPokemonsByUserId('TEST_USER_001')
    console.log(`    用户 TEST_USER_001 有 ${pp.length} 只宝可梦`)
    
    if (pp.length > 0) {
      const first = pp[0]
      console.log(`    第一只: ${first.nickname || p.name}, Lv.${first.level}`)
      console.log(`    个体值: ${JSON.stringify(first.ivs)}`)
    }
  }
  console.log('')
  
  console.log('[7] 清理测试数据...')
  const ppList = pokemonDAL.getPersonalPokemonsByUserId('TEST_USER_001')
  ppList.forEach(pp => {
    pokemonDAL.deletePersonalPokemon(pp.id)
  })
  console.log(`    删除了 ${ppList.length} 只测试宝可梦`)
  console.log('')
  
  console.log('[8] 数据库统计...')
  const pokemonCount = database.all('SELECT COUNT(*) as cnt FROM pokemons')[0].cnt
  const movesCount = database.all('SELECT COUNT(*) as cnt FROM moves')[0].cnt
  const levelMovesCount = database.all('SELECT COUNT(*) as cnt FROM pokemon_level_moves')[0].cnt
  const tmMovesCount = database.all('SELECT COUNT(*) as cnt FROM pokemon_tm_moves')[0].cnt
  const personalCount = database.all('SELECT COUNT(*) as cnt FROM personal_pokemon')[0].cnt
  
  console.log(`    宝可梦总数: ${pokemonCount}`)
  console.log(`    技能总数: ${movesCount}`)
  console.log(`    等级学习技能总数: ${levelMovesCount}`)
  console.log(`    学习机技能总数: ${tmMovesCount}`)
  console.log(`    个人宝可梦总数: ${personalCount}`)
  
  console.log('\n=== 测试完成 ===')
  
  database.close()
}

testPokemonData().catch(console.error)