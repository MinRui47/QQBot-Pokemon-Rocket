const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'game.db')

class Database {
  constructor() {
    this.db = null
    this.SQL = null
    this.initialized = false
  }

  async init() {
    if (this.initialized) return

    // 确保数据目录存在
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    // 初始化SQL.js
    this.SQL = await initSqlJs()

    // 尝试加载现有数据库
    if (fs.existsSync(DB_PATH)) {
      try {
        const buffer = fs.readFileSync(DB_PATH)
        this.db = new this.SQL.Database(buffer)
        console.log('[DB] 已加载现有数据库')
      } catch (e) {
        console.log('[DB] 加载数据库失败，创建新数据库:', e.message)
        this.db = new this.SQL.Database()
      }
    } else {
      this.db = new this.SQL.Database()
      console.log('[DB] 创建新数据库')
    }

    // 初始化表结构
    this._initSchema()
    this.initialized = true
  }

  _initSchema() {
    // 玩家表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS players (
        user_id TEXT PRIMARY KEY,
        username TEXT,
        nickname TEXT,
        registered INTEGER DEFAULT 0,
        location TEXT DEFAULT '火箭队基地',
        coins INTEGER DEFAULT 0,
        medals TEXT DEFAULT '[]',
        title TEXT DEFAULT '火箭队炮灰',
        rank_level INTEGER DEFAULT 1,
        warehouse TEXT DEFAULT '[]',
        backpack TEXT DEFAULT '{"type":"简易斜挎包","slots":4,"items":[]}',
        belt TEXT DEFAULT '{"maxSlots":6,"pokemon":[]}',
        equipped_backpack TEXT DEFAULT '{"type":"简易斜挎包","rarity":"gray","slots":4}',
        unlocked_maps TEXT DEFAULT '["低级地图"]',
        evacuation_total INTEGER DEFAULT 0,
        successful_evacuations INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 游戏状态表（不使用外键以避免约束问题）
    this.db.run(`
      CREATE TABLE IF NOT EXISTS game_states (
        user_id TEXT PRIMARY KEY,
        game_data TEXT,
        current_game TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 交易系统表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY,
        seller_id TEXT,
        item_type TEXT,
        item_name TEXT,
        item_data TEXT,
        quantity INTEGER,
        price INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 宝可梦基础数据表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pokemons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        english_name TEXT,
        pokedex_id TEXT,
        type1 TEXT,
        type2 TEXT,
        category TEXT,
        capture_rate INTEGER,
        gender_ratio TEXT,
        egg_groups TEXT,
        height TEXT,
        weight TEXT,
        hp_base INTEGER DEFAULT 40,
        attack_base INTEGER DEFAULT 40,
        defense_base INTEGER DEFAULT 40,
        sp_attack_base INTEGER DEFAULT 40,
        sp_defense_base INTEGER DEFAULT 40,
        speed_base INTEGER DEFAULT 40,
        stat_total INTEGER DEFAULT 240,
        abilities TEXT DEFAULT '[]',
        hidden_ability TEXT,
        evolution_chain TEXT DEFAULT '[]',
        flavor_text TEXT,
        legendary_category TEXT DEFAULT 'normal',
        growth_rate TEXT DEFAULT 'medium',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建宝可梦名称索引
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pokemons_name ON pokemons(name)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pokemons_pokedex_id ON pokemons(pokedex_id)`)

    // 技能招式表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS moves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        type TEXT,
        category TEXT,
        power INTEGER,
        accuracy INTEGER,
        pp INTEGER,
        effect TEXT,
        effect_chance INTEGER,
        effect_type TEXT,
        effect_target TEXT,
        effect_stat TEXT,
        effect_value INTEGER,
        effect_duration INTEGER,
        priority INTEGER,
        hits INTEGER,
        damage_class TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建技能名称索引
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_moves_name ON moves(name)`)

    // 宝可梦等级技能表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pokemon_level_moves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pokemon_id INTEGER,
        move_id INTEGER,
        level INTEGER,
        FOREIGN KEY (pokemon_id) REFERENCES pokemons(id),
        FOREIGN KEY (move_id) REFERENCES moves(id)
      )
    `)

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_plm_pokemon ON pokemon_level_moves(pokemon_id)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_plm_move ON pokemon_level_moves(move_id)`)

    // 宝可梦学习机技能表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pokemon_tm_moves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pokemon_id INTEGER,
        move_id INTEGER,
        tm_number TEXT,
        FOREIGN KEY (pokemon_id) REFERENCES pokemons(id),
        FOREIGN KEY (move_id) REFERENCES moves(id)
      )
    `)

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_ptm_pokemon ON pokemon_tm_moves(pokemon_id)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_ptm_move ON pokemon_tm_moves(move_id)`)

    // 个人宝可梦表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS personal_pokemon (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pokemon_id INTEGER,
        user_id TEXT,
        npc_id TEXT,
        level INTEGER DEFAULT 5,
        iv_hp INTEGER DEFAULT 15,
        iv_attack INTEGER DEFAULT 15,
        iv_defense INTEGER DEFAULT 15,
        iv_sp_attack INTEGER DEFAULT 15,
        iv_sp_defense INTEGER DEFAULT 15,
        iv_speed INTEGER DEFAULT 15,
        ev_hp INTEGER DEFAULT 0,
        ev_attack INTEGER DEFAULT 0,
        ev_defense INTEGER DEFAULT 0,
        ev_sp_attack INTEGER DEFAULT 0,
        ev_sp_defense INTEGER DEFAULT 0,
        ev_speed INTEGER DEFAULT 0,
        friendship INTEGER DEFAULT 70,
        affection INTEGER DEFAULT 70,
        experience INTEGER DEFAULT 0,
        hp INTEGER,
        max_hp INTEGER,
        attack INTEGER,
        defense INTEGER,
        sp_attack INTEGER,
        sp_defense INTEGER,
        speed INTEGER,
        status TEXT,
        holding_item TEXT,
        moves TEXT DEFAULT '[]',
        move_pp TEXT DEFAULT '[]',
        is_shiny INTEGER DEFAULT 0,
        is_initial INTEGER DEFAULT 0,
        is_rented INTEGER DEFAULT 0,
        nickname TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pokemon_id) REFERENCES pokemons(id)
      )
    `)

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pp_user ON personal_pokemon(user_id)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pp_pokemon ON personal_pokemon(pokemon_id)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pp_npc ON personal_pokemon(npc_id)`)

    // 道具表（宝可梦道具、药品、重要物品等）
    this.db.run(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        japanese_name TEXT,
        english_name TEXT,
        description TEXT,
        category TEXT,
        sub_category TEXT,
        image_url TEXT,
        slots INTEGER DEFAULT 1,
        max_stack INTEGER DEFAULT 1,
        price INTEGER DEFAULT 0,
        sell_price INTEGER DEFAULT 0,
        effect_type TEXT,
        effect_value TEXT,
        effect_target TEXT,
        usable INTEGER DEFAULT 0,
        consumable INTEGER DEFAULT 1,
        battle_usable INTEGER DEFAULT 0,
        field_usable INTEGER DEFAULT 0,
        hold_usable INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_items_name ON items(name)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)`)

    // 精灵球表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pokeballs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        japanese_name TEXT,
        english_name TEXT,
        description TEXT,
        image_url TEXT,
        catch_rate_multiplier REAL DEFAULT 1.0,
        special_condition TEXT,
        slots INTEGER DEFAULT 1,
        max_stack INTEGER DEFAULT 99,
        price INTEGER DEFAULT 0,
        sell_price INTEGER DEFAULT 0,
        rarity TEXT DEFAULT 'common',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pokeballs_name ON pokeballs(name)`)

    // 藏品表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        rarity TEXT DEFAULT 'common',
        slots INTEGER DEFAULT 1,
        base_price INTEGER DEFAULT 50,
        description TEXT,
        source TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_collections_name ON collections(name)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_collections_rarity ON collections(rarity)`)

    // 玩家背包道具表（玩家拥有的道具）
    this.db.run(`
      CREATE TABLE IF NOT EXISTS player_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        item_id INTEGER,
        quantity INTEGER DEFAULT 1,
        location TEXT DEFAULT 'backpack',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES players(user_id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pi_user ON player_items(user_id)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pi_item ON player_items(item_id)`)

    // 玩家精灵球表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS player_pokeballs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        pokeball_id INTEGER,
        quantity INTEGER DEFAULT 1,
        location TEXT DEFAULT 'backpack',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES players(user_id),
        FOREIGN KEY (pokeball_id) REFERENCES pokeballs(id)
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pb_user ON player_pokeballs(user_id)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pb_pokeball ON player_pokeballs(pokeball_id)`)

    // 玩家藏品表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS player_collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        collection_id INTEGER,
        location TEXT DEFAULT 'backpack',
        obtained_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES players(user_id),
        FOREIGN KEY (collection_id) REFERENCES collections(id)
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pc_user ON player_collections(user_id)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pc_collection ON player_collections(collection_id)`)

    // 保存数据库
    this.save()

    console.log('[DB] 表结构初始化完成')
  }

  save() {
    if (!this.db) return
    try {
      const data = this.db.export()
      const buffer = Buffer.from(data)
      fs.writeFileSync(DB_PATH, buffer)
    } catch (e) {
      console.error('[DB] 保存数据库失败:', e.message)
    }
  }

  run(sql, params = []) {
    try {
      this.db.run(sql, params)
      this.save()
      return { changes: this.db.getRowsModified() }
    } catch (e) {
      console.error('[DB] SQL执行失败:', e?.message || e, '\nSQL:', sql, '\n参数:', params)
      throw e
    }
  }

  get(sql, params = []) {
    try {
      // sql.js不支持参数化的get方法，需要手动替换参数
      let finalSql = sql
      for (const param of params) {
        finalSql = finalSql.replace('?', `'${param}'`)
      }
      const results = this.db.exec(finalSql)
      if (results.length === 0 || results[0].values.length === 0) return null
      
      const columns = results[0].columns
      const row = results[0].values[0]
      const obj = {}
      columns.forEach((col, i) => {
        obj[col] = row[i]
      })
      return obj
    } catch (e) {
      console.error('[DB] SQL查询失败:', e.message, sql)
      return null
    }
  }

  all(sql, params = []) {
    try {
      // sql.js不支持参数化的all方法，需要手动替换参数
      let finalSql = sql
      for (const param of params) {
        finalSql = finalSql.replace('?', `'${param}'`)
      }
      const results = this.db.exec(finalSql)
      if (results.length === 0) return []
      
      const columns = results[0].columns
      return results[0].values.map(row => {
        const obj = {}
        columns.forEach((col, i) => {
          obj[col] = row[i]
        })
        return obj
      })
    } catch (e) {
      console.error('[DB] SQL查询失败:', e.message, sql)
      return []
    }
  }

  close() {
    if (this.db) {
      this.save()
      this.db.close()
      this.db = null
      this.initialized = false
    }
  }
}

// 单例模式
const database = new Database()

module.exports = database
