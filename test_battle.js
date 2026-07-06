const { Pokemon } = require('./src/game/models')

async function testBattleSystem() {
  console.log('=== 测试宝可梦战斗系统 ===')
  
  const pokemon1 = new Pokemon('阿柏蛇', { level: 10 })
  console.log(`\n创建宝可梦: ${pokemon1.name}`)
  console.log(`等级: ${pokemon1.level}`)
  console.log(`HP: ${pokemon1.hp}/${pokemon1.maxHp}`)
  console.log(`攻击: ${pokemon1.getAttack()}`)
  console.log(`防御: ${pokemon1.getDefense()}`)
  console.log(`速度: ${pokemon1.getSpeed()}`)
  console.log(`招式: ${pokemon1.moves.join(', ')}`)
  console.log(`个体值: ${JSON.stringify(pokemon1.ivs)}`)
  console.log(`努力值: ${JSON.stringify(pokemon1.evs)}`)
  console.log(`亲密度: ${pokemon1.friendship}`)
  
  const pokemon2 = new Pokemon('波波', { level: 10 })
  console.log(`\n创建宝可梦: ${pokemon2.name}`)
  console.log(`等级: ${pokemon2.level}`)
  console.log(`HP: ${pokemon2.hp}/${pokemon2.maxHp}`)
  console.log(`招式: ${pokemon2.moves.join(', ')}`)
  
  const { BattleSystem } = require('./src/game/battle')
  
  const mockPlayer = {
    currentGame: {
      belt: {
        getActivePokemon: () => pokemon1
      }
    }
  }
  
  const battle = new BattleSystem(mockPlayer)
  console.log('\n=== 开始战斗 ===')
  
  const result = await battle.startWildBattle({ name: '波波', level: 10 })
  console.log('\n战斗消息:', result.message)
  
  if (result.won) {
    console.log(`\n${pokemon1.name} 获胜！`)
    console.log(`获得奖励: ${JSON.stringify(result.rewards)}`)
    console.log(`战斗后HP: ${pokemon1.hp}/${pokemon1.maxHp}`)
  } else {
    console.log('\n战斗失败')
    console.log(`战斗后HP: ${pokemon1.hp}/${pokemon1.maxHp}`)
  }
  
  console.log('\n=== 测试升级系统 ===')
  const expResult = pokemon1.addExperience(1000)
  console.log(`添加经验结果: ${JSON.stringify(expResult)}`)
  console.log(`当前等级: ${pokemon1.level}, 经验: ${pokemon1.experience}/${pokemon1.experienceToNext}`)
  console.log(`升级后HP: ${pokemon1.hp}/${pokemon1.maxHp}`)
  
  if (expResult.leveledUp && expResult.learnableMoves && expResult.learnableMoves.length > 0) {
    const moveNames = expResult.learnableMoves.map(m => m.name).join(', ')
    console.log(`学会新招式: ${moveNames}`)
  }
}

testBattleSystem().catch(err => {
  console.error('测试失败:', err)
  process.exit(1)
})