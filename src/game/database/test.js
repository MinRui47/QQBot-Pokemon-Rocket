/**
 * 测试SQLite数据库读写功能
 */

const { database, playerDAL, gameStateDAL } = require('./dal')

async function testDatabase() {
  console.log('=== 开始测试SQLite数据库 ===\n')
  
  // 初始化数据库
  await database.init()
  console.log('[1] 数据库初始化完成\n')
  
  // 测试1：读取所有玩家
  console.log('[2] 测试读取所有玩家...')
  const players = playerDAL.getAllPlayers()
  console.log(`    找到 ${players.length} 个玩家`)
  if (players.length > 0) {
    console.log(`    第一个玩家: ${players[0].user_id}`)
    console.log(`    昵称: ${players[0].nickname}`)
    console.log(`    已注册: ${players[0].registered}`)
    console.log(`    金币: ${players[0].coins}`)
  }
  console.log('')
  
  // 测试2：创建新玩家
  console.log('[3] 测试创建新玩家...')
  const testUserId = 'TEST_PLAYER_' + Date.now()
  const testUsername = '测试玩家'
  const testPlayer = playerDAL.createPlayer(testUserId, testUsername)
  console.log(`    创建成功: ${testPlayer.userId}`)
  console.log('')
  
  // 测试3：更新玩家数据
  console.log('[4] 测试更新玩家数据...')
  testPlayer.nickname = '测试昵称'
  testPlayer.coins = 1000
  testPlayer.registered = true
  playerDAL.updatePlayer(testPlayer)
  
  // 重新读取验证
  const updatedPlayer = playerDAL.getPlayer(testUserId)
  console.log(`    更新后昵称: ${updatedPlayer.nickname}`)
  console.log(`    更新后金币: ${updatedPlayer.coins}`)
  console.log(`    更新后注册状态: ${updatedPlayer.registered}`)
  console.log('')
  
  // 测试4：保存游戏状态
  console.log('[5] 测试保存游戏状态...')
  const testGameState = {
    mapTier: '低级地图',
    status: 'playing',
    stepsTaken: 5,
    maxSteps: 20
  }
  gameStateDAL.saveGameState(testUserId, null, testGameState)
  
  // 重新读取验证
  const savedState = gameStateDAL.getGameState(testUserId)
  console.log(`    保存成功: ${savedState ? 'YES' : 'NO'}`)
  if (savedState) {
    console.log(`    游戏状态: ${savedState.currentGame.status}`)
    console.log(`    当前步数: ${savedState.currentGame.stepsTaken}`)
  }
  console.log('')
  
  // 测试5：删除测试数据
  console.log('[6] 清理测试数据...')
  playerDAL.deletePlayer(testUserId)
  gameStateDAL.deleteGameState(testUserId)
  
  // 验证删除
  const deletedPlayer = playerDAL.getPlayer(testUserId)
  console.log(`    删除成功: ${deletedPlayer ? 'NO' : 'YES'}`)
  console.log('')
  
  // 测试6：验证原有玩家数据
  console.log('[7] 验证原有玩家数据...')
  const originalPlayers = playerDAL.getAllPlayers()
  console.log(`    原有玩家数量: ${originalPlayers.length}`)
  for (const p of originalPlayers.slice(0, 3)) {
    console.log(`    - ${p.user_id}: 昵称="${p.nickname}", 金币=${p.coins}`)
  }
  console.log('')
  
  console.log('=== 测试完成 ===')
  
  // 关闭数据库
  database.close()
  console.log('\n数据库已关闭')
}

testDatabase().catch(console.error)