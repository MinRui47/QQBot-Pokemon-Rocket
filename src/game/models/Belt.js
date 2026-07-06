class Belt {
  constructor() {
    this.pokemon = []
    this.maxSlots = 6
  }

  addPokemon(pokemon) {
    if (this.pokemon.length >= this.maxSlots) {
      return { success: false, message: '精灵带已满' }
    }

    this.pokemon.push(pokemon)
    return { success: true }
  }

  removePokemon(index) {
    if (index < 0 || index >= this.pokemon.length) {
      return { success: false, message: '无效的索引' }
    }

    const removed = this.pokemon.splice(index, 1)[0]
    return { success: true, pokemon: removed }
  }

  getPokemon(index) {
    if (index < 0 || index >= this.pokemon.length) {
      return null
    }
    return this.pokemon[index]
  }

  getUsedSlots() {
    return this.pokemon.length
  }

  getActivePokemon() {
    return this.pokemon.find(p => p.hp > 0) || null
  }

  setActivePokemon(index) {
    if (index < 0 || index >= this.pokemon.length) {
      return { success: false, message: '无效的索引' }
    }

    const [active] = this.pokemon.splice(index, 1)
    this.pokemon.unshift(active)
    return { success: true }
  }

  getPokemonCount() {
    return this.pokemon.length
  }

  hasAlivePokemon() {
    return this.pokemon.some(p => p.hp > 0)
  }

  getAlivePokemon() {
    return this.pokemon.filter(p => p.hp > 0)
  }

  toJSON() {
    return {
      pokemon: this.pokemon.map(p => p.toJSON()),
      maxSlots: this.maxSlots
    }
  }

  static fromJSON(data, PokemonClass) {
    if (!data) return null
    
    const belt = new Belt()
    belt.maxSlots = data.maxSlots || 6
    
    if (data.pokemon && Array.isArray(data.pokemon) && PokemonClass) {
      belt.pokemon = data.pokemon.map(p => {
        return PokemonClass.fromJSON(p)
      }).filter(p => p !== null)
    }
    
    return belt
  }
}

module.exports = { Belt }