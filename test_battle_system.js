// 测试战斗系统
const { Pokemon, MOVE_DATABASE, EVOLUTION_DATA, MEGA_STONES, ITEM_CONFIG } = require('./src/game/models')
const { BattleSystem } = require('./src/game/battle')
const { GameMap, MAP_CONFIG } = require('./src/game/map')

console.log('====================================')
console.log('     宝可梦战斗系统测试')
console.log('====================================\n')

// 1. 测试创建宝可梦
console.log('【测试1】创建初始精灵阿柏蛇 Lv.5')
const snake = new Pokemon('阿柏蛇', 5, { isInitial: true })
console.log(snake.toDetailedString())
console.log('')

// 2. 测试技能PP
console.log('【测试2】技能PP系统')
console.log('技能: ', snake.moves)
console.log('撞击 PP: ', snake.getMovePP('撞击'), '/', snake.getMoveMaxPP('撞击'))
for (let i = 0; i < 5; i++) {
  snake.useMovePP('撞击')
}
console.log('使用5次后: 撞击 PP:', snake.getMovePP('撞击'))
snake.restoreAllPP()
console.log('恢复后: 撞击 PP:', snake.getMovePP('撞击'))
console.log('')

// 3. 测试经验值和等级提升
console.log('【测试3】经验值和等级提升')
const testPokemon = new Pokemon('小拉达', 5, { isInitial: true })
console.log(`初始: ${testPokemon.name} Lv.${testPokemon.level} 经验: ${testPokemon.experience}`)
const result1 = testPokemon.addExperience(200)
console.log(`获得200经验后: Lv.${testPokemon.level}, 升级了${result1.levelsGained}级`)
const result2 = testPokemon.addExperience(1000)
console.log(`获得1000经验后: Lv.${testPokemon.level}, 升级了${result2.levelsGained}级`)
console.log(`学会新技能:`, result2.learnableMoves?.map(m => m.name).join(', ') || '无')
console.log('')

// 4. 测试地图等级限制
console.log('【测试4】地图等级限制（低级地图等级上限10）')
const restricted = new Pokemon('波波', 9, { isInitial: true })
const blocked = restricted.addExperience(5000, { maxLevel: 10 })
console.log(`宝可梦Lv.${restricted.level}, 限制到10级, 尝试获得5000经验`)
console.log(`结果:`, blocked.blocked ? '已阻止' : '已给予', 'leveledUp:', blocked.leveledUp, 'levelsGained:', blocked.levelsGained)
if (blocked.reason) console.log(`原因: ${blocked.reason}`)

const blocked2 = restricted.addExperience(5000, { maxLevel: 10 })
console.log(`再次尝试: blocked=${blocked2.blocked}, 当前等级=${restricted.level}`)
console.log('')

// 5. 测试神奇糖果限制
console.log('【测试5】神奇糖果限制')
const candyTest = new Pokemon('绿毛虫', 8, { isInitial: true })
console.log(`初始: ${candyTest.name} Lv.${candyTest.level}`)
const candyResult = candyTest.useRareCandy(15, 10)
console.log(candyResult.message)
console.log(`当前等级: ${candyTest.level}`)
console.log('')

const candyTest2 = new Pokemon('独角虫', 10, { isInitial: true })
const candyResult2 = candyTest2.useRareCandy(20, 10)
console.log(candyResult2.message)
console.log('')

// 6. 测试进化
console.log('【测试6】进化系统')
const evolveTest = new Pokemon('绿毛虫', 7, { isInitial: true })
console.log(`初始: ${evolveTest.name} Lv.${evolveTest.level}`)
console.log(`可以进化: ${evolveTest.canEvolve()}`)
const evoResult = evolveTest.evolve()
console.log(`进化结果: ${evoResult.success ? `${evoResult.from} -> ${evoResult.to}` : '失败'}`)
console.log('')

// 7. 测试超级进化
console.log('【测试7】超级进化系统')
const charizard = new Pokemon('喷火龙', 60, { isInitial: true })
console.log(`初始: ${charizard.name} Lv.${charizard.level}`)
console.log(`可以超级进化: ${charizard.canMegaEvolve('喷火石X')}`)
const megaResult = charizard.megaEvolve('喷火石X')
console.log(`超级进化: ${megaResult ? '成功' : '失败'}`)
console.log(`超级进化后: ${charizard.name} 类型: ${charizard.types.join('/')}`)
console.log(`速度: ${charizard.stats.速度}`)
console.log('')

// 8. 测试战斗
console.log('【测试8】实际战斗测试')
async function testBattle() {
  // 创建一个简单的玩家对象
  const player = {
    currentGame: {
      map: new GameMap('低级地图'),
      belt: { pokemon: [snake], getActivePokemon: function() { return this.pokemon[0] }, hasHealthyPokemon: function() { return this.pokemon.some(p => !p.isFainted()) } }
    },
    getObedienceLevel: function() { return 100 }
  }
  
  const battleSystem = new BattleSystem(player)
  
  console.log('玩家:', snake.name, 'Lv.', snake.level, 'HP:', snake.hp + '/' + snake.maxHp)
  const result = await battleSystem.startWildBattle({ name: '波波', level: 5 })
  
  console.log('\n战斗结果:')
  console.log(result.message)
  if (result.turnLog && result.turnLog.length > 0) {
    console.log('\n战斗日志 (前20条):')
    result.turnLog.slice(0, 20).forEach(log => console.log(' ', log))
    if (result.turnLog.length > 20) console.log(`  ... 还有${result.turnLog.length - 20}条日志`)
  }
}

testBattle().then(() => {
  console.log('\n====================================')
  console.log('     测试完成！')
  console.log('====================================')
}).catch(err => {
  console.error('测试出错:', err)
})
