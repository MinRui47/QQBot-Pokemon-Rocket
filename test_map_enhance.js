const { GameManager } = require('./src/game/GameManager')

async function test() {
  const gm = new GameManager()
  const player = gm.getOrCreatePlayer('test789', 'TestPlayer3')
  
  console.log('=== 开始测试 ===')
  
  const startResult = gm.startGame(player, '低级地图')
  console.log('开始游戏:', startResult.message)
  
  const selectResult = gm.selectInitialPokemon(player, '阿柏蛇')
  console.log('选择初始精灵:', selectResult.message)
  
  let moveResult = gm.move(player, '北')
  console.log('移动到:', moveResult.location)
  console.log('移动结果:', moveResult.message)
  
  moveResult = gm.move(player, '东')
  console.log('移动到:', moveResult.location)
  console.log('移动结果:', moveResult.message)
  
  const features = gm.getLocationFeatures(player)
  console.log('\n=== 当前地点信息 ===')
  console.log('地点:', features.location)
  console.log('描述:', features.locationInfo.description)
  console.log('类型:', features.locationInfo.type)
  console.log('难度:', features.locationInfo.difficulty)
  console.log('等级范围:', features.locationInfo.levelRange.min + '-' + features.locationInfo.levelRange.max)
  console.log('宝可梦类型:', features.locationInfo.pokemonTypes.join(', '))
  
  console.log('\n=== 可用探索地点 ===')
  features.features.forEach(f => {
    console.log('- ' + f.name + ' (' + f.type + '): ' + f.description)
  })
  
  console.log('\n=== 测试搜索大树洞 ===')
  const searchResult = gm.searchFeature(player, '大树洞')
  console.log('搜索结果:', searchResult.message)
  if (searchResult.encounter) {
    console.log('遭遇:', searchResult.encounter.type, searchResult.encounter.pokemon?.name)
  }
  
  console.log('\n=== 测试进入废弃小屋 ===')
  const enterResult = gm.enterFeature(player, '废弃小屋')
  console.log('进入结果:', enterResult.message)
  if (enterResult.encounter) {
    console.log('遭遇:', enterResult.encounter.type, enterResult.encounter.trainer?.name)
  }
  
  console.log('\n=== 测试上2楼 ===')
  const floorResult = gm.goToFloor(player, 2)
  console.log('上楼结果:', floorResult.message)
  if (floorResult.encounter) {
    console.log('遭遇:', floorResult.encounter.type, floorResult.encounter.trainer?.name)
  }
  
  console.log('\n=== 测试离开建筑 ===')
  const leaveResult = gm.leaveBuilding(player)
  console.log('离开结果:', leaveResult.message)
  
  console.log('\n=== 测试战斗后搜刮 ===')
  const encounter = gm.move(player, '北')
  if (encounter.encounter) {
    console.log('遭遇:', encounter.encounter.type)
    if (encounter.encounter.type === 'trainer') {
      const battleResult = await gm.battle(player)
      console.log('战斗结果:', battleResult.message)
      if (battleResult.won && battleResult.rewards) {
        console.log('战利品:', JSON.stringify(battleResult.rewards))
      }
    }
  }
  
  console.log('\n=== 测试完成 ===')
}

test().catch(console.error)