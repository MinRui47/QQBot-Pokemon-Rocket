const { POKEMON_STATS, getPokemonList } = require('./data/pokemonData')

const pokemonBaseData = {}
for (const name of getPokemonList()) {
  const data = POKEMON_STATS[name]
  if (data) {
    pokemonBaseData[name] = {
      ...data,
      rarity: data.rarity || (data.HP > 80 ? 'rare' : 'common')
    }
  }
}

function getPokemonRarity(name) {
  const base = pokemonBaseData[name]
  if (!base) return 'common'
  return base.rarity || 'common'
}

function getPokemonData(name) {
  return pokemonBaseData[name] || null
}

module.exports = {
  getPokemonRarity,
  getPokemonData,
  pokemonBaseData
}