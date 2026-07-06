const db = require('./database/db')
const { loadAllConfigs } = require('./configCache')
const { refreshFromDb } = require('./config')
const { initBattleConfig } = require('./battle')
const { initMapConfig } = require('./map')

async function bootstrap() {
  console.log('[Bootstrap] 开始初始化...')
  
  console.log('[Bootstrap] 初始化数据库...')
  await db.init()
  console.log('[Bootstrap] 数据库初始化完成')
  
  console.log('[Bootstrap] 加载配置缓存...')
  await loadAllConfigs()
  console.log('[Bootstrap] 配置缓存加载完成')
  
  console.log('[Bootstrap] 刷新配置数据...')
  await refreshFromDb()
  console.log('[Bootstrap] 配置数据刷新完成')
  
  console.log('[Bootstrap] 初始化战斗配置...')
  await initBattleConfig()
  console.log('[Bootstrap] 战斗配置初始化完成')
  
  console.log('[Bootstrap] 初始化地图配置...')
  await initMapConfig()
  console.log('[Bootstrap] 地图配置初始化完成')
  
  console.log('[Bootstrap] 所有初始化完成！')
}

module.exports = { bootstrap }