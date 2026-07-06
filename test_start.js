const { GameManager } = require('./src/game/GameManager')

async function testGame() {
  console.log('=== 测试游戏启动 ===')
  
  const gm = new GameManager()
  const player = gm.getOrCreatePlayer('test_player', '测试玩家')
  console.log(`创建玩家: ${player.username}`)
  
  const startResult = gm.startGame(player, '低级地图')
  console.log(`开始游戏结果: ${startResult.message}`)
  
  if (startResult.success) {
    console.log('游戏启动成功！')
    
    const game = player.currentGame
    console.log(`当前地图: ${game.map.currentLocation}`)
    console.log(`最大步数: ${game.maxSteps}`)
    console.log(`当前状态: ${game.status}`)
    console.log(`背包容量: ${game.backpack.capacity}`)
    console.log(`精灵带槽位: ${game.belt.maxSlots}`)
  }
}

testGame().catch(err => {
  console.error('测试失败:', err)
  process.exit(1)
})