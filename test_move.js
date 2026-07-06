const { GameManager } = require('./src/game/GameManager')

async function testMove() {
  console.log('=== 测试移动功能 ===')
  
  const gm = new GameManager()
  const player = gm.getOrCreatePlayer('test_player', '测试玩家')
  
  const startResult = gm.startGame(player, '低级地图')
  console.log(`开始游戏: ${startResult.message}`)
  
  const selectResult = gm.selectInitialPokemon(player, '阿柏蛇')
  console.log(`选择精灵: ${selectResult.message}`)
  
  console.log('\n测试向北移动')
  const moveResult = gm.move(player, '北')
  console.log(`移动结果: ${moveResult.message}`)
  
  if (moveResult.success) {
    console.log(`当前位置: ${moveResult.location}`)
    console.log(`剩余步数: ${moveResult.maxSteps - moveResult.stepsTaken}/${moveResult.maxSteps}`)
    
    if (moveResult.encounter) {
      console.log(`遭遇: ${moveResult.encounter.type}`)
      if (moveResult.encounter.pokemon) {
        console.log(`  精灵: ${moveResult.encounter.pokemon.name} Lv.${moveResult.encounter.pokemon.level}`)
      }
      if (moveResult.encounter.trainer) {
        console.log(`  训练师: ${moveResult.encounter.trainer.name}`)
      }
    }
  }
  
  console.log('\n测试查看当前位置')
  const lookResult = gm.getLocationFeatures(player)
  console.log(lookResult.message)
}

testMove().catch(err => {
  console.error('测试失败:', err)
  process.exit(1)
})