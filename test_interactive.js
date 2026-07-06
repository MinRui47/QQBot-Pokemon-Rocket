const readline = require('readline')
const { GameManager } = require('./src/game/GameManager')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
})

const gm = new GameManager()
let player = null

console.log('====================================')
console.log('     宝可梦搜打撤 - 交互式测试')
console.log('====================================')
console.log('')
console.log('可用命令:')
console.log('  start        - 开始新游戏')
console.log('  select <名>  - 选择初始精灵')
console.log('  move <方向>  - 移动(N/E/S/W/北/东/南/西)')
console.log('  look         - 查看当前地点信息')
console.log('  search <名>  - 搜索指定地点')
console.log('  enter <名>   - 进入指定建筑')
console.log('  leave        - 离开当前建筑')
console.log('  floor <num>  - 前往指定楼层')
console.log('  battle       - 进行战斗')
console.log('  status       - 查看玩家状态')
console.log('  pokemon      - 查看精灵详细信息')
console.log('  help         - 显示帮助')
console.log('  exit         - 退出测试')
console.log('')
console.log('示例:')
console.log('  start')
console.log('  select 阿柏蛇')
console.log('  move 北')
console.log('  look')
console.log('  search 大树洞')
console.log('  enter 废弃小屋')
console.log('  floor 2')
console.log('')

rl.prompt()

