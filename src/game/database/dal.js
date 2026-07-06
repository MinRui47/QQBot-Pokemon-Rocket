const db = require('./db')

class PlayerDAL {
  // 获取所有玩家
  getAllPlayers() {
    const rows = db.all('SELECT * FROM players ORDER BY updated_at DESC')
    return rows.map(row => this._rowToPlayer(row))
  }

  // 根据user_id获取玩家
  getPlayer(userId) {
    const row = db.get('SELECT * FROM players WHERE user_id = ?', [userId])
    if (!row) return null
    return this._rowToPlayer(row)
  }

  // 创建新玩家
  createPlayer(userId, username) {
    const player = {
      user_id: userId,
      username: username,
      nickname: '',
      registered: 0,
      location: '火箭队基地',
      coins: 0,
      medals: '[]',
      title: '火箭队炮灰',
      rank_level: 1,
      warehouse: '[]',
      backpack: JSON.stringify({ type: '简易斜挎包', slots: 4, items: [] }),
      belt: JSON.stringify({ maxSlots: 6, pokemon: [] }),
      equipped_backpack: JSON.stringify({ type: '简易斜挎包', rarity: 'gray', slots: 4 }),
      unlocked_maps: '["低级地图"]',
      evacuation_total: 0,
      successful_evacuations: 0
    }

    db.run(`
      INSERT INTO players (user_id, username, nickname, registered, location, coins, medals, 
        title, rank_level, warehouse, backpack, belt, equipped_backpack, unlocked_maps, 
        evacuation_total, successful_evacuations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      player.user_id, player.username, player.nickname, player.registered, player.location,
      player.coins, player.medals, player.title, player.rank_level, player.warehouse,
      player.backpack, player.belt, player.equipped_backpack, player.unlocked_maps,
      player.evacuation_total, player.successful_evacuations
    ])

    return this._rowToPlayer(player)
  }

  // 更新玩家数据
  updatePlayer(player) {
    const now = new Date().toISOString()
    
    // 确保 userId 存在
    if (!player.userId) {
      console.error('[DAL] updatePlayer: player.userId is undefined!', player)
      return
    }
    
    db.run(`
      UPDATE players SET 
        username = ?,
        nickname = ?,
        registered = ?,
        location = ?,
        coins = ?,
        medals = ?,
        title = ?,
        rank_level = ?,
        warehouse = ?,
        backpack = ?,
        belt = ?,
        equipped_backpack = ?,
        unlocked_maps = ?,
        evacuation_total = ?,
        successful_evacuations = ?,
        updated_at = ?
      WHERE user_id = ?
    `, [
      player.username,
      player.nickname,
      player.registered ? 1 : 0,
      player.location,
      player.coins || player.money || 0,
      JSON.stringify(player.medals || []),
      player.title || '火箭队炮灰',
      player.rankLevel || 1,
      JSON.stringify(player.warehouse),
      JSON.stringify(player.backpack),
      JSON.stringify(player.belt),
      JSON.stringify(player.equippedBackpack),
      JSON.stringify(player.unlockedMaps || ['低级地图']),
      player.evacuationTotal || 0,
      player.successfulEvacuations || 0,
      now,
      player.userId
    ])
  }

  // 删除玩家
  deletePlayer(userId) {
    db.run('DELETE FROM players WHERE user_id = ?', [userId])
    db.run('DELETE FROM game_states WHERE user_id = ?', [userId])
  }

  // 将数据库行转换为玩家对象
  _rowToPlayer(row) {
    return {
      userId: row.user_id,
      username: row.username,
      nickname: row.nickname,
      registered: row.registered === 1,
      location: row.location,
      coins: row.coins,
      medals: JSON.parse(row.medals || '[]'),
      title: row.title,
      rankLevel: row.rank_level,
      warehouse: JSON.parse(row.warehouse || '[]'),
      backpack: JSON.parse(row.backpack || '{}'),
      belt: JSON.parse(row.belt || '{}'),
      equippedBackpack: JSON.parse(row.equipped_backpack || '{}'),
      unlockedMaps: JSON.parse(row.unlocked_maps || '[]'),
      evacuationTotal: row.evacuation_total,
      successfulEvacuations: row.successful_evacuations,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}

class GameStateDAL {
  // 获取玩家游戏状态
  getGameState(userId) {
    try {
      const rows = db.all('SELECT * FROM game_states WHERE user_id = ?', [userId])
      if (rows.length === 0) return null
      const row = rows[0]
      return {
        userId: row.user_id,
        gameData: row.game_data ? JSON.parse(row.game_data) : null,
        currentGame: row.current_game ? JSON.parse(row.current_game) : null,
        updatedAt: row.updated_at
      }
    } catch (e) {
      console.error('[DAL] getGameState 失败:', e.message)
      return null
    }
  }

  // 保存玩家游戏状态
  saveGameState(userId, gameData, currentGame) {
    const now = new Date().toISOString()
    const existing = this.getGameState(userId)
    
    if (existing) {
      db.run(`
        UPDATE game_states SET 
          game_data = ?,
          current_game = ?,
          updated_at = ?
        WHERE user_id = ?
      `, [
        JSON.stringify(gameData),
        JSON.stringify(currentGame),
        now,
        userId
      ])
    } else {
      db.run(`
        INSERT INTO game_states (user_id, game_data, current_game, updated_at)
        VALUES (?, ?, ?, ?)
      `, [
        userId,
        JSON.stringify(gameData),
        JSON.stringify(currentGame),
        now
      ])
    }
  }

  // 删除玩家游戏状态
  deleteGameState(userId) {
    db.run('DELETE FROM game_states WHERE user_id = ?', [userId])
  }

  // 获取所有进行中的游戏
  getActiveGameStates() {
    const rows = db.all(`
      SELECT gs.*, p.warehouse 
      FROM game_states gs
      LEFT JOIN players p ON gs.user_id = p.user_id
      WHERE gs.current_game IS NOT NULL
    `)
    
    return rows.map(row => ({
      userId: row.user_id,
      gameData: row.game_data ? JSON.parse(row.game_data) : null,
      currentGame: row.current_game ? JSON.parse(row.current_game) : null,
      warehouse: JSON.parse(row.warehouse || '[]'),
      updatedAt: row.updated_at
    })).filter(g => g.currentGame && g.currentGame.status !== 'ended')
  }
}

class ListingDAL {
  // 获取所有上架物品
  getAllListings() {
    const rows = db.all('SELECT * FROM listings ORDER BY created_at DESC')
    return rows.map(row => ({
      id: row.id,
      sellerId: row.seller_id,
      itemType: row.item_type,
      itemName: row.item_name,
      itemData: JSON.parse(row.item_data || '{}'),
      quantity: row.quantity,
      price: row.price,
      createdAt: row.created_at
    }))
  }

  // 添加上架物品
  addListing(sellerId, itemType, itemName, itemData, quantity, price) {
    const result = db.run(`
      INSERT INTO listings (seller_id, item_type, item_name, item_data, quantity, price)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [sellerId, itemType, itemName, JSON.stringify(itemData), quantity, price])
    return result
  }

