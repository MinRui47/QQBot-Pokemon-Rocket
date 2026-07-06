const { GameManager } = require('./src/game/GameManager')

async function testSearchOnce() {
  console.log('=== 测试搜索地点只能搜索一次 ===')
  
  const gm = new GameManager()
  const player = gm.getOrCreatePlayer('test_player', '测试玩家')
  
  // 开始游戏
  gm.startGame(player, '低级地图')
  gm.selectInitialPokemon(player, '阿柏蛇')
  
  // 移动到有搜索点的位置
  gm.move(player, '北')
  
  // 第一次搜索
  console.log('\n1. 第一次搜索 长椅')
  const search1 = gm.searchFeature(player, '长椅')
  console.log(search1.message)
  
  // 第二次搜索（应该失败）
  console.log('\n2. 第二次搜索 长椅（应该提示已搜索）')
  const search2 = gm.searchFeature(player, '长椅')
  console.log(search2.message)
  
  // 搜索另一个地点
  console.log('\n3. 搜索路边草丛')
  const search3 = gm.searchFeature(player, '路边草丛')
  console.log(search3.message)
  
  // 第二次搜索草丛（应该失败）
  console.log('\n4. 第二次搜索路边草丛（应该提示已搜索）')
  const search4 = gm.searchFeature(player, '路边草丛')
  console.log(search4.message)
  
  // 查看当前位置信息（应该显示已搜索标记）
  console.log('\n5. 查看当前位置（已搜索地点应该有标记）')
  const features = gm.getLocationFeatures(player)
  console.log('可用探索地点:')
  features.features.forEach(f => {
    const exploredMark = f.isExplored ? '[已搜索]' : ''
    console.log(`  [${f.type}] ${f.name}: ${f.description} ${exploredMark}`)
  })
}

testSearchOnce().catch(err => {
  console.error('测试失败:', err)
  process.exit(1)
})