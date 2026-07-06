/**
 * 数据迁移脚本：从JSON迁移到SQLite
 * 运行一次即可，将现有的players.json和game.json数据迁移到SQLite数据库
 */

const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data')
const PLAYER_DATA_PATH = path.join(DATA_DIR, 'players.json')
const GAME_DATA_PATH = path.join(DATA_DIR, 'game.json')

async function migrate() {
  console.log('[迁移] 开始数据迁移...')
  
  // 初始化数据库
  const { database, playerDAL, gameStateDAL } = require('./dal')
  await database.init()
  
  let migratedCount = 0
  let skippedCount = 0
  
  // 迁移玩家数据
  if (fs.existsSync(PLAYER_DATA_PATH)) {
    try {
      const playerData = JSON.parse(fs.readFileSync(PLAYER_DATA_PATH, 'utf-8'))
      const totalPlayers = Object.keys(playerData).length
      console.log(`[迁移] 发现 ${totalPlayers} 个玩家数据`)
      
      for (const [userId, data] of Object.entries(playerData)) {
        try {
          // 检查是否已存在
          const existing = playerDAL.getPlayer(userId)
          if (existing) {
            console.log(`[迁移] 跳过已存在的玩家: ${userId}`)
            skippedCount++
            continue
          }
          
          // 创建玩家记录
          const player = {
            userId: userId,
            username: data.username || userId,
            nickname: data.nickname || '',
            registered: data.registered || false,
            location: data.location || '火箭队基地',
            coins: data.coins || 0,
            medals: data.medals || [],
            title: data.title || '火箭队炮灰',
            rankLevel: data.rankLevel || 1,
            warehouse: data.warehouse || { pokemon: [] },
            backpack: data.backpack || { type: '简易斜挎包', slots: 4, items: [] },
            belt: data.belt || { maxSlots: 6, pokemon: [] },
            equippedBackpack: data.equippedBackpack || { type: '简易斜挎包', rarity: 'gray', slots: 4 },
            unlockedMaps: data.unlockedMaps || ['低级地图'],
            evacuationTotal: data.evacuationTotal || 0,
            successfulEvacuations: data.successfulEvacuations || 0
          }
          
          // 插入数据库
          database.db.run(`
            INSERT OR IGNORE INTO players (user_id, username, nickname, registered, location, coins, medals, 
              title, rank_level, warehouse, backpack, belt, equipped_backpack, unlocked_maps, 
              evacuation_total, successful_evacuations)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            player.userId, player.username, player.nickname, player.registered ? 1 : 0, player.location,
            player.coins, JSON.stringify(player.medals), player.title, player.rankLevel,
            JSON.stringify(player.warehouse), JSON.stringify(player.backpack), JSON.stringify(player.belt),
            JSON.stringify(player.equippedBackpack), JSON.stringify(player.unlockedMaps),
            player.evacuationTotal, player.successfulEvacuations
          ])
          
          // 迁移游戏状态
          if (data.currentGame && data.currentGame.status !== 'ended') {
            gameStateDAL.saveGameState(userId, null, data.currentGame)
            console.log(`[迁移] 玩家 ${userId} 有进行中的游戏`)
          }
          
          migratedCount++
        } catch (e) {
          console.error(`[迁移] 处理玩家 ${userId} 失败:`, e.message)
        }
      }
      
      database.save()
      console.log(`[迁移] 玩家数据迁移完成：成功 ${migratedCount}，跳过 ${skippedCount}`)
      
    } catch (e) {
      console.error('[迁移] 读取玩家数据失败:', e.message)
    }
  } else {
    console.log('[迁移] 未找到players.json，跳过玩家数据迁移')
  }
  
  // 迁移交易数据
  if (fs.existsSync(GAME_DATA_PATH)) {
    try {
      const gameData = JSON.parse(fs.readFileSync(GAME_DATA_PATH, 'utf-8'))
      
      if (gameData.tradingSystem && gameData.tradingSystem.listings) {
        const { listingDAL } = require('./dal')
        let listingCount = 0
        
        for (const listing of gameData.tradingSystem.listings) {
          try {
            listingDAL.addListing(
              listing.sellerId,
              listing.itemType,
              listing.itemName,
              listing.itemData || {},
              listing.quantity,
              listing.price
            )
            listingCount++
          } catch (e) {
            console.error(`[迁移] 处理上架物品失败:`, e.message)
          }
        }
        
        database.save()
        console.log(`[迁移] 交易数据迁移完成：成功 ${listingCount}`)
      }
      
    } catch (e) {
      console.error('[迁移] 读取game.json失败:', e.message)
    }
  } else {
    console.log('[迁移] 未找到game.json，跳过交易数据迁移')
  }
  
  console.log('[迁移] 数据迁移完成！')
  console.log('[迁移] 提示：可以备份原有的players.json和game.json文件，然后删除它们')
  
  database.close()
}

// 运行迁移
migrate().catch(console.error)