  // 获取上架物品
  getListing(listingId) {
    const row = db.get('SELECT * FROM listings WHERE id = ?', [listingId])
    if (!row) return null
    return {
      id: row.id,
      sellerId: row.seller_id,
      itemType: row.item_type,
      itemName: row.item_name,
      itemData: JSON.parse(row.item_data || '{}'),
      quantity: row.quantity,
      price: row.price,
      createdAt: row.created_at
    }
  }

  // 删除上架物品
  deleteListing(listingId) {
    db.run('DELETE FROM listings WHERE id = ?', [listingId])
  }

  // 获取卖家的所有上架物品
  getSellerListings(sellerId) {
    const rows = db.all('SELECT * FROM listings WHERE seller_id = ?', [sellerId])
    return rows.map(row => ({
      id: row.id,
      sellerId: row.seller_id,
      itemType: row.item_type,
      itemName: row.item_name,
      itemData: JSON.parse(row.item_data || '{}'),
      quantity: row.quantity,
      price: row.price,
      createdAt: row.created_at
    }))
  }
}

class PokemonDAL {
  getPokemonByName(name) {
    const row = db.get('SELECT * FROM pokemons WHERE name = ?', [name])
    if (!row) return null
    return this._rowToPokemon(row)
  }

  getPokemonById(id) {
    const row = db.get('SELECT * FROM pokemons WHERE id = ?', [id])
    if (!row) return null
    return this._rowToPokemon(row)
  }

  getAllPokemons() {
    const rows = db.all('SELECT * FROM pokemons ORDER BY pokedex_id ASC')
    return rows.map(row => this._rowToPokemon(row))
  }

