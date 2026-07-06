const { GameManager } = require('./src/game/GameManager')

async function testFullGame() {
  console.log('=== 完整游戏流程测试 ===')
  
  const gm = new GameManager()
  const player = gm.getOrCreatePlayer('test_player', '测试玩家')
  
  // 开始游戏
  const startResult = gm.startGame(player, '低级地图')
  console.log(`\n1. 开始游戏: ${startResult.message}`)
  
  // 选择初始精灵
  const selectResult = gm.selectInitialPokemon(player, '阿柏蛇')
  console.log(`\n2. 选择精灵: ${selectResult.message}`)
  
  // 移动
  const moveResult = gm.move(player, '北')
  console.log(`\n3. 向北移动: ${moveResult.message}`)
  console.log(`   当前位置: ${moveResult.location}`)
  console.log(`   剩余步数: ${moveResult.maxSteps - moveResult.stepsTaken}/${moveResult.maxSteps}`)
  
  if (moveResult.encounter) {
    console.log(`   遭遇: ${moveResult.encounter.type}`)
    if (moveResult.encounter.pokemon) {
      console.log(`   精灵: ${moveResult.encounter.pokemon.name} Lv.${moveResult.encounter.pokemon.level}`)
    }
  }
  
  // 查看玩家状态
  const statusResult = gm.getPlayerStatus(player)
  console.log(`\n4. 玩家状态:`)
  console.log(`   状态: ${statusResult.status}`)
  console.log(`   金钱: ${statusResult.money}`)
  console.log(`   徽章: ${statusResult.medals}`)
  console.log(`   背包: ${statusResult.backpackSlots}`)
  console.log(`   精灵带: ${statusResult.beltSlots}`)
  
  // 查看精灵
  const beltResult = gm.getPlayerBelt(player)
  console.log(`\n5. 精灵详情:`)
  beltResult.pokemon.forEach((p, i) => {
    const hp = p.currentHp || p.hp || p.maxHp
    const maxHp = p.maxHp || p.hp
    console.log(`   ${i + 1}. ${p.name} Lv.${p.level} HP:${hp}/${maxHp}`)
  })
}

testFullGame().catch(err => {
  console.error('测试失败:', err)
  process.exit(1)
})