/**
 * 设置测试训练家数据
 */

const { database, playerDAL, gameStateDAL } = require('./dal')

async function setupTestTrainer() {
  console.log('=== 设置测试训练家 ===\n')
  
  // 初始化数据库
  await database.init()
  
  // 获取玩家数据
  const userId = 'FC5A7A5E0397102410A77E359E3E90EF' // 群主的user_openid
  
  // 获取游戏状态
  let gameState = gameStateDAL.getGameState(userId)
  
  if (!gameState) {
    console.log('没有找到游戏状态，需要先开始外勤')
    database.close()
    return
  }
  
  console.log('找到游戏状态:', gameState.userId)
  
  // 设置测试训练家数据
  const defeatedTrainer = {
    name: '测试训练家小明',
    belt: [
      { name: '皮卡丘', level: 5, hp: 15, maxHp: 15 },
      { name: '小拉达', level: 3, hp: 10, maxHp: 10 }
    ],
    backpack: [
      { name: '伤药', quantity: 2 },
      { name: '普通精灵球', quantity: 3 },
      { name: '解毒药', quantity: 1 }
    ],
    backpackType: '探险背包',
    hasBeenSearched: false
  }
  
  // 更新 currentGame 数据（getGameState 已经 JSON.parse 了）
  let currentGame = gameState.currentGame || {}
  currentGame.defeatedTrainer = defeatedTrainer
  
  // 保存到数据库（saveGameState 会 JSON.stringify）
  gameStateDAL.saveGameState(userId, gameState.gameData, currentGame)
  
  console.log('\n训练家数据已设置:')
  console.log(`  名称: ${defeatedTrainer.name}`)
  console.log(`  腰带精灵: ${defeatedTrainer.belt.map(p => `${p.name} Lv.${p.level}`).join(', ')}`)
  console.log(`  背包物品: ${defeatedTrainer.backpack.map(i => `${i.name} x${i.quantity}`).join(', ')}`)
  console.log(`  背包类型: ${defeatedTrainer.backpackType}`)
  
  console.log('\n现在可以在群里测试:')
  console.log('  - 输入"抢夺"查看训练家装备')
  console.log('  - 输入"抢夺精灵 1"获取皮卡丘')
  console.log('  - 输入"抢夺物品 伤药"获取伤药')
  console.log('  - 输入"抢夺背包"更换背包')
  
  database.close()
}

setupTestTrainer().catch(console.error)