  getPokemonsByType(type) {
    const rows = db.all(`
      SELECT * FROM pokemons WHERE type1 = ? OR type2 = ? ORDER BY pokedex_id ASC
    `, [type, type])
    return rows.map(row => this._rowToPokemon(row))
  }

  getPokemonLevelMoves(pokemonId) {
    const rows = db.all(`
      SELECT m.*, plm.level 
      FROM pokemon_level_moves plm
      JOIN moves m ON plm.move_id = m.id
      WHERE plm.pokemon_id = ?
      ORDER BY plm.level ASC
    `, [pokemonId])
    return rows.map(row => this._rowToMove(row))
  }

  getPokemonTMs(pokemonId) {
    const rows = db.all(`
      SELECT m.*, ptm.tm_number 
      FROM pokemon_tm_moves ptm
      JOIN moves m ON ptm.move_id = m.id
      WHERE ptm.pokemon_id = ?
      ORDER BY ptm.tm_number ASC
    `, [pokemonId])
    return rows.map(row => this._rowToMove(row))
  }

  getMoveByName(name) {
    const row = db.get('SELECT * FROM moves WHERE name = ?', [name])
    if (!row) return null
    return this._rowToMove(row)
  }

  getMoveById(id) {
    const row = db.get('SELECT * FROM moves WHERE id = ?', [id])
    if (!row) return null
    return this._rowToMove(row)
  }

  getAllMoves() {
    const rows = db.all('SELECT * FROM moves ORDER BY id ASC')
    return rows.map(row => this._rowToMove(row))
  }

