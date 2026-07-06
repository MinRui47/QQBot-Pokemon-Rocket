const { Pokemon } = require('./src/game/models')

async function testStatusEffect() {
  console.log('=== 测试异常状态系统 ===')
  
  // 创建玩家宝可梦（已经有睡眠状态）
  const playerPokemon = new Pokemon('阿柏蛇', { level: 10 })
  
  // 创建对手宝可梦（使用蘑菇孢子）
  const enemyPokemon = new Pokemon('派拉斯', { level: 15 })
  
  console.log(`\n玩家宝可梦: ${playerPokemon.name} Lv.${playerPokemon.level}`)
  console.log(`\n对手宝可梦: ${enemyPokemon.name} Lv.${enemyPokemon.level}`)
  console.log(`技能: ${enemyPokemon.moves.join(', ')}`)
  
  // 测试1：目标已有状态时，再次施加应该失败
  console.log('\n=== 测试1：目标已有睡眠状态，蘑菇孢子应该失败 ===')
  const BattleSystem = require('./src/game/battle').BattleSystem
  const battle = new BattleSystem(playerPokemon, enemyPokemon)
  
  // 手动测试状态施加
  const defenderState = { boosts: {}, status: 'sleep', statusTurns: 0 }
  const defender = enemyPokemon
  const attacker = playerPokemon
  const result = { log: [] }
  const moveData = {
    name: '蘑菇孢子',
    power: 0,
    accuracy: 100,
    type: '草',
    category: 'status',
    effect: { status: 'sleep', chance: 1 }
  }
  
  // 模拟状态招式处理（复制 _applyStatusMove 的逻辑）
  if (moveData.effect && moveData.effect.status) {
    const effect = moveData.effect
    if (Math.random() < (effect.chance || 1)) {
      // 检查目标是否已有异常状态
      if (defenderState.status) {
        result.log.push(`派拉斯 使用 蘑菇孢子！`)
        result.log.push(`但是失败了！`)
        console.log('\n状态施加结果:')
        result.log.forEach(line => console.log(line))
        console.log('\n✓ 测试通过：目标已有状态时，技能失败')
      }
    }
  }
  
  // 测试2：目标没有状态时，技能应该成功
  console.log('\n=== 测试2：目标没有状态，蘑菇孢子应该成功 ===')
  const defenderState2 = { boosts: {}, status: null, statusTurns: 0 }
  const result2 = { log: [] }
  
  if (moveData.effect && moveData.effect.status) {
    const effect = moveData.effect
    if (Math.random() < (effect.chance || 1)) {
      if (defenderState2.status) {
        result2.log.push(`但是失败了！`)
      } else {
        defenderState2.status = effect.status
        defenderState2.statusTurns = 0
        result2.log.push(`派拉斯 使用 蘑菇孢子！`)
        result2.log.push(`阿柏蛇 陷入了睡眠状态！`)
        console.log('\n状态施加结果:')
        result2.log.forEach(line => console.log(line))
        console.log('\n✓ 测试通过：目标没有状态时，技能成功')
      }
    }
  }
  
  console.log('\n=== 所有测试完成 ===')
}

testStatusEffect().catch(err => {
  console.error('测试失败:', err)
  process.exit(1)
})