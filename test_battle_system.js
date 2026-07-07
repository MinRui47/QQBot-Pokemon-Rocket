const { Pokemon, ITEM_CONFIG, RARITY_COLORS } = require('./src/game/models')
const { BattleSystem, initBattleConfig } = require('./src/game/battle')
const { GameMap, MAP_CONFIG } = require('./src/game/map')
const { database } = require('./src/game/database/dal')

console.log('====================================')
console.log('     宝可梦战斗系统测试')
console.log('====================================\n')

async function runTests() {
  await database.init()
  await initBattleConfig()
  console.log('[测试] 数据库和配置初始化完成\n')

  console.log('【测试1】创建初始精灵阿柏蛇 Lv.5')
  const snake = new Pokemon('阿柏蛇', 5, { isInitial: true })
  console.log(snake.toDetailedString())
  console.log('')

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

  console.log('【测试3】经验值和等级提升')
  const testPokemon = new Pokemon('小拉达', 5, { isInitial: true })
  console.log(`初始: ${testPokemon.name} Lv.${testPokemon.level} 经验: ${testPokemon.experience}`)
  const result1 = testPokemon.addExperience(200)
  console.log(`获得200经验后: Lv.${testPokemon.level}, 升级了${result1.levelsGained}级`)
  const result2 = testPokemon.addExperience(1000)
  console.log(`获得1000经验后: Lv.${testPokemon.level}, 升级了${result2.levelsGained}级`)
  console.log(`学会新技能:`, result2.learnableMoves?.map(m => m.name).join(', ') || '无')
  console.log('')

  console.log('【测试4】地图等级限制（低级地图等级上限10）')
  const restricted = new Pokemon('波波', 9, { isInitial: true })
  const blocked = restricted.addExperience(5000, { maxLevel: 10 })
  console.log(`宝可梦Lv.${restricted.level}, 限制到10级, 尝试获得5000经验`)
  console.log(`结果:`, blocked.blocked ? '已阻止' : '已给予', 'leveledUp:', blocked.leveledUp, 'levelsGained:', blocked.levelsGained)
  if (blocked.reason) console.log(`原因: ${blocked.reason}`)

  const blocked2 = restricted.addExperience(5000, { maxLevel: 10 })
  console.log(`再次尝试: blocked=${blocked2.blocked}, 当前等级=${restricted.level}`)
  console.log('')

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

  console.log('【测试6】进化系统')
  const evolveTest = new Pokemon('绿毛虫', 7, { isInitial: true })
  console.log(`初始: ${evolveTest.name} Lv.${evolveTest.level}`)
  console.log(`可以进化: ${evolveTest.canEvolve()}`)
  const evoResult = evolveTest.evolve()
  console.log(`进化结果: ${evoResult.success ? `${evoResult.from} -> ${evoResult.to}` : '失败'}`)
  console.log('')

  console.log('【测试7】实际战斗测试')
  const player = {
    currentGame: {
      map: new GameMap('低级地图'),
      belt: { 
        pokemon: [snake], 
        getActivePokemon: function() { return this.pokemon[0] }, 
        hasHealthyPokemon: function() { return this.pokemon.some(p => !p.isFainted()) },
        hasAlivePokemon: function() { return this.pokemon.some(p => !p.isFainted()) }
      },
      backpack: {
        items: [],
        findItem: function(name) { return this.items.find(i => i.name === name) },
        removeItem: function(name, qty) {
          const idx = this.items.findIndex(i => i.name === name)
          if (idx !== -1) {
            this.items[idx].quantity -= qty
            if (this.items[idx].quantity <= 0) this.items.splice(idx, 1)
          }
        }
      }
    },
    getObedienceLevel: function() { return 100 }
  }
  
  const battleSystem = new BattleSystem(player)
  
  console.log('玩家:', snake.name, 'Lv.', snake.level, 'HP:', snake.hp + '/' + snake.maxHp)
  const battleResult = await battleSystem.startWildBattle({ name: '波波', level: 5 })
  
  console.log('\n战斗结果:')
  console.log(battleResult.message)
  if (battleResult.turnLog && battleResult.turnLog.length > 0) {
    console.log('\n战斗日志 (前30条):')
    battleResult.turnLog.slice(0, 30).forEach(log => console.log(' ', log))
    if (battleResult.turnLog.length > 30) console.log(`  ... 还有${battleResult.turnLog.length - 30}条日志`)
  }

  console.log('\n【测试8】获取战斗选项')
  const options = battleSystem.getBattleOptions()
  console.log('战斗选项:', options ? JSON.stringify(options, null, 2) : '无进行中的战斗')

  console.log('\n====================================')
  console.log('     测试完成！')
  console.log('====================================')
}

runTests().catch(err => {
  console.error('测试出错:', err)
  process.exit(1)
})