  createPersonalPokemon(pokemonId, userId, options = {}) {
    const now = new Date().toISOString()
    const result = db.run(`
      INSERT INTO personal_pokemon (
        pokemon_id, user_id, npc_id, level,
        iv_hp, iv_attack, iv_defense, iv_sp_attack, iv_sp_defense, iv_speed,
        ev_hp, ev_attack, ev_defense, ev_sp_attack, ev_sp_defense, ev_speed,
        friendship, affection, experience,
        is_shiny, nickname, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pokemonId,
      options.userId || userId,
      options.npcId || null,
      options.level || 5,
      options.ivs?.HP || Math.floor(Math.random() * 32),
      options.ivs?.攻击 || Math.floor(Math.random() * 32),
      options.ivs?.防御 || Math.floor(Math.random() * 32),
      options.ivs?.特攻 || Math.floor(Math.random() * 32),
      options.ivs?.特防 || Math.floor(Math.random() * 32),
      options.ivs?.速度 || Math.floor(Math.random() * 32),
      options.evs?.HP || 0,
      options.evs?.攻击 || 0,
      options.evs?.防御 || 0,
      options.evs?.特攻 || 0,
      options.evs?.特防 || 0,
      options.evs?.速度 || 0,
      options.friendship || 70,
      options.affection || 70,
      options.experience || 0,
      options.isShiny || 0,
      options.nickname || null,
      now,
      now
    ])
    return result
  }

  getPersonalPokemon(id) {
    const row = db.get('SELECT * FROM personal_pokemon WHERE id = ?', [id])
    if (!row) return null
    return this._rowToPersonalPokemon(row)
  }

  getPersonalPokemonsByUserId(userId) {
    const rows = db.all('SELECT * FROM personal_pokemon WHERE user_id = ? ORDER BY level DESC', [userId])
    return rows.map(row => this._rowToPersonalPokemon(row))
  }

  getPersonalPokemonsByNpcId(npcId) {
    const rows = db.all('SELECT * FROM personal_pokemon WHERE npc_id = ? ORDER BY level DESC', [npcId])
    return rows.map(row => this._rowToPersonalPokemon(row))
  }

  updatePersonalPokemon(id, data) {
    const now = new Date().toISOString()
    const updates = []
    const params = []

    if (data.level !== undefined) { updates.push('level = ?'); params.push(data.level) }
    if (data.friendship !== undefined) { updates.push('friendship = ?'); params.push(data.friendship) }
    if (data.affection !== undefined) { updates.push('affection = ?'); params.push(data.affection) }
    if (data.experience !== undefined) { updates.push('experience = ?'); params.push(data.experience) }
    if (data.hp !== undefined) { updates.push('hp = ?'); params.push(data.hp) }
    if (data.max_hp !== undefined) { updates.push('max_hp = ?'); params.push(data.max_hp) }
    if (data.attack !== undefined) { updates.push('attack = ?'); params.push(data.attack) }
    if (data.defense !== undefined) { updates.push('defense = ?'); params.push(data.defense) }
    if (data.sp_attack !== undefined) { updates.push('sp_attack = ?'); params.push(data.sp_attack) }
    if (data.sp_defense !== undefined) { updates.push('sp_defense = ?'); params.push(data.sp_defense) }
    if (data.speed !== undefined) { updates.push('speed = ?'); params.push(data.speed) }
    if (data.status !== undefined) { updates.push('status = ?'); params.push(data.status) }
    if (data.holding_item !== undefined) { updates.push('holding_item = ?'); params.push(data.holding_item) }
    if (data.moves !== undefined) { updates.push('moves = ?'); params.push(JSON.stringify(data.moves)) }
    if (data.move_pp !== undefined) { updates.push('move_pp = ?'); params.push(JSON.stringify(data.move_pp)) }
    if (data.nickname !== undefined) { updates.push('nickname = ?'); params.push(data.nickname) }

    params.push(now)
    params.push(id)

    db.run(`UPDATE personal_pokemon SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`, params)
  }

  deletePersonalPokemon(id) {
    db.run('DELETE FROM personal_pokemon WHERE id = ?', [id])
  }

  _rowToPokemon(row) {
    return {
      id: row.id,
      name: row.name,
      englishName: row.english_name,
      pokedexId: row.pokedex_id,
      type1: row.type1,
      type2: row.type2,
      types: [row.type1, row.type2].filter(t => t),
      category: row.category,
      captureRate: row.capture_rate,
      genderRatio: row.gender_ratio,
      eggGroups: row.egg_groups,
      height: row.height,
      weight: row.weight,
      baseStats: {
        HP: row.hp_base,
        攻击: row.attack_base,
        防御: row.defense_base,
        特攻: row.sp_attack_base,
        特防: row.sp_defense_base,
        速度: row.speed_base
      },
      statTotal: row.stat_total,
      abilities: JSON.parse(row.abilities || '[]'),
      hiddenAbility: row.hidden_ability,
      evolutionChain: JSON.parse(row.evolution_chain || '[]'),
      flavorText: row.flavor_text,
      legendaryCategory: row.legendary_category,
      growthRate: row.growth_rate
    }
  }

  _rowToMove(row) {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      category: row.category,
      power: row.power,
      accuracy: row.accuracy,
      pp: row.pp,
      effect: row.effect,
      effectChance: row.effect_chance,
      damageClass: row.damage_class,
      // 结构化效果数据
      effectType: row.effect_type,
      effectTarget: row.effect_target,
      effectStat: row.effect_stat,
      effectValue: row.effect_value,
      effectDuration: row.effect_duration,
      priority: row.priority,
      hits: row.hits,
      level: row.level,
      tmNumber: row.tm_number
    }
  }

  _rowToPersonalPokemon(row) {
    return {
      id: row.id,
      pokemonId: row.pokemon_id,
      userId: row.user_id,
      npcId: row.npc_id,
      level: row.level,
      ivs: {
        HP: row.iv_hp,
        攻击: row.iv_attack,
        防御: row.iv_defense,
        特攻: row.iv_sp_attack,
        特防: row.iv_sp_defense,
        速度: row.iv_speed
      },
      evs: {
        HP: row.ev_hp,
        攻击: row.ev_attack,
        防御: row.ev_defense,
        特攻: row.ev_sp_attack,
        特防: row.ev_sp_defense,
        速度: row.ev_speed
      },
      friendship: row.friendship,
      affection: row.affection,
      experience: row.experience,
      hp: row.hp,
      maxHp: row.max_hp,
      attack: row.attack,
      defense: row.defense,
      spAttack: row.sp_attack,
      spDefense: row.sp_defense,
      speed: row.speed,
      status: row.status,
      holdingItem: row.holding_item,
      moves: JSON.parse(row.moves || '[]'),
      movePp: JSON.parse(row.move_pp || '[]'),
      isShiny: row.is_shiny === 1,
      isInitial: row.is_initial === 1,
      isRented: row.is_rented === 1,
      nickname: row.nickname,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}

const playerDAL = new PlayerDAL()
const gameStateDAL = new GameStateDAL()
const listingDAL = new ListingDAL()
const pokemonDAL = new PokemonDAL()

module.exports = {
  database: db,
  playerDAL,
  gameStateDAL,
  listingDAL,
  pokemonDAL
}
