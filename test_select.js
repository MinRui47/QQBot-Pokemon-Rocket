const { GameManager } = require('./src/game/GameManager')

async function testGame() {
  console.log('=== 测试选择初始精灵 ===')
  
  const gm = new GameManager()
  const player = gm.getOrCreatePlayer('test_player', '测试玩家')
  console.log(`创建玩家: ${player.username}`)
  
  const startResult = gm.startGame(player, '低级地图')
  console.log(`开始游戏: ${startResult.message}`)
  
  if (startResult.success) {
    console.log('\n选择初始精灵 - 阿柏蛇')
    const selectResult = gm.selectInitialPokemon(player, '阿柏蛇')
    console.log(`选择结果: ${selectResult.message}`)
    
    if (selectResult.success) {
      const game = player.currentGame
      const pokemon = game.belt.pokemon[0]
      console.log(`\n精灵详情:`)
      console.log(`  名称: ${pokemon.name} Lv.${pokemon.level}`)
      console.log(`  稀有度: ${pokemon.rarity}`)
      console.log(`  IV评价: ${pokemon.getIVPercentage()}%`)
      console.log(`  亲密度: ${pokemon.friendship}`)
      console.log(`  能力值: HP${pokemon.maxHp} 攻击${pokemon.getAttack()} 防御${pokemon.getDefense()} 特攻${pokemon.getSpecialAttack()} 特防${pokemon.getSpecialDefense()} 速度${pokemon.getSpeed()}`)
      console.log(`  技能: ${pokemon.moves.join('、')}`)
      console.log(`\n游戏状态: ${game.status}`)
    }
  }
}

testGame().catch(err => {
  console.error('测试失败:', err)
  process.exit(1)
})