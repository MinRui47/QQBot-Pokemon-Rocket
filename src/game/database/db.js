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

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    this.SQL = await initSqlJs()

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

    this._initSchema()
    this.initialized = true
  }

  _initSchema() {
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

    this.db.run(`
      CREATE TABLE IF NOT EXISTS game_states (
        user_id TEXT PRIMARY KEY,
        game_data TEXT,
        current_game TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

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

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pokemons_name ON pokemons(name)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pokemons_pokedex_id ON pokemons(pokedex_id)`)

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

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_moves_name ON moves(name)`)

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

    this.db.run(`
      CREATE TABLE IF NOT EXISTS config_dictionary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_key TEXT UNIQUE NOT NULL,
        config_group TEXT NOT NULL,
        config_value TEXT,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_cd_key ON config_dictionary(config_key)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_cd_group ON config_dictionary(config_group)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS type_chart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attacker_type TEXT NOT NULL,
        defender_type TEXT NOT NULL,
        multiplier REAL NOT NULL DEFAULT 1.0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(attacker_type, defender_type)
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_tc_attacker ON type_chart(attacker_type)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_tc_defender ON type_chart(defender_type)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS status_effects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        damage REAL DEFAULT 0,
        message TEXT,
        lasts INTEGER DEFAULT -1,
        attack_mod REAL DEFAULT 1.0,
        speed_mod REAL DEFAULT 1.0,
        skip_turn INTEGER DEFAULT 0,
        skip_chance REAL DEFAULT 0,
        grow INTEGER DEFAULT 0,
        self_damage INTEGER DEFAULT 0,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_se_key ON status_effects(status_key)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS rarity_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rarity_key TEXT UNIQUE NOT NULL,
        color TEXT,
        name TEXT,
        base_price INTEGER DEFAULT 0,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_rc_key ON rarity_config(rarity_key)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS map_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        location_type TEXT DEFAULT 'wild',
        difficulty INTEGER DEFAULT 1,
        level_min INTEGER DEFAULT 3,
        level_max INTEGER DEFAULT 10,
        pokemon_types TEXT DEFAULT '[]',
        features TEXT DEFAULT '[]',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_ml_name ON map_locations(name)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_ml_difficulty ON map_locations(difficulty)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS map_connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_location TEXT NOT NULL,
        north TEXT,
        east TEXT,
        south TEXT,
        west TEXT,
        FOREIGN KEY (from_location) REFERENCES map_locations(name),
        UNIQUE(from_location)
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mc_from ON map_connections(from_location)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS map_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        map_name TEXT UNIQUE NOT NULL,
        difficulty TEXT DEFAULT '简单',
        steps_min INTEGER DEFAULT 30,
        steps_max INTEGER DEFAULT 45,
        encounter_rate REAL DEFAULT 0.3,
        trainer_rate REAL DEFAULT 0.1,
        locations TEXT DEFAULT '[]',
        pokemon_pool TEXT DEFAULT '[]',
        item_pool TEXT DEFAULT '[]',
        silver_points TEXT DEFAULT '[]',
        gold_points TEXT DEFAULT '[]',
        unlock_condition TEXT,
        level_min INTEGER DEFAULT 3,
        level_max INTEGER DEFAULT 10,
        start_location TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mc_name ON map_config(map_name)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS rarity_probability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        difficulty INTEGER NOT NULL,
        rarity_key TEXT NOT NULL,
        probability REAL NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(difficulty, rarity_key)
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_rp_difficulty ON rarity_probability(difficulty)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS collection_names (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rarity_key TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_cn_rarity ON collection_names(rarity_key)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS medal_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medal_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mc_key ON medal_config(medal_key)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS initial_pokemon (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pokemon_name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_ip_pokemon ON initial_pokemon(pokemon_name)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS map_instances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        map_tier TEXT NOT NULL,
        current_location TEXT NOT NULL,
        current_building TEXT,
        current_floor INTEGER DEFAULT 0,
        explored_locations TEXT DEFAULT '[]',
        explored_features TEXT DEFAULT '[]',
        visited_points TEXT DEFAULT '[]',
        state TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mi_user ON map_instances(user_id)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mi_state ON map_instances(state)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS map_locations_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instance_id INTEGER,
        location_name TEXT NOT NULL,
        feature_name TEXT NOT NULL,
        is_searched INTEGER DEFAULT 0,
        searched_at TEXT,
        FOREIGN KEY (instance_id) REFERENCES map_instances(id)
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mls_instance ON map_locations_state(instance_id)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mls_location ON map_locations_state(location_name)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS map_dropped_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instance_id INTEGER,
        location_name TEXT NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        item_data TEXT DEFAULT '{}',
        dropped_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_picked INTEGER DEFAULT 0,
        picked_at TEXT,
        FOREIGN KEY (instance_id) REFERENCES map_instances(id)
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mdi_instance ON map_dropped_items(instance_id)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mdi_location ON map_dropped_items(location_name)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mdi_picked ON map_dropped_items(is_picked)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS map_trainers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instance_id INTEGER,
        location_name TEXT NOT NULL,
        trainer_name TEXT NOT NULL,
        trainer_title TEXT,
        is_defeated INTEGER DEFAULT 0,
        defeated_at TEXT,
        trainer_data TEXT DEFAULT '{}',
        FOREIGN KEY (instance_id) REFERENCES map_instances(id),
        UNIQUE(instance_id, location_name, trainer_name)
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mt_instance ON map_trainers(instance_id)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mt_location ON map_trainers(location_name)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mt_defeated ON map_trainers(is_defeated)`)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS map_wild_encounters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instance_id INTEGER,
        location_name TEXT NOT NULL,
        pokemon_name TEXT NOT NULL,
        level INTEGER NOT NULL,
        is_defeated INTEGER DEFAULT 0,
        defeated_at TEXT,
        flee_at TEXT,
        FOREIGN KEY (instance_id) REFERENCES map_instances(id)
      )
    `)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mwe_instance ON map_wild_encounters(instance_id)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mwe_location ON map_wild_encounters(location_name)`)

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
      return { changes: this.db.getRowsModified() }
    } catch (e) {
      console.error('[DB] SQL执行失败:', e?.message || e, '\nSQL:', sql, '\n参数:', params)
      throw e
    }
  }

  get(sql, params = []) {
    try {
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

const database = new Database()

module.exports = database