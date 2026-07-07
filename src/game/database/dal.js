const db = require('./db')

async function ensureDbInit() {
  await db.init()
}

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
    db.save()

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
    db.save()
  }

  // 删除玩家
  deletePlayer(userId) {
    db.run('DELETE FROM players WHERE user_id = ?', [userId])
    db.run('DELETE FROM game_states WHERE user_id = ?', [userId])
    db.save()
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
    db.save()
  }

  // 删除玩家游戏状态
  deleteGameState(userId) {
    db.run('DELETE FROM game_states WHERE user_id = ?', [userId])
    db.save()
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
    db.save()
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
    db.save()
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

  getAllMovesAsMap() {
    const moves = this.getAllMoves()
    const map = {}
    for (const move of moves) {
      map[move.name] = move
    }
    return map
  }

  getMoveEffectByName(name) {
    const move = this.getMoveByName(name)
    if (!move) return null
    
    const effect = {}
    if (move.effectType) effect.effectType = move.effectType
    if (move.effectTarget) effect.effectTarget = move.effectTarget
    if (move.effectStat) effect.effectStat = move.effectStat
    if (move.effectValue !== undefined && move.effectValue !== null) effect.effectValue = move.effectValue
    if (move.effectDuration !== undefined && move.effectDuration !== null) effect.effectDuration = move.effectDuration
    if (move.priority !== undefined && move.priority !== null) effect.priority = move.priority
    if (move.hits !== undefined && move.hits !== null) effect.hits = move.hits
    
    return Object.keys(effect).length > 0 ? effect : null
  }

  getPokemonByNameWithMoves(name) {
    const pokemon = this.getPokemonByName(name)
    if (!pokemon) return null
    
    const levelMoves = this.getPokemonLevelMoves(pokemon.id)
    const tmMoves = this.getPokemonTMs(pokemon.id)
    
    return {
      ...pokemon,
      levelMoves: levelMoves,
      tmMoves: tmMoves
    }
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
    db.save()
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
    db.save()
  }

  deletePersonalPokemon(id) {
    db.run('DELETE FROM personal_pokemon WHERE id = ?', [id])
    db.save()
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

class MapStateDAL {
  createMapInstance(userId, mapTier, startLocation) {
    const now = new Date().toISOString()
    db.run(`
      INSERT OR REPLACE INTO map_instances (user_id, map_tier, current_location, current_building, current_floor, 
        explored_locations, explored_features, visited_points, state, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, mapTier, startLocation, null, 0, JSON.stringify([startLocation]), '[]', '[]', 'active', now, now])
    db.save()
    
    const instance = db.get('SELECT * FROM map_instances WHERE user_id = ?', [userId])
    return this._rowToMapInstance(instance)
  }

  getMapInstance(userId) {
    const row = db.get('SELECT * FROM map_instances WHERE user_id = ? AND state = ?', [userId, 'active'])
    if (!row) return null
    return this._rowToMapInstance(row)
  }

  updateMapInstance(instanceId, data) {
    const now = new Date().toISOString()
    const updates = []
    const params = []

    if (data.currentLocation !== undefined) { updates.push('current_location = ?'); params.push(data.currentLocation) }
    if (data.currentBuilding !== undefined) { updates.push('current_building = ?'); params.push(data.currentBuilding) }
    if (data.currentFloor !== undefined) { updates.push('current_floor = ?'); params.push(data.currentFloor) }
    if (data.exploredLocations !== undefined) { updates.push('explored_locations = ?'); params.push(JSON.stringify(data.exploredLocations)) }
    if (data.exploredFeatures !== undefined) { updates.push('explored_features = ?'); params.push(JSON.stringify(data.exploredFeatures)) }
    if (data.visitedPoints !== undefined) { updates.push('visited_points = ?'); params.push(JSON.stringify(data.visitedPoints)) }
    if (data.state !== undefined) { updates.push('state = ?'); params.push(data.state) }

    params.push(now)
    params.push(instanceId)

    db.run(`UPDATE map_instances SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`, params)
    db.save()
  }

  endMapInstance(userId) {
    db.run('UPDATE map_instances SET state = ?, updated_at = ? WHERE user_id = ?', ['ended', new Date().toISOString(), userId])
    db.save()
  }

  deleteMapInstance(userId) {
    const instance = db.get('SELECT id FROM map_instances WHERE user_id = ?', [userId])
    if (instance) {
      db.run('DELETE FROM map_dropped_items WHERE instance_id = ?', [instance.id])
      db.run('DELETE FROM map_locations_state WHERE instance_id = ?', [instance.id])
      db.run('DELETE FROM map_trainers WHERE instance_id = ?', [instance.id])
      db.run('DELETE FROM map_wild_encounters WHERE instance_id = ?', [instance.id])
      db.run('DELETE FROM map_instances WHERE id = ?', [instance.id])
      db.save()
    }
  }

  markLocationSearched(instanceId, locationName, featureName) {
    const existing = db.get('SELECT id FROM map_locations_state WHERE instance_id = ? AND location_name = ? AND feature_name = ?', [instanceId, locationName, featureName])
    if (existing) {
      db.run('UPDATE map_locations_state SET is_searched = ?, searched_at = ? WHERE id = ?', [1, new Date().toISOString(), existing.id])
    } else {
      db.run('INSERT INTO map_locations_state (instance_id, location_name, feature_name, is_searched, searched_at) VALUES (?, ?, ?, ?, ?)', [instanceId, locationName, featureName, 1, new Date().toISOString()])
    }
    db.save()
  }

  isLocationSearched(instanceId, locationName, featureName) {
    const row = db.get('SELECT is_searched FROM map_locations_state WHERE instance_id = ? AND location_name = ? AND feature_name = ?', [instanceId, locationName, featureName])
    return row && row.is_searched === 1
  }

  getAllSearchedLocations(instanceId) {
    const rows = db.all('SELECT location_name, feature_name FROM map_locations_state WHERE instance_id = ? AND is_searched = 1', [instanceId])
    return rows.map(r => ({ location: r.location_name, feature: r.feature_name }))
  }

  dropItem(instanceId, locationName, itemName, quantity, itemData = {}) {
    db.run('INSERT INTO map_dropped_items (instance_id, location_name, item_name, quantity, item_data, dropped_at) VALUES (?, ?, ?, ?, ?, ?)', [instanceId, locationName, itemName, quantity, JSON.stringify(itemData), new Date().toISOString()])
    db.save()
  }

  getDroppedItems(instanceId, locationName) {
    const rows = db.all('SELECT * FROM map_dropped_items WHERE instance_id = ? AND location_name = ? AND is_picked = 0', [instanceId, locationName])
    return rows.map(this._rowToDroppedItem)
  }

  pickItem(itemId) {
    db.run('UPDATE map_dropped_items SET is_picked = ?, picked_at = ? WHERE id = ?', [1, new Date().toISOString(), itemId])
    db.save()
  }

  addTrainer(instanceId, locationName, trainer) {
    const existing = db.get('SELECT id FROM map_trainers WHERE instance_id = ? AND location_name = ? AND trainer_name = ?', [instanceId, locationName, trainer.name])
    if (!existing) {
      db.run('INSERT INTO map_trainers (instance_id, location_name, trainer_name, trainer_title, trainer_data) VALUES (?, ?, ?, ?, ?)', [instanceId, locationName, trainer.name, trainer.title || '', JSON.stringify(trainer)])
      db.save()
    }
  }

  getTrainer(instanceId, locationName, trainerName) {
    const row = db.get('SELECT * FROM map_trainers WHERE instance_id = ? AND location_name = ? AND trainer_name = ?', [instanceId, locationName, trainerName])
    if (!row) return null
    return this._rowToTrainer(row)
  }

  getActiveTrainers(instanceId, locationName) {
    const rows = db.all('SELECT * FROM map_trainers WHERE instance_id = ? AND location_name = ? AND is_defeated = 0', [instanceId, locationName])
    return rows.map(this._rowToTrainer)
  }

  defeatTrainer(instanceId, locationName, trainerName) {
    db.run('UPDATE map_trainers SET is_defeated = ?, defeated_at = ? WHERE instance_id = ? AND location_name = ? AND trainer_name = ?', [1, new Date().toISOString(), instanceId, locationName, trainerName])
    db.save()
  }

  addWildEncounter(instanceId, locationName, pokemonName, level) {
    db.run('INSERT INTO map_wild_encounters (instance_id, location_name, pokemon_name, level) VALUES (?, ?, ?, ?)', [instanceId, locationName, pokemonName, level])
    db.save()
  }

  defeatWildEncounter(instanceId, locationName, pokemonName) {
    db.run('UPDATE map_wild_encounters SET is_defeated = ?, defeated_at = ? WHERE instance_id = ? AND location_name = ? AND pokemon_name = ? AND is_defeated = 0', [1, new Date().toISOString(), instanceId, locationName, pokemonName])
    db.save()
  }

  fleeWildEncounter(instanceId, locationName, pokemonName) {
    db.run('UPDATE map_wild_encounters SET flee_at = ? WHERE instance_id = ? AND location_name = ? AND pokemon_name = ? AND is_defeated = 0', [new Date().toISOString(), instanceId, locationName, pokemonName])
    db.save()
  }

  getCurrentWildEncounters(instanceId, locationName) {
    const rows = db.all('SELECT * FROM map_wild_encounters WHERE instance_id = ? AND location_name = ? AND is_defeated = 0 AND flee_at IS NULL', [instanceId, locationName])
    return rows.map(this._rowToWildEncounter)
  }

  _rowToMapInstance(row) {
    return {
      id: row.id,
      userId: row.user_id,
      mapTier: row.map_tier,
      currentLocation: row.current_location,
      currentBuilding: row.current_building || null,
      currentFloor: row.current_floor || 0,
      exploredLocations: JSON.parse(row.explored_locations || '[]'),
      exploredFeatures: JSON.parse(row.explored_features || '[]'),
      visitedPoints: JSON.parse(row.visited_points || '[]'),
      state: row.state,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  _rowToDroppedItem(row) {
    return {
      id: row.id,
      instanceId: row.instance_id,
      locationName: row.location_name,
      itemName: row.item_name,
      quantity: row.quantity,
      itemData: JSON.parse(row.item_data || '{}'),
      droppedAt: row.dropped_at,
      isPicked: row.is_picked === 1,
      pickedAt: row.picked_at
    }
  }

  _rowToTrainer(row) {
    return {
      id: row.id,
      instanceId: row.instance_id,
      locationName: row.location_name,
      trainerName: row.trainer_name,
      trainerTitle: row.trainer_title,
      isDefeated: row.is_defeated === 1,
      defeatedAt: row.defeated_at,
      trainerData: JSON.parse(row.trainer_data || '{}')
    }
  }

  _rowToWildEncounter(row) {
    return {
      id: row.id,
      instanceId: row.instance_id,
      locationName: row.location_name,
      pokemonName: row.pokemon_name,
      level: row.level,
      isDefeated: row.is_defeated === 1,
      defeatedAt: row.defeated_at,
      fleeAt: row.flee_at
    }
  }
}

const playerDAL = new PlayerDAL()
const gameStateDAL = new GameStateDAL()
const listingDAL = new ListingDAL()
const pokemonDAL = new PokemonDAL()
const mapStateDAL = new MapStateDAL()

module.exports = {
  database: db,
  playerDAL,
  gameStateDAL,
  listingDAL,
  pokemonDAL,
  mapStateDAL,
  ensureDbInit
}
