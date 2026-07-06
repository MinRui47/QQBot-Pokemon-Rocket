const { GameManager } = require('./src/game/GameManager')

async function runTest() {
  console.log('========================================')
  console.log('   宝可梦火箭队·搜打撤文字游戏')
  console.log('         自动化测试')
  console.log('========================================\n')

  const gameManager = new GameManager()
  let player = gameManager.getOrCreatePlayer('test_auto_001', '测试玩家')

  console.log('--- 测试1: 查看初始状态 ---')
  let status = gameManager.getPlayerStatus(player)
  console.log(`金币: ${status.money}, 勋章: ${status.medals}, 仓库: ${status.warehouseSlots}`)

  console.log('\n--- 测试2: 开始外勤 ---')
  let result = gameManager.startGame(player, '低级地图')
  console.log(result.message)

  console.log('\n--- 测试3: 选择初始精灵 ---')
  result = gameManager.selectInitialPokemon(player, '阿柏蛇')
  console.log(result.message)

  console.log('\n--- 测试4: 查看腰带 ---')
  let belt = gameManager.getPlayerBelt(player)
  console.log(`腰带容量: ${belt.usedSlots}/${belt.maxSlots}`)
  for (const p of belt.pokemon) {
    console.log(`  ${p.name} Lv.${p.level} ${p.isInitial ? '(初始)' : ''}`)
  }

  console.log('\n--- 测试5: 移动探索 ---')
  for (let i = 0; i < 5; i++) {
    result = gameManager.move(player)
    console.log(result.message)
    if (result.encounter) {
      console.log(`  遭遇: ${result.encounter.type === 'wild' ? `野生${result.encounter.pokemon.name} Lv.${result.encounter.pokemon.level}` : result.encounter.trainer.name}`)
      break
    }
  }

  console.log('\n--- 测试6: 搜刮物资 ---')
  result = gameManager.search(player)
  console.log(result.message)

  console.log('\n--- 测试7: 查看背包 ---')
  let backpack = gameManager.getPlayerBackpack(player)
  console.log(`背包容量: ${backpack.usedSlots}/${backpack.maxSlots}`)
  for (const item of backpack.items) {
    console.log(`  ${item.name} x${item.quantity}`)
  }

  console.log('\n--- 测试8: 遭遇战斗 ---')
  result = gameManager.move(player)
  console.log(result.message)
  if (result.encounter) {
    result = await gameManager.battle(player)
    console.log(result.message)
  }

  console.log('\n--- 测试9: 查看任务 ---')
  status = gameManager.getPlayerStatus(player)
  console.log('当前任务:')
  for (const task of status.tasks) {
    console.log(`  ${task.name}: ${task.description} (进度: ${task.progress})`)
  }

  console.log('\n--- 测试10: 撤离 ---')
  result = gameManager.evacuate(player)
  console.log(result.message)

  console.log('\n--- 测试11: 查看仓库 ---')
  let warehouse = gameManager.getPlayerWarehouse(player)
  console.log(`仓库容量: ${warehouse.usedSlots}/${warehouse.maxSlots}`)
  console.log('物品:')
  for (const item of warehouse.items) {
    console.log(`  ${item.name} x${item.quantity}`)
  }
  console.log('宝可梦:')
  for (const p of warehouse.pokemon) {
    console.log(`  ${p.name} Lv.${p.level}`)
  }

  console.log('\n--- 测试12: 交易系统 ---')
  if (warehouse.items.length > 0) {
    const item = warehouse.items[0]
    result = gameManager.sellDirect(player, item.name, 1)
    console.log(result.message)
  }

  console.log('\n--- 测试13: 查看公金 ---')
  const funds = gameManager.getTeamRocketFunds()
  console.log(`火箭队公共资金: ${funds} 金币`)

  console.log('\n--- 测试14: 勋章听话机制 ---')
  const medals = gameManager.getMedalInfo(player)
  const obedience = gameManager.getObedienceInfo(player)
  console.log(`听话等级: ${obedience.obedienceLevel}级`)
  console.log(`描述: ${obedience.description}`)

  console.log('\n--- 测试15: 可用地图 ---')
  const maps = gameManager.getAvailableMaps(player)
  console.log('可用地图:', maps.join(', '))

  console.log('\n========================================')
  console.log('         测试完成！')
  console.log('========================================')

  gameManager.saveData()
  console.log('游戏数据已保存')
}

runTest().catch(error => {
  console.error('测试出错:', error)
  process.exit(1)
})