rl.on('line', async (input) => {
  const parts = input.trim().split(' ')
  const command = parts[0].toLowerCase()
  const arg = parts.slice(1).join(' ')

  try {
    switch (command) {
      case 'start':
        player = gm.getOrCreatePlayer('test_player', '测试玩家')
        const startResult = gm.startGame(player, '低级地图')
        console.log(startResult.message)
        break

      case 'select':
        if (!player) {
          console.log('请先使用 start 命令开始游戏')
          break
        }
        const selectResult = gm.selectInitialPokemon(player, arg)
        console.log(selectResult.message)
        if (selectResult.success && player.currentGame.belt.pokemon.length > 0) {
          const p = player.currentGame.belt.pokemon[0]
          console.log(`\n精灵详情:`)
          console.log(`  名称: ${p.name} Lv.${p.level}`)
          console.log(`  稀有度: ${p.rarity}`)
          console.log(`  IV评价: ${p.getIVPercentage()}%`)
          console.log(`  亲密度: ${p.affection}`)
          console.log(`  努力值: HP${p.evs.HP} 攻击${p.evs.攻击} 防御${p.evs.防御} 特攻${p.evs.特攻} 特防${p.evs.特防} 速度${p.evs.速度}`)
          console.log(`  能力值: HP${p.stats.HP} 攻击${p.stats.攻击} 防御${p.stats.防御} 特攻${p.stats.特攻} 特防${p.stats.特防} 速度${p.stats.速度}`)
          console.log(`  携带物: ${p.holdingItem || '无'}`)
          console.log(`  技能: ${p.moves.join('、')}`)
        }
        break

      case 'move':
        if (!player || !player.currentGame) {
          console.log('请先开始游戏')
          break
        }
        const moveResult = gm.move(player, arg)
        console.log(moveResult.message)
        if (moveResult.location) {
          console.log('当前位置:', moveResult.location)
        }
        if (moveResult.encounter) {
          console.log('遭遇:', moveResult.encounter.type, moveResult.encounter.pokemon?.name || moveResult.encounter.trainer?.name)
        }
        console.log(`剩余步数: ${moveResult.maxSteps - moveResult.stepsTaken}/${moveResult.maxSteps}`)
        break

      case 'look':
        if (!player || !player.currentGame) {
          console.log('请先开始游戏')
          break
        }
        const features = gm.getLocationFeatures(player)
        console.log('')
        console.log('=== 当前地点 ===')
        console.log('地点:', features.location)
        console.log('描述:', features.locationInfo.description)
        console.log('类型:', features.locationInfo.type)
        console.log('难度:', features.locationInfo.difficulty)
        console.log('等级范围:', features.locationInfo.levelRange.min + '-' + features.locationInfo.levelRange.max)
        console.log('宝可梦类型:', features.locationInfo.pokemonTypes.join(', '))
        console.log('')
        console.log('=== 可用探索地点 ===')
        features.features.forEach(f => {
          const exploredMark = f.isExplored ? '[已搜索]' : ''
          console.log('  [' + f.type + '] ' + f.name + ': ' + f.description + ' ' + exploredMark)
        })
        if (player.currentGame.map.currentBuilding) {
          console.log('')
          console.log('当前建筑:', player.currentGame.map.currentBuilding)
          console.log('当前楼层:', player.currentGame.map.currentFloor)
        }
        break

      case 'search':
        if (!player || !player.currentGame) {
          console.log('请先开始游戏')
          break
        }
        const searchResult = gm.searchFeature(player, arg)
        console.log(searchResult.message)
        if (searchResult.rewards && searchResult.rewards.length > 0) {
          searchResult.rewards.forEach(r => {
            console.log('获得:', r.name, 'x' + r.quantity)
          })
        }
        if (searchResult.encounter) {
          console.log('遭遇:', searchResult.encounter.type, searchResult.encounter.pokemon?.name)
        }
        break

      case 'enter':
        if (!player || !player.currentGame) {
          console.log('请先开始游戏')
          break
        }
        const enterResult = gm.enterFeature(player, arg)
        console.log(enterResult.message)
        if (enterResult.encounter) {
          console.log('遭遇:', enterResult.encounter.type, enterResult.encounter.trainer?.name)
        }
        break

      case 'leave':
        if (!player || !player.currentGame) {
          console.log('请先开始游戏')
          break
        }
        const leaveResult = gm.leaveBuilding(player)
        console.log(leaveResult.message)
        break

      case 'floor':
        if (!player || !player.currentGame) {
          console.log('请先开始游戏')
          break
        }
        const floorResult = gm.goToFloor(player, parseInt(arg))
        console.log(floorResult.message)
        if (floorResult.encounter) {
          console.log('遭遇:', floorResult.encounter.type, floorResult.encounter.trainer?.name)
        }
        break

      case 'battle':
        if (!player || !player.currentGame) {
          console.log('请先开始游戏')
          break
        }
        const battleResult = await gm.battle(player)
        console.log(battleResult.message)
        if (battleResult.turnLog && battleResult.turnLog.length > 0) {
          console.log('')
          console.log('=== 战斗日志 ===')
          battleResult.turnLog.forEach(log => {
            console.log(log)
          })
        }
        if (battleResult.won && battleResult.rewards) {
          console.log('')
          console.log('战利品:')
          battleResult.rewards.forEach(r => {
            if (r.type === 'item') {
              console.log('  - ' + r.name + ' x' + r.quantity)
            } else if (r.type === 'pokemon') {
              console.log('  - 获得精灵: ' + r.name + ' Lv.' + r.level)
            } else if (r.type === 'medal') {
              console.log('  - 获得勋章: ' + r.name)
            } else if (r.type === 'money') {
              console.log('  - 获得金币: ' + r.amount)
            }
          })
        }
        break

      case 'status':
        if (!player) {
          console.log('请先开始游戏')
          break
        }
        const status = gm.getPlayerStatus(player)
        console.log('')
        console.log('=== 玩家状态 ===')
        console.log('昵称:', player.username)
        console.log('金币:', player.money)
        console.log('勋章:', player.medals.length)
        console.log('服从等级:', player.getObedienceLevel())
        if (status.status === 'playing') {
          console.log('游戏状态:', status.status)
          console.log('当前位置:', status.currentLocation)
          console.log('剩余步数:', status.maxSteps - status.stepsTaken + '/' + status.maxSteps)
          console.log('背包:', status.backpackSlots)
          console.log('精灵腰带:', status.beltSlots)
        }
        break

      case 'pokemon':
        if (!player || !player.currentGame) {
          console.log('请先开始游戏')
          break
        }
        const belt = player.currentGame.belt
        console.log('')
        console.log('=== 精灵腰带 ===')
        console.log(`已使用: ${belt.getUsedSlots()}/${belt.maxSlots}`)
        console.log('')
        belt.pokemon.forEach((p, index) => {
          console.log(`[${index + 1}] ${p.name} Lv.${p.level}`)
          console.log(`  稀有度: ${p.rarity}`)
          console.log(`  HP: ${p.hp}/${p.maxHp}`)
          console.log(`  IV评价: ${p.getIVPercentage()}%`)
          console.log(`  亲密度: ${p.affection}`)
          console.log(`  努力值: HP${p.evs.HP} 攻击${p.evs.攻击} 防御${p.evs.防御} 特攻${p.evs.特攻} 特防${p.evs.特防} 速度${p.evs.速度}`)
          console.log(`  能力值: HP${p.stats.HP} 攻击${p.stats.攻击} 防御${p.stats.防御} 特攻${p.stats.特攻} 特防${p.stats.特防} 速度${p.stats.速度}`)
          console.log(`  携带物: ${p.holdingItem || '无'}`)
          console.log(`  技能: ${p.moves.join('、')}`)
          console.log(`  是否初始: ${p.isInitial ? '是' : '否'}`)
          console.log('')
        })
        break

      case 'help':
        console.log('')
        console.log('可用命令:')
        console.log('  start        - 开始新游戏')
        console.log('  select <名>  - 选择初始精灵')
        console.log('  move <方向>  - 移动(N/E/S/W/北/东/南/西)')
        console.log('  look         - 查看当前地点信息')
        console.log('  search <名>  - 搜索指定地点')
        console.log('  enter <名>   - 进入指定建筑')
        console.log('  leave        - 离开当前建筑')
        console.log('  floor <num>  - 前往指定楼层')
        console.log('  battle       - 进行战斗')
        console.log('  status       - 查看玩家状态')
        console.log('  pokemon      - 查看精灵详细信息')
        console.log('  help         - 显示帮助')
        console.log('  exit         - 退出测试')
        console.log('')
        break

      case 'exit':
        console.log('退出测试...')
        rl.close()
        return

      default:
        console.log('未知命令:', command)
        console.log('输入 help 查看可用命令')
    }
  } catch (error) {
    console.log('错误:', error.message)
    console.log('堆栈:', error.stack)
  }

  console.log('')
  rl.prompt()
})

rl.on('close', () => {
  process.exit(0)
})